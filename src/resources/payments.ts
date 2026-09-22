import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import { PaymentsImportResource, PaymentsImportsResource } from "./payments-import";
import type { ReadExtras, WriteExtras } from "./common";

/**
 * Webpay (Transbank) payment reporting (#113).
 *
 * Webpay Plus has no `metadata` field and no webhook, so — unlike Stripe and
 * MercadoPago — Atribu cannot read the payment on its own. Your server is what
 * calls `Transaction.commit()`, so your server is what reports the sale; Atribu
 * owns the mapping.
 *
 * Two steps:
 *
 * ```ts
 * // 1. browser — carry the visitor through Webpay's only round-trip field
 * const sessionId = atribuTracker.getAttributionRef() || `sess-${orderId}`;
 *
 * // 2. server — after commit, forward the response verbatim
 * const commit = await tx.commit(token);
 * await atribu.payments.webpay({ commit });
 * ```
 */
export interface WebpayCommit {
  /** Transbank's `buy_order`, max 26 chars. */
  buy_order: string;
  /** Transbank's `session_id`, max 61 chars — the attribution carrier. */
  session_id?: string | null;
  amount: number;
  /** Only `AUTHORIZED` becomes revenue. */
  status: string;
  authorization_code?: string | null;
  /** ISO-8601. Becomes the outcome event's `event_time`. */
  transaction_date?: string | null;
  accounting_date?: string | null;
  payment_type_code?: string | null;
  /** 0 is approved. */
  response_code?: number | null;
  installments_number?: number | null;
  installments_amount?: number | null;
  balance?: number | null;
  vci?: string | null;
  card_detail?: { card_number?: string | null } | null;
}

export interface WebpayIngestInput {
  /** The `Transaction.commit` (or `Transaction.status`) response, verbatim. */
  commit: WebpayCommit;
  /** ISO-4217 override. Defaults to CLP. */
  currency?: string;
  /** A full `atb1.` token, if your backend kept one across the redirect. */
  attribution_token?: string;
  customer?: { email?: string; phone?: string; first_name?: string; last_name?: string; external_id?: string };
}

export interface WebpayIngestAccepted {
  event_id: string;
  status: "accepted";
  outcome_event_id: string | null;
  action: string;
  customer_profile_id: string | null;
  /**
   * Which field the visitor came from. `null` means the passthrough carried
   * nothing — check that `Transaction.create()` really sent
   * `getAttributionRef()` as `session_id`.
   */
  attribution_carrier: "attribution_token" | "session_id" | "buy_order" | null;
  anonymous_id: string | null;
  conversion: {
    matched: boolean;
    conversion_key: string | null;
    revenue_type: string | null;
    attribution_eligible: boolean | null;
  };
}

export interface WebpayIngestIgnored {
  event_id: string;
  status: "ignored";
  /** Why no cash event was written — the Webpay status / response code. */
  reason: string;
}

export type WebpayIngestResult = WebpayIngestAccepted | WebpayIngestIgnored;

// ---------------------------------------------------------------------------
// #1654/payments program (D7) — merchant payment actions: who paid, refunded
// outside the provider, installment. Payments a provider can't fully
// describe — MercadoPago bank transfers, most concretely.
// ---------------------------------------------------------------------------

type PaymentsListQuery = paths["/api/v1/payments"]["get"]["parameters"]["query"];
export type PaymentsListResponse =
  paths["/api/v1/payments"]["get"]["responses"][200]["content"]["application/json"];
export type PaymentsListOptions = PaymentsListQuery & ReadExtras;

export type PaymentSetPayerInput = NonNullable<
  paths["/api/v1/payments/{payment_id}/payer"]["put"]["requestBody"]
>["content"]["application/json"];
export type PaymentSetInstallmentInput = NonNullable<
  paths["/api/v1/payments/{payment_id}/installment"]["put"]["requestBody"]
>["content"]["application/json"];
export type PaymentRecordRefundInput = NonNullable<
  paths["/api/v1/payments/{payment_id}/refund"]["post"]["requestBody"]
>["content"]["application/json"];

/** The single `Payment` shape all five write/list methods on this surface answer with. */
export type PaymentResponse =
  paths["/api/v1/payments/{payment_id}/payer"]["put"]["responses"][200]["content"]["application/json"];
export type PaymentWriteOptions = WriteExtras;

export class PaymentsResource {
  /** The Transbank Webpay bank-statement importer (#489) — parse/commit/template. */
  readonly import: PaymentsImportResource;
  /** Past Webpay imports — list/undo. */
  readonly imports: PaymentsImportsResource;

  constructor(private readonly http: HttpClientLike) {
    this.import = new PaymentsImportResource(http);
    this.imports = new PaymentsImportsResource(http);
  }

  /**
   * Report a completed Webpay Plus transaction. Idempotent on
   * `<buy_order>_<authorization_code>` — the same key the webpay.cl report
   * importer uses, so retries and a later monthly PDF upload of the same
   * payment collapse onto one conversion.
   */
  async webpay(
    input: WebpayIngestInput,
    opts: { signal?: AbortSignal } = {},
  ): Promise<WebpayIngestResult> {
    const res = await this.http.request<{ data: WebpayIngestResult }>({
      method: "POST",
      path: "/api/v1/payments/webpay",
      body: input,
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
    return res.data;
  }

  /**
   * Keyset page of the profile's `payment_received` rows, newest first, each
   * carrying who paid, whether it is an installment, and any refund recorded
   * against it — the provider's own reversals AND a merchant's manual one
   * (#1654).
   *
   * `from`/`to` are full ISO-8601 instants (not calendar days) — `from` is
   * inclusive, `to` is exclusive. `status: "unidentified"` returns only
   * payments with no customer known at all — the queue {@link setPayer} works
   * through. `customers:read` — the PII tier, same as
   * `GET /api/v1/customers/{id}/payments`.
   */
  async list(options: PaymentsListOptions): Promise<PaymentsListResponse> {
    const { signal, ...query } = options;
    return this.http.request<PaymentsListResponse>({
      method: "GET",
      path: "/api/v1/payments",
      query,
      signal,
    });
  }

  /**
   * Record who paid a payment the provider itself cannot attribute to a
   * customer (#1654) — a bank transfer, most concretely. Two body forms,
   * never both: `{customer_id}` for an existing customer of this profile, or
   * `{email?, phone?, first_name?, last_name?}` to resolve-or-create one (an
   * email or a phone is required).
   *
   * The assignment is DURABLE: it wins over the provider's own payer on every
   * future re-sync of this payment (and its reversals), not only on the rows
   * that exist today. `attribution:write` — it re-points which customer a
   * payment, and its conversion, is credited to.
   */
  async setPayer(
    paymentId: string,
    input: PaymentSetPayerInput,
    options: PaymentWriteOptions = {},
  ): Promise<PaymentResponse> {
    const { signal, idempotencyKey } = options;
    return this.http.request<PaymentResponse>({
      method: "PUT",
      path: `/api/v1/payments/${encodeURIComponent(paymentId)}/payer`,
      body: input,
      idempotencyKey,
      signal,
    });
  }

  /**
   * Mark (or unmark) a payment as a later installment of an earlier sale
   * (#1654) — it stops counting as a NEW purchase, and still counts as cash.
   * Idempotent: setting the same value twice is a no-op. `attribution:write`.
   */
  async setInstallment(
    paymentId: string,
    input: PaymentSetInstallmentInput,
    options: PaymentWriteOptions = {},
  ): Promise<PaymentResponse> {
    const { signal, idempotencyKey } = options;
    return this.http.request<PaymentResponse>({
      method: "PUT",
      path: `/api/v1/payments/${encodeURIComponent(paymentId)}/installment`,
      body: input,
      idempotencyKey,
      signal,
    });
  }

  /**
   * Record a full or partial refund made OUTSIDE this payment's provider
   * (#1654) — the provider never learns about it, so nothing else will ever
   * record it. At most one manual refund per payment; {@link undoRefund} it
   * first to change the amount. `amount` must be greater than zero and no
   * more than the payment's value minus what the provider has already
   * reversed for it. `attribution:write`.
   */
  async recordRefund(
    paymentId: string,
    input: PaymentRecordRefundInput,
    options: PaymentWriteOptions = {},
  ): Promise<PaymentResponse> {
    const { signal, idempotencyKey } = options;
    return this.http.request<PaymentResponse>({
      method: "POST",
      path: `/api/v1/payments/${encodeURIComponent(paymentId)}/refund`,
      body: input,
      idempotencyKey,
      signal,
    });
  }

  /**
   * Undo a manually recorded refund (#1654) — its touchpoints, its
   * conversion, and the reversal row itself — and enqueue a recompute.
   * Idempotent: resolves with the current payment whether or not there was a
   * manual refund to undo. `attribution:write`.
   */
  async undoRefund(
    paymentId: string,
    options: PaymentWriteOptions = {},
  ): Promise<PaymentResponse> {
    const { signal, idempotencyKey } = options;
    return this.http.request<PaymentResponse>({
      method: "DELETE",
      path: `/api/v1/payments/${encodeURIComponent(paymentId)}/refund`,
      idempotencyKey,
      signal,
    });
  }
}

import type { HttpClientLike } from "../http";
import { PaymentsImportResource, PaymentsImportsResource } from "./payments-import";

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
}

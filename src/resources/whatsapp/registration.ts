import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type AddNumberBody = NonNullable<
  paths["/api/v1/whatsapp/registration/phone-numbers"]["post"]["requestBody"]
>["content"]["application/json"];
type AddNumberResponse =
  paths["/api/v1/whatsapp/registration/phone-numbers"]["post"]["responses"][201]["content"]["application/json"];

type RequestCodeBody = NonNullable<
  paths["/api/v1/whatsapp/registration/request-code"]["post"]["requestBody"]
>["content"]["application/json"];
type RequestCodeResponse =
  paths["/api/v1/whatsapp/registration/request-code"]["post"]["responses"][200]["content"]["application/json"];

type VerifyCodeBody = NonNullable<
  paths["/api/v1/whatsapp/registration/verify-code"]["post"]["requestBody"]
>["content"]["application/json"];
type VerifyCodeResponse =
  paths["/api/v1/whatsapp/registration/verify-code"]["post"]["responses"][200]["content"]["application/json"];

type RegisterBody = NonNullable<
  paths["/api/v1/whatsapp/registration/register"]["post"]["requestBody"]
>["content"]["application/json"];
type RegisterResponse =
  paths["/api/v1/whatsapp/registration/register"]["post"]["responses"][200]["content"]["application/json"];

type SubscribeBody = NonNullable<
  paths["/api/v1/whatsapp/registration/subscribe"]["post"]["requestBody"]
>["content"]["application/json"];
type SubscribeResponse =
  paths["/api/v1/whatsapp/registration/subscribe"]["post"]["responses"][200]["content"]["application/json"];

type SubscribedAppsResponse =
  paths["/api/v1/whatsapp/registration/subscribed-apps"]["get"]["responses"][200]["content"]["application/json"];

type FundingResponse =
  paths["/api/v1/whatsapp/registration/funding"]["get"]["responses"][200]["content"]["application/json"];

type PhoneNumbersResponse =
  paths["/api/v1/whatsapp/registration/phone-numbers"]["get"]["responses"][200]["content"]["application/json"];

export type WhatsAppAddNumberInput = AddNumberBody;
export type WhatsAppAddNumberResult = AddNumberResponse["data"];
export type WhatsAppRequestCodeInput = RequestCodeBody;
export type WhatsAppVerifyCodeInput = VerifyCodeBody;
export type WhatsAppRegisterInput = RegisterBody;
export type WhatsAppSubscribeInput = SubscribeBody;
export type WhatsAppSubscribedApp = SubscribedAppsResponse["data"][number];
export type WhatsAppFundingInfo = FundingResponse["data"];
export type WhatsAppPhoneNumber = PhoneNumbersResponse["data"][number];

export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ReadOptions {
  connectionId: string;
  signal?: AbortSignal;
}

/**
 * The Meta-facing half of WhatsApp registration. Every method resolves the
 * connection's customer-scoped Meta business token server-side (Atribu never
 * returns it) and proxies exactly one Graph call.
 *
 * Contract notes surfaced as typed errors on `AtribuApiError`:
 *   - `whatsapp_register_limit` (429) — `/register` is capped 10/number/72h
 *     (Meta 133016). Never retried server-side; wait out the window.
 *   - `whatsapp_payment_required` (402) — the WABA has no working funding
 *     source (Meta 131042); add a payment method, then retry.
 *
 * `requestCode` / `verifyCode` are single, attempt-limited actions — do NOT
 * auto-retry them.
 */
export class WhatsAppRegistrationResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Add (or, with `migrate: true`, migrate) a phone number onto the WABA. */
  async addPhoneNumber(
    input: WhatsAppAddNumberInput,
    opts: MutationOptions = {},
  ): Promise<WhatsAppAddNumberResult> {
    const res = await this.http.request<AddNumberResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/registration/phone-numbers",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Request the voice OTP. Single, non-idempotent — do NOT auto-retry. */
  async requestCode(
    input: WhatsAppRequestCodeInput,
    opts: MutationOptions = {},
  ): Promise<RequestCodeResponse["data"]> {
    const res = await this.http.request<RequestCodeResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/registration/request-code",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      // Single, attempt-limited action — never replayed by `withRetry`.
      retryable: false,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Verify the OTP. Attempt-limited by Meta — do NOT auto-retry. */
  async verifyCode(
    input: WhatsAppVerifyCodeInput,
    opts: MutationOptions = {},
  ): Promise<VerifyCodeResponse["data"]> {
    const res = await this.http.request<VerifyCodeResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/registration/verify-code",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      // The OTP is consumed on each try — never replayed by `withRetry`.
      retryable: false,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Register the number + subscribe Atribu's app (idempotent). */
  async register(
    input: WhatsAppRegisterInput,
    opts: MutationOptions = {},
  ): Promise<RegisterResponse["data"]> {
    const res = await this.http.request<RegisterResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/registration/register",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      // /register is capped 10/number/72h — never replayed by `withRetry`.
      retryable: false,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Subscribe Atribu's app to an already-registered WABA (case 4a). */
  async subscribe(
    input: WhatsAppSubscribeInput,
    opts: MutationOptions = {},
  ): Promise<SubscribeResponse["data"]> {
    const res = await this.http.request<SubscribeResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/registration/subscribe",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** List apps subscribed to the WABA (incumbent detection, case 4b). */
  async listSubscribedApps(opts: ReadOptions): Promise<WhatsAppSubscribedApp[]> {
    const res = await this.http.request<SubscribedAppsResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/registration/subscribed-apps?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Read the WABA's funding + status (payment gate). */
  async getFunding(opts: ReadOptions): Promise<WhatsAppFundingInfo> {
    const res = await this.http.request<FundingResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/registration/funding?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * List the phone numbers on the WABA. Detects an already-connected number
   * (its `phone_number_id`, `display_phone_number`, quality) before registration
   * — the read `only_waba_sharing` ES needs because Meta never returns the phone
   * on the connection itself.
   */
  async listPhoneNumbers(opts: ReadOptions): Promise<WhatsAppPhoneNumber[]> {
    const res = await this.http.request<PhoneNumbersResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/registration/phone-numbers?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }
}

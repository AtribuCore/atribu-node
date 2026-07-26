import type { paths } from "../../__generated__/api";
import { AtribuConfigError } from "../../errors";
import type { HttpClientLike } from "../../http";

type PublishBody = NonNullable<
  paths["/api/v1/whatsapp/otp-capture"]["post"]["requestBody"]
>["content"]["application/json"];
type PublishResponse =
  paths["/api/v1/whatsapp/otp-capture"]["post"]["responses"][200]["content"]["application/json"];
type ReadResponse =
  paths["/api/v1/whatsapp/otp-capture"]["get"]["responses"][200]["content"]["application/json"];

export type WhatsAppOtpCaptureInput = PublishBody;
export type WhatsAppOtpCapture = NonNullable<ReadResponse["data"]["capture"]>;

export interface OtpCaptureOptions {
  signal?: AbortSignal;
  /**
   * The app's OAuth client credentials — REQUIRED for this resource.
   *
   * Every other endpoint uses the API key the client was constructed with, but
   * that key is minted by the OAuth exchange and so does not exist yet: this
   * relay runs while the dealer is still inside Meta's popup, before any code has
   * been exchanged. The consumer app authenticates as itself instead, with the
   * same `client_secret_basic` pair it uses at `/oauth/token`.
   */
  clientCredentials: { clientId: string; clientSecret: string };
}

/**
 * `Authorization: Basic base64(client_id:client_secret)`.
 *
 * VALIDATED, because this is the one surface the keyless client exists for. The
 * client itself no longer demands an `apiKey` at construction — precisely so a
 * consumer can build one before the OAuth exchange and call this — which means
 * an undefined/empty credential here is not caught anywhere upstream either.
 * Unvalidated it encoded to a `Basic` header of `:` or `undefined:undefined`,
 * and the caller learned about it as an opaque 401 from a relay they had every
 * reason to think they were authorised for. Fail at the call, naming what is
 * missing — the same contract `resolveConfig` gives the API key.
 */
function basicAuth(creds: { clientId: string; clientSecret: string } | undefined): string {
  if (!creds?.clientId || !creds?.clientSecret) {
    throw new AtribuConfigError(
      "whatsapp.otpCapture requires `clientCredentials: { clientId, clientSecret }` — it authenticates as the app (client_secret_basic), not with an API key",
    );
  }
  const raw = `${creds.clientId}:${creds.clientSecret}`;
  const encoded =
    typeof btoa === "function"
      ? btoa(raw)
      : Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

/**
 * THE OTP-CAPTURE RELAY — the wire between whoever HEARS Meta's verification
 * call and the dealer's connect page, which is sitting behind Meta's popup with
 * no way to learn the code.
 *
 * Embedded Signup v4 removed the phone-screen bypass, so Meta may verify a
 * number in-popup: it places a VOICE call and reads six digits aloud. A consumer
 * that has taken over that number's voice webhook can hear them — and this is
 * how it hands them across.
 *
 * ── HANDLING RULES ──────────────────────────────────────────────────────────
 *
 * `code` is populated ONLY when the capture cleared the publisher's confidence
 * gate. When it is null, `candidate_code` still carries the best guess — show it
 * as a hint next to the audio, never as an answer, and never submit it. Meta's
 * verify is attempt-limited and `/register` is capped 10/number/72h, so a wrong
 * auto-submitted code can lock a real business out of WhatsApp.
 *
 * Everything here is a LIVE registration secret with a few-minute life. Do not
 * log it, do not persist it, and do not put it anywhere it will outlive the
 * connect.
 */
export class WhatsAppOtpCaptureResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Hold a captured code for the connect page, keyed by the connect's OAuth
   * `state`.
   *
   * Publishing again for the same state REPLACES the previous capture: a second
   * call means a second recording (a re-dialled verification), and only the
   * newest read can still be valid.
   *
   * Throws `whatsapp_otp_relay_unavailable` (503) rather than silently accepting
   * a code it cannot store — a false success would tell the caller the dealer is
   * about to see a code that nothing will ever show her.
   *
   * Throws `invalid_state` (404) when `state` is not one of YOUR live WhatsApp
   * Embedded Signup connects. The state is a correlation id, not a capability:
   * knowing one proves nothing, so publishing under it requires that it belong
   * to an in-flight connect of yours, of that kind, still unexpired and
   * unconsumed. In practice this means the connect finished, timed out, or the
   * state was never one of yours.
   */
  async publish(
    input: WhatsAppOtpCaptureInput,
    opts: OtpCaptureOptions,
  ): Promise<PublishResponse["data"]> {
    const res = await this.http.request<PublishResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/otp-capture",
      body: input,
      authOverride: basicAuth(opts.clientCredentials),
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Read back the capture for a connect, or `null` when none has landed yet.
   *
   * `null` is the NORMAL answer for most of a connect's life — the dealer is
   * still working through Meta's screens and no call has happened. It is an
   * empty result, not an error, so poll it rather than treating it as a failure.
   *
   * Captures are bound to the app that published them, so this can only ever
   * return your own.
   */
  async get(
    state: string,
    opts: OtpCaptureOptions,
  ): Promise<WhatsAppOtpCapture | null> {
    const res = await this.http.request<ReadResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/otp-capture?state=${encodeURIComponent(state)}`,
      authOverride: basicAuth(opts.clientCredentials),
      signal: opts.signal,
    });
    return res.data.capture ?? null;
  }
}

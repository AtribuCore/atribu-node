import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type GetResponse =
  paths["/api/v1/whatsapp/calling"]["get"]["responses"][200]["content"]["application/json"];
type PostResponse =
  paths["/api/v1/whatsapp/calling"]["post"]["responses"][200]["content"]["application/json"];
type SipCredentialsResponse =
  paths["/api/v1/whatsapp/calling/sip-credentials"]["get"]["responses"][200]["content"]["application/json"];

/**
 * A number's SIP digest credentials.
 *
 * `username` is the digest username Meta authenticates with — the business
 * number as DIGITS ONLY, with NO leading `+`.
 *
 * Meta's guide calls it "the (normalized) business phone number", which reads
 * as E.164, but a captured live call shows Meta authenticating as
 * `username="16065177691"` while its own request URI carries
 * `sip:+16065177691@...` — two spellings in one exchange, and only the bare
 * digits are the credential. It is also NOT the `phone_number_id` and not the
 * punctuated `display_phone_number`. A trunk configured with any other spelling
 * gets a 401 on every call, which presents as ringing that never answers.
 */
export type WhatsAppSipCredentials = SipCredentialsResponse["data"];

/**
 * Meta's `calling` object, passed through verbatim in both directions. Left
 * open on purpose: Atribu holds no opinion about its contents, and a type that
 * enumerated Meta's fields would reject a field Meta shipped this morning.
 */
export type WhatsAppCallingSettings = GetResponse["data"]["calling"];

export interface CallingOptions {
  signal?: AbortSignal;
}

/**
 * Per-number WhatsApp calling settings.
 *
 * `connection_id` is required on both calls and is not redundant with
 * `phone_number_id`: it is the token resolver's key, and a phone-number id
 * alone resolves nothing. The number is cross-validated against the
 * connection's WABA before anything is proxied.
 *
 * WHAT YOU GET BACK IS WHAT META HOLDS, not what you sent. `update()` proxies
 * your settings, then re-reads and returns the re-read — Meta normalizes input
 * and fills defaults, so echoing the request would report settings that were
 * never applied.
 *
 * SIP credentials are never returned or stored. The read never requests
 * `include_sip_credentials`, and Atribu's drift snapshot is an allowlist
 * projection of the reachable settings, so a credential cannot reach storage
 * even if Meta widens the payload.
 */
export class WhatsAppCallingResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Read a number's current calling settings, live from Meta. */
  async get(
    connectionId: string,
    phoneNumberId: string,
    opts: CallingOptions = {},
  ): Promise<WhatsAppCallingSettings> {
    const q = new URLSearchParams({
      connection_id: connectionId,
      phone_number_id: phoneNumberId,
    });
    const res = await this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/calling?${q.toString()}`,
      signal: opts.signal,
    });
    return res.data.calling;
  }

  /**
   * Enable or update calling on one number. Idempotent — re-sending the same
   * settings is a no-op at Meta, which is why this is retried on transient
   * upstream failures where the OTP steps never are.
   */
  async update(
    connectionId: string,
    phoneNumberId: string,
    settings: WhatsAppCallingSettings,
    opts: CallingOptions = {},
  ): Promise<WhatsAppCallingSettings> {
    const res = await this.http.request<PostResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/calling",
      body: {
        connection_id: connectionId,
        phone_number_id: phoneNumberId,
        settings,
      },
      signal: opts.signal,
    });
    return res.data.calling;
  }

  /**
   * Read the number's Meta-generated SIP digest credentials.
   *
   * THE ONLY CALL IN THIS SDK THAT RETURNS A SECRET. Meta publishes no static
   * SIP egress IP ranges and does not support mTLS, so digest auth is the
   * practical control on who may INVITE your trunk: your SIP server answers
   * Meta's INVITE with a 407 and Meta re-sends carrying the challenge response.
   * Configuring that needs this password.
   *
   * Treat the result as a secret in transit: hand it straight to the SIP
   * provider and do not persist or log it. Atribu stores none of it — `get()`
   * above never even asks Meta for it, and the drift snapshot is an allowlist
   * projection that structurally cannot hold a credential.
   *
   * Throws 404 when the number has no SIP credential — calling disabled, or no
   * `sip` configuration. That is deliberately not an empty success: a caller
   * that treats "no credential" as "no password needed" builds a trunk with no
   * inbound authentication at all.
   */
  async sipCredentials(
    connectionId: string,
    phoneNumberId: string,
    opts: CallingOptions = {},
  ): Promise<WhatsAppSipCredentials> {
    const q = new URLSearchParams({
      connection_id: connectionId,
      phone_number_id: phoneNumberId,
    });
    const res = await this.http.request<SipCredentialsResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/calling/sip-credentials?${q.toString()}`,
      signal: opts.signal,
    });
    return res.data;
  }
}

import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type GetResponse =
  paths["/api/v1/whatsapp/calling"]["get"]["responses"][200]["content"]["application/json"];
type PostResponse =
  paths["/api/v1/whatsapp/calling"]["post"]["responses"][200]["content"]["application/json"];

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
}

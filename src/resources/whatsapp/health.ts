import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type GetResponse =
  paths["/api/v1/whatsapp/account-health"]["get"]["responses"][200]["content"]["application/json"];

export type WhatsAppChannelHealth = GetResponse["data"];
export type WhatsAppHealthIssue = WhatsAppChannelHealth["issues"][number];

export interface HealthGetOptions {
  signal?: AbortSignal;
}

/**
 * WhatsApp channel health. Assembles Meta's `health_status` (→ `canSend` +
 * `issues[]`), the phone-number status fields, the token-validity probe and the
 * webhook-subscription check into one typed object. An expired token comes back
 * as `tokenValid:false` with a critical issue rather than an error — check
 * `canSend`/`tokenValid`/`issues`, don't rely on a throw.
 *
 * `get()` serves the persisted snapshot (with `refreshedAt` + a `stale` flag);
 * `refresh()` forces a live Meta re-read, updates the snapshot + trend history,
 * and returns the fresh object.
 */
export class WhatsAppHealthResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Cached snapshot (stale-while-revalidate). A never-refreshed channel reads live. */
  async get(
    connectionId: string,
    opts: HealthGetOptions = {},
  ): Promise<WhatsAppChannelHealth> {
    const res = await this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/account-health?connection_id=${encodeURIComponent(connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Force a live Meta re-check; updates the snapshot + history and returns it fresh. */
  async refresh(
    connectionId: string,
    opts: HealthGetOptions = {},
  ): Promise<WhatsAppChannelHealth> {
    const res = await this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/account-health?connection_id=${encodeURIComponent(connectionId)}&refresh=true`,
      signal: opts.signal,
    });
    return res.data;
  }
}

import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type GetResponse =
  paths["/api/v1/instagram/contacts/{igsid}"]["get"]["responses"][200]["content"]["application/json"];

export type InstagramContact = GetResponse["data"];

export interface GetContactOptions {
  /** The Instagram `data_connection` to resolve the contact against. */
  connectionId: string;
  signal?: AbortSignal;
}

/**
 * Instagram contact (sender) profile lookups. Mounted on
 * `AtribuClient.instagram.contacts`.
 */
export class InstagramContactsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Resolve an IGSID — the sender id Meta puts on inbound DM/comment webhooks —
   * to that person's public profile: `name`, `@username`, avatar, follower
   * count, and the mutual-follow flags. Use it to show "@jane" + an avatar in
   * an inbox instead of a bare numeric id.
   *
   * Throws `AtribuApiError` with status 404 when the profile can't be resolved
   * (the user blocked DMs, the IGSID is invalid, or the connection lacks the
   * messaging permission) — fall back to displaying the raw IGSID.
   */
  async get(igsid: string, opts: GetContactOptions): Promise<InstagramContact> {
    const res = await this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/instagram/contacts/${encodeURIComponent(igsid)}?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }
}

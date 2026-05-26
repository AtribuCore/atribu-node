import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type ListResponse =
  paths["/api/v1/connections"]["get"]["responses"][200]["content"]["application/json"];
type GetResponse =
  paths["/api/v1/connections/{id}"]["get"]["responses"][200]["content"]["application/json"];

export type Connection = ListResponse["data"][number];

export interface ListOptions {
  channel?: "whatsapp" | "instagram" | "email" | "google_calendar";
  signal?: AbortSignal;
}

export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class ConnectionsResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(opts: ListOptions = {}): Promise<Connection[]> {
    const qs = opts.channel ? `?channel=${encodeURIComponent(opts.channel)}` : "";
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: `/api/v1/connections${qs}`,
      signal: opts.signal,
    });
    return res.data;
  }

  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Connection> {
    const res = await this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/connections/${encodeURIComponent(id)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Revoke this OAuth app's authorization for the connection. Does NOT
   * disconnect the underlying data_connection (other consumers + the
   * Atribu UI still see it). Direct admin keys reject this call with 400.
   */
  async revoke(id: string, opts: MutationOptions = {}): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/api/v1/connections/${encodeURIComponent(id)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
      expectEmpty: true,
    });
  }
}

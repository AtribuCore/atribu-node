import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type ListResponse =
  paths["/api/v1/whatsapp/broadcasts"]["get"]["responses"][200]["content"]["application/json"];
type CreateBody = NonNullable<
  paths["/api/v1/whatsapp/broadcasts"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateResponse =
  paths["/api/v1/whatsapp/broadcasts"]["post"]["responses"][201]["content"]["application/json"];
type GetResponse =
  paths["/api/v1/whatsapp/broadcasts/{id}"]["get"]["responses"][200]["content"]["application/json"];
type CancelBody = NonNullable<
  paths["/api/v1/whatsapp/broadcasts/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
type CancelResponse =
  paths["/api/v1/whatsapp/broadcasts/{id}"]["patch"]["responses"][200]["content"]["application/json"];
type SendResponse =
  paths["/api/v1/whatsapp/broadcasts/{id}/send"]["post"]["responses"][200]["content"]["application/json"];

export type WhatsAppBroadcast = ListResponse["data"][number];
export type WhatsAppBroadcastDetail = GetResponse["data"];
export type WhatsAppBroadcastCreateInput = CreateBody;

export interface ListOptions {
  connectionId: string;
  signal?: AbortSignal;
}

export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class WhatsAppBroadcastsResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(opts: ListOptions): Promise<WhatsAppBroadcast[]> {
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/broadcasts?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  async create(
    input: WhatsAppBroadcastCreateInput,
    opts: MutationOptions = {},
  ): Promise<WhatsAppBroadcast> {
    const res = await this.http.request<CreateResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/broadcasts",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<WhatsAppBroadcastDetail> {
    const res = await this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/broadcasts/${encodeURIComponent(id)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  async cancel(id: string, opts: MutationOptions = {}): Promise<WhatsAppBroadcast> {
    const body: CancelBody = { status: "cancelled" };
    const res = await this.http.request<CancelResponse>({
      method: "PATCH",
      path: `/api/v1/whatsapp/broadcasts/${encodeURIComponent(id)}`,
      body,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Execute the broadcast. Long-running — iterates recipients with 100ms
   * pacing between sends. Consider extending your HTTP client's timeout
   * for broadcasts over a few hundred recipients (the Atribu server caps
   * the route at 300s).
   */
  async send(id: string, opts: MutationOptions = {}): Promise<WhatsAppBroadcast> {
    const res = await this.http.request<SendResponse>({
      method: "POST",
      path: `/api/v1/whatsapp/broadcasts/${encodeURIComponent(id)}/send`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

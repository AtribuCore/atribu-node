import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type ListResponse =
  paths["/api/v1/whatsapp/templates"]["get"]["responses"][200]["content"]["application/json"];
type CreateBody = NonNullable<
  paths["/api/v1/whatsapp/templates"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateResponse =
  paths["/api/v1/whatsapp/templates"]["post"]["responses"][201]["content"]["application/json"];

export type WhatsAppTemplate = ListResponse["data"][number];
export type WhatsAppTemplateCreateInput = CreateBody;
export type WhatsAppTemplateCreateResult = CreateResponse["data"];

export interface ListOptions {
  connectionId: string;
  signal?: AbortSignal;
}

export interface DeleteOptions {
  connectionId: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface CreateOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class WhatsAppTemplatesResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(opts: ListOptions): Promise<WhatsAppTemplate[]> {
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/templates?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  async create(
    input: WhatsAppTemplateCreateInput,
    opts: CreateOptions = {},
  ): Promise<WhatsAppTemplateCreateResult> {
    const res = await this.http.request<CreateResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/templates",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async delete(name: string, opts: DeleteOptions): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/api/v1/whatsapp/templates/${encodeURIComponent(name)}?connection_id=${encodeURIComponent(opts.connectionId)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
      expectEmpty: true,
    });
  }
}

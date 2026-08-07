import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type ListResponse =
  paths["/api/v1/whatsapp/flows"]["get"]["responses"][200]["content"]["application/json"];
type CreateBody = NonNullable<
  paths["/api/v1/whatsapp/flows"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateResponse =
  paths["/api/v1/whatsapp/flows"]["post"]["responses"][201]["content"]["application/json"];
type GetResponse =
  paths["/api/v1/whatsapp/flows/{flowId}"]["get"]["responses"][200]["content"]["application/json"];
type UpdateBody = NonNullable<
  paths["/api/v1/whatsapp/flows/{flowId}"]["post"]["requestBody"]
>["content"]["application/json"];
type AssetsListResponse =
  paths["/api/v1/whatsapp/flows/{flowId}/assets"]["get"]["responses"][200]["content"]["application/json"];
type AssetsUploadBody = NonNullable<
  paths["/api/v1/whatsapp/flows/{flowId}/assets"]["post"]["requestBody"]
>["content"]["application/json"];
type AssetsUploadResponse =
  paths["/api/v1/whatsapp/flows/{flowId}/assets"]["post"]["responses"][200]["content"]["application/json"];

export type WhatsAppFlow = ListResponse["data"][number];
export type WhatsAppFlowDetail = GetResponse["data"];
export type WhatsAppFlowCreateInput = CreateBody;
export type WhatsAppFlowCreateResult = CreateResponse["data"];
export type WhatsAppFlowUpdateInput = UpdateBody;
export type WhatsAppFlowAsset = AssetsListResponse["data"][number];
export type WhatsAppFlowJson = AssetsUploadBody["flow_json"];
export type WhatsAppFlowJsonUploadResult = AssetsUploadResponse["data"];

export interface FlowReadOptions {
  connectionId: string;
  signal?: AbortSignal;
}

export interface FlowWriteOptions {
  connectionId: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface FlowMutateOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/**
 * WhatsApp Flows — Meta-hosted multi-screen forms opened from an interactive
 * message. This resource manages the flow lifecycle (DRAFT → PUBLISHED →
 * DEPRECATED); *sending* one is `messages.send()` with `content.type: "flow"`.
 * There is no local mirror: every call proxies Meta live.
 */
export class WhatsAppFlowsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** List ALL flows on the connection's WABA, drafts included. */
  async list(opts: FlowReadOptions): Promise<WhatsAppFlow[]> {
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/flows?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Create a flow (born DRAFT). Upload its JSON next via `uploadFlowJson`. */
  async create(
    input: WhatsAppFlowCreateInput,
    opts: FlowMutateOptions = {},
  ): Promise<WhatsAppFlowCreateResult> {
    const res = await this.http.request<CreateResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/flows",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Read one flow, including validation_errors and a web preview URL. */
  async get(flowId: string, opts: FlowReadOptions): Promise<WhatsAppFlowDetail> {
    const res = await this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/flows/${encodeURIComponent(flowId)}?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Update name / categories / endpoint_uri (at least one). Not the JSON — that's `uploadFlowJson`. */
  async update(
    flowId: string,
    input: WhatsAppFlowUpdateInput,
    opts: FlowMutateOptions = {},
  ): Promise<void> {
    await this.http.request<unknown>({
      method: "POST",
      path: `/api/v1/whatsapp/flows/${encodeURIComponent(flowId)}`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /** Delete a DRAFT flow. Meta rejects any other status — `deprecate` those. */
  async delete(flowId: string, opts: FlowWriteOptions): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/api/v1/whatsapp/flows/${encodeURIComponent(flowId)}?connection_id=${encodeURIComponent(opts.connectionId)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
      expectEmpty: true,
    });
  }

  /** List the flow's assets — the flow.json `download_url` lives here. */
  async listAssets(flowId: string, opts: FlowReadOptions): Promise<WhatsAppFlowAsset[]> {
    const res = await this.http.request<AssetsListResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/flows/${encodeURIComponent(flowId)}/assets?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Replace the flow's JSON. Pass an object or a pre-serialized string — the
   * server builds Meta's multipart upload either way. The returned
   * `validation_errors` come back verbatim from Meta: an upload of broken flow
   * JSON *succeeds* with findings, and `publish` is what Meta rejects until
   * they're fixed.
   */
  async uploadFlowJson(
    flowId: string,
    flowJson: WhatsAppFlowJson,
    opts: FlowWriteOptions,
  ): Promise<WhatsAppFlowJsonUploadResult> {
    const res = await this.http.request<AssetsUploadResponse>({
      method: "POST",
      path: `/api/v1/whatsapp/flows/${encodeURIComponent(flowId)}/assets`,
      body: { connection_id: opts.connectionId, flow_json: flowJson },
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** DRAFT → PUBLISHED. Meta rejects flows with outstanding validation_errors. */
  async publish(flowId: string, opts: FlowWriteOptions): Promise<void> {
    await this.http.request<unknown>({
      method: "POST",
      path: `/api/v1/whatsapp/flows/${encodeURIComponent(flowId)}/publish`,
      body: { connection_id: opts.connectionId },
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /** PUBLISHED → DEPRECATED. Terminal: a deprecated flow can't be re-published. */
  async deprecate(flowId: string, opts: FlowWriteOptions): Promise<void> {
    await this.http.request<unknown>({
      method: "POST",
      path: `/api/v1/whatsapp/flows/${encodeURIComponent(flowId)}/deprecate`,
      body: { connection_id: opts.connectionId },
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }
}

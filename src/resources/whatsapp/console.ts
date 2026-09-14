import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type AutomaticEventsResponse =
  paths["/api/v1/whatsapp/automatic-events"]["get"]["responses"][200]["content"]["application/json"];
export type WhatsAppAutomaticEventsAccount = AutomaticEventsResponse["data"]["accounts"][number];

export type SetAutomaticEventsOptInInput = NonNullable<
  paths["/api/v1/whatsapp/automatic-events"]["patch"]["requestBody"]
>["content"]["application/json"];

type LabelsResponse =
  paths["/api/v1/whatsapp/labels"]["get"]["responses"][200]["content"]["application/json"];
export type WhatsAppSettingsLabel = LabelsResponse["data"]["labels"][number];
export type WhatsAppLabelMapping = LabelsResponse["data"]["mappings"][number];

export type CreateWhatsAppLabelInput = NonNullable<
  paths["/api/v1/whatsapp/labels"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateWhatsAppLabelResponse =
  paths["/api/v1/whatsapp/labels"]["post"]["responses"][201]["content"]["application/json"];

export type UpsertWhatsAppLabelMappingInput = NonNullable<
  paths["/api/v1/whatsapp/label-mappings"]["post"]["requestBody"]
>["content"]["application/json"];
type UpsertWhatsAppLabelMappingResponse =
  paths["/api/v1/whatsapp/label-mappings"]["post"]["responses"][201]["content"]["application/json"];

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/**
 * The WhatsApp SETTINGS panel (#489) — Automatic Events opt-in and the
 * pipeline-stage → WhatsApp-label mapping. Not messaging: `.templates` /
 * `.broadcasts` / `.conversations` are the send/receive surface.
 */
export class WhatsAppConsoleResource {
  constructor(private readonly http: HttpClientLike) {}

  /** The profile's WABAs and their Automatic Events opt-in confirmation. */
  async getAutomaticEvents(
    opts: RequestOptions = {},
  ): Promise<WhatsAppAutomaticEventsAccount[]> {
    const res = await this.http.request<AutomaticEventsResponse>({
      method: "GET",
      path: "/api/v1/whatsapp/automatic-events",
      signal: opts.signal,
    });
    return res.data.accounts;
  }

  /**
   * Record the business's own confirmation that they flipped the Business
   * Suite toggle. Never turns anything on inside Meta.
   */
  async setAutomaticEventsOptIn(
    input: SetAutomaticEventsOptInInput,
    opts: MutationOptions = {},
  ): Promise<WhatsAppAutomaticEventsAccount[]> {
    const res = await this.http.request<AutomaticEventsResponse>({
      method: "PATCH",
      path: "/api/v1/whatsapp/automatic-events",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data.accounts;
  }

  /** This profile's WhatsApp labels (live) and pipeline-stage mappings (DB). */
  async getLabels(opts: RequestOptions = {}): Promise<LabelsResponse["data"]> {
    const res = await this.http.request<LabelsResponse>({
      method: "GET",
      path: "/api/v1/whatsapp/labels",
      signal: opts.signal,
    });
    return res.data;
  }

  /** Create a WhatsApp label on this profile's WABA (Meta caps at ~20 per WABA). */
  async createLabel(
    input: CreateWhatsAppLabelInput,
    opts: MutationOptions = {},
  ): Promise<CreateWhatsAppLabelResponse["data"]> {
    const res = await this.http.request<CreateWhatsAppLabelResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/labels",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Map a pipeline stage to a WhatsApp label. Upserts on the (stage, WABA) pair. */
  async upsertLabelMapping(
    input: UpsertWhatsAppLabelMappingInput,
    opts: MutationOptions = {},
  ): Promise<UpsertWhatsAppLabelMappingResponse["data"]> {
    const res = await this.http.request<UpsertWhatsAppLabelMappingResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/label-mappings",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Remove a pipeline-stage → label mapping. */
  async deleteLabelMapping(id: string, opts: MutationOptions = {}): Promise<void> {
    await this.http.request({
      method: "DELETE",
      path: `/api/v1/whatsapp/label-mappings/${encodeURIComponent(id)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }
}

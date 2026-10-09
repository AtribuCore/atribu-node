import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type AutomaticEventsResponse =
  paths["/api/v1/whatsapp/automatic-events"]["get"]["responses"][200]["content"]["application/json"];
export type WhatsAppAutomaticEventsAccount = AutomaticEventsResponse["data"]["accounts"][number];

export type SetAutomaticEventsOptInInput = NonNullable<
  paths["/api/v1/whatsapp/automatic-events"]["patch"]["requestBody"]
>["content"]["application/json"];

type DeclaredSourcePromptResponse =
  paths["/api/v1/whatsapp/declared-source-prompt"]["get"]["responses"][200]["content"]["application/json"];
/** #1708 — the profile's WhatsApp accounts, their opt-in, and the spec a bot follows. */
export type WhatsAppDeclaredSourcePrompt = DeclaredSourcePromptResponse["data"];
export type WhatsAppDeclaredSourcePromptAccount = WhatsAppDeclaredSourcePrompt["accounts"][number];
export type WhatsAppDeclaredSourcePromptSpec = WhatsAppDeclaredSourcePrompt["spec"];
export type SetDeclaredSourcePromptInput = NonNullable<
  paths["/api/v1/whatsapp/declared-source-prompt"]["patch"]["requestBody"]
>["content"]["application/json"];

/** A partner-interpreted "how did you find us?" answer — `POST /api/v1/partner/declared-source`. */
export type RecordDeclaredSourceAnswerInput = NonNullable<
  paths["/api/v1/partner/declared-source"]["post"]["requestBody"]
>["content"]["application/json"];
type RecordDeclaredSourceAnswerResponse =
  paths["/api/v1/partner/declared-source"]["post"]["responses"][200]["content"]["application/json"];
export type DeclaredSourceAnswerRecord = RecordDeclaredSourceAnswerResponse["data"];

/** A historical click-to-message ad referral — `POST /api/v1/partner/ad-referrals`. */
export type RecordAdReferralInput = NonNullable<
  paths["/api/v1/partner/ad-referrals"]["post"]["requestBody"]
>["content"]["application/json"];
type RecordAdReferralResponse =
  paths["/api/v1/partner/ad-referrals"]["post"]["responses"][200]["content"]["application/json"];
export type AdReferralRecord = RecordAdReferralResponse["data"];
/** A batch for the read-only impact preview — `POST /api/v1/partner/ad-referrals/preview`. */
export type PreviewAdReferralsInput = NonNullable<
  paths["/api/v1/partner/ad-referrals/preview"]["post"]["requestBody"]
>["content"]["application/json"];
type PreviewAdReferralsResponse =
  paths["/api/v1/partner/ad-referrals/preview"]["post"]["responses"][200]["content"]["application/json"];
export type AdReferralImpactPreview = PreviewAdReferralsResponse["data"];

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

  /**
   * #1708 — the "how did you find us?" prompt: per-account opt-in and the
   * spec (reply ids, ready-to-send list, template variant) a bot follows.
   */
  async getDeclaredSourcePrompt(opts: RequestOptions = {}): Promise<WhatsAppDeclaredSourcePrompt> {
    const res = await this.http.request<DeclaredSourcePromptResponse>({
      method: "GET",
      path: "/api/v1/whatsapp/declared-source-prompt",
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Turn the declared-source prompt on or off. While off Atribu sends no
   * prompt and records no reply as a declared source.
   */
  async setDeclaredSourcePrompt(
    input: SetDeclaredSourcePromptInput,
    opts: MutationOptions = {},
  ): Promise<WhatsAppDeclaredSourcePrompt> {
    const res = await this.http.request<DeclaredSourcePromptResponse>({
      method: "PATCH",
      path: "/api/v1/whatsapp/declared-source-prompt",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Record the answer YOUR assistant got to "how did you find us?" in your own
   * WhatsApp conversation. Name the customer by exactly one of
   * `customer.external_ref` (your own customer id) or `customer.wa_id`. To
   * backfill a customer Atribu has never seen, send `email` and/or `phone`
   * with the `external_ref`: Atribu creates the customer from that PII and
   * binds the ref; a ref alone never creates one. Never send a national id
   * (RUT) — it is refused. Idempotent on `wamid`: retry with the same input; a
   * customer who already answered returns `status: "already_answered"` and the
   * stored answer. Requires the account's prompt opt-in
   * (`setDeclaredSourcePrompt({ enabled: true })`).
   */
  async recordDeclaredSourceAnswer(
    input: RecordDeclaredSourceAnswerInput,
    opts: RequestOptions = {},
  ): Promise<DeclaredSourceAnswerRecord> {
    const res = await this.http.request<RecordDeclaredSourceAnswerResponse>({
      method: "POST",
      path: "/api/v1/partner/declared-source",
      body: input,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Record a HISTORICAL click-to-message ad referral — the Meta ad a past
   * conversation came from, for a business moving to Atribu from another
   * bot. Becomes a touch at `occurred_at`, so a later `closed_won` /
   * `payment_received` is credited to the ad only inside the profile's
   * attribution windows. Creates no lead and never changes one. Nothing from
   * the call is sent to Meta. `ad_id` must be one of the profile's Meta ads
   * (`unknown_ad`).
   * Customer rules as `recordDeclaredSourceAnswer`; never a national id.
   * Idempotent on `idempotency_key`. Run `previewAdReferrals` first.
   */
  async recordAdReferral(input: RecordAdReferralInput, opts: RequestOptions = {}): Promise<AdReferralRecord> {
    const res = await this.http.request<RecordAdReferralResponse>({
      method: "POST",
      path: "/api/v1/partner/ad-referrals",
      body: input,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Read-only: how applying up to 500 referrals would change credit —
   * existing conversions gaining a touch, and per model how many would change
   * their credited ad. Writes nothing.
   */
  async previewAdReferrals(
    input: PreviewAdReferralsInput,
    opts: RequestOptions = {},
  ): Promise<AdReferralImpactPreview> {
    const res = await this.http.request<PreviewAdReferralsResponse>({
      method: "POST",
      path: "/api/v1/partner/ad-referrals/preview",
      body: input,
      signal: opts.signal,
    });
    return res.data;
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

import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

// ---------------------------------------------------------------------------
// Fintoc
// ---------------------------------------------------------------------------

type FintocLinkStartResponse =
  paths["/api/v1/integrations/fintoc/link/start"]["post"]["responses"][200]["content"]["application/json"];
export type FintocLinkStart = FintocLinkStartResponse["data"];

export type FintocLinkConnectInput = NonNullable<
  paths["/api/v1/integrations/fintoc/link/connect"]["post"]["requestBody"]
>["content"]["application/json"];
type FintocLinkConnectResponse =
  paths["/api/v1/integrations/fintoc/link/connect"]["post"]["responses"][200]["content"]["application/json"];
export type FintocConnectedAccount = FintocLinkConnectResponse["data"];

// ---------------------------------------------------------------------------
// GoHighLevel — outcome-mapping prefill
// ---------------------------------------------------------------------------

type GhlOutcomePrefillResponse =
  paths["/api/v1/integrations/lhg/outcomes/prefill"]["get"]["responses"][200]["content"]["application/json"];
export type GhlOutcomePrefill = GhlOutcomePrefillResponse["data"];

// #2436 (ADR 0029) — workflows that send to Meta.
type GhlWorkflowMetaChecklistResponse =
  paths["/api/v1/integrations/lhg/workflows/meta-steps"]["get"]["responses"][200]["content"]["application/json"];
export type GhlWorkflowMetaChecklist = GhlWorkflowMetaChecklistResponse["data"];
export type GhlWorkflowMetaLocation = GhlWorkflowMetaChecklist["locations"][number];

// #2519 — Conversion Sync «Automatizaciones de GoHighLevel»: scan, apply, restore.
type GhlAutomationsResponse =
  paths["/api/v1/integrations/lhg/workflows/automations"]["get"]["responses"][200]["content"]["application/json"];
export type GhlAutomations = GhlAutomationsResponse["data"];
export type GhlAutomationLocation = GhlAutomations["locations"][number];
export type GhlAutomationWorkflow = GhlAutomationLocation["workflows"][number];
export type GhlAutomationChange = GhlAutomationLocation["changes"][number];
export type GhlAutomationScanInput = NonNullable<
  paths["/api/v1/integrations/lhg/workflows/automations/scan"]["post"]["requestBody"]
>["content"]["application/json"];
export type GhlAutomationApplyInput = NonNullable<
  paths["/api/v1/integrations/lhg/workflows/automations/apply"]["post"]["requestBody"]
>["content"]["application/json"];
type GhlAutomationApplyResponse =
  paths["/api/v1/integrations/lhg/workflows/automations/apply"]["post"]["responses"][200]["content"]["application/json"];
export type GhlAutomationApply = GhlAutomationApplyResponse["data"];
export type GhlAutomationRestoreInput = NonNullable<
  paths["/api/v1/integrations/lhg/workflows/automations/restore"]["post"]["requestBody"]
>["content"]["application/json"];
type GhlAutomationRestoreResponse =
  paths["/api/v1/integrations/lhg/workflows/automations/restore"]["post"]["responses"][200]["content"]["application/json"];
export type GhlAutomationRestore = GhlAutomationRestoreResponse["data"];

// #2517 — funnel pages missing the Atribu tracker.
type GhlFunnelTrackerChecksResponse =
  paths["/api/v1/integrations/lhg/funnels/tracker-checks"]["get"]["responses"][200]["content"]["application/json"];
export type GhlFunnelTrackerChecks = GhlFunnelTrackerChecksResponse["data"];
export type GhlFunnelTrackerLocation = GhlFunnelTrackerChecks["locations"][number];
export type GhlFunnelTrackerRecheckBody = NonNullable<
  paths["/api/v1/integrations/lhg/funnels/tracker-checks/recheck"]["post"]["requestBody"]
>["content"]["application/json"];

// #2564 — click-to-WhatsApp ad referrals in GoHighLevel conversations.
type GhlCtwaDetectionsResponse =
  paths["/api/v1/integrations/lhg/conversations/ctwa-detections"]["get"]["responses"][200]["content"]["application/json"];
export type GhlCtwaDetections = GhlCtwaDetectionsResponse["data"];
type GhlCtwaScanResponse =
  paths["/api/v1/integrations/lhg/conversations/ctwa-detections/scan"]["post"]["responses"][200]["content"]["application/json"];
export type GhlCtwaScan = GhlCtwaScanResponse["data"];
export type GhlCtwaScanBody = NonNullable<
  paths["/api/v1/integrations/lhg/conversations/ctwa-detections/scan"]["post"]["requestBody"]
>["content"]["application/json"];

// #2518 — GoHighLevel bookings -> Dentalink citas through Vitrina.
type GhlDentalinkGetResponse =
  paths["/api/v1/integrations/lhg/dentalink"]["get"]["responses"][200]["content"]["application/json"];
export type GhlDentalinkSettings = GhlDentalinkGetResponse["data"];
export type GhlDentalinkCalendar = GhlDentalinkSettings["calendars"][number];
export type GhlDentalinkBooking = GhlDentalinkSettings["bookings"][number];
export type SaveGhlDentalinkSettingsInput = NonNullable<
  paths["/api/v1/integrations/lhg/dentalink"]["put"]["requestBody"]
>["content"]["application/json"];
type GhlDentalinkPutResponse =
  paths["/api/v1/integrations/lhg/dentalink"]["put"]["responses"][200]["content"]["application/json"];
type GhlDentalinkDeleteResponse =
  paths["/api/v1/integrations/lhg/dentalink"]["delete"]["responses"][200]["content"]["application/json"];

// ---------------------------------------------------------------------------
// ManyChat
// ---------------------------------------------------------------------------

type ManyChatConnectionGetResponse =
  paths["/api/v1/integrations/manychat/connection"]["get"]["responses"][200]["content"]["application/json"];
export type ManyChatConnection = NonNullable<ManyChatConnectionGetResponse["data"]["connection"]>;

export type UpsertManyChatConnectionInput = NonNullable<
  paths["/api/v1/integrations/manychat/connection"]["post"]["requestBody"]
>["content"]["application/json"];
type ManyChatConnectionPostResponse =
  paths["/api/v1/integrations/manychat/connection"]["post"]["responses"][200]["content"]["application/json"];
export type UpsertedManyChatConnection = ManyChatConnectionPostResponse["data"]["connection"];

type ManyChatSecretRotateResponse =
  paths["/api/v1/integrations/manychat/connection/rotate-secret"]["post"]["responses"][200]["content"]["application/json"];
export type RotatedManyChatSecret = ManyChatSecretRotateResponse["data"]["connection"];

// ---------------------------------------------------------------------------
// Meta Pages
// ---------------------------------------------------------------------------

type MetaPagesGetResponse =
  paths["/api/v1/integrations/meta/pages"]["get"]["responses"][200]["content"]["application/json"];
export type MetaPageRow = MetaPagesGetResponse["data"]["pages"][number];

type MetaPagesAvailableResponse =
  paths["/api/v1/integrations/meta/pages/available"]["get"]["responses"][200]["content"]["application/json"];
export type AvailableMetaPages = MetaPagesAvailableResponse["data"];
export type AvailableMetaPage = AvailableMetaPages["pages"][number];

export type SaveMetaPagesInput = NonNullable<
  paths["/api/v1/integrations/meta/pages"]["post"]["requestBody"]
>["content"]["application/json"];
type MetaPagesPostResponse =
  paths["/api/v1/integrations/meta/pages"]["post"]["responses"][200]["content"]["application/json"];
export type SaveMetaPagesResult = MetaPagesPostResponse["data"];

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/**
 * The "Settings → Integrations" connection surface (#489) — Fintoc,
 * GoHighLevel's outcome-mapping prefill, ManyChat, and Meta Pages. Four
 * unrelated providers under one namespace because each is a small,
 * settings-panel-only surface with no other natural home; see
 * `services/api/src/dal/integration-connections.ts`'s header for the same
 * reasoning on the server side.
 *
 * Every method here requires a PERSON principal — a signed-in session or an
 * MCP user token, never a bare API key.
 */
export class IntegrationConnectionsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Mint a one-shot Fintoc Link Intent for the widget. Nothing is persisted. */
  async fintocLinkStart(opts: MutationOptions = {}): Promise<FintocLinkStart> {
    const res = await this.http.request<FintocLinkStartResponse>({
      method: "POST",
      path: "/api/v1/integrations/fintoc/link/start",
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Exchange the widget's `exchange_token` and persist the connection. */
  async fintocLinkConnect(
    input: FintocLinkConnectInput,
    opts: MutationOptions = {},
  ): Promise<FintocConnectedAccount> {
    const res = await this.http.request<FintocLinkConnectResponse>({
      method: "POST",
      path: "/api/v1/integrations/fintoc/link/connect",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Suggest outcome-event mappings from GoHighLevel's pipeline stages —
   * one live provider round trip per connected location, run in parallel.
   */
  async ghlOutcomePrefill(opts: RequestOptions = {}): Promise<GhlOutcomePrefill> {
    const res = await this.http.request<GhlOutcomePrefillResponse>({
      method: "GET",
      path: "/api/v1/integrations/lhg/outcomes/prefill",
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Per connected GoHighLevel location, the workflows holding a step that
   * sends to Meta (#2436). Read-only against GoHighLevel; a location without
   * the workflow scopes reads `needs_reconnect`, one HighLevel has not enabled
   * reads `pending_enablement`.
   */
  async ghlWorkflowMetaSteps(opts: RequestOptions = {}): Promise<GhlWorkflowMetaChecklist> {
    const res = await this.http.request<GhlWorkflowMetaChecklistResponse>({
      method: "GET",
      path: "/api/v1/integrations/lhg/workflows/meta-steps",
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * GoHighLevel bookings -> Dentalink citas through Vitrina (#2518): each
   * calendar with the professional it books, the clinic's Dentalink
   * professionals, and the recent bookings with their state.
   */
  async ghlDentalinkSettings(opts: RequestOptions = {}): Promise<GhlDentalinkSettings> {
    const res = await this.http.request<GhlDentalinkGetResponse>({
      method: "GET",
      path: "/api/v1/integrations/lhg/dentalink",
      signal: opts.signal,
    });
    return res.data;
  }

  /** Save the Vitrina key (validated against Vitrina) and replace the calendar mapping (#2518). */
  async saveGhlDentalinkSettings(
    input: SaveGhlDentalinkSettingsInput,
    opts: MutationOptions = {},
  ): Promise<GhlDentalinkSettings> {
    const res = await this.http.request<GhlDentalinkPutResponse>({
      method: "PUT",
      path: "/api/v1/integrations/lhg/dentalink",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Remove the Vitrina key: the Profile stops booking GoHighLevel appointments in Dentalink (#2518). */
  async disableGhlDentalink(opts: MutationOptions = {}): Promise<{ disabled: true }> {
    const res = await this.http.request<GhlDentalinkDeleteResponse>({
      method: "DELETE",
      path: "/api/v1/integrations/lhg/dentalink",
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Per connected GoHighLevel location, each published funnel page's stored
   * tracker check (#2517). No GoHighLevel call; {@link ghlFunnelTrackerRecheck} runs it.
   */
  async ghlFunnelTrackerChecks(opts: RequestOptions = {}): Promise<GhlFunnelTrackerChecks> {
    const res = await this.http.request<GhlFunnelTrackerChecksResponse>({
      method: "GET",
      path: "/api/v1/integrations/lhg/funnels/tracker-checks",
      signal: opts.signal,
    });
    return res.data;
  }

  /** Re-check the funnel pages (one funnel, one location, or all) and return the stored result. */
  async ghlFunnelTrackerRecheck(
    body: GhlFunnelTrackerRecheckBody = {},
    opts: RequestOptions = {},
  ): Promise<GhlFunnelTrackerChecks> {
    const res = await this.http.request<GhlFunnelTrackerChecksResponse>({
      method: "POST",
      path: "/api/v1/integrations/lhg/funnels/tracker-checks/recheck",
      body,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * #2519 — this Profile's GoHighLevel workflows, from Atribu's cached scan
   * (no GoHighLevel call): published workflows sorted into
   * `native_meta_capi` / `event_relay` / `ok`, each flagged one with its steps
   * before → after, plus every workflow Atribu changed (restorable).
   */
  async ghlWorkflowAutomations(opts: RequestOptions = {}): Promise<GhlAutomations> {
    const res = await this.http.request<GhlAutomationsResponse>({
      method: "GET",
      path: "/api/v1/integrations/lhg/workflows/automations",
      signal: opts.signal,
    });
    return res.data;
  }

  /** #2519 — read every location again and cache it. Read-only against GoHighLevel. */
  async ghlWorkflowAutomationsScan(input: GhlAutomationScanInput = {}, opts: RequestOptions = {}): Promise<GhlAutomations> {
    const res = await this.http.request<GhlAutomationsResponse>({
      method: "POST",
      path: "/api/v1/integrations/lhg/workflows/automations/scan",
      body: input,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * #2519 — apply the proposal (unpublish, or remove the event-sending steps).
   * A workspace owner or admin acting as a person; per-workflow results.
   */
  async ghlWorkflowAutomationsApply(input: GhlAutomationApplyInput = {}, opts: RequestOptions = {}): Promise<GhlAutomationApply> {
    const res = await this.http.request<GhlAutomationApplyResponse>({
      method: "POST",
      path: "/api/v1/integrations/lhg/workflows/automations/apply",
      body: input,
      signal: opts.signal,
    });
    return res.data;
  }

  /** #2519 — put one workflow Atribu changed back to its backed-up definition and status. Idempotent. */
  async ghlWorkflowAutomationsRestore(input: GhlAutomationRestoreInput, opts: RequestOptions = {}): Promise<GhlAutomationRestore> {
    const res = await this.http.request<GhlAutomationRestoreResponse>({
      method: "POST",
      path: "/api/v1/integrations/lhg/workflows/automations/restore",
      body: input,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Click-to-WhatsApp ad referrals found in GoHighLevel conversation messages
   * (#2564), and each location's conversation-scope state. No GoHighLevel call.
   */
  async ghlCtwaDetections(opts: RequestOptions = {}): Promise<GhlCtwaDetections> {
    const res = await this.http.request<GhlCtwaDetectionsResponse>({
      method: "GET",
      path: "/api/v1/integrations/lhg/conversations/ctwa-detections",
      signal: opts.signal,
    });
    return res.data;
  }

  /** One bounded slice of the conversation scan; continue with `scan.next_cursor` until null. */
  async ghlCtwaScan(body: GhlCtwaScanBody = {}, opts: RequestOptions = {}): Promise<GhlCtwaScan> {
    const res = await this.http.request<GhlCtwaScanResponse>({
      method: "POST",
      path: "/api/v1/integrations/lhg/conversations/ctwa-detections/scan",
      body,
      signal: opts.signal,
    });
    return res.data;
  }

  /** `revealSecret: true` includes the webhook secret — omitted by default. */
  async manychatGetConnection(
    opts: RequestOptions & { revealSecret?: boolean } = {},
  ): Promise<ManyChatConnection | null> {
    const res = await this.http.request<ManyChatConnectionGetResponse>({
      method: "GET",
      path: `/api/v1/integrations/manychat/connection${opts.revealSecret ? "?reveal_secret=1" : ""}`,
      signal: opts.signal,
    });
    return res.data.connection;
  }

  /** Create (or update) the ManyChat connection. Mints fresh secrets on first connect. */
  async manychatUpsertConnection(
    input: UpsertManyChatConnectionInput,
    opts: MutationOptions = {},
  ): Promise<UpsertedManyChatConnection> {
    const res = await this.http.request<ManyChatConnectionPostResponse>({
      method: "POST",
      path: "/api/v1/integrations/manychat/connection",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data.connection;
  }

  /**
   * Regenerate the ManyChat webhook secret (the `Authorization: Bearer` value
   * of every External Request). The old one stops working at once.
   */
  async manychatRotateSecret(opts: MutationOptions = {}): Promise<RotatedManyChatSecret> {
    const res = await this.http.request<ManyChatSecretRotateResponse>({
      method: "POST",
      path: "/api/v1/integrations/manychat/connection/rotate-secret",
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data.connection;
  }

  /** The currently SAVED tracked Pages (from `meta_page_connections`), not the live Meta list. */
  async metaPagesList(opts: RequestOptions = {}): Promise<MetaPageRow[]> {
    const res = await this.http.request<MetaPagesGetResponse>({
      method: "GET",
      path: "/api/v1/integrations/meta/pages",
      signal: opts.signal,
    });
    return res.data.pages;
  }

  /**
   * The Pages the connected Meta account can see right now, each marked
   * `connected` when already tracked. `needs_reconsent: true` (empty list) means
   * the Meta grant lacks the Page permissions: restart the Meta Ads connect hand-off.
   */
  async metaPagesAvailable(opts: RequestOptions = {}): Promise<AvailableMetaPages> {
    const res = await this.http.request<MetaPagesAvailableResponse>({
      method: "GET",
      path: "/api/v1/integrations/meta/pages/available",
      signal: opts.signal,
    });
    return res.data;
  }

  /** Reconcile tracked Pages to the requested set; ids left out are disabled, not deleted. */
  async metaPagesSave(
    input: SaveMetaPagesInput,
    opts: MutationOptions = {},
  ): Promise<SaveMetaPagesResult> {
    const res = await this.http.request<MetaPagesPostResponse>({
      method: "POST",
      path: "/api/v1/integrations/meta/pages",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

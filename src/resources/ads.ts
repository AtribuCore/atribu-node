/**
 * Ad-level reads (#590, extended by #641) — the surface that sits AROUND the
 * ads ranking (`analytics.campaigns({ level })`).
 *
 * Request and response types are indexed straight out of the generated OpenAPI
 * `paths`, never restated by hand, so a contract change lands as a compile error
 * rather than a runtime surprise. `test/route-coverage.test.ts` holds the
 * methods and the route manifest in step.
 *
 * `id` IS ALWAYS THE PLATFORM ID — the provider's own campaign/ad-set/ad id, the
 * `platform_id` on every `analytics.campaigns({ level })` row. Atribu's internal
 * `ad_entity_dim` uuid is not a public identifier.
 *
 * Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

export type AdCreativeAnalysisResponse =
  paths["/api/v1/ads/{id}/creative-analysis"]["get"]["responses"][200]["content"]["application/json"];

/**
 * The receipt from queueing an analysis (#533).
 *
 * Indexed off the 202 — the 200 (an idempotent reuse) carries the identical
 * schema, so one type serves both and a caller never has to branch on status to
 * read the body.
 */
export type AdCreativeAnalysisJobResponse =
  paths["/api/v1/ads/{id}/creative-analysis"]["post"]["responses"][202]["content"]["application/json"];

/** #2570 — the body of a Label Override change: `{ labels: { hook_type: "listicle", cta_type: null } }`. */
export type AdCreativeLabelsUpdateInput = NonNullable<
  paths["/api/v1/ads/{id}/creative-analysis"]["patch"]["requestBody"]
>["content"]["application/json"];

/** One Creative Label as the analysis read publishes it. */
export type AdCreativeLabel = AdCreativeAnalysisResponse["data"]["labels"]["hook_type"];

type AdsLevelCountsQuery = paths["/api/v1/ads/level-counts"]["get"]["parameters"]["query"];
export type AdsLevelCountsResponse =
  paths["/api/v1/ads/level-counts"]["get"]["responses"][200]["content"]["application/json"];
export type AdsLevelCountsOptions = AdsLevelCountsQuery & ReadExtras;

type AdsBudgetPacingQuery = paths["/api/v1/ads/budget-pacing"]["get"]["parameters"]["query"];
export type AdsBudgetPacingResponse =
  paths["/api/v1/ads/budget-pacing"]["get"]["responses"][200]["content"]["application/json"];
export type AdsBudgetPacingOptions = AdsBudgetPacingQuery & ReadExtras;

export type GoalStepResponse =
  paths["/api/v1/goal-step"]["get"]["responses"][200]["content"]["application/json"];

export type PeerBenchmarksResponse =
  paths["/api/v1/peer-benchmarks"]["get"]["responses"][200]["content"]["application/json"];

export type AdsSignalsResponse =
  paths["/api/v1/ads/signals"]["get"]["responses"][200]["content"]["application/json"];

type AdsTrendQuery = paths["/api/v1/ads/trend"]["get"]["parameters"]["query"];
export type AdsTrendResponse =
  paths["/api/v1/ads/trend"]["get"]["responses"][200]["content"]["application/json"];
export type AdsTrendOptions = AdsTrendQuery & ReadExtras;

type AdsMetaReportedSkoolJoinsQuery =
  paths["/api/v1/ads/meta-reported-skool-joins"]["get"]["parameters"]["query"];
export type AdsMetaReportedSkoolJoinsResponse =
  paths["/api/v1/ads/meta-reported-skool-joins"]["get"]["responses"][200]["content"]["application/json"];
export type AdsMetaReportedSkoolJoinsOptions = AdsMetaReportedSkoolJoinsQuery & ReadExtras;

type AdsFunnelQuery = paths["/api/v1/ads/funnel"]["get"]["parameters"]["query"];
export type AdsFunnelResponse =
  paths["/api/v1/ads/funnel"]["get"]["responses"][200]["content"]["application/json"];
export type AdsFunnelOptions = AdsFunnelQuery & ReadExtras;

type AdsFunnelStepsPath = paths["/api/v1/ads/funnel/steps"];
export type AdsFunnelStepsResponse = AdsFunnelStepsPath["get"]["responses"][200]["content"]["application/json"];
export type AdsFunnelStepsInput = NonNullable<AdsFunnelStepsPath["put"]["requestBody"]>["content"]["application/json"];

type AdAnglesPath = paths["/api/v1/ads/angles"];
export type AdAnglesResponse = AdAnglesPath["get"]["responses"][200]["content"]["application/json"];
export type AdAngleCreateInput = NonNullable<AdAnglesPath["post"]["requestBody"]>["content"]["application/json"];
export type AdAngleRenameInput = NonNullable<
  paths["/api/v1/ads/angles/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
export type AdAngleMergeInput = NonNullable<
  paths["/api/v1/ads/angles/{id}/merge"]["post"]["requestBody"]
>["content"]["application/json"];
export type AdAngleMoveInput = NonNullable<
  paths["/api/v1/ads/angles/{id}/ads"]["post"]["requestBody"]
>["content"]["application/json"];

type AdTrendQuery = paths["/api/v1/ads/{id}/trend"]["get"]["parameters"]["query"];
export type AdTrendResponse =
  paths["/api/v1/ads/{id}/trend"]["get"]["responses"][200]["content"]["application/json"];
export type AdTrendOptions = AdTrendQuery & ReadExtras;

type AdDetailQuery = paths["/api/v1/ads/{id}"]["get"]["parameters"]["query"];
export type AdDetailResponse =
  paths["/api/v1/ads/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type AdDetailOptions = AdDetailQuery & ReadExtras;

type AdPlacementsQuery = paths["/api/v1/ads/{id}/placements"]["get"]["parameters"]["query"];
export type AdPlacementsResponse =
  paths["/api/v1/ads/{id}/placements"]["get"]["responses"][200]["content"]["application/json"];
export type AdPlacementsOptions = AdPlacementsQuery & ReadExtras;

// ---------------------------------------------------------------------------
// #489 — the AI console operations, folded off the internal console routes.
//
// FOUR of the six spend the workspace's AI allowance; the two here that do
// (`analyze`, `generateCreativeVariants`) say so on the method. `creativeReview`
// and `videoSource` are free reads.
// ---------------------------------------------------------------------------

export type AdAnalysisInput =
  paths["/api/v1/ads/{id}/analysis"]["post"]["requestBody"]["content"]["application/json"];
export type AdAnalysisResponse =
  paths["/api/v1/ads/{id}/analysis"]["post"]["responses"][200]["content"]["application/json"];

type AdCreativeReviewQuery =
  paths["/api/v1/ads/{id}/creative-review"]["get"]["parameters"]["query"];
export type AdCreativeReviewResponse =
  paths["/api/v1/ads/{id}/creative-review"]["get"]["responses"][200]["content"]["application/json"];
export type AdCreativeReviewOptions = AdCreativeReviewQuery & ReadExtras;

export type CreativeVariantsInput = NonNullable<
  paths["/api/v1/ads/{id}/creative-review/variants"]["post"]["requestBody"]
>["content"]["application/json"];
export type CreativeVariantsResponse =
  paths["/api/v1/ads/{id}/creative-review/variants"]["post"]["responses"][200]["content"]["application/json"];

export type CreativeVariantsPublishInput =
  paths["/api/v1/ads/{id}/creative-review/publish"]["post"]["requestBody"]["content"]["application/json"];
export type CreativeVariantsPublishResponse =
  paths["/api/v1/ads/{id}/creative-review/publish"]["post"]["responses"][201]["content"]["application/json"];

export type AdVideoSourceResponse =
  paths["/api/v1/ads/videos/{video_id}"]["get"]["responses"][200]["content"]["application/json"];

// The Vitrina Ads contract §12 (asks B/C) — key-callable ad-object writes.
export type AdStatusChangeInput = NonNullable<
  paths["/api/v1/ads/{id}/pause"]["post"]["requestBody"]
>["content"]["application/json"];
export type AdStatusChangeResponse =
  paths["/api/v1/ads/{id}/pause"]["post"]["responses"][200]["content"]["application/json"];
export type AdSetBudgetInput = NonNullable<
  paths["/api/v1/adsets/{id}/budget"]["post"]["requestBody"]
>["content"]["application/json"];
export type AdSetBudgetResponse =
  paths["/api/v1/adsets/{id}/budget"]["post"]["responses"][200]["content"]["application/json"];

export class AdsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * The stored creative analysis for one ad — hook, format, copy features and
   * the method that produced them. `id` is the ad's platform id. 404 when the
   * analysis pass has not run for that ad.
   */
  async creativeAnalysis(
    id: string,
    options: ReadExtras = {},
  ): Promise<AdCreativeAnalysisResponse> {
    return this.http.request<AdCreativeAnalysisResponse>({
      method: "GET",
      path: `/api/v1/ads/${encodeURIComponent(id)}/creative-analysis`,
      signal: options.signal,
    });
  }

  /**
   * Queue an on-demand analysis of the same ad's creative (#533).
   *
   * Returns a receipt, not an analysis: the model call happens in the
   * background, and {@link creativeAnalysis} on the same id is where the result
   * appears. Counts against the workspace's daily creative-analysis allowance,
   * so it is also capped per profile and per API key per
   * UTC day and needs the `creatives:write` scope, which is not granted by
   * default.
   *
   * IDEMPOTENT FOR 24 HOURS on the ad's creative (name, headline, body, video,
   * thumbnail): an unchanged creative returns the same job with `reused: true`
   * and consumes no budget. `data.budget` says what is left; `data.previous_attempt`
   * is how a `failed` or `blocked` earlier run surfaces, since neither is reused.
   */
  async requestCreativeAnalysis(
    id: string,
    options: ReadExtras = {},
  ): Promise<AdCreativeAnalysisJobResponse> {
    return this.http.request<AdCreativeAnalysisJobResponse>({
      method: "POST",
      path: `/api/v1/ads/${encodeURIComponent(id)}/creative-analysis`,
      signal: options.signal,
    });
  }

  /**
   * Change one or more of the ad's Creative Labels (#2570). Each change is a
   * Label Override — recorded with who made it and when, kept across every
   * re-analysis, and the value every report uses. `null` clears one. Runs no
   * model. Answers the analysis as {@link creativeAnalysis} would afterwards.
   * Needs `creatives:label` (every signed-in member with profile access).
   */
  async updateCreativeLabels(
    id: string,
    input: AdCreativeLabelsUpdateInput,
    options: WriteExtras = {},
  ): Promise<AdCreativeAnalysisResponse> {
    return this.http.request<AdCreativeAnalysisResponse>({
      method: "PATCH",
      path: `/api/v1/ads/${encodeURIComponent(id)}/creative-analysis`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * How many campaigns, ad sets and ads had delivery in the window — the
   * cheapest way to find out whether a level is worth asking
   * `analytics.campaigns({ level })` for.
   */
  async levelCounts(options: AdsLevelCountsOptions): Promise<AdsLevelCountsResponse> {
    const { signal, ...query } = options;
    return this.http.request<AdsLevelCountsResponse>({
      method: "GET",
      path: "/api/v1/ads/level-counts",
      query,
      signal,
    });
  }

  /**
   * Each Meta budget holder's budget against its spend in the window, with a
   * pacing state (`under` / `on_track` / `over`). The holder is the ad set, or
   * the campaign for a CBO budget. Money is native to the ad account.
   */
  async budgetPacing(options: AdsBudgetPacingOptions): Promise<AdsBudgetPacingResponse> {
    const { signal, ...query } = options;
    return this.http.request<AdsBudgetPacingResponse>({
      method: "GET",
      path: "/api/v1/ads/budget-pacing",
      query,
      signal,
    });
  }

  /**
   * The Funnel Step this profile's ads are ranked and judged by (ADR 0032):
   * `booking` when the profile averaged >= 20 Bookings a week over the trailing
   * 4 weeks (up immediately, down only after 4 consecutive weeks below), else
   * `lead` — with the weekly Booking average it was decided on and its history.
   */
  async goalStep(options: ReadExtras = {}): Promise<GoalStepResponse> {
    const { signal } = options;
    return this.http.request<GoalStepResponse>({
      method: "GET",
      path: "/api/v1/goal-step",
      signal,
    });
  }

  /**
   * #2593 — where this profile's cost per Lead, cost per Booking and CTR over
   * the trailing 28 days sit among profiles of the same confirmed vertical
   * across Atribu: the quarter (`band`) and the group size, nothing about any
   * other profile. `band` and `peer_count` are `null` below the minimum group
   * (5 profiles from 3 workspaces) — withheld, never zero.
   */
  async peerBenchmarks(options: ReadExtras = {}): Promise<PeerBenchmarksResponse> {
    const { signal } = options;
    return this.http.request<PeerBenchmarksResponse>({
      method: "GET",
      path: "/api/v1/peer-benchmarks",
      signal,
    });
  }

  /**
   * How much conversion sync is switched on for this profile: enabled signal
   * rules, the pipeline-stage subset, and the enabled export destinations per ad
   * platform. Configuration, so it takes no date range.
   */
  async signals(options: ReadExtras = {}): Promise<AdsSignalsResponse> {
    return this.http.request<AdsSignalsResponse>({
      method: "GET",
      path: "/api/v1/ads/signals",
      signal: options.signal,
    });
  }

  /**
   * Daily delivery (spend / impressions / clicks) for MANY entities in one
   * request — what a ranking table with a sparkline per row needs. Restrict it
   * with `ids` (comma-separated platform ids, ≤1000); omit `ids` for every
   * entity at `level`.
   *
   * No attributed revenue per day, on purpose: a model's credit is assigned over
   * a window, so a daily series of it does not sum to the period figure.
   */
  async trend(options: AdsTrendOptions): Promise<AdsTrendResponse> {
    const { signal, ...query } = options;
    return this.http.request<AdsTrendResponse>({
      method: "GET",
      path: "/api/v1/ads/trend",
      query,
      signal,
    });
  }

  /**
   * META'S own count of Skool membership requests per entity (#2063) — what
   * Skool's built-in Meta pixel reported. Platform-reported: never part of an
   * attributed figure. Only measured entities are listed; `level` defaults to
   * `ad`, `ids` (comma-separated, ≤1000) restricts the answer.
   */
  async metaReportedSkoolJoins(
    options: AdsMetaReportedSkoolJoinsOptions,
  ): Promise<AdsMetaReportedSkoolJoinsResponse> {
    const { signal, ...query } = options;
    return this.http.request<AdsMetaReportedSkoolJoinsResponse>({
      method: "GET",
      path: "/api/v1/ads/meta-reported-skool-joins",
      query,
      signal,
    });
  }

  /**
   * The Funnel per campaign, ad set or ad (#2297): per step, people who
   * Reached it, step rate, Drop-off and cost per step. Each person is credited
   * to their Entry Ad (the ad that brought them), not to an attribution model.
   * `level` defaults to `campaign`; `ids` (comma-separated, ≤1000) narrows it
   * and drops the «Sin anuncio» group.
   */
  async funnel(options: AdsFunnelOptions): Promise<AdsFunnelResponse> {
    const { signal, ...query } = options;
    return this.http.request<AdsFunnelResponse>({
      method: "GET",
      path: "/api/v1/ads/funnel",
      query,
      signal,
    });
  }

  /**
   * «Editar pasos» (#2298): the profile's Funnel steps: the chain in force
   * (`steps`, `chain_source` saved or default), the default (`suggested`) and
   * what can be added (`available`).
   */
  async funnelSteps(options: ReadExtras = {}): Promise<AdsFunnelStepsResponse> {
    return this.http.request<AdsFunnelStepsResponse>({
      method: "GET",
      path: "/api/v1/ads/funnel/steps",
      signal: options.signal,
    });
  }

  /** Saves the profile's own ordered Funnel chain; every Funnel surface counts it from then on. */
  async saveFunnelSteps(input: AdsFunnelStepsInput, options: WriteExtras = {}): Promise<AdsFunnelStepsResponse> {
    return this.http.request<AdsFunnelStepsResponse>({
      method: "PUT",
      path: "/api/v1/ads/funnel/steps",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** «Restaurar sugeridos»: forget the saved chain and go back to the default one. */
  async restoreFunnelSteps(options: WriteExtras = {}): Promise<AdsFunnelStepsResponse> {
    return this.http.request<AdsFunnelStepsResponse>({
      method: "DELETE",
      path: "/api/v1/ads/funnel/steps",
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Angles (#2300): the profile's ads grouped by the idea they pitch, the ads
   * in each, and the analysed ads waiting for one. The Funnel per Angle is
   * `funnel({ level: "angle", … })`.
   */
  async angles(options: ReadExtras = {}): Promise<AdAnglesResponse> {
    return this.http.request<AdAnglesResponse>({ method: "GET", path: "/api/v1/ads/angles", signal: options.signal });
  }

  /** A new Angle the user names, with the given ads moved into it. */
  async createAngle(input: AdAngleCreateInput, options: WriteExtras = {}): Promise<AdAnglesResponse> {
    return this.http.request<AdAnglesResponse>({
      method: "POST",
      path: "/api/v1/ads/angles",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Renames an Angle; the AI never renames it afterwards. */
  async renameAngle(id: string, input: AdAngleRenameInput, options: WriteExtras = {}): Promise<AdAnglesResponse> {
    return this.http.request<AdAnglesResponse>({
      method: "PATCH",
      path: `/api/v1/ads/angles/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Merges Angle `id` into `input.into_angle_id`. */
  async mergeAngle(id: string, input: AdAngleMergeInput, options: WriteExtras = {}): Promise<AdAnglesResponse> {
    return this.http.request<AdAnglesResponse>({
      method: "POST",
      path: `/api/v1/ads/angles/${encodeURIComponent(id)}/merge`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Moves ads into Angle `id`; a re-cluster never moves them back. */
  async moveToAngle(id: string, input: AdAngleMoveInput, options: WriteExtras = {}): Promise<AdAnglesResponse> {
    return this.http.request<AdAnglesResponse>({
      method: "POST",
      path: `/api/v1/ads/angles/${encodeURIComponent(id)}/ads`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** The same series for a single entity. `level` defaults to `ad`. */
  async entityTrend(id: string, options: AdTrendOptions): Promise<AdTrendResponse> {
    const { signal, ...query } = options;
    return this.http.request<AdTrendResponse>({
      method: "GET",
      path: `/api/v1/ads/${encodeURIComponent(id)}/trend`,
      query,
      signal,
    });
  }

  /**
   * One campaign, ad set or ad in full — a superset of the row
   * `analytics.campaigns({ level })` returns, with the first-payment pair, the
   * creative copy and the video + messaging funnels.
   *
   * `level` is optional; it is resolved from the profile's own ad dimension and
   * is only needed when one external id exists at more than one level.
   */
  async get(id: string, options: AdDetailOptions): Promise<AdDetailResponse> {
    const { signal, ...query } = options;
    return this.http.request<AdDetailResponse>({
      method: "GET",
      path: `/api/v1/ads/${encodeURIComponent(id)}`,
      query,
      signal,
    });
  }

  /**
   * One ad's delivery split by (publisher platform × position) — Reels vs Feed
   * vs Stories — with the CTR and CPC of each. Empty for a campaign or ad-set
   * id: placement is a property of a delivered ad.
   */
  async placements(id: string, options: AdPlacementsOptions): Promise<AdPlacementsResponse> {
    const { signal, ...query } = options;
    return this.http.request<AdPlacementsResponse>({
      method: "GET",
      path: `/api/v1/ads/${encodeURIComponent(id)}/placements`,
      query,
      signal,
    });
  }

  /**
   * A live, model-written analysis of how one entity is PERFORMING.
   *
   * SPENDS the workspace's AI allowance — every call runs a model, and nothing
   * is stored, so asking twice costs twice. `include_video: true` runs a
   * frontier multimodal model over the ad's video and is the most expensive
   * single operation on this API. Needs `creatives:write`, which no connect
   * scope mints.
   *
   * NOT {@link creativeAnalysis}, which serves the stored fingerprint of what
   * the creative SAYS. This one is about what the numbers DID.
   *
   * A requested video analysis that could not run does not fail the call:
   * `data.video_status.message` says why, and the copy analysis comes back
   * either way.
   */
  async analyze(
    id: string,
    input: AdAnalysisInput,
    options: ReadExtras = {},
  ): Promise<AdAnalysisResponse> {
    return this.http.request<AdAnalysisResponse>({
      method: "POST",
      path: `/api/v1/ads/${encodeURIComponent(id)}/analysis`,
      body: input,
      signal: options.signal,
    });
  }

  /**
   * One ad's current creative beside the performance it earned — the input a
   * rewrite is judged against. A free warehouse read: no model, no charge.
   *
   * Omit the dates for LIFETIME figures (what the console's review screen
   * shows); pass them to make the numbers agree with a dashboard window.
   */
  async creativeReview(
    id: string,
    options: AdCreativeReviewOptions = {},
  ): Promise<AdCreativeReviewResponse> {
    const { signal, ...query } = options;
    return this.http.request<AdCreativeReviewResponse>({
      method: "GET",
      path: `/api/v1/ads/${encodeURIComponent(id)}/creative-review`,
      query,
      signal,
    });
  }

  /**
   * Fresh copy variants for one ad, grounded in its creative and its measured
   * performance. SPENDS the workspace's AI allowance — one model call per
   * variant. Needs `creatives:write`.
   *
   * `data.used_ai === false` means the deployment has no AI provider (or the
   * model returned nothing usable) and DETERMINISTIC fallback variants came
   * back. That is a 200: the flow is preserved and the caller is told which it
   * got. Nothing is persisted — see {@link publishCreativeVariants}.
   */
  async generateCreativeVariants(
    id: string,
    input: CreativeVariantsInput = {},
    options: ReadExtras = {},
  ): Promise<CreativeVariantsResponse> {
    return this.http.request<CreativeVariantsResponse>({
      method: "POST",
      path: `/api/v1/ads/${encodeURIComponent(id)}/creative-review/variants`,
      body: input,
      signal: options.signal,
    });
  }

  /**
   * Save a chosen set of variants so they survive the page. No model, no
   * charge.
   *
   * Requires a USER credential: the saved record is attributed to a person, and
   * an API key answers 403 rather than having one invented for it.
   */
  async publishCreativeVariants(
    id: string,
    input: CreativeVariantsPublishInput,
    options: ReadExtras = {},
  ): Promise<CreativeVariantsPublishResponse> {
    return this.http.request<CreativeVariantsPublishResponse>({
      method: "POST",
      path: `/api/v1/ads/${encodeURIComponent(id)}/creative-review/publish`,
      body: input,
      signal: options.signal,
    });
  }

  /**
   * A playable URL for one Meta ad video. `videoId` is Meta's own id, carried
   * on the ad row — NOT an Atribu id.
   *
   * `data.type === "embed"` is common rather than an error: Meta only returns a
   * direct CDN source for a page-owned video when a Page access token exists,
   * which requires the Page to be connected in Atribu. The returned URL is
   * short-lived and signed by Meta — fetch it promptly, do not cache it.
   */
  async videoSource(videoId: string, options: ReadExtras = {}): Promise<AdVideoSourceResponse> {
    return this.http.request<AdVideoSourceResponse>({
      method: "GET",
      path: `/api/v1/ads/videos/${encodeURIComponent(videoId)}`,
      signal: options.signal,
    });
  }

  /**
   * Pause one ad by its Meta id — no recommendation required. Tier `confirm`
   * (the call is the confirmation), audited in `meta_action_log`, reversible:
   * undo with {@link resume} or `conversionSync.rollbackAction(data.action_id)`.
   *
   * The `Idempotency-Key` header is REQUIRED and the transport always sends one
   * (generated when `idempotencyKey` is omitted). Pass your own whenever a retry
   * may cross a process boundary: the same key replays the stored result
   * (`outcome: "replayed"`) without calling Meta. `campaigns:apply`.
   */
  async pause(
    id: string,
    input: AdStatusChangeInput = {},
    options: WriteExtras = {},
  ): Promise<AdStatusChangeResponse> {
    return this.http.request<AdStatusChangeResponse>({
      method: "POST",
      path: `/api/v1/ads/${encodeURIComponent(id)}/pause`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Resume one PAUSED ad by its Meta id (also one paused outside Atribu). An
   * ARCHIVED/DELETED ad is refused with `409 invalid_state`. Same idempotency
   * contract as {@link pause}. `campaigns:apply`.
   */
  async resume(
    id: string,
    input: AdStatusChangeInput = {},
    options: WriteExtras = {},
  ): Promise<AdStatusChangeResponse> {
    return this.http.request<AdStatusChangeResponse>({
      method: "POST",
      path: `/api/v1/ads/${encodeURIComponent(id)}/resume`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Set one ad set's daily budget (MINOR units) by its Meta id. Tier `money`:
   * send `applied_by`, or call with a key of the app that provisioned the
   * profile (its shadow owner is used). Held to ±50 % of the live budget per
   * call — outside it is `422 budget_change_out_of_bounds`. `campaigns:apply`.
   */
  async setAdSetBudget(
    adSetId: string,
    input: AdSetBudgetInput,
    options: WriteExtras = {},
  ): Promise<AdSetBudgetResponse> {
    return this.http.request<AdSetBudgetResponse>({
      method: "POST",
      path: `/api/v1/adsets/${encodeURIComponent(adSetId)}/budget`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }
}

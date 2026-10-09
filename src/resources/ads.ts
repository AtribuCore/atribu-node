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

type AdsLevelCountsQuery = paths["/api/v1/ads/level-counts"]["get"]["parameters"]["query"];
export type AdsLevelCountsResponse =
  paths["/api/v1/ads/level-counts"]["get"]["responses"][200]["content"]["application/json"];
export type AdsLevelCountsOptions = AdsLevelCountsQuery & ReadExtras;

export type AdsSignalsResponse =
  paths["/api/v1/ads/signals"]["get"]["responses"][200]["content"]["application/json"];

type AdsTrendQuery = paths["/api/v1/ads/trend"]["get"]["parameters"]["query"];
export type AdsTrendResponse =
  paths["/api/v1/ads/trend"]["get"]["responses"][200]["content"]["application/json"];
export type AdsTrendOptions = AdsTrendQuery & ReadExtras;

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

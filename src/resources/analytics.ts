/**
 * The dashboard reads (#590) — the numbers the Atribu console is made of.
 *
 * Every method here is a thin, typed call onto a route in
 * `services/api/src/routes/manifest.ts`; the request and response types are
 * indexed straight out of the generated OpenAPI `paths`, never restated by
 * hand, so a contract change lands as a compile error rather than a runtime
 * surprise. `test/resources/route-coverage.test.ts` holds the two in step.
 *
 * Responses are the full envelope, not `data` — see `./common.ts`.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

type OverviewQuery = paths["/api/v1/overview"]["get"]["parameters"]["query"];
export type OverviewResponse =
  paths["/api/v1/overview"]["get"]["responses"][200]["content"]["application/json"];
export type OverviewOptions = OverviewQuery & ReadExtras;

/**
 * #584 — `data` is one of two shapes, picked by `?grain=`. The two are pulled
 * APART here rather than left as a union, because the union is what a caller
 * would otherwise have to narrow on every call: `overview()`'s overloads below
 * map the grain they passed to the shape they get, so `res.data.current` keeps
 * compiling for everyone who was calling this before the grain existed.
 *
 * `Extract` keys on the discriminating property rather than restating either
 * shape — the branches stay generated.
 */
export type OverviewTotalsResponse = Omit<OverviewResponse, "data"> & {
  data: Extract<OverviewResponse["data"], { current: unknown }>;
};
export type OverviewDaysResponse = Omit<OverviewResponse, "data"> & {
  data: Extract<OverviewResponse["data"], { days: unknown }>;
};

type CampaignsQuery = paths["/api/v1/campaigns"]["get"]["parameters"]["query"];
export type CampaignsResponse =
  paths["/api/v1/campaigns"]["get"]["responses"][200]["content"]["application/json"];
export type CampaignsOptions = CampaignsQuery & ReadExtras;

/**
 * #627 — `data` is one of two shapes, picked by whether `?level=` was sent.
 * Pulled APART here the same way `overview()`'s grain split works: `Extract`ed
 * on each shape's own discriminating field rather than restated, so a contract
 * change lands as a type error, and `campaigns()`'s overloads below bind
 * `level` to the shape so nothing has to be narrowed at the call site.
 */
export type CampaignsTopNResponse = Omit<CampaignsResponse, "data"> & {
  data: Extract<CampaignsResponse["data"], { campaign_id: unknown }[]>;
};
export type AdsRankingResponse = Omit<CampaignsResponse, "data"> & {
  data: Extract<CampaignsResponse["data"], { entity_id: unknown }[]>;
};

type CampaignsUnattributedQuery =
  paths["/api/v1/campaigns/unattributed"]["get"]["parameters"]["query"];
export type CampaignsUnattributedResponse =
  paths["/api/v1/campaigns/unattributed"]["get"]["responses"][200]["content"]["application/json"];
export type CampaignsUnattributedOptions = CampaignsUnattributedQuery & ReadExtras;

type CampaignsPlatformComparisonQuery =
  paths["/api/v1/campaigns/platform-comparison"]["get"]["parameters"]["query"];
export type CampaignsPlatformComparisonResponse =
  paths["/api/v1/campaigns/platform-comparison"]["get"]["responses"][200]["content"]["application/json"];
export type CampaignsPlatformComparisonOptions = CampaignsPlatformComparisonQuery & ReadExtras;

type CampaignConversionsQuery =
  paths["/api/v1/campaigns/{id}/conversions"]["get"]["parameters"]["query"];
export type CampaignConversionsResponse =
  paths["/api/v1/campaigns/{id}/conversions"]["get"]["responses"][200]["content"]["application/json"];
export type CampaignConversionsOptions = CampaignConversionsQuery & ReadExtras;

// #1776 — campaign-level pause / resume and the live status read before them.
export type CampaignStatusResponse =
  paths["/api/v1/campaigns/{id}/status"]["get"]["responses"][200]["content"]["application/json"];
export type CampaignStatusChangeInput = NonNullable<
  paths["/api/v1/campaigns/{id}/pause"]["post"]["requestBody"]
>["content"]["application/json"];
export type CampaignStatusChangeResponse =
  paths["/api/v1/campaigns/{id}/pause"]["post"]["responses"][200]["content"]["application/json"];
export type CampaignBudgetInput = NonNullable<
  paths["/api/v1/campaigns/{id}/budget"]["post"]["requestBody"]
>["content"]["application/json"];
export type CampaignBudgetResponse =
  paths["/api/v1/campaigns/{id}/budget"]["post"]["responses"][200]["content"]["application/json"];

type BreakdownQuery = paths["/api/v1/breakdown"]["get"]["parameters"]["query"];
export type BreakdownResponse =
  paths["/api/v1/breakdown"]["get"]["responses"][200]["content"]["application/json"];
export type BreakdownOptions = BreakdownQuery & ReadExtras;

type DrillQuery = paths["/api/v1/drill"]["get"]["parameters"]["query"];
export type DrillResponse =
  paths["/api/v1/drill"]["get"]["responses"][200]["content"]["application/json"];
/**
 * `format` is absent on purpose: it is what separates {@link AnalyticsResource.drill}
 * from {@link AnalyticsResource.drillCsv}, and the two return different
 * TypeScript types. A caller who could set it would be able to ask `drill()`
 * for a CSV and get a `string` typed as a `DrillResult`.
 */
export type DrillOptions = Omit<DrillQuery, "format"> & ReadExtras;

type FunnelsQuery = paths["/api/v1/funnels"]["get"]["parameters"]["query"];
export type FunnelsResponse =
  paths["/api/v1/funnels"]["get"]["responses"][200]["content"]["application/json"];
export type FunnelsOptions = FunnelsQuery & ReadExtras;

type NewVsReturningQuery =
  paths["/api/v1/cohorts/new-vs-returning"]["get"]["parameters"]["query"];
export type NewVsReturningResponse =
  paths["/api/v1/cohorts/new-vs-returning"]["get"]["responses"][200]["content"]["application/json"];
export type NewVsReturningOptions = NewVsReturningQuery & ReadExtras;

type LtvQuery = paths["/api/v1/ltv"]["get"]["parameters"]["query"];
export type LtvResponse =
  paths["/api/v1/ltv"]["get"]["responses"][200]["content"]["application/json"];
export type LtvOptions = LtvQuery & ReadExtras;

type CustomersQuery = paths["/api/v1/customers"]["get"]["parameters"]["query"];
export type CustomersResponse =
  paths["/api/v1/customers"]["get"]["responses"][200]["content"]["application/json"];
export type CustomersOptions = CustomersQuery & ReadExtras;

type TrustQuery = paths["/api/v1/trust"]["get"]["parameters"]["query"];
export type TrustResponse =
  paths["/api/v1/trust"]["get"]["responses"][200]["content"]["application/json"];
export type TrustOptions = TrustQuery & ReadExtras;

type VisitorsQuery = paths["/api/v1/visitors"]["get"]["parameters"]["query"];
export type VisitorsResponse =
  paths["/api/v1/visitors"]["get"]["responses"][200]["content"]["application/json"];
export type VisitorsOptions = VisitorsQuery & ReadExtras;

// #589 — the LTV reclassify pair. NO `…Query` type for either: both take the
// customer in the PATH and nothing in the query string, so their options are
// the extras alone rather than `never & ReadExtras`.
export type CustomerPaymentsResponse =
  paths["/api/v1/customers/{id}/payments"]["get"]["responses"][200]["content"]["application/json"];
export type CustomerPaymentsOptions = ReadExtras;

// #645 — the journey pair. Both take the VISITOR in the path; `journey` also
// takes a query (cursor / limit / model), `summary` takes only `goal`.
type CustomerJourneyQuery =
  paths["/api/v1/customers/{id}/journey"]["get"]["parameters"]["query"];
export type CustomerJourneyResponse =
  paths["/api/v1/customers/{id}/journey"]["get"]["responses"][200]["content"]["application/json"];
export type CustomerJourneyOptions = CustomerJourneyQuery & ReadExtras;

// The Vitrina Ads contract §12, ask D — the same page, addressed by a
// conversion handle (outcome_event_id, conversions.id, or the ingest event_id).
type ConversionJourneyQuery =
  paths["/api/v1/conversions/{id}/journey"]["get"]["parameters"]["query"];
export type ConversionJourneyResponse =
  paths["/api/v1/conversions/{id}/journey"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionJourneyOptions = ConversionJourneyQuery & ReadExtras;

// #1768 — one person's journey, named by YOUR customer id (the
// `user_traits.external_id` you ingest), or with `customers:read` by email/phone.
type CustomerJourneyByKeyQuery =
  NonNullable<paths["/api/v1/customers/journey"]["get"]["parameters"]["query"]>;
export type CustomerJourneyByKeyResponse =
  paths["/api/v1/customers/journey"]["get"]["responses"][200]["content"]["application/json"];
export type CustomerJourneyByKeyOptions = CustomerJourneyByKeyQuery & ReadExtras;

type CustomerSummaryQuery =
  paths["/api/v1/customers/{id}/summary"]["get"]["parameters"]["query"];
export type CustomerSummaryResponse =
  paths["/api/v1/customers/{id}/summary"]["get"]["responses"][200]["content"]["application/json"];
export type CustomerSummaryOptions = CustomerSummaryQuery & ReadExtras;

export type FirstPaymentOverrideInput = NonNullable<
  paths["/api/v1/customers/{id}/first-payment-override"]["post"]["requestBody"]
>["content"]["application/json"];
export type FirstPaymentOverrideResponse =
  paths["/api/v1/customers/{id}/first-payment-override"]["post"]["responses"][200]["content"]["application/json"];
export type FirstPaymentOverrideOptions = WriteExtras;

// ---------------------------------------------------------------------------
// #489 — the merge-candidate customer search and the AI journey summary, both
// folded off internal `/api/workspaces/{w}/profiles/{p}/**` routes.
// ---------------------------------------------------------------------------

type CustomerSearchQuery = NonNullable<
  paths["/api/v1/customers/search"]["get"]["parameters"]["query"]
>;
export type CustomerSearchResponse =
  paths["/api/v1/customers/search"]["get"]["responses"][200]["content"]["application/json"];
export type CustomerSearchOptions = Omit<CustomerSearchQuery, "q"> & ReadExtras;

export type CustomerJourneySummaryResponse =
  paths["/api/v1/customers/{id}/journey-summary"]["get"]["responses"][200]["content"]["application/json"];


export class AnalyticsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Spend, clicks, revenue, ROAS, outcome counts and the cash / first-payment /
   * recurring / refund / dispute legs, plus the previous period of equal length.
   *
   * `grain: "day"` (#584) swaps the `current`/`previous` totals for
   * `days`/`previous_days` — one row per calendar day carrying the same legs.
   * The overloads bind the grain to the shape, so nothing has to be narrowed at
   * the call site unless the grain itself is computed at runtime.
   */
  async overview(
    options: OverviewOptions & { grain: "day" },
  ): Promise<OverviewDaysResponse>;
  async overview(
    options: OverviewOptions & { grain?: "total" },
  ): Promise<OverviewTotalsResponse>;
  async overview(options: OverviewOptions): Promise<OverviewResponse>;
  async overview(options: OverviewOptions): Promise<OverviewResponse> {
    const { signal, ...query } = options;
    return this.http.request<OverviewResponse>({
      method: "GET",
      path: "/api/v1/overview",
      query,
      signal,
    });
  }

  /**
   * Campaign / ad-set / ad performance for the window, under one model.
   *
   * `level` picks the response shape (#627): omitted, a ranked top-N
   * (`CampaignDTO[]`, honours `limit`); set, every entity at that level
   * (`AdsRankingDTO[]`, unlimited, `filter[…]`-aware). The overloads bind the
   * two together, the way {@link overview}'s `grain` does, so nothing has to
   * be narrowed at the call site unless `level` itself is computed at runtime.
   */
  async campaigns(
    options: CampaignsOptions & { level: string },
  ): Promise<AdsRankingResponse>;
  async campaigns(
    options: CampaignsOptions & { level?: undefined },
  ): Promise<CampaignsTopNResponse>;
  async campaigns(options: CampaignsOptions): Promise<CampaignsResponse>;
  async campaigns(options: CampaignsOptions): Promise<CampaignsResponse> {
    const { signal, ...query } = options;
    return this.http.request<CampaignsResponse>({
      method: "GET",
      path: "/api/v1/campaigns",
      query,
      signal,
    });
  }

  /**
   * The reconciling remainder under a `campaigns({ level })` list (#641):
   * attributed outcomes that carry no entity id at that level.
   *
   * Call it with the SAME `model` / window / `level` as the list — it is the
   * complement of one particular ranking, and `Σ(rows) + this` is the profile's
   * attributed total only when the arguments match.
   */
  async campaignsUnattributed(
    options: CampaignsUnattributedOptions,
  ): Promise<CampaignsUnattributedResponse> {
    const { signal, ...query } = options;
    return this.http.request<CampaignsUnattributedResponse>({
      method: "GET",
      path: "/api/v1/campaigns/unattributed",
      query,
      signal,
    });
  }

  /**
   * Platform-reported vs Atribu-attributed (#1710): per platform and per
   * campaign / ad set / ad (`level`), the platform's OWN reported conversions
   * and value beside the conversions and cash Atribu attributed under `model`,
   * with the gap and ROAS both ways. The two sides are never blended — every
   * platform field is `platform_*`, every Atribu field `atribu_*`, and `null`
   * on the platform side means "the platform reported nothing", not zero.
   * Durable tables only: any range up to 366 days is valid.
   */
  async campaignsPlatformComparison(
    options: CampaignsPlatformComparisonOptions,
  ): Promise<CampaignsPlatformComparisonResponse> {
    const { signal, ...query } = options;
    return this.http.request<CampaignsPlatformComparisonResponse>({
      method: "GET",
      path: "/api/v1/campaigns/platform-comparison",
      query,
      signal,
    });
  }

  /**
   * The conversions one campaign is credited with. `campaignId` is the
   * PLATFORM id (Meta's numeric campaign id), the value `campaigns()` returns
   * as `campaign_external_id` — not the Atribu row id.
   */
  async campaignConversions(
    campaignId: string,
    options: CampaignConversionsOptions,
  ): Promise<CampaignConversionsResponse> {
    const { signal, ...query } = options;
    return this.http.request<CampaignConversionsResponse>({
      method: "GET",
      path: `/api/v1/campaigns/${encodeURIComponent(campaignId)}/conversions`,
      query,
      signal,
    });
  }

  /**
   * A campaign's live status and what pausing or resuming it would do — the
   * consent screen's one call: name, `effective_status`, the ads a pause stops
   * (or a resume frees), daily budget, mean daily spend, and per action
   * `{ available, reason, affected_ads_count }`. Degrades to the synced status
   * (with a `reason`) instead of failing when Meta is unreadable. `campaigns:read`.
   */
  async campaignStatus(
    campaignId: string,
    options: ReadExtras = {},
  ): Promise<CampaignStatusResponse> {
    return this.http.request<CampaignStatusResponse>({
      method: "GET",
      path: `/api/v1/campaigns/${encodeURIComponent(campaignId)}/status`,
      signal: options.signal,
    });
  }

  /**
   * Pause one ACTIVE campaign by its Meta id — ONE campaign-level write, never
   * a per-ad fan-out. `affected_ads_count` is how many delivering ads stopped;
   * `undo` is the resume call. A paused campaign is `outcome: "no_change"`.
   * Pass `idempotencyKey` (required by the route) — derive it from
   * {@link campaignStatus}'s `confirm_token`, so a retry replays and a later
   * toggle never does. `campaigns:apply`.
   */
  async campaignPause(
    campaignId: string,
    input: CampaignStatusChangeInput = {},
    options: WriteExtras = {},
  ): Promise<CampaignStatusChangeResponse> {
    return this.http.request<CampaignStatusChangeResponse>({
      method: "POST",
      path: `/api/v1/campaigns/${encodeURIComponent(campaignId)}/pause`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Resume one PAUSED campaign. When Atribu paused it, this is that pause's
   * undo (`rollback_of` names it). Ads paused on their own stay paused. An
   * active campaign is `outcome: "no_change"`. Same idempotency contract as
   * {@link campaignPause}. `campaigns:apply`.
   */
  async campaignResume(
    campaignId: string,
    input: CampaignStatusChangeInput = {},
    options: WriteExtras = {},
  ): Promise<CampaignStatusChangeResponse> {
    return this.http.request<CampaignStatusChangeResponse>({
      method: "POST",
      path: `/api/v1/campaigns/${encodeURIComponent(campaignId)}/resume`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Raise or lower one campaign's own (Advantage) budget — daily or lifetime,
   * MINOR units, exactly one of `new_daily_budget_minor` /
   * `new_lifetime_budget_minor`. Tier `money` (send `applied_by`, or use a key
   * of the app that provisioned the profile). Held to ±50 % of the live budget
   * per call (`422 budget_change_out_of_bounds`); a campaign whose ad sets own
   * the budget is `409 invalid_state`. Undo with the conversion-sync rollback
   * on `action_id`. Pass `idempotencyKey` (required). `campaigns:apply`.
   */
  async campaignBudget(
    campaignId: string,
    input: CampaignBudgetInput,
    options: WriteExtras = {},
  ): Promise<CampaignBudgetResponse> {
    return this.http.request<CampaignBudgetResponse>({
      method: "POST",
      path: `/api/v1/campaigns/${encodeURIComponent(campaignId)}/budget`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * One or more dimensions of the same read — `dimensions` is a comma-separated
   * list (`channel,campaign`), and the response keys each result by dimension.
   */
  async breakdown(options: BreakdownOptions): Promise<BreakdownResponse> {
    const { signal, ...query } = options;
    return this.http.request<BreakdownResponse>({
      method: "GET",
      path: "/api/v1/breakdown",
      query,
      signal,
    });
  }

  /** The rows behind a KPI tile, in the seven kinds the API publishes. */
  async drill(options: DrillOptions): Promise<DrillResponse> {
    const { signal, ...query } = options;
    return this.http.request<DrillResponse>({
      method: "GET",
      path: "/api/v1/drill",
      query,
      signal,
    });
  }

  /**
   * The SAME rows {@link drill} returns, rendered as `text/csv`, resolved as a
   * raw string.
   *
   * The switch is `?format=csv`, NOT `Accept: text/csv` — deliberately, and the
   * operation description says so: the header is unreachable from the
   * `<a download>` links that consume this in the browser, so the API refuses
   * to hide a two-body endpoint behind a header one caller class cannot set.
   */
  async drillCsv(options: DrillOptions): Promise<string> {
    const { signal, ...query } = options;
    return this.http.request<string>({
      method: "GET",
      path: "/api/v1/drill",
      query: { ...query, format: "csv" },
      headers: { Accept: "text/csv" },
      expectText: true,
      signal,
    });
  }

  /** Stage-by-stage conversion for one funnel definition. */
  async funnels(options: FunnelsOptions): Promise<FunnelsResponse> {
    const { signal, ...query } = options;
    return this.http.request<FunnelsResponse>({
      method: "GET",
      path: "/api/v1/funnels",
      query,
      signal,
    });
  }

  /** New vs. returning customer cohorts over the window. */
  async newVsReturning(options: NewVsReturningOptions): Promise<NewVsReturningResponse> {
    const { signal, ...query } = options;
    return this.http.request<NewVsReturningResponse>({
      method: "GET",
      path: "/api/v1/cohorts/new-vs-returning",
      query,
      signal,
    });
  }

  /** Lifetime-value curves by acquisition cohort. */
  async ltv(options: LtvOptions): Promise<LtvResponse> {
    const { signal, ...query } = options;
    return this.http.request<LtvResponse>({
      method: "GET",
      path: "/api/v1/ltv",
      query,
      signal,
    });
  }

  /**
   * Customers who achieved a goal, paginated. Returns identity (name, email)
   * only to a caller holding `customers:read`.
   */
  async customers(options: CustomersOptions): Promise<CustomersResponse> {
    const { signal, ...query } = options;
    return this.http.request<CustomersResponse>({
      method: "GET",
      path: "/api/v1/customers",
      query,
      signal,
    });
  }

  /**
   * Attribution trust: how much of the profile's cash is traceable to an ad,
   * whether the instrumentation producing that number is sound, and which way
   * the traceable half is moving.
   *
   * READ `instrumentation` BEFORE ACTING ON `cash_coverage`. A low
   * `traceable_pct_by_value` means "this account has great organic" when
   * `instrumentation.tracking_healthy` is true and "this account's tracking is
   * broken" when it is false — opposite problems calling for opposite
   * responses, and `coverage_interpretation` states which one applies. That is
   * why the three arrive together rather than as three calls a caller could
   * make two of.
   *
   * THREE WINDOWS. `date_from`/`date_to` bound `cash_coverage` only. `days`
   * (default 30) bounds `instrumentation` and is capped at the Ephemeral
   * Buffer's retention — a wider value is rejected, not narrowed.
   * `window_days` (default 28) is the trend's half-over-half window and always
   * ends today, so the recent-vs-prior comparison does not move with the range
   * you asked for.
   */
  async trust(options: TrustOptions): Promise<TrustResponse> {
    const { signal, ...query } = options;
    return this.http.request<TrustResponse>({
      method: "GET",
      path: "/api/v1/trust",
      query,
      signal,
    });
  }

  /** Visitors in the window, paginated. Same PII rule as {@link customers}. */
  async visitors(options: VisitorsOptions): Promise<VisitorsResponse> {
    const { signal, ...query } = options;
    return this.http.request<VisitorsResponse>({
      method: "GET",
      path: "/api/v1/visitors",
      query,
      signal,
    });
  }

  /**
   * One customer's `payment_received` conversions, newest first, each with the
   * effective `is_first_payment` flag and the stored `manual_override` (#589).
   *
   * `customerProfileId` is the customer's Atribu id — the value {@link ltv}
   * returns as `top_customers[].customer_profile_id` and {@link customers}
   * returns as `customer_profile_id`.
   *
   * NO DATE RANGE, unlike every other read here: this is the customer's whole
   * payment history, which is the only window in which "is this their first
   * payment?" has an answer. `customers:read` — the PII tier, with no masked
   * variant, because the response IS one named person's payment history.
   *
   * `manual_override: null` is NOT `false`. `null` means nobody has overridden
   * the payment and `is_first_payment` is derived; `false` means an operator
   * said this is not a first payment.
   */
  async customerPayments(
    customerProfileId: string,
    options: CustomerPaymentsOptions = {},
  ): Promise<CustomerPaymentsResponse> {
    const { signal } = options;
    return this.http.request<CustomerPaymentsResponse>({
      method: "GET",
      path: `/api/v1/customers/${encodeURIComponent(customerProfileId)}/payments`,
      signal,
    });
  }

  /**
   * Pin (or un-pin) one payment as the customer's first (#589).
   * `manual_override: null` CLEARS the override and returns the payment to the
   * derived flag — which is why the field is required rather than optional.
   *
   * IDEMPOTENT: posting the override a payment already carries writes nothing
   * and resolves with `data.changed === false`; a real change is `true`. Safe
   * to retry after a dropped response.
   *
   * The write re-derives `is_first_payment` for EVERY payment of this customer,
   * not only the named one, so re-read {@link customerPayments} rather than
   * assuming only the posted payment moved. `attribution:write` — it moves LTV
   * cohorts, the first-payment-vs-recurring revenue split and the CAC
   * denominator.
   */
  async setFirstPaymentOverride(
    customerProfileId: string,
    input: FirstPaymentOverrideInput,
    options: FirstPaymentOverrideOptions = {},
  ): Promise<FirstPaymentOverrideResponse> {
    const { signal, idempotencyKey } = options;
    return this.http.request<FirstPaymentOverrideResponse>({
      method: "POST",
      path: `/api/v1/customers/${encodeURIComponent(customerProfileId)}/first-payment-override`,
      body: input,
      idempotencyKey,
      signal,
    });
  }

  /**
   * One page of a visitor's event timeline, oldest first, with the per-touch
   * credit overlay (#645).
   *
   * `visitorId` IS THE `visitor_id` {@link visitors} RETURNS, which is the
   * `customer_profile_id` {@link customers} returns when the visitor is
   * identified and an anonymous id when they are not. Pass either back
   * verbatim — the two kinds are told apart by shape, and there is nothing for
   * a caller to decide.
   *
   * `model` CHANGES THE ANSWER, not just its labels: `is_credited`,
   * `credit_share`, `credited_revenue` and `credited_conversions` are
   * recomputed per model, so the same visitor genuinely reads differently under
   * `first_touch` than under `last_touch`. Absent means `last_touch`; an
   * unknown value is rejected rather than silently defaulted.
   *
   * Page with `pagination.cursor` → `cursor`. `customers:read`, with no masked
   * variant: a timeline IS one person's history.
   *
   * The whole-history header — touches, cash, time to completion, identifiers
   * — is {@link customerSummary}, deliberately a separate call rather than a
   * block that appears only on page one.
   */
  async customerJourney(
    visitorId: string,
    options: CustomerJourneyOptions = {},
  ): Promise<CustomerJourneyResponse> {
    const { signal, ...query } = options;
    return this.http.request<CustomerJourneyResponse>({
      method: "GET",
      path: `/api/v1/customers/${encodeURIComponent(visitorId)}/journey`,
      query,
      signal,
    });
  }

  /**
   * The visitor timeline behind ONE conversion — the page
   * {@link customerJourney} returns, addressed by the `outcome_event_id` an
   * `events.ingest` response returned, a `conversions.id`, or the ingest's own
   * `event_id` (your idempotency key). `conversions:read`; without
   * `customers:read` the answer is the key-only projection, with your own
   * `customer_key` in `meta.conversion` instead of Atribu's ids (#1767).
   */
  async conversionJourney(
    conversionId: string,
    options: ConversionJourneyOptions = {},
  ): Promise<ConversionJourneyResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionJourneyResponse>({
      method: "GET",
      path: `/api/v1/conversions/${encodeURIComponent(conversionId)}/journey`,
      query,
      signal,
    });
  }

  /**
   * One person's whole journey, named by the customer id YOU send as
   * `user_traits.external_id` (`{ customer_key }`), or — with `customers:read`
   * — by `{ email }` / `{ phone }`. `conversions:read`. Without
   * `customers:read` the rows are the key-only projection (no person, no
   * pages) and `meta.person` carries no name or identifiers (#1768).
   */
  async customerJourneyByKey(
    options: CustomerJourneyByKeyOptions,
  ): Promise<CustomerJourneyByKeyResponse> {
    const { signal, ...query } = options;
    return this.http.request<CustomerJourneyByKeyResponse>({
      method: "GET",
      path: "/api/v1/customers/journey",
      query,
      signal,
    });
  }

  /**
   * The same visitor's WHOLE-HISTORY totals and identifiers (#645).
   *
   * NOT WINDOWED, and it takes no date range on purpose: `touch_count` and
   * `total_cash_revenue` are lifetime, and `time_to_completion_seconds` is the
   * gap between the first touch and the first `goal` conversion — a number a
   * window could only answer when both of its ends fell inside the range.
   *
   * `goal` picks which conversion type counts as completion (default
   * `payment_received`) and affects ONLY that field.
   *
   * `customers:read`: `identifiers` is the person's email and phone.
   */
  async customerSummary(
    visitorId: string,
    options: CustomerSummaryOptions = {},
  ): Promise<CustomerSummaryResponse> {
    const { signal, ...query } = options;
    return this.http.request<CustomerSummaryResponse>({
      method: "GET",
      path: `/api/v1/customers/${encodeURIComponent(visitorId)}/summary`,
      query,
      signal,
    });
  }

  /**
   * Search this profile's customers by name, email or phone (#489).
   *
   * The merge-candidate picker's read. A query shorter than two characters
   * returns an empty list rather than every customer, so a debounced input can
   * call it on every keystroke.
   */
  async customerSearch(
    q: string,
    options: CustomerSearchOptions = {},
  ): Promise<CustomerSearchResponse> {
    const { signal, ...query } = options;
    return this.http.request<CustomerSearchResponse>({
      method: "GET",
      path: "/api/v1/customers/search",
      query: { ...query, q },
      signal,
    });
  }

  /**
   * The STORED AI summary of one visitor's journey (#489). Never calls a
   * model: a null `summary` with `cached: false` means none exists yet.
   */
  async customerJourneySummary(
    visitorId: string,
    options: ReadExtras = {},
  ): Promise<CustomerJourneySummaryResponse> {
    return this.http.request<CustomerJourneySummaryResponse>({
      method: "GET",
      path: `/api/v1/customers/${encodeURIComponent(visitorId)}/journey-summary`,
      signal: options.signal,
    });
  }

  /**
   * Generate and store an AI summary of one visitor's journey (#489).
   *
   * Draws ONE unit from the workspace's daily AI allowance; a spent allowance
   * throws `rate_limit_exceeded` (429) carrying `Retry-After` for the next UTC
   * midnight. A visitor with no events returns a null summary and costs nothing.
   */
  async generateCustomerJourneySummary(
    visitorId: string,
    options: ReadExtras = {},
  ): Promise<CustomerJourneySummaryResponse> {
    return this.http.request<CustomerJourneySummaryResponse>({
      method: "POST",
      path: `/api/v1/customers/${encodeURIComponent(visitorId)}/journey-summary`,
      signal: options.signal,
    });
  }
}

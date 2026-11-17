/**
 * Conversion Sync (#489) — the console's read surface over the Meta CAPI /
 * Google Ads export pipeline: wiring diagnostics, dataset quality, Custom
 * Audiences, export deliveries, and the compliance state behind Platform-Safe
 * Mode. Phase 1: nine reads. The remainder (live Meta Marketing API reads —
 * wiring, campaigns, catalog, dataset, match-quality, optimization, scaling,
 * platform-safe/*, rules, blueprints) ports in a follow-up; see
 * `services/api/src/dal/conversion-sync.ts`'s header.
 *
 * Every method returns the full envelope (`./common.ts`) rather than
 * unwrapping `data` — consistent with the other analytics-area resources.
 *
 * Phase 2 (#489) adds the WIRING surface — the six routes that talk to the
 * Meta Marketing API live. The write half (`recheckWiring`, `wireAdSets`,
 * `createCustomConversion`, `createNewCustomerPurchaseConversion`) needs
 * `exports:write`; everything else here is `exports:read`.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

export type ConversionSyncActionsResponse =
  paths["/api/v1/conversion-sync/actions"]["get"]["responses"][200]["content"]["application/json"];

type AuditQuery = NonNullable<paths["/api/v1/conversion-sync/audit"]["get"]["parameters"]["query"]>;
export type ConversionSyncAuditResponse =
  paths["/api/v1/conversion-sync/audit"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncAuditOptions = AuditQuery & ReadExtras;

export type ConversionSyncDefinitionResponse =
  paths["/api/v1/conversion-sync/definition"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncLegalResponse =
  paths["/api/v1/conversion-sync/legal"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncAudiencesResponse =
  paths["/api/v1/conversion-sync/audiences"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncAudienceSeedPreviewResponse =
  paths["/api/v1/conversion-sync/audiences/seed-preview"]["get"]["responses"][200]["content"]["application/json"];

type FeedQuery = NonNullable<paths["/api/v1/conversion-sync/feed"]["get"]["parameters"]["query"]>;
export type ConversionSyncFeedResponse =
  paths["/api/v1/conversion-sync/feed"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncFeedOptions = FeedQuery & ReadExtras;

export type ConversionSyncSetupLinkResponse =
  paths["/api/v1/conversion-sync/setup-links"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncTransparencyResponse =
  paths["/api/v1/conversion-sync/transparency"]["get"]["responses"][200]["content"]["application/json"];

// ---------------------------------------------------------------------------
// Wiring (#489 phase 2)
// ---------------------------------------------------------------------------

type WiringQuery = NonNullable<paths["/api/v1/conversion-sync/wiring"]["get"]["parameters"]["query"]>;
export type ConversionSyncWiringResponse =
  paths["/api/v1/conversion-sync/wiring"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncWiringOptions = WiringQuery & ReadExtras;

export type ConversionSyncWiringRecheckInput = NonNullable<
  paths["/api/v1/conversion-sync/wiring/recheck"]["post"]["requestBody"]
>["content"]["application/json"];
export type ConversionSyncWiringRecheckResponse =
  paths["/api/v1/conversion-sync/wiring/recheck"]["post"]["responses"][200]["content"]["application/json"];

type CandidateAdSetsQuery = NonNullable<
  paths["/api/v1/conversion-sync/wiring/candidate-ad-sets"]["get"]["parameters"]["query"]
>;
export type ConversionSyncCandidateAdSetsResponse =
  paths["/api/v1/conversion-sync/wiring/candidate-ad-sets"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncCandidateAdSetsOptions = CandidateAdSetsQuery & ReadExtras;

type CampaignWiringQuery = NonNullable<
  paths["/api/v1/conversion-sync/wiring/campaigns"]["get"]["parameters"]["query"]
>;
export type ConversionSyncCampaignWiringResponse =
  paths["/api/v1/conversion-sync/wiring/campaigns"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncCampaignWiringOptions = CampaignWiringQuery & ReadExtras;

type CampaignWiringEditModesQuery = NonNullable<
  paths["/api/v1/conversion-sync/wiring/campaigns/edit-modes"]["get"]["parameters"]["query"]
>;
export type ConversionSyncCampaignWiringEditModesResponse =
  paths["/api/v1/conversion-sync/wiring/campaigns/edit-modes"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncCampaignWiringEditModesOptions = CampaignWiringEditModesQuery & ReadExtras;

// #2143 — background ad-set move operations.
export type ConversionSyncOperationsResponse =
  paths["/api/v1/conversion-sync/operations"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncOperationsOptions = NonNullable<
  paths["/api/v1/conversion-sync/operations"]["get"]["parameters"]["query"]
> &
  ReadExtras;
export type ConversionSyncOperationResponse =
  paths["/api/v1/conversion-sync/operations/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncOperationItemRetryResponse =
  paths["/api/v1/conversion-sync/operations/{id}/items/{item_id}/retry"]["post"]["responses"][202]["content"]["application/json"];

type RewirePreviewQuery = NonNullable<
  paths["/api/v1/conversion-sync/wiring/rewire"]["get"]["parameters"]["query"]
>;
export type ConversionSyncRewirePreviewResponse =
  paths["/api/v1/conversion-sync/wiring/rewire"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncRewirePreviewOptions = RewirePreviewQuery & ReadExtras;
export type ConversionSyncRewireInput =
  paths["/api/v1/conversion-sync/wiring/rewire"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncRewireResponse =
  paths["/api/v1/conversion-sync/wiring/rewire"]["post"]["responses"][200]["content"]["application/json"];
export type ConversionSyncPendingRewiresResponse =
  paths["/api/v1/conversion-sync/wiring/rewires"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncWireAdSetsInput =
  paths["/api/v1/conversion-sync/wiring/ad-sets"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncWireAdSetsResponse =
  paths["/api/v1/conversion-sync/wiring/ad-sets"]["post"]["responses"][200]["content"]["application/json"];

export type ConversionSyncCreateCustomConversionInput =
  paths["/api/v1/conversion-sync/wiring/custom-conversions"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncCreateCustomConversionResponse =
  paths["/api/v1/conversion-sync/wiring/custom-conversions"]["post"]["responses"][201]["content"]["application/json"];

export type ConversionSyncNewCustomerPurchaseConversionInput =
  paths["/api/v1/conversion-sync/wiring/new-customer-purchase-conversion"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncNewCustomerPurchaseConversionResponse =
  paths["/api/v1/conversion-sync/wiring/new-customer-purchase-conversion"]["post"]["responses"][201]["content"]["application/json"];

export type ConversionSyncMessagingOptimizationResponse =
  paths["/api/v1/conversion-sync/messaging-optimization"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncMessagingBookingConversionInput =
  paths["/api/v1/conversion-sync/messaging-optimization/booking-conversion"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncMessagingBookingConversionResponse =
  paths["/api/v1/conversion-sync/messaging-optimization/booking-conversion"]["post"]["responses"][201]["content"]["application/json"];


// ---------------------------------------------------------------------------
// #489 phase 8 — the LAST conversion-sync slice
// ---------------------------------------------------------------------------

export type ConversionSyncCatalogResponse =
  paths["/api/v1/conversion-sync/catalog"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncCatalogWriteInput =
  paths["/api/v1/conversion-sync/catalog"]["put"]["requestBody"]["content"]["application/json"];
export type ConversionSyncCatalogWriteResponse =
  paths["/api/v1/conversion-sync/catalog"]["put"]["responses"][200]["content"]["application/json"];

/** #2209 — the health-data question, Conversion Sync's first setup step. */
export type ConversionSyncHealthDataAnswerInput =
  paths["/api/v1/conversion-sync/health-data-answer"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncHealthDataAnswerResponse =
  paths["/api/v1/conversion-sync/health-data-answer"]["post"]["responses"][200]["content"]["application/json"];

/** #2146 — the Outcome Catalog behind «Qué enviar». */
export type ConversionSyncOutcomeCatalogResponse =
  paths["/api/v1/conversion-sync/outcome-catalog"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncCampaignsResponse =
  paths["/api/v1/conversion-sync/campaigns"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncCampaignCreateInput =
  paths["/api/v1/conversion-sync/campaigns"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncCampaignCreateResponse =
  paths["/api/v1/conversion-sync/campaigns"]["post"]["responses"][201]["content"]["application/json"];

export type ConversionSyncAudienceConfirmResponse =
  paths["/api/v1/conversion-sync/audiences/{audience_id}/confirm"]["post"]["responses"][201]["content"]["application/json"];
export type ConversionSyncAudienceManageInput =
  paths["/api/v1/conversion-sync/audiences/{audience_id}/manage"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncAudienceManageResponse =
  paths["/api/v1/conversion-sync/audiences/{audience_id}/manage"]["post"]["responses"][200]["content"]["application/json"];

export type PlatformSafeProvisionInput =
  NonNullable<paths["/api/v1/conversion-sync/platform-safe/provision"]["post"]["requestBody"]>["content"]["application/json"];
export type PlatformSafeProvisionResponse =
  paths["/api/v1/conversion-sync/platform-safe/provision"]["post"]["responses"][200]["content"]["application/json"];
export type PlatformSafeTargetInput =
  paths["/api/v1/conversion-sync/platform-safe/target"]["post"]["requestBody"]["content"]["application/json"];
export type PlatformSafeTargetResponse =
  paths["/api/v1/conversion-sync/platform-safe/target"]["post"]["responses"][200]["content"]["application/json"];
export type PlatformSafeSendingInput =
  paths["/api/v1/conversion-sync/platform-safe/sending"]["post"]["requestBody"]["content"]["application/json"];
export type PlatformSafeSendingResponse =
  paths["/api/v1/conversion-sync/platform-safe/sending"]["post"]["responses"][200]["content"]["application/json"];
export type PlatformSafeServiceDatasetsResponse =
  paths["/api/v1/conversion-sync/platform-safe/service-datasets"]["get"]["responses"][200]["content"]["application/json"];
export type PlatformSafeServiceDatasetAddInput =
  paths["/api/v1/conversion-sync/platform-safe/service-datasets"]["post"]["requestBody"]["content"]["application/json"];
export type PlatformSafeServiceDatasetAddResponse =
  paths["/api/v1/conversion-sync/platform-safe/service-datasets"]["post"]["responses"][200]["content"]["application/json"];
export type PlatformSafeServiceDatasetUpdateInput =
  paths["/api/v1/conversion-sync/platform-safe/service-datasets/{key}"]["patch"]["requestBody"]["content"]["application/json"];
export type PlatformSafeServiceDatasetUpdateResponse =
  paths["/api/v1/conversion-sync/platform-safe/service-datasets/{key}"]["patch"]["responses"][200]["content"]["application/json"];
export type PlatformSafeCleanDatasetActionSourceInput =
  paths["/api/v1/conversion-sync/platform-safe/clean-datasets/action-source"]["put"]["requestBody"]["content"]["application/json"];
export type PlatformSafeCleanDatasetActionSourceResponse =
  paths["/api/v1/conversion-sync/platform-safe/clean-datasets/action-source"]["put"]["responses"][200]["content"]["application/json"];
export type PlatformSafeLandingPagesResponse =
  paths["/api/v1/conversion-sync/platform-safe/landing-pages"]["get"]["responses"][200]["content"]["application/json"];
export type GoogleConversionActionsResponse =
  paths["/api/v1/conversion-sync/google/conversion-actions"]["get"]["responses"][200]["content"]["application/json"];
export type GoogleConversionActionProvisionInput = NonNullable<
  paths["/api/v1/conversion-sync/google/conversion-actions"]["post"]["requestBody"]
>["content"]["application/json"];
export type GoogleConversionActionProvisionResponse =
  paths["/api/v1/conversion-sync/google/conversion-actions"]["post"]["responses"][200]["content"]["application/json"];
export type GoogleCampaignGoalsResponse =
  paths["/api/v1/conversion-sync/google/campaign-goals"]["get"]["responses"][200]["content"]["application/json"];
export type GoogleCampaignGoalAssignInput =
  paths["/api/v1/conversion-sync/google/campaign-goals/assign"]["post"]["requestBody"]["content"]["application/json"];
export type GoogleCampaignGoalChangeResponse =
  paths["/api/v1/conversion-sync/google/campaign-goals/assign"]["post"]["responses"][201]["content"]["application/json"];
export type GoogleServiceDestinationUpdateInput =
  paths["/api/v1/conversion-sync/google/service-destinations/{key}"]["patch"]["requestBody"]["content"]["application/json"];
export type GoogleServiceDestinationUpdateResponse =
  paths["/api/v1/conversion-sync/google/service-destinations/{key}"]["patch"]["responses"][200]["content"]["application/json"];
export type GoogleTagLabelMapInput =
  paths["/api/v1/conversion-sync/google/tag-labels"]["put"]["requestBody"]["content"]["application/json"];
export type GoogleTagLabelMapResponse =
  paths["/api/v1/conversion-sync/google/tag-labels"]["put"]["responses"][200]["content"]["application/json"];

// ---------------------------------------------------------------------------
// Platform-Safe Mode (#489 phase 3)
// ---------------------------------------------------------------------------

export type PlatformSafeStatusResponse =
  paths["/api/v1/conversion-sync/platform-safe/status"]["get"]["responses"][200]["content"]["application/json"];
export type PlatformSafeCutoverResponse =
  paths["/api/v1/conversion-sync/platform-safe/cutover"]["get"]["responses"][200]["content"]["application/json"];
export type PlatformSafeAllowlistResponse =
  paths["/api/v1/conversion-sync/platform-safe/allowlist"]["get"]["responses"][200]["content"]["application/json"];
export type PlatformSafeAllowlistInput =
  paths["/api/v1/conversion-sync/platform-safe/allowlist"]["post"]["requestBody"]["content"]["application/json"];

// ---------------------------------------------------------------------------
// The remaining writes (#489 phase 4)
// ---------------------------------------------------------------------------

export type ConversionSyncLegalWriteInput =
  paths["/api/v1/conversion-sync/legal"]["put"]["requestBody"]["content"]["application/json"];
export type ConversionSyncLegalWriteResponse =
  paths["/api/v1/conversion-sync/legal"]["put"]["responses"][200]["content"]["application/json"];

export type ConversionSyncLegalDocumentResponse =
  paths["/api/v1/conversion-sync/legal/documents"]["post"]["responses"][201]["content"]["application/json"];

export type ConversionSyncReplayInput = NonNullable<
  paths["/api/v1/conversion-sync/replay"]["post"]["requestBody"]
>["content"]["application/json"];
export type ConversionSyncReplayResponse =
  paths["/api/v1/conversion-sync/replay"]["post"]["responses"][200]["content"]["application/json"];

export type ConversionSyncSetupLinkWriteResponse =
  paths["/api/v1/conversion-sync/setup-links"]["post"]["responses"][201]["content"]["application/json"];
export type ConversionSyncSetupLinkFixResponse =
  paths["/api/v1/conversion-sync/setup-links/{id}/request-fix"]["post"]["responses"][200]["content"]["application/json"];

export type ConversionSyncAudienceProposeInput =
  paths["/api/v1/conversion-sync/audiences"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncAudienceProposeResponse =
  paths["/api/v1/conversion-sync/audiences"]["post"]["responses"][201]["content"]["application/json"];

// ---------------------------------------------------------------------------
// Dataset reconciliation + match quality (#489 phase 5)
// ---------------------------------------------------------------------------

type DatasetQualityQuery = NonNullable<
  paths["/api/v1/conversion-sync/dataset-quality"]["get"]["parameters"]["query"]
>;
export type ConversionSyncDatasetQualityResponse =
  paths["/api/v1/conversion-sync/dataset-quality"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncDatasetQualityOptions = DatasetQualityQuery & ReadExtras;

type MatchQualityQuery = NonNullable<
  paths["/api/v1/conversion-sync/match-quality"]["get"]["parameters"]["query"]
>;
export type ConversionSyncMatchQualityResponse =
  paths["/api/v1/conversion-sync/match-quality"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncMatchQualityOptions = MatchQualityQuery & ReadExtras;

/** #2151 — the setup checklist's «Verificar» step. */
export type ConversionSyncVerifyResponse =
  paths["/api/v1/conversion-sync/verify"]["get"]["responses"][200]["content"]["application/json"];

/** #2437 — landing Pixels / Customer Labs, and a second sender in Meta's dataset stats. */
export type ConversionSyncOtherSendersResponse =
  paths["/api/v1/conversion-sync/other-senders"]["get"]["responses"][200]["content"]["application/json"];

/** #2689 — `rule_id` and/or `event_name`, optional `dataset_id`, `from`, `to`. */
export type ConversionSyncMetaParityOptions = NonNullable<
  paths["/api/v1/conversion-sync/meta-parity"]["get"]["parameters"]["query"]
> &
  ReadExtras;
export type ConversionSyncMetaParityResponse =
  paths["/api/v1/conversion-sync/meta-parity"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncEmqRecommendationsResponse =
  paths["/api/v1/conversion-sync/emq-recommendations"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncEmqResendInput =
  paths["/api/v1/conversion-sync/emq-recommendations/resend"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncEmqResendResponse =
  paths["/api/v1/conversion-sync/emq-recommendations/resend"]["post"]["responses"][202]["content"]["application/json"];

type DatasetQuery = NonNullable<
  paths["/api/v1/conversion-sync/dataset"]["get"]["parameters"]["query"]
>;
export type ConversionSyncDatasetResponse =
  paths["/api/v1/conversion-sync/dataset"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncDatasetOptions = DatasetQuery & ReadExtras;

export type ConversionSyncDataSourcesResponse =
  paths["/api/v1/conversion-sync/data-sources"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncDataSourceEnsureResponse =
  paths["/api/v1/conversion-sync/data-sources/{kind}/ensure"]["post"]["responses"][200]["content"]["application/json"];
export type ConversionSyncDataSourceOptionsResponse =
  paths["/api/v1/conversion-sync/data-source-options"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncDataSourceOption = ConversionSyncDataSourceOptionsResponse["data"]["sources"][number];
export type ConversionSyncCreateDatasetInput = NonNullable<
  paths["/api/v1/conversion-sync/datasets"]["post"]["requestBody"]
>["content"]["application/json"];
export type ConversionSyncCreatedDatasetResponse =
  paths["/api/v1/conversion-sync/datasets"]["post"]["responses"][200]["content"]["application/json"];

// ---------------------------------------------------------------------------
// Campaign Blueprints (#489 phase 6)
// ---------------------------------------------------------------------------

export type ConversionSyncBlueprintContextResponse =
  paths["/api/v1/conversion-sync/blueprints"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncBlueprintCreateInput =
  paths["/api/v1/conversion-sync/blueprints"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncBlueprintCreateResponse =
  paths["/api/v1/conversion-sync/blueprints"]["post"]["responses"][201]["content"]["application/json"];

type BlueprintInterestQuery = NonNullable<
  paths["/api/v1/conversion-sync/blueprints/interests"]["get"]["parameters"]["query"]
>;
export type ConversionSyncBlueprintInterestsResponse =
  paths["/api/v1/conversion-sync/blueprints/interests"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncBlueprintInterestsOptions = BlueprintInterestQuery & ReadExtras;

export type ConversionSyncBlueprintPromoteInput =
  paths["/api/v1/conversion-sync/blueprints/{id}/promote"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncBlueprintPromoteResponse =
  paths["/api/v1/conversion-sync/blueprints/{id}/promote"]["post"]["responses"][200]["content"]["application/json"];

export type ConversionSyncBlueprintAutoGraduateInput =
  paths["/api/v1/conversion-sync/blueprints/{id}/auto-graduate"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncBlueprintAutoGraduateResponse =
  paths["/api/v1/conversion-sync/blueprints/{id}/auto-graduate"]["post"]["responses"][200]["content"]["application/json"];

export type ConversionSyncBlueprintDismissGraduationResponse =
  paths["/api/v1/conversion-sync/blueprints/graduations/{id}/dismiss"]["post"]["responses"][200]["content"]["application/json"];

// ---------------------------------------------------------------------------
// The Meta action layer (#489 phase 7)
// ---------------------------------------------------------------------------

type ScalingQuery = NonNullable<
  paths["/api/v1/conversion-sync/scaling"]["get"]["parameters"]["query"]
>;
export type ConversionSyncScalingResponse =
  paths["/api/v1/conversion-sync/scaling"]["get"]["responses"][200]["content"]["application/json"];
export type ConversionSyncScalingOptions = ScalingQuery & ReadExtras;

export type ConversionSyncScalingApplyInput =
  paths["/api/v1/conversion-sync/scaling/apply"]["post"]["requestBody"]["content"]["application/json"];
export type ConversionSyncScalingApplyResponse =
  paths["/api/v1/conversion-sync/scaling/apply"]["post"]["responses"][200]["content"]["application/json"];

export type ConversionSyncOptimizationResponse =
  paths["/api/v1/conversion-sync/optimization"]["get"]["responses"][200]["content"]["application/json"];

export type ConversionSyncActionRollbackResponse =
  paths["/api/v1/conversion-sync/actions/{id}/rollback"]["post"]["responses"][200]["content"]["application/json"];

// The partner customer-list audience (enabled per profile; off by default).
export type PartnerCustomerListAudienceStatusResponse =
  paths["/api/v1/partner/audiences/customer-list"]["get"]["responses"][200]["content"]["application/json"];
export type PartnerCustomerListAudienceCreateInput =
  paths["/api/v1/partner/audiences/customer-list"]["post"]["requestBody"]["content"]["application/json"];
export type PartnerCustomerListLookalikeInput =
  paths["/api/v1/partner/audiences/customer-list/lookalike"]["post"]["requestBody"]["content"]["application/json"];

export class ConversionSyncResource {
  constructor(private readonly http: HttpClientLike) {}

  /** The Meta action-layer audit trail: applies, previews, failures, rollbacks. */
  async actions(options: ReadExtras = {}): Promise<ConversionSyncActionsResponse> {
    return this.http.request<ConversionSyncActionsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/actions",
      signal: options.signal,
    });
  }

  /** The signal-settings change-history log, cursor-paginated. */
  async audit(options: ConversionSyncAuditOptions = {}): Promise<ConversionSyncAuditResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncAuditResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/audit",
      query,
      signal,
    });
  }

  /** The conversion-definition builder for click-to-WhatsApp funnels. */
  async definition(options: ReadExtras = {}): Promise<ConversionSyncDefinitionResponse> {
    return this.http.request<ConversionSyncDefinitionResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/definition",
      signal: options.signal,
    });
  }

  /** BAA/HIPAA/DPA compliance state and uploaded documents. */
  async legal(options: ReadExtras = {}): Promise<ConversionSyncLegalResponse> {
    return this.http.request<ConversionSyncLegalResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/legal",
      signal: options.signal,
    });
  }

  /** Managed Meta Custom Audiences + their recent action-log entries. */
  async audiences(options: ReadExtras = {}): Promise<ConversionSyncAudiencesResponse> {
    return this.http.request<ConversionSyncAudiencesResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/audiences",
      signal: options.signal,
    });
  }

  /** The exact customer list a value-based lookalike proposal would upload. */
  async audienceSeedPreview(
    options: ReadExtras = {},
  ): Promise<ConversionSyncAudienceSeedPreviewResponse> {
    return this.http.request<ConversionSyncAudienceSeedPreviewResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/audiences/seed-preview",
      signal: options.signal,
    });
  }

  /** The CAPI/Google Ads export deliveries feed, filtered and cursor-paginated. */
  async feed(options: ConversionSyncFeedOptions = {}): Promise<ConversionSyncFeedResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncFeedResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/feed",
      query,
      signal,
    });
  }

  /** The agency's live one-link (Pixel + Dataset) client setup link, if any. */
  async setupLink(options: ReadExtras = {}): Promise<ConversionSyncSetupLinkResponse> {
    return this.http.request<ConversionSyncSetupLinkResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/setup-links",
      signal: options.signal,
    });
  }

  /** "What we send to Meta" — the real privacy cleanse on a synthetic sample. */
  async transparency(options: ReadExtras = {}): Promise<ConversionSyncTransparencyResponse> {
    return this.http.request<ConversionSyncTransparencyResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/transparency",
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // Wiring (#489 phase 2)
  // -------------------------------------------------------------------------

  /**
   * Whether this profile's ad sets are actually optimizing for the events
   * Atribu sends. Cached 6h; pass `force: "1"` to re-verify live against Meta
   * (several API calls — use sparingly).
   */
  async wiring(options: ConversionSyncWiringOptions = {}): Promise<ConversionSyncWiringResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncWiringResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/wiring",
      query,
      signal,
    });
  }

  /**
   * Re-verify wiring AND self-heal: a rule whose custom event has no working
   * Custom Conversion gets one created (#363). `exports:write` for that
   * reason — it is a write, not a cache bust.
   */
  async recheckWiring(
    input: ConversionSyncWiringRecheckInput = {},
    options: WriteExtras = {},
  ): Promise<ConversionSyncWiringRecheckResponse> {
    return this.http.request<ConversionSyncWiringRecheckResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/wiring/recheck",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * The ad sets a rule can be wired to. Pass `rule_id` (wire mode) or
   * `event_name` (create mode, before the rule exists).
   *
   * @deprecated Since 2026-10-21 (#2154). Use {@link campaignWiring}: campaigns
   * → ad sets with Meta's objective × event verdict, which this read never
   * checked. Still served; no removal date yet.
   */
  async candidateAdSets(
    options: ConversionSyncCandidateAdSetsOptions,
  ): Promise<ConversionSyncCandidateAdSetsResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncCandidateAdSetsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/wiring/candidate-ad-sets",
      query,
      signal,
    });
  }

  /**
   * Campaigns → ad sets with, per rule, whether each ad set can be connected
   * (objective × event compatibility, with reason and suggested event) and
   * whether connecting is an in-place edit or a Recreate (#2144).
   */
  async campaignWiring(
    options: ConversionSyncCampaignWiringOptions,
  ): Promise<ConversionSyncCampaignWiringResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncCampaignWiringResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/wiring/campaigns",
      query,
      signal,
    });
  }

  /**
   * In-place vs Recreate for one rule's offerable ad sets (#2173) — the
   * validate_only probes {@link campaignWiring} skips under `edit_mode: "skip"`.
   * Ad sets absent from the answer were not probed: treat them as `unknown`.
   */
  async campaignWiringEditModes(
    options: ConversionSyncCampaignWiringEditModesOptions,
  ): Promise<ConversionSyncCampaignWiringEditModesResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncCampaignWiringEditModesResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/wiring/campaigns/edit-modes",
      query,
      signal,
    });
  }

  /**
   * Point up to 20 ad sets at this rule's conversion event.
   *
   * Ad sets Meta froze at publish come back in `needs_duplicate_swap`
   * untouched — rebuilding (a Recreate) costs a new ad set id and a learning
   * reset, so it needs a second explicit yes: re-send with
   * `confirm_duplicate_swap: true`.
   *
   * #2207 — every ad set that will be recreated also needs its own answer in
   * `pause_original` (keyed by ad set id): `true` pauses the original once the
   * replacement is live, `false` leaves both running. No default on purpose;
   * a missing answer throws `validation_error` (400) naming the ad sets, with
   * nothing queued. In-place edits need no answer.
   *
   * #306 — with an API key or MCP user token, that second yes must also carry
   * `consent: { version, text_hash, accepted_by, accepted_at }` for the current
   * consent text (Partners → Automated duplicate-and-swap), or it throws
   * `consent_required` (409) with `error.consent` naming the current version.
   * Every rebuild is stated in `warnings`.
   */
  async wireAdSets(
    input: ConversionSyncWireAdSetsInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncWireAdSetsResponse> {
    return this.http.request<ConversionSyncWireAdSetsResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/wiring/ad-sets",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * The ad sets optimizing for a rule's Meta event NOW (#2150) — ask before
   * saving an edit that changes the event; the edit does not move them.
   */
  async rewirePreview(
    options: ConversionSyncRewirePreviewOptions,
  ): Promise<ConversionSyncRewirePreviewResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncRewirePreviewResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/wiring/rewire",
      query,
      signal,
    });
  }

  /**
   * After saving the edit (#2150): re-wire the accepted ad sets to the rule's
   * new event as one background operation (Recreates), or record the decline.
   * A `rewire` needs `pause_original` on every ad set it moves (#2207).
   */
  async rewire(
    input: ConversionSyncRewireInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncRewireResponse> {
    return this.http.request<ConversionSyncRewireResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/wiring/rewire",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Declined re-wires each rule still owes (#2150). */
  async pendingRewires(options: ReadExtras = {}): Promise<ConversionSyncPendingRewiresResponse> {
    return this.http.request<ConversionSyncPendingRewiresResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/wiring/rewires",
      signal: options.signal,
    });
  }

  /**
   * The profile's recent background ad-set move operations (#2143), newest
   * first, each with per-ad-set progress.
   */
  async operations(options: ConversionSyncOperationsOptions = {}): Promise<ConversionSyncOperationsResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncOperationsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/operations",
      query,
      signal,
    });
  }

  /** One background operation's per-ad-set progress (#2143). Poll while `running`. */
  async operation(operationId: string, options: ReadExtras = {}): Promise<ConversionSyncOperationResponse> {
    return this.http.request<ConversionSyncOperationResponse>({
      method: "GET",
      path: `/api/v1/conversion-sync/operations/${encodeURIComponent(operationId)}`,
      signal: options.signal,
    });
  }

  /** Re-queue ONE failed ad set of an operation (#2143). */
  async retryOperationItem(
    operationId: string,
    itemId: string,
    options: WriteExtras = {},
  ): Promise<ConversionSyncOperationItemRetryResponse> {
    return this.http.request<ConversionSyncOperationItemRetryResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/operations/${encodeURIComponent(operationId)}/items/${encodeURIComponent(itemId)}/retry`,
      body: {},
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Create this rule's Meta Custom Conversion. Idempotent. */
  async createCustomConversion(
    input: ConversionSyncCreateCustomConversionInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncCreateCustomConversionResponse> {
    return this.http.request<ConversionSyncCreateCustomConversionResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/wiring/custom-conversions",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Create the fixed "Purchase — new customer" Custom Conversion (W6a). */
  async createNewCustomerPurchaseConversion(
    input: ConversionSyncNewCustomerPurchaseConversionInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncNewCustomerPurchaseConversionResponse> {
    return this.http.request<ConversionSyncNewCustomerPurchaseConversionResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/wiring/new-customer-purchase-conversion",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Which event a WhatsApp dataset's ad sets should optimize on: the deepest
   * funnel step with ≥ 20 sent events a week, and the Custom Conversion that
   * names it.
   */
  async messagingOptimization(
    query: { destination_id: string },
    options: ReadExtras = {},
  ): Promise<ConversionSyncMessagingOptimizationResponse> {
    return this.http.request<ConversionSyncMessagingOptimizationResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/messaging-optimization",
      query,
      signal: options.signal,
    });
  }

  /** Create the Custom Conversion covering every booking (InitiateCheckout OR OrderCreated). */
  async createMessagingBookingConversion(
    input: ConversionSyncMessagingBookingConversionInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncMessagingBookingConversionResponse> {
    return this.http.request<ConversionSyncMessagingBookingConversionResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/messaging-optimization/booking-conversion",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // Platform-Safe Mode (#489 phase 3)
  // -------------------------------------------------------------------------

  /** Clean Dataset delivery volume + Meta learning-phase progress. */
  async platformSafeStatus(options: ReadExtras = {}): Promise<PlatformSafeStatusResponse> {
    return this.http.request<PlatformSafeStatusResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/platform-safe/status",
      signal: options.signal,
    });
  }

  /** Have the OLD dirty datasets actually stopped receiving events? */
  async platformSafeCutover(options: ReadExtras = {}): Promise<PlatformSafeCutoverResponse> {
    return this.http.request<PlatformSafeCutoverResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/platform-safe/cutover",
      signal: options.signal,
    });
  }

  /** The safe floor plus this profile's opted-in `custom_data` fields. */
  async platformSafeAllowlist(options: ReadExtras = {}): Promise<PlatformSafeAllowlistResponse> {
    return this.http.request<PlatformSafeAllowlistResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/platform-safe/allowlist",
      signal: options.signal,
    });
  }

  /**
   * Add or remove one opted-in field. Owners and admins only; a field name
   * that reads as health or medical context is refused server-side whatever
   * the client shows.
   */
  async updatePlatformSafeAllowlist(
    input: PlatformSafeAllowlistInput,
    options: WriteExtras = {},
  ): Promise<PlatformSafeAllowlistResponse> {
    return this.http.request<PlatformSafeAllowlistResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/platform-safe/allowlist",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // The remaining writes (#489 phase 4)
  // -------------------------------------------------------------------------

  /**
   * Save the BAA/HIPAA compliance REVIEW. Not acceptance — signing a DPA or
   * BAA is `client.legal.acceptDpa()` / `acceptBaa()`, which refuses a key.
   * Owners and admins only when the caller is a person.
   */
  async saveLegal(
    input: ConversionSyncLegalWriteInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncLegalWriteResponse> {
    return this.http.request<ConversionSyncLegalWriteResponse>({
      method: "PUT",
      path: "/api/v1/conversion-sync/legal",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Attach a signed agreement. `multipart/form-data`: pass a `FormData` with
   * `document_name` plus a `file` and/or an `external_url`.
   */
  async uploadLegalDocument(
    form: FormData,
    options: WriteExtras = {},
  ): Promise<ConversionSyncLegalDocumentResponse> {
    return this.http.request<ConversionSyncLegalDocumentResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/legal/documents",
      body: form,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Re-queue failed / dead-lettered / skipped exports. */
  async replayExports(
    input: ConversionSyncReplayInput = {},
    options: WriteExtras = {},
  ): Promise<ConversionSyncReplayResponse> {
    return this.http.request<ConversionSyncReplayResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/replay",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Generate the agency's one-link client onboarding URL. Refuses an API key:
   * the row records the person who generated it.
   */
  async createSetupLink(
    options: WriteExtras = {},
  ): Promise<ConversionSyncSetupLinkWriteResponse> {
    return this.http.request<ConversionSyncSetupLinkWriteResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/setup-links",
      body: {},
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Revive a link after a partial Meta grant. The URL does not change. */
  async requestSetupLinkFix(
    linkId: string,
    options: WriteExtras = {},
  ): Promise<ConversionSyncSetupLinkFixResponse> {
    return this.http.request<ConversionSyncSetupLinkFixResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/setup-links/${encodeURIComponent(linkId)}/request-fix`,
      body: {},
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Propose a Custom Audience stack. Uploads nothing to Meta. */
  async proposeAudience(
    input: ConversionSyncAudienceProposeInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncAudienceProposeResponse> {
    return this.http.request<ConversionSyncAudienceProposeResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/audiences",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // Dataset reconciliation + match quality (#489 phase 5)
  // -------------------------------------------------------------------------

  /**
   * Meta's Event Match Quality per destination. Messaging datasets return
   * Atribu's identifier-coverage proxy instead (`emq: null`), never a
   * fabricated score — Meta does not score non-web events.
   */
  async datasetQuality(
    options: ConversionSyncDatasetQualityOptions = {},
  ): Promise<ConversionSyncDatasetQualityResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncDatasetQualityResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/dataset-quality",
      query,
      signal,
    });
  }

  /** The EMQ plus the reasons: parameter gap, sent volume, history, causes. */
  async matchQuality(
    options: ConversionSyncMatchQualityOptions = {},
  ): Promise<ConversionSyncMatchQualityResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncMatchQualityResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/match-quality",
      query,
      signal,
    });
  }

  /**
   * Per live Sync Rule that sends to Meta: did Meta accept a real event (trace
   * id present) in the last 7 days — `accepted` / `waiting` / `failing` — plus
   * each Meta destination's cached Event Match Quality. No Meta call.
   */
  async verify(options: ReadExtras = {}): Promise<ConversionSyncVerifyResponse> {
    return this.http.request<ConversionSyncVerifyResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/verify",
      signal: options.signal,
    });
  }

  /**
   * What else sends to the profile's Meta datasets: Meta Pixels and Customer
   * Labs on the landing pages (fetched server-side, no JavaScript), and events
   * Meta counted that Atribu did not send, over the last 7 complete days.
   */
  async otherSenders(options: ReadExtras = {}): Promise<ConversionSyncOtherSendersResponse> {
    return this.http.request<ConversionSyncOtherSendersResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/other-senders",
      signal: options.signal,
    });
  }

  /**
   * #2689 — per UTC day, what a Sync Rule in Meta dry run would have sent
   * against the dataset's own count for one event. No Meta call.
   */
  async metaParity(options: ConversionSyncMetaParityOptions): Promise<ConversionSyncMetaParityResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncMetaParityResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/meta-parity",
      query,
      signal,
    });
  }

  /** The parameter gap as an action list. Cache-only; no Meta call. */
  async emqRecommendations(
    options: ReadExtras = {},
  ): Promise<ConversionSyncEmqRecommendationsResponse> {
    return this.http.request<ConversionSyncEmqRecommendationsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/emq-recommendations",
      signal: options.signal,
    });
  }

  /**
   * Re-send recent conversions with every identifier Atribu can now supply.
   * Safe against double-counting: each event carries an `event_id` Meta
   * deduplicates on.
   */
  async resendForEmq(
    input: ConversionSyncEmqResendInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncEmqResendResponse> {
    return this.http.request<ConversionSyncEmqResendResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/emq-recommendations/resend",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * The Events Manager Overview table, reconciled against what Atribu sends
   * — including the events it does NOT send, which is the point.
   */
  async dataset(
    options: ConversionSyncDatasetOptions = {},
  ): Promise<ConversionSyncDatasetResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncDatasetResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/dataset",
      query,
      signal,
    });
  }

  /**
   * Per data source (WhatsApp, website pixel, Instagram): whether the Meta dataset is
   * wired, what blocks it, and a 30-day preview of what it would export.
   * `creation: "on_request"` means connecting only reports `ready` — the
   * dataset is created by {@link ensureDataSource}. Never calls Meta.
   */
  async dataSources(options: ReadExtras = {}): Promise<ConversionSyncDataSourcesResponse> {
    return this.http.request<ConversionSyncDataSourcesResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/data-sources",
      signal: options.signal,
    });
  }

  /**
   * `whatsapp`: create (201) or confirm (200) the WhatsApp Business Account's
   * Meta dataset and its Conversions API destination. `instagram`: the same,
   * on the connected Instagram professional account. `website`: attach one of
   * the ad account's EXISTING pixels (`{ dataset_id }`) — never creates one. Idempotent — a retry never creates
   * twice. Exports start from this moment (`export_from`); history is never
   * sent.
   */
  async ensureDataSource(
    kind: "whatsapp" | "website" | "instagram",
    input: { dataset_id?: string } = {},
    options: WriteExtras = {},
  ): Promise<ConversionSyncDataSourceEnsureResponse> {
    return this.http.request<ConversionSyncDataSourceEnsureResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/data-sources/${encodeURIComponent(kind)}/ensure`,
      ...(input.dataset_id !== undefined ? { body: input } : {}),
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * #1764 — every connectable Meta data source on the profile (WhatsApp,
   * Messenger, Instagram, website), with its asset and any dataset already
   * wired. Step 1 of «Connect a data source». Never calls Meta.
   */
  async dataSourceOptions(options: ReadExtras = {}): Promise<ConversionSyncDataSourceOptionsResponse> {
    return this.http.request<ConversionSyncDataSourceOptionsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/data-source-options",
      signal: options.signal,
    });
  }

  /**
   * #1764 — create (201) or retrieve (200) the Meta dataset for one data
   * source and wire it as a Conversions API destination. `website` creates a
   * NEW pixel named `name`; `manual_dataset_id` skips Meta. Idempotent on the
   * stored dataset id.
   */
  async createDataset(
    input: ConversionSyncCreateDatasetInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncCreatedDatasetResponse> {
    return this.http.request<ConversionSyncCreatedDatasetResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/datasets",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // Campaign Blueprints (#489 phase 6)
  // -------------------------------------------------------------------------

  /**
   * Everything the blueprint planner needs in one read: account currency,
   * event candidates ranked deepest-first, copyable ads, past blueprints,
   * live graduation proposals, retargeting tiers.
   *
   * A profile with no usable Meta connection answers `blocked` with empty
   * lists rather than pretending the account has nothing in it.
   */
  async blueprints(
    options: ReadExtras = {},
  ): Promise<ConversionSyncBlueprintContextResponse> {
    return this.http.request<ConversionSyncBlueprintContextResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/blueprints",
      signal: options.signal,
    });
  }

  /**
   * Build the Testing + Winners tree. Seven preflights run before the first
   * Meta write, and each answers 200 with `outcome: "refused"` — a refusal
   * guarantees nothing was created. `idempotency_key` is required and a
   * replay reports the existing tree rather than re-running the refusals.
   */
  async createBlueprint(
    input: ConversionSyncBlueprintCreateInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncBlueprintCreateResponse> {
    return this.http.request<ConversionSyncBlueprintCreateResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/blueprints",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Search Meta's ad interests for a challenger cell. An empty `interests`
   * with a non-null `blocked` means the search COULD NOT RUN — not that
   * nothing matched.
   */
  async blueprintInterests(
    options: ConversionSyncBlueprintInterestsOptions,
  ): Promise<ConversionSyncBlueprintInterestsResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncBlueprintInterestsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/blueprints/interests",
      query,
      signal,
    });
  }

  /**
   * Graduate a winning Testing cell into Winners.
   *
   * **Refuses an API key (403)** — the one `money`-tier operation here, and
   * the executor requires a human on the record before spend starts.
   */
  async promoteBlueprintCell(
    blueprintId: string,
    input: ConversionSyncBlueprintPromoteInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncBlueprintPromoteResponse> {
    return this.http.request<ConversionSyncBlueprintPromoteResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/blueprints/${encodeURIComponent(blueprintId)}/promote`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Arm or disarm the daily graduation pass for one blueprint.
   *
   * **Enabling refuses an API key (403); disabling does not** — the stored
   * actor is what the pass later hands the `money` gate, so arming with no
   * one on record would silently refuse every promotion afterwards.
   */
  async setBlueprintAutoGraduate(
    blueprintId: string,
    input: ConversionSyncBlueprintAutoGraduateInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncBlueprintAutoGraduateResponse> {
    return this.http.request<ConversionSyncBlueprintAutoGraduateResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/blueprints/${encodeURIComponent(blueprintId)}/auto-graduate`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Reject a graduation proposal. Never touches Meta. */
  async dismissBlueprintGraduation(
    graduationId: string,
    options: WriteExtras = {},
  ): Promise<ConversionSyncBlueprintDismissGraduationResponse> {
    return this.http.request<ConversionSyncBlueprintDismissGraduationResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/blueprints/graduations/${encodeURIComponent(graduationId)}/dismiss`,
      body: {},
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // The Meta action layer (#489 phase 7)
  // -------------------------------------------------------------------------

  /**
   * Every active ad set with a directional scale call.
   *
   * Budgets are MINOR units — divide by `minor_per_major`, never by a
   * hardcoded 100. When `currency_unavailable` is true the unit is unknown
   * and no currency symbol should be printed; when `fatigue_unavailable` is
   * true the signal that would override a `room_to_scale` verdict could not
   * be read.
   */
  async scaling(
    options: ConversionSyncScalingOptions = {},
  ): Promise<ConversionSyncScalingResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversionSyncScalingResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/scaling",
      query,
      signal,
    });
  }

  /**
   * Change one ad set's daily budget.
   *
   * **Refuses an API key (403)** — tier `money`. The undo below deliberately
   * does not carry that restriction.
   */
  async applyScalingBudget(
    input: ConversionSyncScalingApplyInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncScalingApplyResponse> {
    return this.http.request<ConversionSyncScalingApplyResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/scaling/apply",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Ad sets optimizing on an event shallower than one they already earn. */
  async optimization(
    options: ReadExtras = {},
  ): Promise<ConversionSyncOptimizationResponse> {
    return this.http.request<ConversionSyncOptimizationResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/optimization",
      signal: options.signal,
    });
  }

  /**
   * Undo an applied Meta action. Accepts an API key — undoing is the safe
   * direction, and an undo an agent cannot reach will not happen in time.
   */
  async rollbackAction(
    actionId: string,
    options: WriteExtras = {},
  ): Promise<ConversionSyncActionRollbackResponse> {
    return this.http.request<ConversionSyncActionRollbackResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/actions/${encodeURIComponent(actionId)}/rollback`,
      body: {},
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // The LAST conversion-sync slice (#489 phase 8)
  // -------------------------------------------------------------------------

  /**
   * Everything the Conversion Sync setup surface renders, in one request:
   * conversion definitions and their 7-day volumes, destinations with a
   * computed readiness diagnosis, connections, privacy settings, the cached
   * Meta Dataset Quality verdicts, and webhook liveness.
   */
  async catalog(options: ReadExtras = {}): Promise<ConversionSyncCatalogResponse> {
    return this.http.request<ConversionSyncCatalogResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/catalog",
      signal: options.signal,
    });
  }

  /**
   * The Outcome Catalog (#2146): the profile's outcomes by Source (web, CRM,
   * payments, messaging) with 7/30-day volume per Source, and every CRM
   * pipeline stage grouped by pipeline with the outcome it already counts as.
   */
  async outcomeCatalog(options: ReadExtras = {}): Promise<ConversionSyncOutcomeCatalogResponse> {
    return this.http.request<ConversionSyncOutcomeCatalogResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/outcome-catalog",
      signal: options.signal,
    });
  }

  /**
   * Replace the profile's privacy and export settings.
   *
   * `privacy_config` is REQUIRED and the write REPLACES it — send the config
   * you want to keep, or `{}` to clear every filter. Changing `privacy_mode`
   * needs a workspace owner or admin when the caller is a person; re-writing
   * the same mode does not.
   */
  async saveCatalogSettings(
    input: ConversionSyncCatalogWriteInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncCatalogWriteResponse> {
    return this.http.request<ConversionSyncCatalogWriteResponse>({
      method: "PUT",
      path: "/api/v1/conversion-sync/catalog",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Answer «does this business handle health data?» (#2209). `no` →
   * `standard`; `platform_safe_clean` / `platform_safe_existing` →
   * `platform_safe` with that target; `hipaa` → `hipaa`. Stamps
   * `health_data_answered_at`. Database only — a Clean Dataset is created by
   * `provisionPlatformSafe()` (`clean_dataset_provisioned` says whether one
   * exists). Changing the mode or target needs a workspace owner or admin when
   * the caller is a person.
   */
  async answerHealthDataQuestion(
    input: ConversionSyncHealthDataAnswerInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncHealthDataAnswerResponse> {
    return this.http.request<ConversionSyncHealthDataAnswerResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/health-data-answer",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** The connected ad account's campaigns, live from Meta. */
  async campaigns(options: ReadExtras = {}): Promise<ConversionSyncCampaignsResponse> {
    return this.http.request<ConversionSyncCampaignsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/campaigns",
      signal: options.signal,
    });
  }

  /**
   * Create a campaign, PAUSED. It never delivers and never spends — the action
   * definition forces the status. `already_existed` tells a retry apart from a
   * fresh create.
   */
  async createCampaign(
    input: ConversionSyncCampaignCreateInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncCampaignCreateResponse> {
    return this.http.request<ConversionSyncCampaignCreateResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/campaigns",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Upload a proposed audience to Meta — THE consent moment. `proposeAudience`
   * uploads nothing; this does. The seed is rebuilt fresh, so what reaches Meta
   * is what is true now rather than what was true when the proposal was made.
   *
   * Answers **428 `audience_tos_required`** when Meta has no record that the ad
   * account accepted its Custom Audience terms. No retry fixes that — the
   * advertiser has to accept them in Meta Ads Manager.
   */
  async confirmAudience(
    audienceId: string,
    options: WriteExtras = {},
  ): Promise<ConversionSyncAudienceConfirmResponse> {
    return this.http.request<ConversionSyncAudienceConfirmResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/audiences/${encodeURIComponent(audienceId)}/confirm`,
      body: {},
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Pause, resume, or delete a managed audience (children first on a delete). */
  /** The partner customer-list audience — its state and whether this profile can have one. */
  async customerListAudience(options: ReadExtras = {}): Promise<PartnerCustomerListAudienceStatusResponse> {
    return this.http.request<PartnerCustomerListAudienceStatusResponse>({
      method: "GET",
      path: "/api/v1/partner/audiences/customer-list",
      signal: options.signal,
    });
  }

  /** Create the customer-list audience (needs the current consent). Idempotent per profile. */
  async createCustomerListAudience(
    input: PartnerCustomerListAudienceCreateInput,
    options: WriteExtras = {},
  ): Promise<PartnerCustomerListAudienceStatusResponse> {
    return this.http.request<PartnerCustomerListAudienceStatusResponse>({
      method: "POST",
      path: "/api/v1/partner/audiences/customer-list",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Add the 1 % lookalike to the customer list. */
  async addCustomerListLookalike(
    input: PartnerCustomerListLookalikeInput,
    options: WriteExtras = {},
  ): Promise<PartnerCustomerListAudienceStatusResponse> {
    return this.http.request<PartnerCustomerListAudienceStatusResponse>({
      method: "POST",
      path: "/api/v1/partner/audiences/customer-list/lookalike",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Delete the customer list and its lookalike in Meta. */
  async deleteCustomerListAudience(options: WriteExtras = {}): Promise<PartnerCustomerListAudienceStatusResponse> {
    return this.http.request<PartnerCustomerListAudienceStatusResponse>({
      method: "DELETE",
      path: "/api/v1/partner/audiences/customer-list",
      signal: options.signal,
    });
  }

  async manageAudience(
    audienceId: string,
    input: ConversionSyncAudienceManageInput,
    options: WriteExtras = {},
  ): Promise<ConversionSyncAudienceManageResponse> {
    return this.http.request<ConversionSyncAudienceManageResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/audiences/${encodeURIComponent(audienceId)}/manage`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Provision the Platform-Safe Clean Dataset and its neutral conversions.
   *
   * Two shapes at 200, discriminated by `status`: `provisioned` /
   * `already_provisioned` (idempotent — answered from Atribu's database, no
   * Meta call), or `action_required` with the manual steps when the grant
   * lacks `ads_management` or the ad account's one self-created-pixel slot is
   * taken. Neither is fixable by retrying. Every 200 carries `checks`.
   * An API key must switch the profile to `platform_safe` first
   * (`saveCatalogSettings`), or gets `409 platform_safe_required`.
   * A Clean Dataset that exists after the call sets the profile's
   * `platform_safe_target` to `clean` (#1669) — prefer `setPlatformSafeTarget`,
   * which also lists the ad sets to recreate.
   * Owners and admins only when the caller is a person.
   */
  async provisionPlatformSafe(
    input: PlatformSafeProvisionInput = {},
    options: WriteExtras = {},
  ): Promise<PlatformSafeProvisionResponse> {
    return this.http.request<PlatformSafeProvisionResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/platform-safe/provision",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Switch where a Platform-Safe profile's scrubbed Meta feed goes (#1669).
   *
   * `existing` (the default) sends to the ordinary Meta dataset(s), so the
   * live ad sets keep optimizing with no recreation. `clean` is the
   * remediation once Meta restricts that dataset: it provisions the Clean
   * Dataset, flips the target (even on an `action_required` provision — the
   * profile then sends Meta nothing until a Clean Dataset exists), and lists
   * the ad sets to recreate. Needs the accepted DPA (`409 dpa_required`). Going back to `existing` is refused with `409
   * clean_dataset_has_live_ad_sets` while Clean Dataset ad sets still deliver,
   * unless `confirm_live_ad_sets: true`. Only in `platform_safe` mode (`409
   * platform_safe_required`); owners and admins only when the caller is a person.
   */
  async setPlatformSafeTarget(
    input: PlatformSafeTargetInput,
    options: WriteExtras = {},
  ): Promise<PlatformSafeTargetResponse> {
    return this.http.request<PlatformSafeTargetResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/platform-safe/target",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * «Enviar conversiones a Meta» — turn a health profile's Meta sending on or
   * off (`export_meta_enabled`). A newly provisioned Clean Dataset starts OFF.
   * `enabled: true` is a signed-in owner/admin's act only (a key gets `403`)
   * and needs the accepted DPA (`409 dpa_required`) and, in Platform-Safe, the
   * Clean Dataset (`409 invalid_state`); `false` is always allowed.
   */
  async setPlatformSafeSending(
    input: PlatformSafeSendingInput,
    options: WriteExtras = {},
  ): Promise<PlatformSafeSendingResponse> {
    return this.http.request<PlatformSafeSendingResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/platform-safe/sending",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * #2296 — the profile's Clean Datasets: the default row plus every
   * per-service row, with its route and Meta's dataset name.
   */
  async platformSafeServiceDatasets(options: ReadExtras = {}): Promise<PlatformSafeServiceDatasetsResponse> {
    return this.http.request<PlatformSafeServiceDatasetsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/platform-safe/service-datasets",
      signal: options.signal,
    });
  }

  /**
   * #2296 — attach a per-service Clean Dataset, adopted by id: share it with
   * the ad account, create its neutral custom conversions, insert the service
   * row. `dry_run: true` performs every read and no write. Operator-only.
   */
  async addPlatformSafeServiceDataset(
    input: PlatformSafeServiceDatasetAddInput,
    options: WriteExtras = {},
  ): Promise<PlatformSafeServiceDatasetAddResponse> {
    return this.http.request<PlatformSafeServiceDatasetAddResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/platform-safe/service-datasets",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * #2296 — the profile's lead landing pages over 30 days (host + first path
   * segment; never a query string) and the Clean Dataset each goes to.
   */
  async platformSafeLandingPages(options: ReadExtras = {}): Promise<PlatformSafeLandingPagesResponse> {
    return this.http.request<PlatformSafeLandingPagesResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/platform-safe/landing-pages",
      signal: options.signal,
    });
  }

  /**
   * #2353 — the Google Ads account's live conversion actions, and which one is
   * the profile's default Google Clean Destination.
   */
  async googleConversionActions(options: ReadExtras = {}): Promise<GoogleConversionActionsResponse> {
    return this.http.request<GoogleConversionActionsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/google/conversion-actions",
      signal: options.signal,
    });
  }

  /**
   * #2353 — provision the default Google Clean Destination: create-or-adopt
   * «Atribu · Lead» (secondary, Import from clicks) by its coded name, or adopt
   * `conversion_action_id`. Idempotent. Operator-only.
   */
  async provisionGoogleConversionAction(
    input: GoogleConversionActionProvisionInput = {},
    options: WriteExtras = {},
  ): Promise<GoogleConversionActionProvisionResponse> {
    return this.http.request<GoogleConversionActionProvisionResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/google/conversion-actions",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * #2354 — the Google goal step's preview: every ENABLED campaign with the
   * conversion action(s) it bids on now, the action an assign would make its
   * only primary, the learning warning (7–14 days) and the latest changes.
   */
  async googleCampaignGoals(
    query: { destination_id?: string } = {},
    options: ReadExtras = {},
  ): Promise<GoogleCampaignGoalsResponse> {
    return this.http.request<GoogleCampaignGoalsResponse>({
      method: "GET",
      path: "/api/v1/conversion-sync/google/campaign-goals",
      query,
      signal: options.signal,
    });
  }

  /**
   * #2354 — make Atribu's Conversion Action ONE campaign's only primary goal,
   * in place and synchronously. `confirm: true` is required. Audited with the
   * previous goal; revert with {@link revertGoogleCampaignGoal}. Operator-only.
   */
  async assignGoogleCampaignGoal(
    input: GoogleCampaignGoalAssignInput,
    options: WriteExtras = {},
  ): Promise<GoogleCampaignGoalChangeResponse> {
    return this.http.request<GoogleCampaignGoalChangeResponse>({
      method: "POST",
      path: "/api/v1/conversion-sync/google/campaign-goals/assign",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** #2354 — restore the goal config an assign's audit entry recorded. Operator-only. */
  async revertGoogleCampaignGoal(changeId: string, options: WriteExtras = {}): Promise<GoogleCampaignGoalChangeResponse> {
    return this.http.request<GoogleCampaignGoalChangeResponse>({
      method: "POST",
      path: `/api/v1/conversion-sync/google/campaign-goals/changes/${encodeURIComponent(changeId)}/revert`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * #2357 — edit a per-service Google Clean Destination's route (campaign ids,
   * landing pages, pipelines, label). The key is immutable. Operator-only.
   */
  async updateGoogleServiceDestination(
    key: string,
    input: GoogleServiceDestinationUpdateInput,
    options: WriteExtras = {},
  ): Promise<GoogleServiceDestinationUpdateResponse> {
    return this.http.request<GoogleServiceDestinationUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/conversion-sync/google/service-destinations/${encodeURIComponent(key)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * #2362 — map the site's own Google tag label (`send_to`) to an Outcome; the
   * Google destination adopts the label's conversion action (resolved from its
   * tag snippet, or `conversion_action_id`). Refused on Platform-Safe. Operator-only.
   */
  async mapGoogleTagLabel(
    input: GoogleTagLabelMapInput,
    options: WriteExtras = {},
  ): Promise<GoogleTagLabelMapResponse> {
    return this.http.request<GoogleTagLabelMapResponse>({
      method: "PUT",
      path: "/api/v1/conversion-sync/google/tag-labels",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * #2391 — turn a System-generated Clean Dataset on (`system_generated`) or off
   * (`automatic`): one Clean Dataset (`dataset_id`) or all of the profile's.
   * Operator-only.
   */
  async setPlatformSafeCleanDatasetActionSource(
    input: PlatformSafeCleanDatasetActionSourceInput,
    options: WriteExtras = {},
  ): Promise<PlatformSafeCleanDatasetActionSourceResponse> {
    return this.http.request<PlatformSafeCleanDatasetActionSourceResponse>({
      method: "PUT",
      path: "/api/v1/conversion-sync/platform-safe/clean-datasets/action-source",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** #2296 — edit a service Clean Dataset's route. The key is immutable. Operator-only. */
  async updatePlatformSafeServiceDataset(
    key: string,
    input: PlatformSafeServiceDatasetUpdateInput,
    options: WriteExtras = {},
  ): Promise<PlatformSafeServiceDatasetUpdateResponse> {
    return this.http.request<PlatformSafeServiceDatasetUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/conversion-sync/platform-safe/service-datasets/${encodeURIComponent(key)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }
}

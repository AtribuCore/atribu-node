/**
 * Attribution reads (#590) — model comparison, per-conversion explanation, and
 * the messaging-channel view. Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras } from "./common";

type ModelsQuery = paths["/api/v1/attribution/models"]["get"]["parameters"]["query"];
export type AttributionModelsResponse =
  paths["/api/v1/attribution/models"]["get"]["responses"][200]["content"]["application/json"];
export type AttributionModelsOptions = ModelsQuery & ReadExtras;

type ExploreQuery = paths["/api/v1/attribution/explore"]["get"]["parameters"]["query"];
export type AttributionExploreResponse =
  paths["/api/v1/attribution/explore"]["get"]["responses"][200]["content"]["application/json"];
export type AttributionExploreOptions = ExploreQuery & ReadExtras;

type MessagingQuery = paths["/api/v1/attribution/messaging"]["get"]["parameters"]["query"];
export type MessagingAttributionResponse =
  paths["/api/v1/attribution/messaging"]["get"]["responses"][200]["content"]["application/json"];
export type MessagingAttributionOptions = MessagingQuery & ReadExtras;

type MessagingKpiQuery =
  paths["/api/v1/attribution/messaging/kpi"]["get"]["parameters"]["query"];
export type MessagingKpiResponse =
  paths["/api/v1/attribution/messaging/kpi"]["get"]["responses"][200]["content"]["application/json"];
export type MessagingKpiOptions = MessagingKpiQuery & ReadExtras;

export type MessagingConversionChainResponse =
  paths["/api/v1/attribution/messaging/conversions/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type MessagingConversionChainOptions = ReadExtras;

export class AttributionResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * The same window scored under several models side by side — `models` is a
   * comma-separated list. What it answers is "how much does the answer depend
   * on the model", which is a different question from any single number.
   */
  async models(options: AttributionModelsOptions): Promise<AttributionModelsResponse> {
    const { signal, ...query } = options;
    return this.http.request<AttributionModelsResponse>({
      method: "GET",
      path: "/api/v1/attribution/models",
      query,
      signal,
    });
  }

  /**
   * One conversion's touch path and how the credit was split across it. Keyed
   * by `outcome_event_id`, not by conversion id.
   */
  async explore(options: AttributionExploreOptions): Promise<AttributionExploreResponse> {
    const { signal, ...query } = options;
    return this.http.request<AttributionExploreResponse>({
      method: "GET",
      path: "/api/v1/attribution/explore",
      query,
      signal,
    });
  }

  /**
   * Messaging-originated conversions bucketed by how confidently the ad is
   * known — `mode` runs from `exact_dm_ad` down to `organic_or_unknown`, and
   * the buckets are never merged.
   */
  async messaging(options: MessagingAttributionOptions): Promise<MessagingAttributionResponse> {
    const { signal, ...query } = options;
    return this.http.request<MessagingAttributionResponse>({
      method: "GET",
      path: "/api/v1/attribution/messaging",
      query,
      signal,
    });
  }

  /**
   * The messaging-cohort (DM Ads) headline numbers (#588) — spend,
   * conversations started, how many were intent-scored, how many scored
   * high-intent, and the resulting cost per high-intent conversation.
   *
   * A different source from {@link messaging}: the creative feature store's
   * messaging cohort rather than the modeled-credit ledger.
   *
   * CHECK `data.available` BEFORE READING THE NUMBERS. It resolves 200 with
   * `available: false` in two normal cases, each named in `unavailable_reason`:
   * `stale_window` (the range ends more than two days back, and the source is a
   * ROLLING aggregate whose numbers would silently describe a different period)
   * and `no_messaging_data`. Every metric is null in both — null, not 0, because
   * neither is a measurement.
   *
   * There is no previous-period parameter: the rolling source has no date-bound
   * breakdown to compute a delta from, so none is offered rather than accepted
   * and ignored.
   */
  async messagingKpi(options: MessagingKpiOptions): Promise<MessagingKpiResponse> {
    const { signal, ...query } = options;
    return this.http.request<MessagingKpiResponse>({
      method: "GET",
      path: "/api/v1/attribution/messaging/kpi",
      query,
      signal,
    });
  }

  /**
   * Every candidate ad the messaging attribution model scored for ONE
   * conversion, highest probability first — the drill behind a row of
   * {@link messaging}.
   *
   * `probability` is MODELLED credit, never cash, and is never folded into
   * ROAS. `evidence` is the model's own explanation blob and is opaque by
   * contract.
   *
   * REQUIRES `customers:read`, not `analytics:read`: the whole response is one
   * named person's conversion and `evidence` can carry the text of their
   * messages, so there is no aggregate half to serve without PII rights.
   *
   * A conversion belonging to another profile — and a malformed id — is a
   * **404**, never an empty chain: an empty `candidates` array means the
   * conversion is yours and nothing was scored for it.
   */
  async messagingConversion(
    id: string,
    options: MessagingConversionChainOptions = {},
  ): Promise<MessagingConversionChainResponse> {
    const { signal } = options;
    return this.http.request<MessagingConversionChainResponse>({
      method: "GET",
      path: `/api/v1/attribution/messaging/conversions/${encodeURIComponent(id)}`,
      signal,
    });
  }
}

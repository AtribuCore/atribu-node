/**
 * The DM Ads board (#646) — the click-to-message surface as one document.
 *
 * Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras } from "./common";

type BoardQuery = paths["/api/v1/dm-ads/board"]["get"]["parameters"]["query"];
export type DmAdsBoardResponse =
  paths["/api/v1/dm-ads/board"]["get"]["responses"][200]["content"]["application/json"];
export type DmAdsBoardOptions = BoardQuery & ReadExtras;

export class DmAdsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Everything the click-to-message board renders, in one call: the
   * messaging-cohort ad ranking with its creative and per-day series, the six
   * headline KPIs against the previous period of equal length, the messaging
   * funnel and its trend, and the creative patterns mined across this profile's
   * messaging ads.
   *
   * `campaigns:read`. Each ad's `sample_conversations` needs `customers:read`
   * ON TOP and is `null` — never `[]` — without it.
   *
   * TWO LEGS DO NOT HONOUR THE REQUESTED RANGE, by construction rather than by
   * omission: `funnel_trend` is always the 30 days ending at `date_to`, and
   * `patterns` is scored on the rolling `28d` creative window, because
   * `creative_feature_store` has no custom-range grain. Everything else is the
   * window you asked for.
   *
   * This is a heavier resource than `GET /api/v1/dm-ads`, not a superset of it
   * — reach for that one when all you need is the ranking.
   */
  async board(options: DmAdsBoardOptions): Promise<DmAdsBoardResponse> {
    const { signal, ...query } = options;
    return this.http.request<DmAdsBoardResponse>({
      method: "GET",
      path: "/api/v1/dm-ads/board",
      query,
      signal,
    });
  }
}

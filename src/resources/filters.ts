/**
 * Filter metadata (#588) — what a filter chip can be set to.
 *
 * Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras } from "./common";

type FilterValuesQuery = paths["/api/v1/filters/values"]["get"]["parameters"]["query"];
export type FilterValuesResponse =
  paths["/api/v1/filters/values"]["get"]["responses"][200]["content"]["application/json"];
export type FilterValuesOptions = FilterValuesQuery & ReadExtras;

export class FiltersResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * The distinct values of one filter dimension seen in the window, ranked by
   * frequency — the list a chip picker is built from.
   *
   * Only the five dimensions the engine can scope AD SPEND by are offered
   * (`channel`, `referrer`, `campaign`, `entry_page`, `goal`); anything else is
   * a 400. A filter spend cannot be scoped by makes every spend-derived ratio
   * wrong while still looking measured, so it is refused rather than answered.
   *
   * `count` ranks the list; it is not a reportable metric. `campaign` values are
   * platform campaign IDs, which is what the filter compares against — resolve
   * them through `analytics.campaigns()` for display.
   */
  async values(options: FilterValuesOptions): Promise<FilterValuesResponse> {
    const { signal, ...query } = options;
    return this.http.request<FilterValuesResponse>({
      method: "GET",
      path: "/api/v1/filters/values",
      query,
      signal,
    });
  }
}

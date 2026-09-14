/**
 * Tracking-quality reads (#590, #588, #642) — three reads, deliberately not
 * merged.
 *
 * {@link QualityResource.utm} scores TRAFFIC (anomalous or missing UTMs on
 * visits, plus ad ids that resolve to no known ad); {@link
 * QualityResource.attribution} scores CONVERSIONS (how many of the outcomes you
 * are counting could be attributed at all); {@link
 * QualityResource.instrumentationHealth} scores the PLUMBING those two are
 * measured through (is the tracker firing, is identity stitching, are click IDs
 * arriving). A profile can pass one and fail the others, which is exactly when
 * reading all three matters.
 *
 * Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

type UtmQuery = NonNullable<paths["/api/v1/quality/utm"]["get"]["parameters"]["query"]>;
export type QualityUtmResponse =
  paths["/api/v1/quality/utm"]["get"]["responses"][200]["content"]["application/json"];
export type QualityUtmOptions = UtmQuery & ReadExtras;

type UtmRefreshQuery = NonNullable<
  paths["/api/v1/quality/utm/refresh"]["post"]["parameters"]["query"]
>;
export type QualityUtmRefreshInput = NonNullable<
  paths["/api/v1/quality/utm/refresh"]["post"]["requestBody"]
>["content"]["application/json"];
export type QualityUtmRefreshResponse =
  paths["/api/v1/quality/utm/refresh"]["post"]["responses"][200]["content"]["application/json"];
export type QualityUtmRefreshOptions = UtmRefreshQuery & WriteExtras;

type UtmAnomaliesQuery = NonNullable<
  paths["/api/v1/quality/utm/anomalies"]["get"]["parameters"]["query"]
>;
export type QualityUtmAnomaliesResponse =
  paths["/api/v1/quality/utm/anomalies"]["get"]["responses"][200]["content"]["application/json"];
export type QualityUtmAnomaliesOptions = UtmAnomaliesQuery & ReadExtras;

type InstrumentationHealthQuery = NonNullable<
  paths["/api/v1/quality/instrumentation-health"]["get"]["parameters"]["query"]
>;
export type QualityInstrumentationHealthResponse =
  paths["/api/v1/quality/instrumentation-health"]["get"]["responses"][200]["content"]["application/json"];
export type QualityInstrumentationHealthOptions = InstrumentationHealthQuery & ReadExtras;

type AttributionQualityQuery =
  paths["/api/v1/quality/attribution"]["get"]["parameters"]["query"];
export type QualityAttributionResponse =
  paths["/api/v1/quality/attribution"]["get"]["responses"][200]["content"]["application/json"];
export type QualityAttributionOptions = AttributionQualityQuery & ReadExtras;

export class QualityResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * UTM health: malformed, missing and dangling parameters over the last
   * `days`.
   *
   * `days` is capped server-side at the Ephemeral Buffer's retention (30) —
   * this read is over `events_enriched`, and offering a range longer than the
   * table keeps would answer with a silent hole rather than an error.
   */
  async utm(options: QualityUtmOptions = {}): Promise<QualityUtmResponse> {
    const { signal, ...query } = options;
    return this.http.request<QualityUtmResponse>({
      method: "GET",
      path: "/api/v1/quality/utm",
      query,
      signal,
    });
  }

  /**
   * Instrumentation health (#642): whether the measurement itself can be
   * trusted — six signals, a 0-100 `score`, a `verdict`, and `missing`, the
   * machine-readable list of what is dead or incomplete.
   *
   * READ IT BEFORE ACTING ON A COVERAGE OR ROAS NUMBER. A low traceable-cash
   * percentage means "great organic" when `tracking_healthy` is true and
   * "broken tracking" when it is false, and the two call for opposite
   * responses; `coverage_interpretation` states which.
   *
   * This is byte-for-byte the `instrumentation` leg of {@link
   * AnalyticsResource.trust}. Use `trust()` when you want the coverage number
   * and this caveat together over one date range; use this when the WINDOW is
   * the question — re-checking after a fix, say, where `trust()` would make you
   * invent a date range and pay for two reads you do not render.
   *
   * `days` is capped server-side at the Ephemeral Buffer's retention (30) and
   * REJECTED beyond it: one of the six signals counts `events_enriched` rows,
   * and a silently narrowed window is a number that lies about what it
   * measured.
   */
  async instrumentationHealth(
    options: QualityInstrumentationHealthOptions = {},
  ): Promise<QualityInstrumentationHealthResponse> {
    const { signal, ...query } = options;
    return this.http.request<QualityInstrumentationHealthResponse>({
      method: "GET",
      path: "/api/v1/quality/instrumentation-health",
      query,
      signal,
    });
  }

  /**
   * Attribution coverage (#588): how many of the window's non-reversal
   * conversions carry enough tracking to be placed in the ad hierarchy.
   *
   * The three buckets PARTITION `total_conversions` — a real ad identifier, an
   * `fbclid` only, or nothing — so they sum to it. Unlike {@link utm} this read
   * is not bounded by the 30-day Ephemeral Buffer retention: it scans a durable
   * table, so any range up to 366 days is valid.
   *
   * `filter[<dimension>]=<operator>:<value>` narrows it to the same slice
   * `analytics.breakdown()` would report, so the coverage number reconciles
   * with a filtered dashboard.
   */
  async attribution(options: QualityAttributionOptions): Promise<QualityAttributionResponse> {
    const { signal, ...query } = options;
    return this.http.request<QualityAttributionResponse>({
      method: "GET",
      path: "/api/v1/quality/attribution",
      query,
      signal,
    });
  }

  /**
   * The per-issue breakdown behind {@link utm}'s `high_count` / `medium_count`
   * (#665): what each issue is, how much traffic it affects, the top offending
   * values observed, and the fix in prose.
   *
   * A CACHED read, exactly like {@link utm} — it never runs the scan. Call
   * {@link refreshUtm} first if you need a live answer, then call this; the
   * refresh deliberately answers with the summary only, so the breakdown is
   * always the second call.
   *
   * `refreshed_at` here dates THIS list and can be older than the badge's, on
   * the same profile: the daily cron recounts the badge cheaply and does not
   * recompute the breakdown. `null` means the deep scan has never run for this
   * window — not that the profile is clean.
   *
   * `severity` and `category` are open strings, not unions: the scan is a
   * database function that can gain a category without a version bump. Switch
   * on them with a default branch.
   */
  async utmAnomalies(
    options: QualityUtmAnomaliesOptions = {},
  ): Promise<QualityUtmAnomaliesResponse> {
    const { signal, ...query } = options;
    return this.http.request<QualityUtmAnomaliesResponse>({
      method: "GET",
      path: "/api/v1/quality/utm/anomalies",
      query,
      signal,
    });
  }

  /**
   * RUN the scan {@link utm} only reads the cache of (#536).
   *
   * Not a read: it is `attribution:write`-scoped because the underlying RPC is
   * VOLATILE and upserts the summary row. It also carries an hourly cap of six
   * on top of its rate-limit tier — one every ten minutes, matching the
   * server's idempotency window. A caller polling at that pace never trips it;
   * one sending `force: true` on every request does, so pass `force` only when
   * a fresh scan is genuinely wanted rather than as a default.
   *
   * `days` is a query parameter and `force` is the body — that is the route's
   * shape, because the cached row is KEYED on `days`.
   */
  async refreshUtm(
    input: QualityUtmRefreshInput = {},
    options: QualityUtmRefreshOptions = {},
  ): Promise<QualityUtmRefreshResponse> {
    const { signal, idempotencyKey, ...query } = options;
    return this.http.request<QualityUtmRefreshResponse>({
      method: "POST",
      path: "/api/v1/quality/utm/refresh",
      query,
      body: input,
      idempotencyKey,
      signal,
    });
  }
}

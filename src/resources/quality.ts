/**
 * Tracking-quality reads (#590, #588, #642, #1695, #1697) — deliberately not
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

type AdIdsQuery = paths["/api/v1/quality/ad-ids"]["get"]["parameters"]["query"];
export type QualityAdIdsResponse =
  paths["/api/v1/quality/ad-ids"]["get"]["responses"][200]["content"]["application/json"];
export type QualityAdIdsOptions = AdIdsQuery & ReadExtras;

type ItpQuery = paths["/api/v1/quality/itp"]["get"]["parameters"]["query"];
export type QualityItpResponse =
  paths["/api/v1/quality/itp"]["get"]["responses"][200]["content"]["application/json"];
export type QualityItpOptions = ItpQuery & ReadExtras;
export type QualityAdUrlTagsResponse =
  paths["/api/v1/quality/ad-ids/url-tags"]["get"]["responses"]["200"]["content"]["application/json"];
export type QualityAdUrlTagsApplyInput = NonNullable<
  paths["/api/v1/quality/ad-ids/url-tags/apply"]["post"]["requestBody"]
>["content"]["application/json"];
export type QualityAdUrlTagsApplyResponse =
  paths["/api/v1/quality/ad-ids/url-tags/apply"]["post"]["responses"]["200"]["content"]["application/json"];
export type QualityAdUrlTagsUndoInput = NonNullable<
  paths["/api/v1/quality/ad-ids/url-tags/undo"]["post"]["requestBody"]
>["content"]["application/json"];
export type QualityAdUrlTagsUndoResponse =
  paths["/api/v1/quality/ad-ids/url-tags/undo"]["post"]["responses"]["200"]["content"]["application/json"];

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
   * Ad-id coverage (#1695): what share of paid clicks name the ad that
   * produced them, per platform, with the reason for every one that does not —
   * and `ads.missing_macro`, each active Meta ad whose URL parameters lack
   * `{{ad.id}}`, with the suggested replacement.
   *
   * Ad-level credit exists only for Touches with an ad id, so this is the
   * ceiling on every ad-level number. Durable tables only: any range up to 366
   * days is valid.
   */
  async adIds(options: QualityAdIdsOptions): Promise<QualityAdIdsResponse> {
    const { signal, ...query } = options;
    return this.http.request<QualityAdIdsResponse>({
      method: "GET",
      path: "/api/v1/quality/ad-ids",
      query,
      signal,
    });
  }

  /**
   * Safari ITP exposure (#1697): what share of browser traffic Safari's 7-day
   * storage cap applies to (every iPhone/iPad browser, in-app ones included,
   * and Safari on Mac), whether the profile's collector protects it, observed
   * evidence of lost visitor ids, and a `recommendation`. Reads the last 90
   * days of the range; `narrowed` says when that is shorter than asked.
   */
  async itp(options: QualityItpOptions): Promise<QualityItpResponse> {
    const { signal, ...query } = options;
    return this.http.request<QualityItpResponse>({
      method: "GET",
      path: "/api/v1/quality/itp",
      query,
      signal,
    });
  }

  /**
   * Whether this profile can apply Atribu's URL parameters to its Meta ads
   * from Atribu (#1696), and the change log with undo availability. No Meta
   * call. `can_apply: false` with `write_permission: "missing"` means the Meta
   * connection is read-only: show the parameters to copy instead.
   */
  async adUrlTags(options: ReadExtras = {}): Promise<QualityAdUrlTagsResponse> {
    return this.http.request<QualityAdUrlTagsResponse>({
      method: "GET",
      path: "/api/v1/quality/ad-ids/url-tags",
      signal: options.signal,
    });
  }

  /**
   * Write Atribu's URL parameters onto up to 25 Meta ads, merged with each
   * ad's own (#1696). Replaces each ad's creative with one built from the same
   * post — a Meta "significant edit" that can restart learning — so
   * `acknowledge_learning_reset: true` is required on every call. One result
   * per ad; a Meta refusal is that ad's `failed` result, not a throw.
   */
  async applyAdUrlTags(
    input: QualityAdUrlTagsApplyInput,
    options: WriteExtras = {},
  ): Promise<QualityAdUrlTagsApplyResponse> {
    return this.http.request<QualityAdUrlTagsApplyResponse>({
      method: "POST",
      path: "/api/v1/quality/ad-ids/url-tags/apply",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Put one ad back on its previous creative — and so its previous URL parameters (#1696). */
  async undoAdUrlTags(
    input: QualityAdUrlTagsUndoInput,
    options: WriteExtras = {},
  ): Promise<QualityAdUrlTagsUndoResponse> {
    return this.http.request<QualityAdUrlTagsUndoResponse>({
      method: "POST",
      path: "/api/v1/quality/ad-ids/url-tags/undo",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
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

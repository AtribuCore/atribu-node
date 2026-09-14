/**
 * Goal / conversion definitions (#588).
 *
 * Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

export type GoalDefinitionsResponse =
  paths["/api/v1/goals/definitions"]["get"]["responses"][200]["content"]["application/json"];
export type GoalDefinitionsOptions = ReadExtras;

type GoalDefinitionSuggestionsQuery = NonNullable<
  paths["/api/v1/goals/definitions/suggestions"]["get"]["parameters"]["query"]
>;
export type GoalDefinitionSuggestionsResponse =
  paths["/api/v1/goals/definitions/suggestions"]["get"]["responses"][200]["content"]["application/json"];
export type GoalDefinitionSuggestionsOptions = GoalDefinitionSuggestionsQuery & ReadExtras;

export type GoalDefinitionPreviewBody = NonNullable<
  paths["/api/v1/goals/definitions/preview"]["post"]["requestBody"]
>["content"]["application/json"];
export type GoalDefinitionPreviewResponse =
  paths["/api/v1/goals/definitions/preview"]["post"]["responses"][200]["content"]["application/json"];

export type GoalDefinitionDiffBody = NonNullable<
  paths["/api/v1/goals/definitions/diff"]["post"]["requestBody"]
>["content"]["application/json"];
export type GoalDefinitionDiffResponse =
  paths["/api/v1/goals/definitions/diff"]["post"]["responses"][200]["content"]["application/json"];

// #675 — the CRUD over `conversion_definitions`, at `goals:write`.
//
// SIBLINGS of `/api/v1/goals/definitions`, not methods on `/api/v1/goals`. That
// older collection still exists and still works; it simply cannot express what
// these do — no UPDATE, `conversion_key` derived from the display name, no
// `lookback_window_days`, no `is_default`, no source-event uniqueness check, no
// audit row and no replay.
export type ConversionDefinitionCreateInput = NonNullable<
  paths["/api/v1/goals/definitions"]["post"]["requestBody"]
>["content"]["application/json"];
export type ConversionDefinitionUpdateInput = NonNullable<
  paths["/api/v1/goals/definitions/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
export type ConversionDefinitionWriteResponse =
  paths["/api/v1/goals/definitions"]["post"]["responses"][200]["content"]["application/json"];
export type ConversionDefinitionDeleteResponse =
  paths["/api/v1/goals/definitions/{id}"]["delete"]["responses"][200]["content"]["application/json"];

/** `?days=` on the two candidate dry-runs. */
export interface GoalDefinitionWindowOptions extends ReadExtras {
  days?: string;
}

// #645 — the windowed half. Unlike the catalogue above this one HAS a query,
// and its date range is required.
type OutcomeCountsQuery = paths["/api/v1/goals/outcome-counts"]["get"]["parameters"]["query"];
export type OutcomeCountsResponse =
  paths["/api/v1/goals/outcome-counts"]["get"]["responses"][200]["content"]["application/json"];
export type OutcomeCountsOptions = OutcomeCountsQuery & ReadExtras;

export class GoalsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Both definition catalogs in one response, because which one to use is the
   * thing that gets confused.
   *
   * `conversion_definitions` are the actual CONVERSION TYPES, with
   * `revenue_type` and `attribution_eligible` — build a goal selector from
   * these, and match `conversion_key` against the `goal` filter dimension.
   * `outcome_definitions` are CRM pipeline-stage LABELS; they name the buckets
   * outcome COUNTS are keyed by and carry no revenue semantics.
   *
   * A READ at `analytics:read`. It is not the write-scoped CRUD collection.
   */
  async definitions(options: GoalDefinitionsOptions = {}): Promise<GoalDefinitionsResponse> {
    const { signal } = options;
    return this.http.request<GoalDefinitionsResponse>({
      method: "GET",
      path: "/api/v1/goals/definitions",
      signal,
    });
  }

  /**
   * Outcome events this profile RECEIVES that no conversion definition claims
   * — the gap between what Atribu stores and what it counts (#647).
   *
   * Every row is a candidate for `POST /api/v1/goals`. The three numbers
   * (frequency, value, distinct customers) are what justify defining it;
   * `suggested_revenue_type` is a guess from the event NAME and is routinely
   * wrong for a house vocabulary.
   *
   * Reads `outcome_events`, a durable table, so the window is not clamped.
   */
  async definitionSuggestions(
    options: GoalDefinitionSuggestionsOptions = {},
  ): Promise<GoalDefinitionSuggestionsResponse> {
    const { signal, ...query } = options;
    return this.http.request<GoalDefinitionSuggestionsResponse>({
      method: "GET",
      path: "/api/v1/goals/definitions/suggestions",
      query,
      signal,
    });
  }

  /**
   * What a candidate definition WOULD have captured over the window (#647).
   *
   * **`revenue_sum` is not revenue.** It is the raw event-value total; whether
   * any of it reaches ROAS depends on `revenue_type` and `attribution_eligible`,
   * which this preview deliberately does not apply. Label it "value of matching
   * events".
   *
   * A read at `analytics:read` despite being a POST — the body is a definition
   * that may never be saved.
   */
  async previewDefinition(
    body: GoalDefinitionPreviewBody,
    options: GoalDefinitionWindowOptions = {},
  ): Promise<GoalDefinitionPreviewResponse> {
    const { signal, ...query } = options;
    return this.http.request<GoalDefinitionPreviewResponse>({
      method: "POST",
      path: "/api/v1/goals/definitions/preview",
      query,
      body,
      signal,
    });
  }

  /**
   * Before and after, over the same window, for a change to one definition
   * (#647).
   *
   * Send `definition_id` to diff against a saved definition; omit it and every
   * `*_before` field is **null** rather than 0 — "this did not exist" and "it
   * captured nothing" are different facts.
   *
   * `removed_event_names` is the field to surface prominently: those events
   * stop being counted as conversions unless another definition claims them.
   */
  async diffDefinition(
    body: GoalDefinitionDiffBody,
    options: GoalDefinitionWindowOptions = {},
  ): Promise<GoalDefinitionDiffResponse> {
    const { signal, ...query } = options;
    return this.http.request<GoalDefinitionDiffResponse>({
      method: "POST",
      path: "/api/v1/goals/definitions/diff",
      query,
      body,
      signal,
    });
  }

  /**
   * How many of each outcome type happened in a window (#645) — the numbers a
   * goal selector ranks its options by.
   *
   * READ IT WITH {@link definitions}, never instead of it. This returns counts
   * keyed by `outcome_events.event_type`; `conversion_definitions` remains the
   * goal CATALOGUE, and `conversion_key` is what a `goal` filter matches on.
   * The two vocabularies usually coincide and are not the same thing.
   *
   * A type with no events in the window is ABSENT from `counts`, not present
   * with 0 — read a missing key as "none".
   *
   * These are raw outcome events: not deduplicated against conversions, no
   * revenue, no attribution filter. For attributed outcomes and credited
   * revenue use `analytics.breakdown()` or `analytics.overview()`.
   */
  async outcomeCounts(options: OutcomeCountsOptions): Promise<OutcomeCountsResponse> {
    const { signal, ...query } = options;
    return this.http.request<OutcomeCountsResponse>({
      method: "GET",
      path: "/api/v1/goals/outcome-counts",
      query,
      signal,
    });
  }

  /**
   * Define a conversion (#675).
   *
   * `conversion_key` is REQUIRED and is taken verbatim — it is what a `goal`
   * filter matches on (`conversions.conversion_type`), so it is an identity,
   * not a slug of the label.
   *
   * **Source event names are unique across the profile.** An overlap is 409 and
   * the message names the definition that already claims the event.
   *
   * **This changes the PAST.** One full-profile replay is queued, so periods
   * already reported gain (or lose) conversions. Preview with
   * {@link previewDefinition} first.
   */
  async createDefinition(
    input: ConversionDefinitionCreateInput,
    options: WriteExtras = {},
  ): Promise<ConversionDefinitionWriteResponse> {
    return this.http.request<ConversionDefinitionWriteResponse>({
      method: "POST",
      path: "/api/v1/goals/definitions",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Edit one definition (#675). PARTIAL: send only what changed.
   *
   * The uniqueness check excludes the row being edited, so re-saving an
   * unchanged definition never conflicts with itself. Look at
   * `removed_event_names` from {@link diffDefinition} before saving — those
   * events stop being counted as conversions unless another definition claims
   * them.
   */
  async updateDefinition(
    id: string,
    input: ConversionDefinitionUpdateInput,
    options: WriteExtras = {},
  ): Promise<ConversionDefinitionWriteResponse> {
    return this.http.request<ConversionDefinitionWriteResponse>({
      method: "PATCH",
      path: `/api/v1/goals/definitions/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Delete one definition (#675).
   *
   * The events it claimed stop producing conversions entirely unless another
   * definition claims them, retroactively — one full-profile replay is queued.
   */
  async deleteDefinition(
    id: string,
    options: WriteExtras = {},
  ): Promise<ConversionDefinitionDeleteResponse> {
    return this.http.request<ConversionDefinitionDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/goals/definitions/${encodeURIComponent(id)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }
}

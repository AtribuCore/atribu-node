/**
 * Conversion exports (#590) — destinations, the delivery ledger, and triggering
 * a run. Responses are the full envelope (`./common.ts`); the ledger carries
 * both `pagination.cursor` and `status_counts`.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

export type ExportDestinationsResponse =
  paths["/api/v1/exports/destinations"]["get"]["responses"][200]["content"]["application/json"];

/** `window` / `from` / `to` set the period `delivery_stats` counts; all optional. */
type ExportRulesQuery = NonNullable<paths["/api/v1/exports/rules"]["get"]["parameters"]["query"]>;
export type ExportRulesOptions = ExportRulesQuery & ReadExtras;

type LedgerQuery = NonNullable<
  paths["/api/v1/exports/ledger"]["get"]["parameters"]["query"]
>;
export type ExportLedgerResponse =
  paths["/api/v1/exports/ledger"]["get"]["responses"][200]["content"]["application/json"];
export type ExportLedgerOptions = LedgerQuery & ReadExtras;

export type ExportTriggerInput = NonNullable<
  paths["/api/v1/exports"]["post"]["requestBody"]
>["content"]["application/json"];
export type ExportTriggerResponse =
  paths["/api/v1/exports"]["post"]["responses"][202]["content"]["application/json"];

export type ExportBatchResponse =
  paths["/api/v1/exports/{id}"]["get"]["responses"][200]["content"]["application/json"];

// ---------------------------------------------------------------------------
// #1059 — the configuration half: destinations (write), signal rules, the dry
// run and the Meta test send.
//
// The ORDER these are meant to be called in is destination → rule → test →
// export, and it is not a style preference: `create()` above enqueues
// correctly against a profile with no destination and no enabled rule, and
// ships nothing at all, because the pipeline has nowhere to send to and no
// mapping to send. There is no default mapping.
// ---------------------------------------------------------------------------

export type ExportDestinationCreateInput = NonNullable<
  paths["/api/v1/exports/destinations"]["post"]["requestBody"]
>["content"]["application/json"];
export type ExportDestinationCreateResponse =
  paths["/api/v1/exports/destinations"]["post"]["responses"][201]["content"]["application/json"];

export type ExportDestinationUpdateInput = NonNullable<
  paths["/api/v1/exports/destinations/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
export type ExportDestinationUpdateResponse =
  paths["/api/v1/exports/destinations/{id}"]["patch"]["responses"][200]["content"]["application/json"];

export type ExportDestinationDisableResponse =
  paths["/api/v1/exports/destinations/{id}"]["delete"]["responses"][200]["content"]["application/json"];

export type ExportRulesResponse =
  paths["/api/v1/exports/rules"]["get"]["responses"][200]["content"]["application/json"];

export type ExportRuleCreateInput = NonNullable<
  paths["/api/v1/exports/rules"]["post"]["requestBody"]
>["content"]["application/json"];
export type ExportRuleCreateResponse =
  paths["/api/v1/exports/rules"]["post"]["responses"][201]["content"]["application/json"];

export type ExportRulesBulkCreateInput = NonNullable<
  paths["/api/v1/exports/rules/bulk"]["post"]["requestBody"]
>["content"]["application/json"];
export type ExportRulesBulkCreateResponse =
  paths["/api/v1/exports/rules/bulk"]["post"]["responses"][200]["content"]["application/json"];

export type ExportRuleUpdateInput = NonNullable<
  paths["/api/v1/exports/rules/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
export type ExportRuleUpdateResponse =
  paths["/api/v1/exports/rules/{id}"]["patch"]["responses"][200]["content"]["application/json"];

export type ExportRuleDeleteResponse =
  paths["/api/v1/exports/rules/{id}"]["delete"]["responses"][200]["content"]["application/json"];

export type ExportRulePreviewInput = NonNullable<
  paths["/api/v1/exports/rules/preview"]["post"]["requestBody"]
>["content"]["application/json"];
export type ExportRulePreviewResponse =
  paths["/api/v1/exports/rules/preview"]["post"]["responses"][200]["content"]["application/json"];

export type ExportTestSendInput = NonNullable<
  paths["/api/v1/exports/test"]["post"]["requestBody"]
>["content"]["application/json"];
export type ExportTestSendResponse =
  paths["/api/v1/exports/test"]["post"]["responses"][200]["content"]["application/json"];

// ---------------------------------------------------------------------------
// #489 — the REVIEW surface, folded off the internal
// `/api/tracking/exports/review`. Distinct from `ledger()` above: this one
// hydrates the conversion each delivery carries, so it can answer "which SALE
// failed to reach Meta" rather than "how many deliveries were there".
// ---------------------------------------------------------------------------

type ExportReviewQuery = NonNullable<
  paths["/api/v1/exports/review"]["get"]["parameters"]["query"]
>;
export type ExportReviewOptions = ExportReviewQuery & ReadExtras;
export type ExportReviewResponse =
  paths["/api/v1/exports/review"]["get"]["responses"][200]["content"]["application/json"];
export type ExportReviewWarningsResponse =
  paths["/api/v1/exports/review/warnings"]["get"]["responses"][200]["content"]["application/json"];
export type ExportRetryInput = NonNullable<
  paths["/api/v1/exports/review/retry"]["post"]["requestBody"]
>["content"]["application/json"];
export type ExportRetryResponse =
  paths["/api/v1/exports/review/retry"]["post"]["responses"][200]["content"]["application/json"];

export class ExportsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** The export destinations configured for the profile, and their state. */
  async destinations(options: ReadExtras = {}): Promise<ExportDestinationsResponse> {
    return this.http.request<ExportDestinationsResponse>({
      method: "GET",
      path: "/api/v1/exports/destinations",
      signal: options.signal,
    });
  }

  /** Per-delivery history: what shipped, what was skipped, and why. */
  async ledger(options: ExportLedgerOptions = {}): Promise<ExportLedgerResponse> {
    const { signal, ...query } = options;
    return this.http.request<ExportLedgerResponse>({
      method: "GET",
      path: "/api/v1/exports/ledger",
      query,
      signal,
    });
  }

  /**
   * Schedule an export run — by date range OR by explicit `conversion_ids`,
   * never both. Returns `202` with a batch id; poll {@link get} for the outcome.
   *
   * This QUEUES work, it does not send: dedup, the privacy guard, the platform
   * staleness window and the retry ceiling all live in the export pipeline, and
   * `counts.enqueued` counts deliveries SCHEDULED, never events a platform
   * received.
   *
   * `require_approval: true` queues NOTHING and answers the same `202` with a
   * hand-off in `data` instead of a batch (#1050) — give `data.handoff.url` to
   * a person and poll `client.handoffs.get(data.handoff.id)`. The response type
   * is a union; narrow on `data.status === "awaiting_approval"`.
   */
  async create(
    input: ExportTriggerInput,
    options: WriteExtras = {},
  ): Promise<ExportTriggerResponse> {
    return this.http.request<ExportTriggerResponse>({
      method: "POST",
      path: "/api/v1/exports",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** One export batch and what it did. */
  async get(id: string, options: ReadExtras = {}): Promise<ExportBatchResponse> {
    return this.http.request<ExportBatchResponse>({
      method: "GET",
      path: `/api/v1/exports/${encodeURIComponent(id)}`,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // Destinations (write) — step 1 of destination → rule → test → export
  // -------------------------------------------------------------------------

  /**
   * Point this profile's conversions at a Meta dataset/pixel or a Google Ads
   * conversion action. `connection_id` must name a connection on this profile
   * whose provider matches the kind.
   */
  async createDestination(
    input: ExportDestinationCreateInput,
    options: WriteExtras = {},
  ): Promise<ExportDestinationCreateResponse> {
    return this.http.request<ExportDestinationCreateResponse>({
      method: "POST",
      path: "/api/v1/exports/destinations",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Partial update. `destination_config` is deep-merged, so a patch that sends
   * only `signal_quality` cannot blank the `data_source` the dataset wizard
   * wrote. `destination` itself is immutable.
   */
  async updateDestination(
    id: string,
    input: ExportDestinationUpdateInput,
    options: WriteExtras = {},
  ): Promise<ExportDestinationUpdateResponse> {
    return this.http.request<ExportDestinationUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/exports/destinations/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * SOFT disable — the row survives with `enabled = false`, because the
   * deliveries ledger references it. Re-enable with
   * {@link updateDestination}(`{ enabled: true }`).
   */
  async disableDestination(
    id: string,
    options: WriteExtras = {},
  ): Promise<ExportDestinationDisableResponse> {
    return this.http.request<ExportDestinationDisableResponse>({
      method: "DELETE",
      path: `/api/v1/exports/destinations/${encodeURIComponent(id)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // Signal rules — step 2
  // -------------------------------------------------------------------------

  /**
   * The mapping layer the export pipeline iterates: which conversion becomes
   * which platform event. A profile with no enabled rule produces no export
   * candidates at all — there is no default mapping.
   */
  async rules(options: ExportRulesOptions = {}): Promise<ExportRulesResponse> {
    const { signal, ...query } = options;
    return this.http.request<ExportRulesResponse>({
      method: "GET",
      path: "/api/v1/exports/rules",
      query,
      signal,
    });
  }

  /** Map one conversion definition (or pipeline stage) to a platform event. */
  async createRule(
    input: ExportRuleCreateInput,
    options: WriteExtras = {},
  ): Promise<ExportRuleCreateResponse> {
    return this.http.request<ExportRuleCreateResponse>({
      method: "POST",
      path: "/api/v1/exports/rules",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Create up to 50 rules at once (#2147). All-or-report: one result per row,
   * `created` or `rejected` with its reason — a bad row never blocks the rest.
   * Pass an `idempotencyKey` so a retried confirm replays the first report.
   */
  async createRules(
    input: ExportRulesBulkCreateInput,
    options: WriteExtras = {},
  ): Promise<ExportRulesBulkCreateResponse> {
    return this.http.request<ExportRulesBulkCreateResponse>({
      method: "POST",
      path: "/api/v1/exports/rules/bulk",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Partial update. `source_kind` is immutable; set `archived_at` to retire. */
  async updateRule(
    id: string,
    input: ExportRuleUpdateInput,
    options: WriteExtras = {},
  ): Promise<ExportRuleUpdateResponse> {
    return this.http.request<ExportRuleUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/exports/rules/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Hard delete — refused with `409` once the rule has export history, because
   * the ledger records every event sent under it. Archive instead.
   */
  async deleteRule(
    id: string,
    options: WriteExtras = {},
  ): Promise<ExportRuleDeleteResponse> {
    return this.http.request<ExportRuleDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/exports/rules/${encodeURIComponent(id)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Dry run: how many source records this rule would have matched in the last
   * 7 days. An upper bound on its effect, never a forecast of deliveries.
   */
  async previewRule(
    input: ExportRulePreviewInput,
    options: WriteExtras = {},
  ): Promise<ExportRulePreviewResponse> {
    return this.http.request<ExportRulePreviewResponse>({
      method: "POST",
      path: "/api/v1/exports/rules/preview",
      body: input,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // Test send — step 3
  // -------------------------------------------------------------------------

  /**
   * One synthetic event to the configured Meta dataset with a
   * `test_event_code`, so it lands in Events Manager → Test Events. Returns
   * Meta's response verbatim. Capped at 5 per profile per minute.
   *
   * `test_event_code` is REQUIRED (#2154): without it Meta would file the event
   * on the live dataset as a real conversion, so the API answers
   * `validation_error` (422) and never calls Meta.
   */
  async test(
    input: ExportTestSendInput,
    options: WriteExtras = {},
  ): Promise<ExportTestSendResponse> {
    return this.http.request<ExportTestSendResponse>({
      method: "POST",
      path: "/api/v1/exports/test",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** The delivery ledger with the conversion each row carries. */
  async review(options: ExportReviewOptions = {}): Promise<ExportReviewResponse> {
    const { signal, ...query } = options;
    return this.http.request<ExportReviewResponse>({
      method: "GET",
      path: "/api/v1/exports/review",
      query,
      signal,
    });
  }

  /** The same window reduced to a verdict. An empty `warnings` array is healthy. */
  async reviewWarnings(
    options: ExportReviewOptions = {},
  ): Promise<ExportReviewWarningsResponse> {
    const { signal, ...query } = options;
    return this.http.request<ExportReviewWarningsResponse>({
      method: "GET",
      path: "/api/v1/exports/review/warnings",
      query,
      signal,
    });
  }

  /**
   * Requeue failed / dead-letter exports. Sends nothing itself — it resets the
   * rows and enqueues one dispatch job for the pipeline-worker.
   */
  async retry(
    input: ExportRetryInput = {},
    options: WriteExtras = {},
  ): Promise<ExportRetryResponse> {
    return this.http.request<ExportRetryResponse>({
      method: "POST",
      path: "/api/v1/exports/review/retry",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }
}

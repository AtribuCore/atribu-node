/**
 * Reports (#590) — templates, schedules, deliveries, and generating or sending
 * one report. Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

export type ReportTemplatesResponse =
  paths["/api/v1/reports/templates"]["get"]["responses"][200]["content"]["application/json"];

export type ReportTemplateWriteInput = NonNullable<
  paths["/api/v1/reports/templates"]["post"]["requestBody"]
>["content"]["application/json"];
export type ReportTemplateCreateResponse =
  paths["/api/v1/reports/templates"]["post"]["responses"][201]["content"]["application/json"];

export type ReportTemplateUpdateInput = NonNullable<
  paths["/api/v1/reports/templates/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
export type ReportTemplateUpdateResponse =
  paths["/api/v1/reports/templates/{id}"]["patch"]["responses"][200]["content"]["application/json"];

export type ReportPreviewInput = NonNullable<
  paths["/api/v1/reports/preview"]["post"]["requestBody"]
>["content"]["application/json"];
export type ReportPreviewResponse =
  paths["/api/v1/reports/preview"]["post"]["responses"][200]["content"]["application/json"];

export type ReportSendTestInput = NonNullable<
  paths["/api/v1/reports/send-test"]["post"]["requestBody"]
>["content"]["application/json"];
export type ReportSendTestResponse =
  paths["/api/v1/reports/send-test"]["post"]["responses"][200]["content"]["application/json"];

export type ReportSchedulesResponse =
  paths["/api/v1/reports/schedules"]["get"]["responses"][200]["content"]["application/json"];

export type ReportScheduleInput = NonNullable<
  paths["/api/v1/reports/schedules"]["post"]["requestBody"]
>["content"]["application/json"];
/**
 * Create and update take the same `ReportScheduleWrite` body and return the
 * same `ReportSchedule`. Typed off the 200 rather than the 201 deliberately —
 * the two responses carry an identical schema, and pinning the type to the
 * status code would make the SDK lie the day the API settles on one.
 */
export type ReportScheduleResponse =
  paths["/api/v1/reports/schedules"]["post"]["responses"][200]["content"]["application/json"];

export type ReportScheduleUpdateInput = NonNullable<
  paths["/api/v1/reports/schedules/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
export type ReportScheduleUpdateResponse =
  paths["/api/v1/reports/schedules/{id}"]["patch"]["responses"][200]["content"]["application/json"];
export type ReportScheduleDeleteResponse =
  paths["/api/v1/reports/schedules/{id}"]["delete"]["responses"][200]["content"]["application/json"];

type ReportListQuery = NonNullable<
  paths["/api/v1/reports"]["get"]["parameters"]["query"]
>;
export type ReportListResponse =
  paths["/api/v1/reports"]["get"]["responses"][200]["content"]["application/json"];
export type ReportListOptions = ReportListQuery & ReadExtras;

type ScheduleChangesQuery = NonNullable<
  paths["/api/v1/reports/schedules/changes"]["get"]["parameters"]["query"]
>;
export type ReportScheduleChangesResponse =
  paths["/api/v1/reports/schedules/changes"]["get"]["responses"][200]["content"]["application/json"];
export type ReportScheduleChangesOptions = ScheduleChangesQuery & ReadExtras;

type DeliveriesQuery = NonNullable<
  paths["/api/v1/reports/deliveries"]["get"]["parameters"]["query"]
>;
export type ReportDeliveriesResponse =
  paths["/api/v1/reports/deliveries"]["get"]["responses"][200]["content"]["application/json"];
export type ReportDeliveriesOptions = DeliveriesQuery & ReadExtras;

type GenerateQuery = paths["/api/v1/reports/generate"]["post"]["parameters"]["query"];
export type ReportGenerateResponse =
  paths["/api/v1/reports/generate"]["post"]["responses"][200]["content"]["application/json"];
export type ReportGenerateOptions = GenerateQuery & WriteExtras;

export type ReportResponse =
  paths["/api/v1/reports/{id}"]["get"]["responses"][200]["content"]["application/json"];

export type ReportSendInput = NonNullable<
  paths["/api/v1/reports/{id}/send"]["post"]["requestBody"]
>["content"]["application/json"];
export type ReportSendResponse =
  paths["/api/v1/reports/{id}/send"]["post"]["responses"][200]["content"]["application/json"];

/**
 * #489 — the report-commentary AI assist, folded off the internal
 * `POST /api/reports/commentary/assist`.
 */
export type CommentaryAssistInput =
  paths["/api/v1/reports/commentary/assist"]["post"]["requestBody"]["content"]["application/json"];
export type CommentaryAssistResponse =
  paths["/api/v1/reports/commentary/assist"]["post"]["responses"][200]["content"]["application/json"];

export class ReportsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * The profile's generated reports, newest first.
   *
   * Summaries — identity, window, four headline numbers. Call {@link get} for
   * the full payload of one; a collection that inlined every document would
   * ship megabytes to answer which reports exist.
   */
  async list(options: ReportListOptions = {}): Promise<ReportListResponse> {
    const { signal, ...query } = options;
    return this.http.request<ReportListResponse>({
      method: "GET",
      path: "/api/v1/reports",
      query,
      signal,
    });
  }

  /** Report templates available to the profile, system defaults included. */
  async templates(options: ReadExtras = {}): Promise<ReportTemplatesResponse> {
    return this.http.request<ReportTemplatesResponse>({
      method: "GET",
      path: "/api/v1/reports/templates",
      signal: options.signal,
    });
  }

  /**
   * Create a report template. `is_default: true` atomically clears the
   * workspace's previous default — one round trip, not a create-then-clear a
   * concurrent call could interleave.
   */
  async createTemplate(
    input: ReportTemplateWriteInput,
    options: WriteExtras = {},
  ): Promise<ReportTemplateCreateResponse> {
    return this.http.request<ReportTemplateCreateResponse>({
      method: "POST",
      path: "/api/v1/reports/templates",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Partial update. Fields you omit are left alone. */
  async updateTemplate(
    id: string,
    input: ReportTemplateUpdateInput,
    options: WriteExtras = {},
  ): Promise<ReportTemplateUpdateResponse> {
    return this.http.request<ReportTemplateUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/reports/templates/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Delete a report template. 404s (not a silent no-op) when the id does not
   * resolve in your workspace. A schedule pinned to it falls through to the
   * workspace default, then the system default — not cleared here.
   */
  async deleteTemplate(id: string, options: WriteExtras = {}): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/api/v1/reports/templates/${encodeURIComponent(id)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
      expectEmpty: true,
    });
  }

  /**
   * Build report data for a window WITHOUT storing it — the exact same
   * builder `generate` uses, under either an existing template (`template_id`)
   * or an unsaved draft (`template_schema`; exactly one is required). Nothing
   * here shows up in {@link list}, and its `id` resolves against no other
   * call.
   */
  async preview(input: ReportPreviewInput, options: ReadExtras = {}): Promise<ReportPreviewResponse> {
    return this.http.request<ReportPreviewResponse>({
      method: "POST",
      path: "/api/v1/reports/preview",
      body: input,
      signal: options.signal,
    });
  }

  /**
   * Mail a test report over the trailing 7 days, under the profile's own
   * schedule model — never stored, unlike {@link send}. `recipients` defaults
   * to the schedule's own recipients; pass it to test a different list.
   */
  async sendTest(
    input: ReportSendTestInput = {},
    options: WriteExtras = {},
  ): Promise<ReportSendTestResponse> {
    return this.http.request<ReportSendTestResponse>({
      method: "POST",
      path: "/api/v1/reports/send-test",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** The profile's recurring report schedules. */
  async schedules(options: ReadExtras = {}): Promise<ReportSchedulesResponse> {
    return this.http.request<ReportSchedulesResponse>({
      method: "GET",
      path: "/api/v1/reports/schedules",
      signal: options.signal,
    });
  }

  async createSchedule(
    input: ReportScheduleInput,
    options: WriteExtras = {},
  ): Promise<ReportScheduleResponse> {
    return this.http.request<ReportScheduleResponse>({
      method: "POST",
      path: "/api/v1/reports/schedules",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  async updateSchedule(
    id: string,
    input: ReportScheduleUpdateInput,
    options: WriteExtras = {},
  ): Promise<ReportScheduleUpdateResponse> {
    return this.http.request<ReportScheduleUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/reports/schedules/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  async deleteSchedule(
    id: string,
    options: WriteExtras = {},
  ): Promise<ReportScheduleDeleteResponse> {
    return this.http.request<ReportScheduleDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/reports/schedules/${encodeURIComponent(id)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * The schedule's audit tail — what the cadence and recipient count were left
   * at by each change, and when. No actor and no addresses.
   */
  async scheduleChanges(
    options: ReportScheduleChangesOptions = {},
  ): Promise<ReportScheduleChangesResponse> {
    const { signal, ...query } = options;
    return this.http.request<ReportScheduleChangesResponse>({
      method: "GET",
      path: "/api/v1/reports/schedules/changes",
      query,
      signal,
    });
  }

  /** Delivery history — what was sent, to whom, and whether it landed. */
  async deliveries(options: ReportDeliveriesOptions = {}): Promise<ReportDeliveriesResponse> {
    const { signal, ...query } = options;
    return this.http.request<ReportDeliveriesResponse>({
      method: "GET",
      path: "/api/v1/reports/deliveries",
      query,
      signal,
    });
  }

  /**
   * Render a report for a window. The date range is a QUERY parameter on this
   * POST, not a body — that is the route's shape, not an oversight.
   */
  async generate(options: ReportGenerateOptions): Promise<ReportGenerateResponse> {
    const { signal, idempotencyKey, ...query } = options;
    return this.http.request<ReportGenerateResponse>({
      method: "POST",
      path: "/api/v1/reports/generate",
      query,
      idempotencyKey,
      signal,
    });
  }

  /** One rendered report. */
  async get(id: string, options: ReadExtras = {}): Promise<ReportResponse> {
    return this.http.request<ReportResponse>({
      method: "GET",
      path: `/api/v1/reports/${encodeURIComponent(id)}`,
      signal: options.signal,
    });
  }

  /**
   * Email a rendered report. This leaves the process and reaches real inboxes —
   * pass an `idempotencyKey` you control if a retry could cross a process
   * boundary.
   */
  async send(
    id: string,
    input: ReportSendInput,
    options: WriteExtras = {},
  ): Promise<ReportSendResponse> {
    return this.http.request<ReportSendResponse>({
      method: "POST",
      path: `/api/v1/reports/${encodeURIComponent(id)}/send`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Delete a stored report. Best-effort removes its rendered PDF artifact, if
   * one was ever generated; send-history rows that reference it survive with
   * `report_id: null` rather than disappearing.
   *
   * 404s (not silently no-ops) when the id does not resolve in your tenant.
   */
  async delete(id: string, options: WriteExtras = {}): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/api/v1/reports/${encodeURIComponent(id)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
      expectEmpty: true,
    });
  }

  /**
   * Sharpen a draft of a report's written commentary — tighter wording, less
   * filler, corrected grammar, in the language it was written in (#489).
   *
   * SPENDS the workspace's AI allowance. Needs `reports:write`.
   *
   * EVERY concrete number, name and claim in the draft is preserved. Supply
   * `data_context` (a compact summary of the report's own KPI numbers) and the
   * model may fill in a vague reference with the real figure and flag an
   * obvious typo — but where the draft and the data disagree it keeps the
   * DRAFT, because the author may know about reporting lag, platform
   * discrepancies or refunds the data does not reflect.
   *
   * Input and output are both sanitized to `<p> <strong> <em> <ul> <ol> <li>`.
   */
  async assistCommentary(
    input: CommentaryAssistInput,
    options: WriteExtras = {},
  ): Promise<CommentaryAssistResponse> {
    return this.http.request<CommentaryAssistResponse>({
      method: "POST",
      path: "/api/v1/reports/commentary/assist",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }
}

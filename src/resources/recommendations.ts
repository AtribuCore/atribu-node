/**
 * Recommendations (#590) — list, apply, dismiss, diagnose. Responses are the
 * full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

type ListQuery = NonNullable<paths["/api/v1/recommendations"]["get"]["parameters"]["query"]>;
export type RecommendationsResponse =
  paths["/api/v1/recommendations"]["get"]["responses"][200]["content"]["application/json"];
export type RecommendationsOptions = ListQuery & ReadExtras;

export type RecommendationApplyInput = NonNullable<
  paths["/api/v1/recommendations/{id}/apply"]["post"]["requestBody"]
>["content"]["application/json"];
export type RecommendationApplyResponse =
  paths["/api/v1/recommendations/{id}/apply"]["post"]["responses"][200]["content"]["application/json"];
/**
 * `require_approval: true` — nothing was applied and a human is being asked
 * (#1050). A separate type, not a widened `RecommendationApplyResponse`: the two
 * bodies answer different questions ("what happened" vs "who is deciding"), and
 * `apply()` returns the union so TypeScript makes the caller narrow on
 * `data.status === "awaiting_approval"` rather than reading `legs` off a body
 * that has none.
 */
export type RecommendationApplyAwaitingApprovalResponse =
  paths["/api/v1/recommendations/{id}/apply"]["post"]["responses"][202]["content"]["application/json"];

export type RecommendationDismissInput = NonNullable<
  paths["/api/v1/recommendations/{id}/dismiss"]["post"]["requestBody"]
>["content"]["application/json"];
export type RecommendationDismissResponse =
  paths["/api/v1/recommendations/{id}/dismiss"]["post"]["responses"][200]["content"]["application/json"];

export type RecommendationDiagnoseResponse =
  paths["/api/v1/recommendations/{id}/diagnose"]["get"]["responses"][200]["content"]["application/json"];

export class RecommendationsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Open recommendations for the profile, filterable by status / kind / risk. */
  async list(options: RecommendationsOptions = {}): Promise<RecommendationsResponse> {
    const { signal, ...query } = options;
    return this.http.request<RecommendationsResponse>({
      method: "GET",
      path: "/api/v1/recommendations",
      query,
      signal,
    });
  }

  /**
   * Execute a recommendation. Terminal — there is nothing to poll; the response
   * says what happened.
   *
   * The `Idempotency-Key` header is REQUIRED by this route and the transport
   * always sends one (generated when `idempotencyKey` is omitted). Pass your own
   * whenever the retry may cross a process boundary, since a fresh key on a
   * retry is a fresh apply attempt as far as the caller's own bookkeeping goes —
   * leg-level dedup still protects the money.
   *
   * `applied_by` is required for the budget kinds: money-tier changes never move
   * without a human on the record.
   *
   * `require_approval: true` applies NOTHING and answers `202` with a hand-off
   * instead — give `data.handoff.url` to a person and poll
   * `client.handoffs.get(data.handoff.id)`. Narrow on
   * `data.status === "awaiting_approval"`.
   */
  async apply(
    id: string,
    input: RecommendationApplyInput = {},
    options: WriteExtras = {},
  ): Promise<RecommendationApplyResponse | RecommendationApplyAwaitingApprovalResponse> {
    return this.http.request<
      RecommendationApplyResponse | RecommendationApplyAwaitingApprovalResponse
    >({
      method: "POST",
      path: `/api/v1/recommendations/${encodeURIComponent(id)}/apply`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Stop a recommendation surfacing. Idempotent. */
  async dismiss(
    id: string,
    input: RecommendationDismissInput = {},
    options: WriteExtras = {},
  ): Promise<RecommendationDismissResponse> {
    return this.http.request<RecommendationDismissResponse>({
      method: "POST",
      path: `/api/v1/recommendations/${encodeURIComponent(id)}/dismiss`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Why this recommendation exists — the evidence behind the score. */
  async diagnose(
    id: string,
    options: ReadExtras = {},
  ): Promise<RecommendationDiagnoseResponse> {
    return this.http.request<RecommendationDiagnoseResponse>({
      method: "GET",
      path: `/api/v1/recommendations/${encodeURIComponent(id)}/diagnose`,
      signal: options.signal,
    });
  }
}

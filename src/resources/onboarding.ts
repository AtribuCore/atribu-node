/**
 * Onboarding plans (#2438) — propose → owner approves → run, audited.
 *
 * An onboarding plan lists the operations to run for ONE profile, in order
 * (today: `meta_sending_on`). An agent or integration proposes it; a
 * **signed-in** workspace owner or admin approves it in the app — an API key
 * or an MCP token cannot approve (403); running an approved plan carries out
 * every operation once, each audited. Changing the operations after approval
 * withdraws it.
 *
 * ```ts
 * const plan = await client.onboarding.propose({ operations: [{ type: "meta_sending_on" }] });
 * // a person approves it in the app (or, signed in: client.onboarding.approve(plan.id, plan.content_hash))
 * const done = await client.onboarding.run(plan.id);
 * ```
 *
 * Methods unwrap `data`: a plan is one object an integrator acts on.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { WriteExtras } from "./common";

export type OnboardingPlan =
  paths["/api/v1/onboarding/plans/{id}"]["get"]["responses"][200]["content"]["application/json"]["data"];

export type OnboardingPlanList =
  paths["/api/v1/onboarding/plans"]["get"]["responses"][200]["content"]["application/json"]["data"];

export type OnboardingPlanProposeInput = NonNullable<
  paths["/api/v1/onboarding/plans"]["post"]["requestBody"]
>["content"]["application/json"];

export type OnboardingPlanUpdateInput = NonNullable<
  paths["/api/v1/onboarding/plans/{id}"]["put"]["requestBody"]
>["content"]["application/json"];

// #2443 — batches: one template, many profiles of a workspace, one approval.
export type OnboardingBatch =
  paths["/api/v1/workspaces/{workspaceId}/onboarding/batches/{id}"]["get"]["responses"][200]["content"]["application/json"]["data"];

export type OnboardingBatchList =
  paths["/api/v1/workspaces/{workspaceId}/onboarding/batches"]["get"]["responses"][200]["content"]["application/json"]["data"];

export type OnboardingBatchProposeInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/onboarding/batches"]["post"]["requestBody"]
>["content"]["application/json"];

const batchesPath = (workspaceId: string) => `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/onboarding/batches`;

export class OnboardingResource {
  constructor(private readonly http: HttpClientLike) {}

  /** The profile's plans, newest first (at most 50). */
  async plans(options: { signal?: AbortSignal } = {}): Promise<OnboardingPlanList> {
    const res = await this.http.request<{ data: OnboardingPlanList }>({
      method: "GET",
      path: "/api/v1/onboarding/plans",
      signal: options.signal,
    });
    return res.data;
  }

  /** One plan, with each operation's preflight and the plan's audit trail. */
  async plan(id: string, options: { signal?: AbortSignal } = {}): Promise<OnboardingPlan> {
    const res = await this.http.request<{ data: OnboardingPlan }>({
      method: "GET",
      path: `/api/v1/onboarding/plans/${encodeURIComponent(id)}`,
      signal: options.signal,
    });
    return res.data;
  }

  /** Propose a plan (`draft`). Nothing runs until a person approves it. */
  async propose(input: OnboardingPlanProposeInput, options: WriteExtras = {}): Promise<OnboardingPlan> {
    const res = await this.http.request<{ data: OnboardingPlan }>({
      method: "POST",
      path: "/api/v1/onboarding/plans",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /** Rename and/or replace the operations. A content change withdraws an approval. */
  async update(id: string, input: OnboardingPlanUpdateInput, options: WriteExtras = {}): Promise<OnboardingPlan> {
    const res = await this.http.request<{ data: OnboardingPlan }>({
      method: "PUT",
      path: `/api/v1/onboarding/plans/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Approve the plan exactly as shown — pass its `content_hash`. Signed-in
   * owner/admin only: an API key or an MCP token answers 403.
   */
  async approve(id: string, contentHash: string, options: WriteExtras = {}): Promise<OnboardingPlan> {
    const res = await this.http.request<{ data: OnboardingPlan }>({
      method: "POST",
      path: `/api/v1/onboarding/plans/${encodeURIComponent(id)}/approve`,
      body: { content_hash: contentHash },
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /** Run an approved plan, once. A second run answers 409. */
  async run(id: string, options: WriteExtras = {}): Promise<OnboardingPlan> {
    const res = await this.http.request<{ data: OnboardingPlan }>({
      method: "POST",
      path: `/api/v1/onboarding/plans/${encodeURIComponent(id)}/run`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  // -------------------------------------------------------------------------
  // #2443 — batches (workspace-scoped: a signed-in session or an MCP token)
  // -------------------------------------------------------------------------

  /** The workspace's onboarding batches, newest first, with per-clinic counts. */
  async batches(workspaceId: string, options: { signal?: AbortSignal } = {}): Promise<OnboardingBatchList> {
    const res = await this.http.request<{ data: OnboardingBatchList }>({
      method: "GET",
      path: batchesPath(workspaceId),
      signal: options.signal,
    });
    return res.data;
  }

  /** One batch with every clinic's plan; `preflight: true` adds each operation's preflight. */
  async batch(
    workspaceId: string,
    id: string,
    options: { preflight?: boolean; signal?: AbortSignal } = {},
  ): Promise<OnboardingBatch> {
    const res = await this.http.request<{ data: OnboardingBatch }>({
      method: "GET",
      path: `${batchesPath(workspaceId)}/${encodeURIComponent(id)}`,
      query: options.preflight ? { preflight: "true" } : undefined,
      signal: options.signal,
    });
    return res.data;
  }

  /** Propose one template for many profiles (`draft`). Nothing runs until a person approves the batch. */
  async proposeBatch(
    workspaceId: string,
    input: OnboardingBatchProposeInput,
    options: WriteExtras = {},
  ): Promise<OnboardingBatch> {
    const res = await this.http.request<{ data: OnboardingBatch }>({
      method: "POST",
      path: batchesPath(workspaceId),
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /** Approve the batch exactly as shown (its `content_hash`) — every clinic at once. Signed-in owner/admin only. */
  async approveBatch(
    workspaceId: string,
    id: string,
    contentHash: string,
    options: WriteExtras = {},
  ): Promise<OnboardingBatch> {
    const res = await this.http.request<{ data: OnboardingBatch }>({
      method: "POST",
      path: `${batchesPath(workspaceId)}/${encodeURIComponent(id)}/approve`,
      body: { content_hash: contentHash },
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /** Run an approved batch. Call again while `remaining > 0` (the batch stays `running`). */
  async runBatch(workspaceId: string, id: string, options: WriteExtras = {}): Promise<OnboardingBatch> {
    const res = await this.http.request<{ data: OnboardingBatch }>({
      method: "POST",
      path: `${batchesPath(workspaceId)}/${encodeURIComponent(id)}/run`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }
}

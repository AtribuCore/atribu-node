import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type ListResponse =
  paths["/api/v1/instagram/triggers"]["get"]["responses"][200]["content"]["application/json"];
type CreateBody = NonNullable<
  paths["/api/v1/instagram/triggers"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateResponse =
  paths["/api/v1/instagram/triggers"]["post"]["responses"][201]["content"]["application/json"];
type UpdateBody = NonNullable<
  paths["/api/v1/instagram/triggers/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
type UpdateResponse =
  paths["/api/v1/instagram/triggers/{id}"]["patch"]["responses"][200]["content"]["application/json"];
type TestDmBody = NonNullable<
  paths["/api/v1/instagram/triggers/{id}/test-dm"]["post"]["requestBody"]
>["content"]["application/json"];
type TestDmResponse =
  paths["/api/v1/instagram/triggers/{id}/test-dm"]["post"]["responses"][200]["content"]["application/json"];
type ResumeBody = NonNullable<
  paths["/api/v1/instagram/triggers/resume"]["post"]["requestBody"]
>["content"]["application/json"];
type ResumeResponse =
  paths["/api/v1/instagram/triggers/resume"]["post"]["responses"][200]["content"]["application/json"];

export type InstagramTrigger = ListResponse["data"][number];
export type InstagramTriggerCreateInput = CreateBody;
export type InstagramTriggerUpdateInput = UpdateBody;

export interface ListOptions {
  connectionId: string;
  signal?: AbortSignal;
}

export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ResumeOptions extends MutationOptions {
  connectionId: string;
}

export class InstagramTriggersResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(opts: ListOptions): Promise<InstagramTrigger[]> {
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: `/api/v1/instagram/triggers?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  async create(
    input: InstagramTriggerCreateInput,
    opts: MutationOptions = {},
  ): Promise<InstagramTrigger> {
    const res = await this.http.request<CreateResponse>({
      method: "POST",
      path: "/api/v1/instagram/triggers",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async update(
    id: string,
    input: InstagramTriggerUpdateInput,
    opts: MutationOptions = {},
  ): Promise<InstagramTrigger> {
    const res = await this.http.request<UpdateResponse>({
      method: "PATCH",
      path: `/api/v1/instagram/triggers/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async delete(id: string, opts: MutationOptions = {}): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/api/v1/instagram/triggers/${encodeURIComponent(id)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
      expectEmpty: true,
    });
  }

  /**
   * Send the trigger's `opening_message` as a one-off DM to a test IGSID.
   * Uses Meta's HUMAN_AGENT tag — recipient must have DMed the IG account
   * in the past 7 days, otherwise Meta rejects the send.
   */
  async testDm(
    id: string,
    input: TestDmBody,
    opts: MutationOptions = {},
  ): Promise<TestDmResponse["data"]> {
    const res = await this.http.request<TestDmResponse>({
      method: "POST",
      path: `/api/v1/instagram/triggers/${encodeURIComponent(id)}/test-dm`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Manually clear the comment-to-DM circuit breaker for the connection's
   * IG account. The breaker normally clears itself once spam signals
   * subside; this method exists for ops intervention.
   */
  async resumeCircuit(opts: ResumeOptions): Promise<ResumeResponse["data"]> {
    const body: ResumeBody = { connection_id: opts.connectionId };
    const res = await this.http.request<ResumeResponse>({
      method: "POST",
      path: "/api/v1/instagram/triggers/resume",
      body,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

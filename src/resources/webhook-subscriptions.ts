import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type ListResponse =
  paths["/api/v1/webhooks/subscriptions"]["get"]["responses"][200]["content"]["application/json"];
type CreateBody = NonNullable<
  paths["/api/v1/webhooks/subscriptions"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateResponse =
  paths["/api/v1/webhooks/subscriptions"]["post"]["responses"][201]["content"]["application/json"];
type UpdateBody = NonNullable<
  paths["/api/v1/webhooks/subscriptions/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
type UpdateResponse =
  paths["/api/v1/webhooks/subscriptions/{id}"]["patch"]["responses"][200]["content"]["application/json"];
type RotateBody = NonNullable<
  NonNullable<
    paths["/api/v1/webhooks/subscriptions/{id}/rotate-secret"]["post"]["requestBody"]
  >["content"]["application/json"]
>;
type RotateResponse =
  paths["/api/v1/webhooks/subscriptions/{id}/rotate-secret"]["post"]["responses"][200]["content"]["application/json"];
type TestResponse =
  paths["/api/v1/webhooks/test/{id}"]["post"]["responses"][200]["content"]["application/json"];

export type WebhookSubscription = ListResponse["data"][number];
export type WebhookSubscriptionWithSecret = CreateResponse["data"];
export type WebhookSubscriptionCreateInput = CreateBody;
export type WebhookSubscriptionUpdateInput = UpdateBody;
export type WebhookSubscriptionRotateOptions = RotateBody;
export type WebhookSubscriptionRotateResult = RotateResponse["data"];
export type WebhookSubscriptionTestResult = TestResponse["data"];

export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class WebhookSubscriptionsResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(opts: { signal?: AbortSignal } = {}): Promise<WebhookSubscription[]> {
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: "/api/v1/webhooks/subscriptions",
      signal: opts.signal,
    });
    return res.data;
  }

  async create(
    input: WebhookSubscriptionCreateInput,
    opts: MutationOptions = {},
  ): Promise<WebhookSubscriptionWithSecret> {
    const res = await this.http.request<CreateResponse>({
      method: "POST",
      path: "/api/v1/webhooks/subscriptions",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async update(
    id: string,
    input: WebhookSubscriptionUpdateInput,
    opts: MutationOptions = {},
  ): Promise<WebhookSubscription> {
    const res = await this.http.request<UpdateResponse>({
      method: "PATCH",
      path: `/api/v1/webhooks/subscriptions/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async delete(id: string, opts: MutationOptions = {}): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/api/v1/webhooks/subscriptions/${encodeURIComponent(id)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
      expectEmpty: true,
    });
  }

  async rotateSecret(
    id: string,
    options: WebhookSubscriptionRotateOptions = {},
    opts: MutationOptions = {},
  ): Promise<WebhookSubscriptionRotateResult> {
    const res = await this.http.request<RotateResponse>({
      method: "POST",
      path: `/api/v1/webhooks/subscriptions/${encodeURIComponent(id)}/rotate-secret`,
      body: options,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async test(
    id: string,
    opts: MutationOptions = {},
  ): Promise<WebhookSubscriptionTestResult> {
    const res = await this.http.request<TestResponse>({
      method: "POST",
      path: `/api/v1/webhooks/test/${encodeURIComponent(id)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

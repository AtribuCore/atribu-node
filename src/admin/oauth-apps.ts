import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type CreateBody = NonNullable<
  paths["/api/v1/admin/oauth-apps"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateResponse =
  paths["/api/v1/admin/oauth-apps"]["post"]["responses"][201]["content"]["application/json"];

type UpdateBody = NonNullable<
  paths["/api/v1/admin/oauth-apps/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
type UpdateResponse =
  paths["/api/v1/admin/oauth-apps/{id}"]["patch"]["responses"][200]["content"]["application/json"];

type SuspendResponse =
  paths["/api/v1/admin/oauth-apps/{id}"]["delete"]["responses"][200]["content"]["application/json"];

type RotateClientResponse =
  paths["/api/v1/admin/oauth-apps/{id}/rotate-client-secret"]["post"]["responses"][200]["content"]["application/json"];
type RotateClientBody = NonNullable<
  NonNullable<
    paths["/api/v1/admin/oauth-apps/{id}/rotate-client-secret"]["post"]["requestBody"]
  >["content"]["application/json"]
>;

type RotateJwtResponse =
  paths["/api/v1/admin/oauth-apps/{id}/rotate-jwt-secret"]["post"]["responses"][200]["content"]["application/json"];
type RotateJwtBody = NonNullable<
  NonNullable<
    paths["/api/v1/admin/oauth-apps/{id}/rotate-jwt-secret"]["post"]["requestBody"]
  >["content"]["application/json"]
>;

export type OauthAppCreateInput = CreateBody;
export type OauthAppCreated = CreateResponse["data"];
export type OauthAppUpdateInput = UpdateBody;
export type OauthApp = UpdateResponse["data"];
export type OauthAppSuspendResult = SuspendResponse["data"];
export type OauthAppRotateClientResult = RotateClientResponse["data"];
export type OauthAppRotateJwtResult = RotateJwtResponse["data"];
export type RotateOptions = RotateClientBody;

export interface AdminMutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class OauthAppsResource {
  constructor(private readonly http: HttpClientLike) {}

  async create(input: OauthAppCreateInput, opts: AdminMutationOptions = {}): Promise<OauthAppCreated> {
    const res = await this.http.request<CreateResponse>({
      method: "POST",
      path: "/api/v1/admin/oauth-apps",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async update(id: string, input: OauthAppUpdateInput, opts: AdminMutationOptions = {}): Promise<OauthApp> {
    const res = await this.http.request<UpdateResponse>({
      method: "PATCH",
      path: `/api/v1/admin/oauth-apps/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async suspend(id: string, opts: AdminMutationOptions = {}): Promise<OauthAppSuspendResult> {
    const res = await this.http.request<SuspendResponse>({
      method: "DELETE",
      path: `/api/v1/admin/oauth-apps/${encodeURIComponent(id)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async rotateClientSecret(
    id: string,
    options: RotateOptions = {},
    opts: AdminMutationOptions = {},
  ): Promise<OauthAppRotateClientResult> {
    const res = await this.http.request<RotateClientResponse>({
      method: "POST",
      path: `/api/v1/admin/oauth-apps/${encodeURIComponent(id)}/rotate-client-secret`,
      body: options,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async rotateJwtSecret(
    id: string,
    options: RotateJwtBody = {},
    opts: AdminMutationOptions = {},
  ): Promise<OauthAppRotateJwtResult> {
    const res = await this.http.request<RotateJwtResponse>({
      method: "POST",
      path: `/api/v1/admin/oauth-apps/${encodeURIComponent(id)}/rotate-jwt-secret`,
      body: options,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

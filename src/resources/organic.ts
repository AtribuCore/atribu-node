/**
 * Organic social reads (#590) — posts and stories with the revenue Atribu
 * attributes to them. Responses are the full envelope (`./common.ts`); the
 * post list carries `pagination.cursor`.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras } from "./common";

type PostsQuery = paths["/api/v1/organic/posts"]["get"]["parameters"]["query"];
export type OrganicPostsResponse =
  paths["/api/v1/organic/posts"]["get"]["responses"][200]["content"]["application/json"];
export type OrganicPostsOptions = PostsQuery & ReadExtras;

type PostQuery = paths["/api/v1/organic/posts/{id}"]["get"]["parameters"]["query"];
export type OrganicPostResponse =
  paths["/api/v1/organic/posts/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type OrganicPostOptions = PostQuery & ReadExtras;

type IntelligenceQuery = NonNullable<
  paths["/api/v1/organic/posts/{id}/intelligence"]["get"]["parameters"]["query"]
>;
export type OrganicPostIntelligenceResponse =
  paths["/api/v1/organic/posts/{id}/intelligence"]["get"]["responses"][200]["content"]["application/json"];
export type OrganicPostIntelligenceOptions = IntelligenceQuery & ReadExtras;

type StoryQuery = NonNullable<
  paths["/api/v1/organic/stories/{id}"]["get"]["parameters"]["query"]
>;
export type OrganicStoryResponse =
  paths["/api/v1/organic/stories/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type OrganicStoryOptions = StoryQuery & ReadExtras;

export class OrganicResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Organic posts across Instagram and Facebook. Cursor-paginated: pass the
   * `pagination.cursor` from the previous page back as `cursor`, never a
   * hand-built token.
   */
  async posts(options: OrganicPostsOptions): Promise<OrganicPostsResponse> {
    const { signal, ...query } = options;
    return this.http.request<OrganicPostsResponse>({
      method: "GET",
      path: "/api/v1/organic/posts",
      query,
      signal,
    });
  }

  /** One post, with its attributed conversions. `id` is the platform post id. */
  async post(id: string, options: OrganicPostOptions): Promise<OrganicPostResponse> {
    const { signal, ...query } = options;
    return this.http.request<OrganicPostResponse>({
      method: "GET",
      path: `/api/v1/organic/posts/${encodeURIComponent(id)}`,
      query,
      signal,
    });
  }

  /**
   * One post's stored AI analysis and the paid ads whose creative copy embeds
   * nearest to its caption (#644).
   *
   * No date range: everything it returns is a property of the creative — one
   * row written by a background pass, plus lifetime spend and lifetime credited
   * revenue on each twin. Use {@link OrganicResource.post} for windowed credit.
   *
   * `analysis` is `null` when the pass has not covered the post yet, and
   * `twin_ads` is `[]` when nothing matched — both are coverage, not errors.
   */
  async postIntelligence(
    id: string,
    options: OrganicPostIntelligenceOptions = {},
  ): Promise<OrganicPostIntelligenceResponse> {
    const { signal, ...query } = options;
    return this.http.request<OrganicPostIntelligenceResponse>({
      method: "GET",
      path: `/api/v1/organic/posts/${encodeURIComponent(id)}/intelligence`,
      query,
      signal,
    });
  }

  /**
   * One story. No date range: a story's window is its own 24-hour life, so the
   * route takes only `model`.
   */
  async story(id: string, options: OrganicStoryOptions = {}): Promise<OrganicStoryResponse> {
    const { signal, ...query } = options;
    return this.http.request<OrganicStoryResponse>({
      method: "GET",
      path: `/api/v1/organic/stories/${encodeURIComponent(id)}`,
      query,
      signal,
    });
  }
}

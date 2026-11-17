/**
 * #2307 / #2308 — the ad-builder primitives and the ad-account limits read.
 *
 * One PAUSED Meta object per call, for an app that orchestrates a launch
 * without holding a Meta token: upload images/videos → campaign → ad set →
 * creative → ad, and roll back child-first with `rollback(action_id)` when a
 * step fails; `activate(id)` switches a built object ON when the dealer confirms. Every write needs `idempotencyKey`. Writes are
 * `campaigns:apply` (`createPixel` also `exports:write`); `object`, `adAccount` and `pixels` are `campaigns:read`.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

type Body<P extends keyof paths> = paths[P] extends { post: { requestBody?: { content: { "application/json": infer B } } } }
  ? B
  : never;
type PostOk<P extends keyof paths> = paths[P] extends {
  post: { responses: { 200: { content: { "application/json": infer R } } } };
}
  ? R
  : never;
type GetOk<P extends keyof paths> = paths[P] extends {
  get: { responses: { 200: { content: { "application/json": infer R } } } };
}
  ? R
  : never;

export type AdBuilderImageInput = Body<"/api/v1/ad-builder/images">;
export type AdBuilderImageResponse = PostOk<"/api/v1/ad-builder/images">;
export type AdBuilderVideoInput = Body<"/api/v1/ad-builder/videos">;
export type AdBuilderVideoResponse = PostOk<"/api/v1/ad-builder/videos">;
export type AdBuilderCampaignInput = Body<"/api/v1/ad-builder/campaigns">;
export type AdBuilderCampaignResponse = PostOk<"/api/v1/ad-builder/campaigns">;
export type AdBuilderAdSetInput = Body<"/api/v1/ad-builder/ad-sets">;
export type AdBuilderAdSetResponse = PostOk<"/api/v1/ad-builder/ad-sets">;
export type AdBuilderCreativeInput = Body<"/api/v1/ad-builder/creatives">;
export type AdBuilderCreativeResponse = PostOk<"/api/v1/ad-builder/creatives">;
export type AdBuilderAdInput = Body<"/api/v1/ad-builder/ads">;
export type AdBuilderAdResponse = PostOk<"/api/v1/ad-builder/ads">;
export type AdBuilderObjectResponse = GetOk<"/api/v1/ad-builder/objects/{id}">;
export type AdBuilderObjectLevel = "campaign" | "ad_set" | "ad" | "creative" | "video";
export type AdBuilderRollbackResponse = PostOk<"/api/v1/ad-builder/actions/{id}/rollback">;
export type AdBuilderActivateInput = NonNullable<Body<"/api/v1/ad-builder/objects/{id}/activate">>;
export type AdBuilderActivateResponse = PostOk<"/api/v1/ad-builder/objects/{id}/activate">;
export type AdAccountLimitsResponse = GetOk<"/api/v1/ad-account">;
export type AdAccountPixelsResponse = GetOk<"/api/v1/ad-account/pixels">;
export type AdAccountPixelCreateInput = Body<"/api/v1/ad-account/pixels">;
export type AdAccountPixelCreateResponse = PostOk<"/api/v1/ad-account/pixels">;

export class AdBuilderResource {
  constructor(private readonly http: HttpClientLike) {}

  private post<R>(path: string, body: unknown, options: WriteExtras): Promise<R> {
    return this.http.request<R>({
      method: "POST",
      path,
      body,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Upload one JPEG/PNG from a public https URL; returns Meta's `image_hash`. */
  uploadImage(input: AdBuilderImageInput, options: WriteExtras = {}): Promise<AdBuilderImageResponse> {
    return this.post("/api/v1/ad-builder/images", input, options);
  }

  /** Hand Meta a public https `file_url`; poll `object(video_id)` until `ready`. */
  uploadVideo(input: AdBuilderVideoInput, options: WriteExtras = {}): Promise<AdBuilderVideoResponse> {
    return this.post("/api/v1/ad-builder/videos", input, options);
  }

  /** A PAUSED testing (ABO) or Winners (CBO) campaign, house-named from `name_parts`. */
  createCampaign(input: AdBuilderCampaignInput, options: WriteExtras = {}): Promise<AdBuilderCampaignResponse> {
    return this.post("/api/v1/ad-builder/campaigns", input, options);
  }

  /** A PAUSED website or click-to-WhatsApp ad set; home-only geo, read back. */
  createAdSet(input: AdBuilderAdSetInput, options: WriteExtras = {}): Promise<AdBuilderAdSetResponse> {
    return this.post("/api/v1/ad-builder/ad-sets", input, options);
  }

  /** A website link creative (4:5 + 9:16) or a single-asset click-to-WhatsApp creative. */
  createCreative(input: AdBuilderCreativeInput, options: WriteExtras = {}): Promise<AdBuilderCreativeResponse> {
    return this.post("/api/v1/ad-builder/creatives", input, options);
  }

  /** A PAUSED ad with its dataset pinned in `tracking_specs`. */
  createAd(input: AdBuilderAdInput, options: WriteExtras = {}): Promise<AdBuilderAdResponse> {
    return this.post("/api/v1/ad-builder/ads", input, options);
  }

  /**
   * Switch ON (PAUSED → ACTIVE) one campaign / ad set / ad this builder created.
   * Already ACTIVE answers `outcome: "no_change"`; any other status is a 409.
   * Meta delivers only once the campaign, the ad set and the ad are all ACTIVE.
   * `rollback(action_id)` pauses it again.
   */
  activate(
    objectId: string,
    input: AdBuilderActivateInput = {},
    options: WriteExtras = {},
  ): Promise<AdBuilderActivateResponse> {
    return this.post(`/api/v1/ad-builder/objects/${encodeURIComponent(objectId)}/activate`, input, options);
  }

  /** Undo one action: delete what a create made (children first), or pause what `activate` switched on. */
  rollback(actionId: string, options: WriteExtras = {}): Promise<AdBuilderRollbackResponse> {
    return this.post(`/api/v1/ad-builder/actions/${encodeURIComponent(actionId)}/rollback`, {}, options);
  }

  /** Live state + `edited_since_creation`. `level` is required only for a synced object Atribu did not create. */
  object(
    objectId: string,
    options: ReadExtras & { level?: AdBuilderObjectLevel } = {},
  ): Promise<AdBuilderObjectResponse> {
    const { signal, level } = options;
    return this.http.request<AdBuilderObjectResponse>({
      method: "GET",
      path: `/api/v1/ad-builder/objects/${encodeURIComponent(objectId)}`,
      query: level ? { level } : {},
      signal,
    });
  }

  /** #2308 — Meta's daily spending limit, today's spend, the account cap, promotable Pages. */
  adAccount(options: ReadExtras & { ad_account_id?: string } = {}): Promise<AdAccountLimitsResponse> {
    const { signal, ad_account_id } = options;
    return this.http.request<AdAccountLimitsResponse>({
      method: "GET",
      path: "/api/v1/ad-account",
      query: ad_account_id ? { ad_account_id } : {},
      signal,
    });
  }

  /** «Crear píxel» — the ad account's pixels, and which one the website destination sends to. `campaigns:read`. */
  pixels(options: ReadExtras & { ad_account_id?: string } = {}): Promise<AdAccountPixelsResponse> {
    const { signal, ad_account_id } = options;
    return this.http.request<AdAccountPixelsResponse>({
      method: "GET",
      path: "/api/v1/ad-account/pixels",
      query: ad_account_id ? { ad_account_id } : {},
      signal,
    });
  }

  /**
   * «Crear píxel» — create (or adopt by exact name) a website pixel on the ad
   * account and wire it as the website Conversions API destination. At most one
   * Meta write, not reversible. `campaigns:apply` + `exports:write`.
   */
  createPixel(input: AdAccountPixelCreateInput, options: WriteExtras = {}): Promise<AdAccountPixelCreateResponse> {
    return this.post("/api/v1/ad-account/pixels", input, options);
  }
}

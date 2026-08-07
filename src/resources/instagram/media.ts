import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type ListResponse =
  paths["/api/v1/instagram/media"]["get"]["responses"][200]["content"]["application/json"];
type GetResponse =
  paths["/api/v1/instagram/media/{media_id}"]["get"]["responses"][200]["content"]["application/json"];
type CreateBody = NonNullable<
  paths["/api/v1/instagram/media"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateResponse =
  paths["/api/v1/instagram/media"]["post"]["responses"][201]["content"]["application/json"];
type PublishBody = NonNullable<
  paths["/api/v1/instagram/media/publish"]["post"]["requestBody"]
>["content"]["application/json"];
type PublishResponse =
  paths["/api/v1/instagram/media/publish"]["post"]["responses"][201]["content"]["application/json"];

export type InstagramMedia = GetResponse["data"];
export type InstagramMediaChild = NonNullable<InstagramMedia["children"]>[number];
export type InstagramMediaContainerInput = CreateBody;
export type InstagramMediaContainer = CreateResponse["data"];
export type InstagramMediaPublishInput = PublishBody;
export type InstagramMediaPublishResult = PublishResponse["data"];

export interface InstagramMediaPage {
  media: InstagramMedia[];
  /** Pass back as `after` to fetch the next page; null when there is none. */
  nextCursor: string | null;
  hasNext: boolean;
}

export interface InstagramMediaListOptions {
  /** The Instagram `data_connection` to read. */
  connectionId: string;
  /** Meta page size (1–100). Defaults to 25 server-side. */
  limit?: number;
  /** Cursor from a previous page's `nextCursor`. */
  after?: string;
  signal?: AbortSignal;
}

export interface InstagramMediaReadOptions {
  connectionId: string;
  signal?: AbortSignal;
}

export interface InstagramMediaWriteOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/**
 * Instagram media — reads and Content Publishing, mounted on
 * `AtribuClient.instagram.media`.
 *
 * Every method proxies Meta live. Atribu keeps no mirror of a customer's posts
 * for this surface, so `list()` reflects the account as it is right now: a post
 * published seconds ago is present, an edited caption is current, a deleted
 * post is gone.
 *
 * Publishing is Meta's two-step model and stays two steps here — the SDK does
 * not hide it, because a carousel is built from the intermediate container ids
 * and because readiness/retry are the caller's to own:
 *
 * @example Single image
 *   const { container_id } = await client.instagram.media.createContainer({
 *     connection_id: connId,
 *     media_type: "IMAGE",
 *     image_url: "https://cdn.example.com/car.jpg",
 *     caption: "Recién llegado 🚗",
 *   });
 *   const { media_id } = await client.instagram.media.publish({
 *     connection_id: connId,
 *     creation_id: container_id,
 *   });
 *
 * @example Carousel
 *   const children = [];
 *   for (const url of imageUrls) {
 *     const child = await client.instagram.media.createContainer({
 *       connection_id: connId,
 *       media_type: "IMAGE",
 *       image_url: url,
 *       is_carousel_item: true,
 *     });
 *     children.push(child.container_id);
 *   }
 *   const parent = await client.instagram.media.createContainer({
 *     connection_id: connId,
 *     media_type: "CAROUSEL",
 *     children,
 *     caption: "Galería",
 *   });
 *   await client.instagram.media.publish({
 *     connection_id: connId,
 *     creation_id: parent.container_id,
 *   });
 */
export class InstagramMediaResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * One page of the account's published media, newest first. Carousel items
   * arrive expanded under `children`; non-carousel media have `children: null`.
   */
  async list(opts: InstagramMediaListOptions): Promise<InstagramMediaPage> {
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: "/api/v1/instagram/media",
      query: {
        connection_id: opts.connectionId,
        ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
        ...(opts.after !== undefined ? { after: opts.after } : {}),
      },
      signal: opts.signal,
    });
    return {
      media: res.data,
      nextCursor: res.pagination?.cursor ?? null,
      hasNext: res.pagination?.has_next ?? false,
    };
  }

  /** Read one media object by id, with carousel `children` expanded. */
  async get(mediaId: string, opts: InstagramMediaReadOptions): Promise<InstagramMedia> {
    const res = await this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/instagram/media/${encodeURIComponent(mediaId)}`,
      query: { connection_id: opts.connectionId },
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Publish step 1 — create a container. Nothing is visible on the account
   * until {@link publish} runs with the returned `container_id`.
   */
  async createContainer(
    input: InstagramMediaContainerInput,
    opts: InstagramMediaWriteOptions = {},
  ): Promise<InstagramMediaContainer> {
    const res = await this.http.request<CreateResponse>({
      method: "POST",
      path: "/api/v1/instagram/media",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Publish step 2 — make a container live and get back the published
   * `media_id`. Meta caps publishing at 25 posts per 24h per account; over that
   * the call throws `AtribuApiError` with status 429 (and a `Retry-After`).
   */
  async publish(
    input: InstagramMediaPublishInput,
    opts: InstagramMediaWriteOptions = {},
  ): Promise<InstagramMediaPublishResult> {
    const res = await this.http.request<PublishResponse>({
      method: "POST",
      path: "/api/v1/instagram/media/publish",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

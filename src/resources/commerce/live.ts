import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";
import type { ReadExtras } from "../common";

type LiveProductsQuery = NonNullable<
  paths["/api/v1/commerce/live/products"]["get"]["parameters"]["query"]
>;
type LiveOrdersQuery = NonNullable<
  paths["/api/v1/commerce/live/orders"]["get"]["parameters"]["query"]
>;

export type CommerceLiveProductsResponse =
  paths["/api/v1/commerce/live/products"]["get"]["responses"][200]["content"]["application/json"];
export type CommerceLiveOrdersResponse =
  paths["/api/v1/commerce/live/orders"]["get"]["responses"][200]["content"]["application/json"];

/** One product read live from Shopify, with EVERY variant. */
export type CommerceLiveProduct = CommerceLiveProductsResponse["data"][number];
export type CommerceLiveVariant = CommerceLiveProduct["variants"][number];
/** One order read live from Shopify — buyer contact, attributes and every line. */
export type CommerceLiveOrder = CommerceLiveOrdersResponse["data"][number];
export type CommerceLiveOrderLine = CommerceLiveOrder["lines"][number];

export type CommerceLiveProductsOptions = LiveProductsQuery & ReadExtras;
export type CommerceLiveOrdersOptions = LiveOrdersQuery & ReadExtras;

/**
 * The LIVE Shopify passthrough (#2105), scope `commerce:live`: a connected
 * store read straight from Shopify's Admin API, never from Atribu's copy. Use it
 * for an initial import and a periodic reconcile; take deltas from the
 * `shopify` webhook events.
 *
 * Walk `pagination.cursor` until `has_next` is false. The cursor carries the
 * `updated_since` and the connection the walk started with — pass it alone.
 */
export class CommerceLiveResource {
  constructor(private readonly http: HttpClientLike) {}

  /** `GET /api/v1/commerce/live/products` — products with every variant and current stock. */
  async products(options: CommerceLiveProductsOptions = {}): Promise<CommerceLiveProductsResponse> {
    const { signal, ...query } = options;
    return this.http.request<CommerceLiveProductsResponse>({
      method: "GET",
      path: "/api/v1/commerce/live/products",
      query,
      signal,
    });
  }

  /** `GET /api/v1/commerce/live/orders` — orders updated since a time, buyer contact included. */
  async orders(options: CommerceLiveOrdersOptions = {}): Promise<CommerceLiveOrdersResponse> {
    const { signal, ...query } = options;
    return this.http.request<CommerceLiveOrdersResponse>({
      method: "GET",
      path: "/api/v1/commerce/live/orders",
      query,
      signal,
    });
  }
}

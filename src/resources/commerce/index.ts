import type { HttpClientLike } from "../../http";
import { CommerceOrdersResource } from "./orders";
import { CommerceProductsResource } from "./products";
import { CommerceLiveResource } from "./live";

/**
 * The commerce namespace — a connected store's catalogue and orders, mounted on
 * `AtribuClient.commerce`.
 *
 * It pairs with the five `shopify` webhook event kinds in `../../webhooks`:
 * `catalog.updated` tickles a `products.list({ updated_since })` pull,
 * `product.stock.changed` / `product.price.changed` carry the transition
 * itself, and `order.status.changed` sends you to `orders.list({ phone })`.
 */
export class CommerceNamespace {
  readonly products: CommerceProductsResource;
  readonly orders: CommerceOrdersResource;
  /** #2105 — the store read live from Shopify (`commerce:live`). */
  readonly live: CommerceLiveResource;

  constructor(http: HttpClientLike) {
    this.products = new CommerceProductsResource(http);
    this.orders = new CommerceOrdersResource(http);
    this.live = new CommerceLiveResource(http);
  }
}

export type {
  CommerceProduct,
  CommerceProductsOptions,
  CommerceProductsResponse,
  CommerceStockState,
  CommerceVariant,
} from "./products";
export type {
  CommerceOrder,
  CommerceOrderStatus,
  CommerceOrdersOptions,
  CommerceOrdersResponse,
} from "./orders";
export type {
  CommerceLiveOrder,
  CommerceLiveOrderLine,
  CommerceLiveOrdersOptions,
  CommerceLiveOrdersResponse,
  CommerceLiveProduct,
  CommerceLiveProductsOptions,
  CommerceLiveProductsResponse,
  CommerceLiveVariant,
} from "./live";

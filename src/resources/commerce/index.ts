import type { HttpClientLike } from "../../http";
import { CommerceOrdersResource } from "./orders";
import { CommerceProductsResource } from "./products";

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

  constructor(http: HttpClientLike) {
    this.products = new CommerceProductsResource(http);
    this.orders = new CommerceOrdersResource(http);
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

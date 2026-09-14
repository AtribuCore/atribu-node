import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";
import type { ReadExtras } from "../common";

type OrdersQuery = NonNullable<
  paths["/api/v1/commerce/orders"]["get"]["parameters"]["query"]
>;

export type CommerceOrdersResponse =
  paths["/api/v1/commerce/orders"]["get"]["responses"][200]["content"]["application/json"];

export type CommerceOrder = CommerceOrdersResponse["data"][number];
/** `placed` | `paid` | `fulfilled` | `delivered` | `cancelled`. */
export type CommerceOrderStatus = CommerceOrder["status"];

export type CommerceOrdersOptions = OrdersQuery & ReadExtras;

/**
 * `GET /api/v1/commerce/orders` — the "where is my order" lookup.
 *
 * This is where an `order.status.changed` webhook sends you: the event tells you
 * an order reached a milestone, this tells you the state of every order a
 * shopper has.
 *
 * **At least one of `order_ref`, `email` or `phone` is required.** A call with
 * none answers 400 rather than the merchant's whole order history — it is a
 * lookup on a named shopper's behalf, not a list.
 *
 * **No customer identity comes back.** You already hold the contact you searched
 * with; the same row is reachable by order number, and returning a contact there
 * would turn a guessable reference into a lookup of the person behind it.
 */
export class CommerceOrdersResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(options: CommerceOrdersOptions = {}): Promise<CommerceOrdersResponse> {
    const { signal, ...query } = options;
    return this.http.request<CommerceOrdersResponse>({
      method: "GET",
      path: "/api/v1/commerce/orders",
      query,
      signal,
    });
  }
}

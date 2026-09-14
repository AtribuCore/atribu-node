import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";
import type { ReadExtras } from "../common";

type ProductsQuery = NonNullable<
  paths["/api/v1/commerce/products"]["get"]["parameters"]["query"]
>;

export type CommerceProductsResponse =
  paths["/api/v1/commerce/products"]["get"]["responses"][200]["content"]["application/json"];

/** One product, with every variant Atribu holds for it. */
export type CommerceProduct = CommerceProductsResponse["data"][number];
/** One purchasable variant. */
export type CommerceVariant = CommerceProduct["variants"][number];
/** `in_stock` | `low_stock` | `out_of_stock` | `discontinued` | null. */
export type CommerceStockState = CommerceVariant["inventory_state"];

export type CommerceProductsOptions = ProductsQuery & ReadExtras;

/**
 * `GET /api/v1/commerce/products` — the merchant's catalogue.
 *
 * The PULL half of the commerce sync. A `catalog.updated` webhook is a TICKLE
 * that says a pull is worth making; it never carries the data. Keep the newest
 * `updated_at` you have seen and pass it as `updated_since` on the next call.
 *
 * Returns the whole envelope rather than just `data`, like every other
 * paginated read in this SDK — `pagination.cursor` is the one field a paginated
 * list cannot be used without. See `../common.ts`.
 */
export class CommerceProductsResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(options: CommerceProductsOptions = {}): Promise<CommerceProductsResponse> {
    const { signal, ...query } = options;
    return this.http.request<CommerceProductsResponse>({
      method: "GET",
      path: "/api/v1/commerce/products",
      query,
      signal,
    });
  }
}

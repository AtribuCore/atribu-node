import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

type ManualListResponse =
  paths["/api/v1/integrations/shopify/manual-connections"]["get"]["responses"][200]["content"]["application/json"];
type ManualCreateResponse =
  paths["/api/v1/integrations/shopify/manual-connections"]["post"]["responses"][201]["content"]["application/json"];
type ManualPatchResponse =
  paths["/api/v1/integrations/shopify/manual-connections/{connectionId}"]["patch"]["responses"][200]["content"]["application/json"];
type ManualDeleteResponse =
  paths["/api/v1/integrations/shopify/manual-connections/{connectionId}"]["delete"]["responses"][200]["content"]["application/json"];
type WebPixelResponse =
  paths["/api/v1/integrations/shopify/web-pixel/activate"]["post"]["responses"][200]["content"]["application/json"];

/**
 * One hand-created Shopify webhook connection.
 *
 * `signing_id_configured` is a BOOLEAN and there is no field carrying the value:
 * the signing ID is write-only across this API. If it is lost, set a new one
 * with {@link ShopifyResource.setManualSigningId}.
 */
export type ShopifyManualConnection = ManualListResponse["data"]["connections"][number];

export type ShopifyWebPixelActivation = WebPixelResponse["data"];

/**
 * Shopify integration operations that are NOT part of the install flow (#489).
 *
 * The App Store install itself — the authorize redirect, the OAuth callback,
 * the workspace picker — is a browser flow with cookies and redirects and is
 * deliberately not on this API. What is here is what a merchant or an agent
 * does to a store that is ALREADY connected, plus manual mode for merchants who
 * will not install an app at all.
 */
export class ShopifyResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * The profile's manual-mode webhook connections (#412).
   *
   * Manual mode exists for merchants who will not install a third-party app —
   * agency-managed client stores, Plus orgs with an app-approval policy.
   * Shopify's admin lets them create webhooks by hand, signed with a per-store
   * signing ID rather than the app's client secret.
   *
   * Read `state` rather than inferring health from `delivery_count`: `stale`
   * means deliveries arrived once and stopped, which is the only signal there
   * is — Shopify deletes a repeatedly-failing admin-created webhook and emails
   * the store owner, not us.
   */
  async manualConnections(options: ReadExtras = {}): Promise<ShopifyManualConnection[]> {
    const res = await this.http.request<ManualListResponse>({
      method: "GET",
      path: "/api/v1/integrations/shopify/manual-connections",
      signal: options.signal,
    });
    return res.data.connections;
  }

  /**
   * Create one, and hand the merchant `webhook_url` + `topics` to paste into
   * Shopify admin → Settings → Notifications → Webhooks.
   *
   * Idempotent on `shopDomain`: repeating it returns the existing connection
   * rather than minting a second inbound token. A shop already connected
   * through the App Store install throws `invalid_state` (409) — a manual twin
   * would give the store two verification paths, one with no signing ID.
   *
   * The connection is not usable until {@link setManualSigningId} runs; until
   * then it reports `state: "pending"` and deliveries are rejected.
   */
  async createManualConnection(
    shopDomain: string,
    opts: WriteExtras = {},
  ): Promise<ShopifyManualConnection> {
    const res = await this.http.request<ManualCreateResponse>({
      method: "POST",
      path: "/api/v1/integrations/shopify/manual-connections",
      body: { shop_domain: shopDomain },
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data.connection;
  }

  /**
   * Store the store's webhook signing ID — printed at the bottom of Shopify's
   * webhook settings page, and what every delivery's HMAC is computed with.
   *
   * Write-only: no route hands it back. Setting a new one also clears the
   * recorded HMAC failures, which are stale history the moment the cause is
   * fixed.
   */
  async setManualSigningId(
    connectionId: string,
    signingId: string,
    opts: WriteExtras = {},
  ): Promise<void> {
    await this.http.request<ManualPatchResponse>({
      method: "PATCH",
      path: `/api/v1/integrations/shopify/manual-connections/${encodeURIComponent(connectionId)}`,
      body: { signing_id: signingId },
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /**
   * Remove a manual connection.
   *
   * **Disconnects, does not delete.** The row is what historical orders were
   * ingested against, so removing it would orphan that attribution. The inbound
   * token is retired, so a webhook the merchant forgets to delete in Shopify
   * stops resolving.
   */
  async removeManualConnection(
    connectionId: string,
    opts: WriteExtras = {},
  ): Promise<void> {
    await this.http.request<ManualDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/integrations/shopify/manual-connections/${encodeURIComponent(connectionId)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /**
   * Re-run the app pixel installation on a connected store.
   *
   * For when the merchant sees the App Pixel as "Disconnected" in Shopify's
   * Settings → Customer events even though the store is connected — a race at
   * install, no tracking key at the time, or a pixel they deleted.
   *
   * `success: false` with an `error` is a NORMAL outcome, not a transport
   * failure: Shopify returns `userErrors` for a store the app cannot pixel, and
   * the message is Shopify's own. Check `success`, do not assume a resolved
   * promise means the pixel is live.
   */
  async activateWebPixel(opts: WriteExtras = {}): Promise<ShopifyWebPixelActivation> {
    const res = await this.http.request<WebPixelResponse>({
      method: "POST",
      path: "/api/v1/integrations/shopify/web-pixel/activate",
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type WelcomeMessageResponse =
  paths["/api/v1/partner/whatsapp/ads/{ad_id}/welcome-message"]["get"]["responses"][200]["content"]["application/json"];

type ListResponse =
  paths["/api/v1/partner/whatsapp/ads"]["get"]["responses"][200]["content"]["application/json"];

export type WhatsAppAdWelcome = WelcomeMessageResponse["data"];
/** The greeting itself — non-null only when the ad has one configured. */
export type WhatsAppAdWelcomeMessage = NonNullable<WhatsAppAdWelcome["welcome"]>;

/** One click-to-WhatsApp ad's configuration, as `list()` returns it. */
export type WhatsAppCtwaAd = ListResponse["data"][number];
/** Which kind of nothing a null `greeting` is. */
export type WhatsAppCtwaAdGreetingStatus = WhatsAppCtwaAd["greeting_status"];

export interface ListCtwaAdsOptions {
  /** Page size, 1-100. Defaults to the API's 25. */
  limit?: number;
  /** The previous page's `nextCursor`. Keyset on `ad_id`, not an offset. */
  after?: string;
  signal?: AbortSignal;
}

export interface WhatsAppCtwaAdPage {
  ads: WhatsAppCtwaAd[];
  /** Pass back as `after`. Null on the last page. */
  nextCursor: string | null;
  hasNext: boolean;
}

export interface AdWelcomeMessageOptions {
  /**
   * A specific `meta_ads` connection on this key's profile. Omit it unless the
   * profile has more than one — it can select among a profile's connections but
   * never reach another profile's.
   */
  connectionId?: string;
  signal?: AbortSignal;
}

/**
 * Ad-level reads for the WhatsApp surface.
 *
 * Two questions, and they arrive from opposite directions.
 *
 * `welcomeMessage(adId)` answers about ONE ad, and you only learn its id from a
 * conversation that already happened (`referral.source_id` on the customer's
 * first inbound message). It is what an assistant needs to avoid greeting
 * someone who has already been greeted: Meta does not deliver the greeting over
 * the webhook — the `referral` object carries the ad's headline, body and
 * thumbnail, and the greeting is ad configuration readable only from the
 * Marketing API.
 *
 * `list()` answers about the WHOLE account, with no conversation required:
 * which of a dealer's ads open WhatsApp, where they send people, and which of
 * them greet. That is the question a settings screen or an audit asks, and it
 * has no ad id to start from.
 *
 * @example Everything that opens WhatsApp, and whether it greets
 *   let after: string | undefined;
 *   do {
 *     const page = await client.whatsapp.ads.list({ after });
 *     for (const ad of page.ads) {
 *       if (ad.greeting_status === "none") {
 *         // A live ad with no "Saludo automático" — worth telling the dealer.
 *       }
 *     }
 *     after = page.nextCursor ?? undefined;
 *   } while (after);
 */
export class WhatsAppAdsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * One page of the profile's click-to-WhatsApp ads, oldest ad id first.
   *
   * An ad is listed when WhatsApp is named either by its ad set's
   * `destination_type` or by its creative's call-to-action — an ad commonly
   * carries only one of the two.
   *
   * Served from Atribu's nightly Meta sync, never from a live Graph call, so
   * polling this costs the advertiser's `ads_management` quota nothing.
   * `last_synced_at` says how stale each row is; an ad launched since the last
   * sync is not listed yet, and its greeting is still readable by id through
   * {@link welcomeMessage}.
   *
   * `greeting` is null whenever `greeting_status` is not `"present"` — check
   * the status to tell "this ad configures no greeting" (final) from "Meta
   * would not show us the creative" (worth asking again once the connection is
   * fixed).
   */
  async list(opts: ListCtwaAdsOptions = {}): Promise<WhatsAppCtwaAdPage> {
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: "/api/v1/partner/whatsapp/ads",
      query: {
        ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
        ...(opts.after !== undefined ? { after: opts.after } : {}),
      },
      signal: opts.signal,
    });
    return {
      ads: res.data,
      nextCursor: res.pagination?.cursor ?? null,
      hasNext: res.pagination?.has_next ?? false,
    };
  }

  /**
   * The welcome message configured on one ad.
   *
   * `adId` is `referral.source_id` from the customer's first inbound message.
   *
   * `welcome` is `null` when the ad simply has no greeting configured — a
   * complete answer, not a failure, and the usual case for an ad whose
   * advertiser never set one up. Check `welcome`, don't rely on a throw.
   *
   * Served from a per-(profile, ad) cache: `cached` says whether this answer
   * came from it, and `fetched_at` is when the answer was read from Meta rather
   * than when the call was made.
   *
   * Throws `AtribuApiError` with `status: 404` when Meta does not show Atribu
   * the ad (deleted, or invisible to the workspace's token — Graph does not
   * distinguish those), `409` when the profile has no usable Meta Ads
   * connection, and `502` on a transient Meta failure (retry that one).
   */
  async welcomeMessage(
    adId: string,
    opts: AdWelcomeMessageOptions = {},
  ): Promise<WhatsAppAdWelcome> {
    const query = opts.connectionId
      ? `?connection_id=${encodeURIComponent(opts.connectionId)}`
      : "";
    const res = await this.http.request<WelcomeMessageResponse>({
      method: "GET",
      path: `/api/v1/partner/whatsapp/ads/${encodeURIComponent(adId)}/welcome-message${query}`,
      signal: opts.signal,
    });
    return res.data;
  }
}

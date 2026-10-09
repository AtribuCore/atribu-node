/**
 * The Instagram CONSOLE surface (#489) — competitor research, short links,
 * connected accounts and their comment triggers, the CTM / follower /
 * identity-review reads, and the sync trigger.
 *
 * ACCOUNT-KEYED, and that is the whole difference from `./triggers.ts`. That
 * resource calls `/api/v1/instagram/triggers`, keyed on `connection_id`; these
 * call `/api/v1/instagram/accounts/{account_id}/comment-triggers`. Both write
 * the same rows and validate the same limits — which one to reach for depends
 * on whether you hold a connection id (a delegated consumer usually does) or an
 * Instagram account id (the console does, because it renders one card per
 * account).
 *
 * Every method needs the `instagram` scope. Responses are the full envelope
 * (`../common.ts`) unwrapped to `data` where there is nothing else in it, and
 * left whole where `meta` carries something a caller needs.
 */
import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";
import type { ReadExtras, WriteExtras } from "../common";

// --- competitor sources ----------------------------------------------------

type CompetitorListResponse =
  paths["/api/v1/instagram/competitor-sources"]["get"]["responses"][200]["content"]["application/json"];
type CompetitorCreateBody = NonNullable<
  paths["/api/v1/instagram/competitor-sources"]["post"]["requestBody"]
>["content"]["application/json"];
type CompetitorCreateResponse =
  paths["/api/v1/instagram/competitor-sources"]["post"]["responses"][201]["content"]["application/json"];
type CompetitorUpdateBody = NonNullable<
  paths["/api/v1/instagram/competitor-sources/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
type CompetitorUpdateResponse =
  paths["/api/v1/instagram/competitor-sources/{id}"]["patch"]["responses"][200]["content"]["application/json"];
type CompetitorDeleteResponse =
  paths["/api/v1/instagram/competitor-sources/{id}"]["delete"]["responses"][200]["content"]["application/json"];
type CompetitorMediaResponse =
  paths["/api/v1/instagram/competitor-sources/{id}/media"]["get"]["responses"][200]["content"]["application/json"];
type CompetitorRefreshResponse =
  paths["/api/v1/instagram/competitor-sources/refresh"]["post"]["responses"][200]["content"]["application/json"];

export type IgCompetitorSource = CompetitorListResponse["data"][number];
export type IgCompetitorSourceCreateInput = CompetitorCreateBody;
export type IgCompetitorSourceUpdateInput = CompetitorUpdateBody;
export type IgCompetitorMedia = CompetitorMediaResponse["data"][number];
export type IgCompetitorRefreshResult = CompetitorRefreshResponse["data"];

export class InstagramCompetitorSourcesResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Every tracked handle and hashtag, enabled and disabled, newest first.
   *
   * `media_count` is `null`, not `0`, when the count could not be assembled —
   * see the field's description. Treating the two as the same is what made a
   * stalled sync render as "no posts".
   */
  async list(options: ReadExtras = {}): Promise<IgCompetitorSource[]> {
    const res = await this.http.request<CompetitorListResponse>({
      method: "GET",
      path: "/api/v1/instagram/competitor-sources",
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Track a handle or hashtag. `value` is normalised (lowercased, leading `@`
   * or `#` removed) before it is stored, and validated against Meta's charset —
   * an invalid character does not fail loudly at Meta, it fails as a sync that
   * reports zero rows forever.
   */
  async create(
    input: IgCompetitorSourceCreateInput,
    options: WriteExtras = {},
  ): Promise<IgCompetitorSource> {
    const res = await this.http.request<CompetitorCreateResponse>({
      method: "POST",
      path: "/api/v1/instagram/competitor-sources",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /** Enable, disable or relabel one source. */
  async update(
    sourceId: string,
    input: IgCompetitorSourceUpdateInput,
    options: WriteExtras = {},
  ): Promise<IgCompetitorSource> {
    const res = await this.http.request<CompetitorUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/instagram/competitor-sources/${encodeURIComponent(sourceId)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /** Stop tracking a source. 404 when this profile does not own it. */
  async delete(sourceId: string, options: WriteExtras = {}): Promise<void> {
    await this.http.request<CompetitorDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/instagram/competitor-sources/${encodeURIComponent(sourceId)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** The latest snapshot day's posts for one source, most-liked first. */
  async media(sourceId: string, options: ReadExtras = {}): Promise<IgCompetitorMedia[]> {
    const res = await this.http.request<CompetitorMediaResponse>({
      method: "GET",
      path: `/api/v1/instagram/competitor-sources/${encodeURIComponent(sourceId)}/media`,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Queue a competitor-research sync now. Enqueue-only — poll {@link list} for
   * `last_synced_at` to see it land. `already_queued` is a success.
   */
  async refresh(options: WriteExtras = {}): Promise<IgCompetitorRefreshResult> {
    const res = await this.http.request<CompetitorRefreshResponse>({
      method: "POST",
      path: "/api/v1/instagram/competitor-sources/refresh",
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }
}

// --- short links -----------------------------------------------------------

type ShortLinkListResponse =
  paths["/api/v1/instagram/short-links"]["get"]["responses"][200]["content"]["application/json"];
type ShortLinkCreateBody = NonNullable<
  paths["/api/v1/instagram/short-links"]["post"]["requestBody"]
>["content"]["application/json"];
type ShortLinkCreateResponse =
  paths["/api/v1/instagram/short-links"]["post"]["responses"][201]["content"]["application/json"];
type FollowProxyBody = NonNullable<
  paths["/api/v1/instagram/short-links/follow-proxy"]["post"]["requestBody"]
>["content"]["application/json"];
type FollowProxyResponse =
  paths["/api/v1/instagram/short-links/follow-proxy"]["post"]["responses"][201]["content"]["application/json"];

export type IgShortLinkList = ShortLinkListResponse["data"];
export type IgShortLink = IgShortLinkList["links"][number];
export type IgShortLinkCreateInput = ShortLinkCreateBody;
export type IgShortLinkCreated = ShortLinkCreateResponse["data"];
export type IgFollowProxyInput = FollowProxyBody;
export type IgFollowProxyLink = FollowProxyResponse["data"];

export class InstagramShortLinksResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * The profile's `/r/<slug>` links plus the `base_url` they resolve against.
   *
   * The whole `data` object, not just the array: the base URL is the main app's
   * origin, which a caller cannot derive from the API's own host.
   */
  async list(options: ReadExtras = {}): Promise<IgShortLinkList> {
    const res = await this.http.request<ShortLinkListResponse>({
      method: "GET",
      path: "/api/v1/instagram/short-links",
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Mint a short link.
   *
   * Idempotent per `ig_media_id`: a second call for the same media returns the
   * existing reservation with `reused: true` rather than a second slug. Pin a
   * `slug` only when you mean it — one that disagrees with an existing
   * reservation is a 409, not a silent substitution.
   */
  async create(
    input: IgShortLinkCreateInput,
    options: WriteExtras = {},
  ): Promise<IgShortLinkCreated> {
    const res = await this.http.request<ShortLinkCreateResponse>({
      method: "POST",
      path: "/api/v1/instagram/short-links",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Mint a Follow Proxy link for an Instagram handle — the URL to put in a Meta
   * Website-Traffic ad so a later Follow→DM can be joined back to the ad.
   *
   * Idempotent per handle.
   */
  async createFollowProxy(
    input: IgFollowProxyInput,
    options: WriteExtras = {},
  ): Promise<IgFollowProxyLink> {
    const res = await this.http.request<FollowProxyResponse>({
      method: "POST",
      path: "/api/v1/instagram/short-links/follow-proxy",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }
}

// --- bio media -------------------------------------------------------------

type BioMediaBody = NonNullable<
  paths["/api/v1/instagram/bio-media/{media_id}"]["patch"]["requestBody"]
>["content"]["application/json"];
type BioMediaResponse =
  paths["/api/v1/instagram/bio-media/{media_id}"]["patch"]["responses"][200]["content"]["application/json"];

export type IgBioMediaVisibility = BioMediaResponse["data"];

export class InstagramBioMediaResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Show or hide one synced post on the hosted `/bio/<slug>` page.
   *
   * `mediaId` is the META media id, not an Atribu uuid.
   */
  async setVisibility(
    mediaId: string,
    input: BioMediaBody,
    options: WriteExtras = {},
  ): Promise<IgBioMediaVisibility> {
    const res = await this.http.request<BioMediaResponse>({
      method: "PATCH",
      path: `/api/v1/instagram/bio-media/${encodeURIComponent(mediaId)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }
}

// --- accounts + account-keyed triggers -------------------------------------

type AccountsListResponse =
  paths["/api/v1/instagram/accounts"]["get"]["responses"][200]["content"]["application/json"];
type AccountDisconnectResponse =
  paths["/api/v1/instagram/accounts/{account_id}"]["delete"]["responses"][200]["content"]["application/json"];
type AccountMediaResponse =
  paths["/api/v1/instagram/accounts/{account_id}/media"]["get"]["responses"][200]["content"]["application/json"];
type AccountResumeResponse =
  paths["/api/v1/instagram/accounts/{account_id}/resume-comment-to-dm"]["post"]["responses"][200]["content"]["application/json"];
type AccountTriggersResponse =
  paths["/api/v1/instagram/accounts/{account_id}/comment-triggers"]["get"]["responses"][200]["content"]["application/json"];
type AccountTriggerCreateBody = NonNullable<
  paths["/api/v1/instagram/accounts/{account_id}/comment-triggers"]["post"]["requestBody"]
>["content"]["application/json"];
type AccountTriggerCreateResponse =
  paths["/api/v1/instagram/accounts/{account_id}/comment-triggers"]["post"]["responses"][201]["content"]["application/json"];
type AccountTriggerUpdateBody = NonNullable<
  paths["/api/v1/instagram/accounts/{account_id}/comment-triggers/{trigger_id}"]["patch"]["requestBody"]
>["content"]["application/json"];
type AccountTriggerUpdateResponse =
  paths["/api/v1/instagram/accounts/{account_id}/comment-triggers/{trigger_id}"]["patch"]["responses"][200]["content"]["application/json"];
type AccountTriggerDeleteResponse =
  paths["/api/v1/instagram/accounts/{account_id}/comment-triggers/{trigger_id}"]["delete"]["responses"][200]["content"]["application/json"];
type AccountTriggerTestDmResponse =
  paths["/api/v1/instagram/accounts/{account_id}/comment-triggers/{trigger_id}/test-dm"]["post"]["responses"][200]["content"]["application/json"];

export type IgAccount = AccountsListResponse["data"][number];
export type IgAccountMediaPage = AccountMediaResponse["data"];
export type IgAccountCommentTrigger = AccountTriggersResponse["data"][number];
export type IgAccountCommentTriggerCreateInput = AccountTriggerCreateBody;
export type IgAccountCommentTriggerUpdateInput = AccountTriggerUpdateBody;

export interface IgAccountMediaOptions extends ReadExtras {
  /** 1–60, default 24. */
  limit?: number;
  /** The previous page's `next_cursor`. */
  after?: string;
}

export class InstagramAccountsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Connected Instagram accounts, each with its connection's health. */
  async list(options: ReadExtras = {}): Promise<IgAccount[]> {
    const res = await this.http.request<AccountsListResponse>({
      method: "GET",
      path: "/api/v1/instagram/accounts",
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Disconnect an account. Promotes a surviving binding to automation owner
   * when this one held it, so another workspace's automations do not go dark.
   */
  async disconnect(accountId: string, options: WriteExtras = {}): Promise<void> {
    await this.http.request<AccountDisconnectResponse>({
      method: "DELETE",
      path: `/api/v1/instagram/accounts/${encodeURIComponent(accountId)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * One page of the account's SYNCED posts — a database read, safe to poll.
   *
   * The page carries the connection's `status` and `last_synced_at` so a picker
   * polling for a running sync does not need a second call per tick.
   */
  async media(
    accountId: string,
    options: IgAccountMediaOptions = {},
  ): Promise<IgAccountMediaPage> {
    const { signal, ...query } = options;
    const res = await this.http.request<AccountMediaResponse>({
      method: "GET",
      path: `/api/v1/instagram/accounts/${encodeURIComponent(accountId)}/media`,
      query,
      signal,
    });
    return res.data;
  }

  /**
   * Clear a tripped comment-to-DM breaker. Clears both the pause column and the
   * Redis key the send path actually consults — one without the other is not a
   * resume.
   */
  async resumeCommentToDm(accountId: string, options: WriteExtras = {}): Promise<void> {
    await this.http.request<AccountResumeResponse>({
      method: "POST",
      path: `/api/v1/instagram/accounts/${encodeURIComponent(accountId)}/resume-comment-to-dm`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** The account's comment-to-DM triggers, oldest first. */
  async listTriggers(
    accountId: string,
    options: ReadExtras = {},
  ): Promise<IgAccountCommentTrigger[]> {
    const res = await this.http.request<AccountTriggersResponse>({
      method: "GET",
      path: `/api/v1/instagram/accounts/${encodeURIComponent(accountId)}/comment-triggers`,
      signal: options.signal,
    });
    return res.data;
  }

  async createTrigger(
    accountId: string,
    input: IgAccountCommentTriggerCreateInput,
    options: WriteExtras = {},
  ): Promise<IgAccountCommentTrigger> {
    const res = await this.http.request<AccountTriggerCreateResponse>({
      method: "POST",
      path: `/api/v1/instagram/accounts/${encodeURIComponent(accountId)}/comment-triggers`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  async updateTrigger(
    accountId: string,
    triggerId: string,
    input: IgAccountCommentTriggerUpdateInput,
    options: WriteExtras = {},
  ): Promise<IgAccountCommentTrigger> {
    const res = await this.http.request<AccountTriggerUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/instagram/accounts/${encodeURIComponent(accountId)}/comment-triggers/${encodeURIComponent(triggerId)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  async deleteTrigger(
    accountId: string,
    triggerId: string,
    options: WriteExtras = {},
  ): Promise<void> {
    await this.http.request<AccountTriggerDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/instagram/accounts/${encodeURIComponent(accountId)}/comment-triggers/${encodeURIComponent(triggerId)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Send the trigger's opening message to one IGSID as a test DM (HUMAN_AGENT
   * tag). Meta refuses unless that person messaged the account in the last 7 days.
   */
  async testTriggerDm(
    accountId: string,
    triggerId: string,
    recipientIgsid: string,
    options: WriteExtras = {},
  ): Promise<AccountTriggerTestDmResponse["data"]> {
    const res = await this.http.request<AccountTriggerTestDmResponse>({
      method: "POST",
      path: `/api/v1/instagram/accounts/${encodeURIComponent(accountId)}/comment-triggers/${encodeURIComponent(triggerId)}/test-dm`,
      body: { recipient_igsid: recipientIgsid },
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }
}

// --- CTM / follower / identity-review reads, and the sync trigger -----------

type CtmHealthResponse =
  paths["/api/v1/instagram/ctm-health"]["get"]["responses"][200]["content"]["application/json"];
type CtmInventoryResponse =
  paths["/api/v1/instagram/ctm-inventory"]["get"]["responses"][200]["content"]["application/json"];
type FollowerAttributionResponse =
  paths["/api/v1/instagram/follower-attribution"]["get"]["responses"][200]["content"]["application/json"];
type IdentityReviewsResponse =
  paths["/api/v1/instagram/identity-reviews"]["get"]["responses"][200]["content"]["application/json"];
type IdentityReviewDecideBody = NonNullable<
  paths["/api/v1/instagram/identity-reviews/{review_id}/decide"]["post"]["requestBody"]
>["content"]["application/json"];
type IdentityReviewDecideResponse =
  paths["/api/v1/instagram/identity-reviews/{review_id}/decide"]["post"]["responses"][200]["content"]["application/json"];
type SyncResponse =
  paths["/api/v1/instagram/sync"]["post"]["responses"][202]["content"]["application/json"];

export type IgCtmHealth = CtmHealthResponse["data"];
export type IgCtmInventory = CtmInventoryResponse["data"];
export type IgFollowerAttribution = FollowerAttributionResponse["data"];
export type IgIdentityReviews = IdentityReviewsResponse["data"];
export type IgIdentityReviewDecision = IdentityReviewDecideResponse["data"];
export type IgSyncResult = SyncResponse["data"];

export interface IgWindowOptions extends ReadExtras {
  /** 1–90. Defaults to 14 for CTM health, 30 for follower attribution. */
  window_days?: number;
}

export class InstagramInsightsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Click-to-Message attribution health.
   *
   * `severity: "empty"` means the window holds no Instagram conversations at
   * all — it is not a bad score, and rendering it as one is the mistake this
   * field exists to prevent.
   */
  async ctmHealth(options: IgWindowOptions = {}): Promise<IgCtmHealth> {
    const { signal, ...query } = options;
    const res = await this.http.request<CtmHealthResponse>({
      method: "GET",
      path: "/api/v1/instagram/ctm-health",
      query,
      signal,
    });
    return res.data;
  }

  /** MESSAGES-objective ads and whether ManyChat maps each one. */
  async ctmInventory(options: ReadExtras = {}): Promise<IgCtmInventory> {
    const res = await this.http.request<CtmInventoryResponse>({
      method: "GET",
      path: "/api/v1/instagram/ctm-inventory",
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Expected followers per ad.
   *
   * Read `coverage_note` before quoting these: only followers who DM the
   * business are scored, because Meta does not expose the `follow` webhook
   * field to Instagram Business Login apps.
   */
  async followerAttribution(options: IgWindowOptions = {}): Promise<IgFollowerAttribution> {
    const { signal, ...query } = options;
    const res = await this.http.request<FollowerAttributionResponse>({
      method: "GET",
      path: "/api/v1/instagram/follower-attribution",
      query,
      signal,
    });
    return res.data;
  }

  /** The pending DM identity-match review queue. */
  async identityReviews(
    options: ReadExtras & { limit?: number } = {},
  ): Promise<IgIdentityReviews> {
    const { signal, ...query } = options;
    const res = await this.http.request<IdentityReviewsResponse>({
      method: "GET",
      path: "/api/v1/instagram/identity-reviews",
      query,
      signal,
    });
    return res.data;
  }

  /**
   * Approve or reject one identity match. Approving MERGES identities — it is
   * what lets a DM conversation be credited to a later payment.
   */
  async decideIdentityReview(
    reviewId: string,
    input: IdentityReviewDecideBody,
    options: WriteExtras = {},
  ): Promise<IgIdentityReviewDecision> {
    const res = await this.http.request<IdentityReviewDecideResponse>({
      method: "POST",
      path: `/api/v1/instagram/identity-reviews/${encodeURIComponent(reviewId)}/decide`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Queue this profile's Instagram sync. 202 — accepted, not done. Poll
   * `accounts.media(...)` for `connection_status` / `last_synced_at`.
   */
  async sync(options: WriteExtras = {}): Promise<IgSyncResult> {
    const res = await this.http.request<SyncResponse>({
      method: "POST",
      path: "/api/v1/instagram/sync",
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }
}

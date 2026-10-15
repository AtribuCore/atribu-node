/**
 * The unified inbox (#649). Conversations and messages across WhatsApp,
 * Instagram and email, plus organic/ad match suggestions, pending
 * contact-extraction review proposals and the Instagram DM↔payment
 * reconciliation worklist. Reads require `conversations:read`; the writes
 * below (PR-B — send/draft/labels/link/unlink/decide/resolve-user) require
 * `conversations:write`.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

type ListQuery = NonNullable<paths["/api/v1/conversations"]["get"]["parameters"]["query"]>;
export type ConversationsListResponse =
  paths["/api/v1/conversations"]["get"]["responses"][200]["content"]["application/json"];
export type ConversationsListOptions = ListQuery & ReadExtras;

type MessagesQuery = NonNullable<
  paths["/api/v1/conversations/{id}/messages"]["get"]["parameters"]["query"]
>;
export type ConversationMessagesResponse =
  paths["/api/v1/conversations/{id}/messages"]["get"]["responses"][200]["content"]["application/json"];
export type ConversationMessagesOptions = MessagesQuery & ReadExtras;

type OrganicMatchesQuery = NonNullable<
  paths["/api/v1/conversations/{id}/organic-matches"]["get"]["parameters"]["query"]
>;
export type ConversationOrganicMatchesResponse =
  paths["/api/v1/conversations/{id}/organic-matches"]["get"]["responses"][200]["content"]["application/json"];
export type ConversationOrganicMatchesOptions = OrganicMatchesQuery & ReadExtras;

export type ConversationLabelsResponse =
  paths["/api/v1/conversations/{id}/labels"]["get"]["responses"][200]["content"]["application/json"];

export type ConversationReviewProposalsResponse =
  paths["/api/v1/conversations/{id}/review-proposals"]["get"]["responses"][200]["content"]["application/json"];

export type ConversationDetectedContactsResponse =
  paths["/api/v1/conversations/{id}/detected-contacts"]["get"]["responses"][200]["content"]["application/json"];

export type PendingReviewsCountResponse =
  paths["/api/v1/inbox/pending-reviews-count"]["get"]["responses"][200]["content"]["application/json"];

type UnlinkedPaymentsQuery = NonNullable<
  paths["/api/v1/instagram/unlinked-payments"]["get"]["parameters"]["query"]
>;
export type UnlinkedInstagramPaymentsResponse =
  paths["/api/v1/instagram/unlinked-payments"]["get"]["responses"][200]["content"]["application/json"];
export type UnlinkedInstagramPaymentsOptions = UnlinkedPaymentsQuery & ReadExtras;

type SearchConversationsQuery = NonNullable<
  paths["/api/v1/instagram/search-conversations"]["get"]["parameters"]["query"]
>;
export type InstagramConversationSearchResponse =
  paths["/api/v1/instagram/search-conversations"]["get"]["responses"][200]["content"]["application/json"];
export type InstagramConversationSearchOptions = SearchConversationsQuery & ReadExtras;

export type SendMessageBody = NonNullable<
  paths["/api/v1/conversations/{id}/messages"]["post"]["requestBody"]
>["content"]["application/json"];
export type SendMessageResponse =
  paths["/api/v1/conversations/{id}/messages"]["post"]["responses"][200]["content"]["application/json"];

export type SaveDraftBody = NonNullable<
  paths["/api/v1/conversations/{id}/draft"]["post"]["requestBody"]
>["content"]["application/json"];
export type SaveDraftResponse =
  paths["/api/v1/conversations/{id}/draft"]["post"]["responses"][200]["content"]["application/json"];

export type ApplyLabelsBody = NonNullable<
  paths["/api/v1/conversations/{id}/labels"]["post"]["requestBody"]
>["content"]["application/json"];
export type ApplyLabelsResponse =
  paths["/api/v1/conversations/{id}/labels"]["post"]["responses"][200]["content"]["application/json"];

export type LinkCustomerBody = NonNullable<
  paths["/api/v1/conversations/{id}/link-customer"]["post"]["requestBody"]
>["content"]["application/json"];
export type LinkCustomerResponse =
  paths["/api/v1/conversations/{id}/link-customer"]["post"]["responses"][200]["content"]["application/json"];
export type UnlinkCustomerResponse =
  paths["/api/v1/conversations/{id}/unlink-customer"]["post"]["responses"][200]["content"]["application/json"];

export type DecideReviewProposalBody = NonNullable<
  paths["/api/v1/conversations/{id}/review-proposals"]["post"]["requestBody"]
>["content"]["application/json"];
export type DecideReviewProposalResponse =
  paths["/api/v1/conversations/{id}/review-proposals"]["post"]["responses"][200]["content"]["application/json"];

export type ResolveConversationUserResponse =
  paths["/api/v1/conversations/{id}/resolve-user"]["get"]["responses"][200]["content"]["application/json"];

export class ConversationsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** One page of conversations across every connected channel, newest first. */
  async list(options: ConversationsListOptions = {}): Promise<ConversationsListResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversationsListResponse>({
      method: "GET",
      path: "/api/v1/conversations",
      query,
      signal,
    });
  }

  /** A conversation's message thread, newest first. */
  async messages(
    id: string,
    options: ConversationMessagesOptions = {},
  ): Promise<ConversationMessagesResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversationMessagesResponse>({
      method: "GET",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/messages`,
      query,
      signal,
    });
  }

  /** Organic posts + ads semantically related to a conversation. */
  async organicMatches(
    id: string,
    options: ConversationOrganicMatchesOptions = {},
  ): Promise<ConversationOrganicMatchesResponse> {
    const { signal, ...query } = options;
    return this.http.request<ConversationOrganicMatchesResponse>({
      method: "GET",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/organic-matches`,
      query,
      signal,
    });
  }

  /** An email conversation's connected mailbox's Gmail labels. */
  async labels(id: string, options: ReadExtras = {}): Promise<ConversationLabelsResponse> {
    return this.http.request<ConversationLabelsResponse>({
      method: "GET",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/labels`,
      signal: options.signal,
    });
  }

  /** A conversation's pending contact-extraction review proposals. */
  async reviewProposals(
    id: string,
    options: ReadExtras = {},
  ): Promise<ConversationReviewProposalsResponse> {
    return this.http.request<ConversationReviewProposalsResponse>({
      method: "GET",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/review-proposals`,
      signal: options.signal,
    });
  }

  /** The email / phone the customer typed in a conversation, beside their customer's (#2057). */
  async detectedContacts(
    id: string,
    options: ReadExtras = {},
  ): Promise<ConversationDetectedContactsResponse> {
    return this.http.request<ConversationDetectedContactsResponse>({
      method: "GET",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/detected-contacts`,
      signal: options.signal,
    });
  }

  /** The profile's pending review-queue count, plus the oldest proposal's conversation. */
  async pendingReviewsCount(options: ReadExtras = {}): Promise<PendingReviewsCountResponse> {
    return this.http.request<PendingReviewsCountResponse>({
      method: "GET",
      path: "/api/v1/inbox/pending-reviews-count",
      signal: options.signal,
    });
  }

  /** Recent cash payments with no linked Instagram conversation. */
  async unlinkedInstagramPayments(
    options: UnlinkedInstagramPaymentsOptions = {},
  ): Promise<UnlinkedInstagramPaymentsResponse> {
    const { signal, ...query } = options;
    return this.http.request<UnlinkedInstagramPaymentsResponse>({
      method: "GET",
      path: "/api/v1/instagram/unlinked-payments",
      query,
      signal,
    });
  }

  /** Typeahead search over Instagram conversations. */
  async searchInstagramConversations(
    options: InstagramConversationSearchOptions = {},
  ): Promise<InstagramConversationSearchResponse> {
    const { signal, ...query } = options;
    return this.http.request<InstagramConversationSearchResponse>({
      method: "GET",
      path: "/api/v1/instagram/search-conversations",
      query,
      signal,
    });
  }

  // -- writes (conversations:write) --------------------------------------

  /** Send a reply on a conversation (text-only in v1). */
  async sendMessage(
    id: string,
    body: SendMessageBody,
    options: WriteExtras = {},
  ): Promise<SendMessageResponse> {
    return this.http.request<SendMessageResponse>({
      method: "POST",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/messages`,
      body,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Save a reply as a Gmail draft instead of sending it. Email-channel only. */
  async saveDraft(
    id: string,
    body: SaveDraftBody,
    options: WriteExtras = {},
  ): Promise<SaveDraftResponse> {
    return this.http.request<SaveDraftResponse>({
      method: "POST",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/draft`,
      body,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Add/remove Gmail labels on an email conversation's thread. */
  async applyLabels(
    id: string,
    body: ApplyLabelsBody,
    options: WriteExtras = {},
  ): Promise<ApplyLabelsResponse> {
    return this.http.request<ApplyLabelsResponse>({
      method: "POST",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/labels`,
      body,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Link an Instagram conversation to a customer (human-driven DM→payment link). */
  async linkCustomer(
    id: string,
    body: LinkCustomerBody,
    options: WriteExtras = {},
  ): Promise<LinkCustomerResponse> {
    return this.http.request<LinkCustomerResponse>({
      method: "POST",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/link-customer`,
      body,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Undo a prior manual DM→payment link. */
  async unlinkCustomer(id: string, options: WriteExtras = {}): Promise<UnlinkCustomerResponse> {
    return this.http.request<UnlinkCustomerResponse>({
      method: "POST",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/unlink-customer`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Approve or reject a pending contact-extraction review proposal. */
  async decideReviewProposal(
    id: string,
    body: DecideReviewProposalBody,
    options: WriteExtras = {},
  ): Promise<DecideReviewProposalResponse> {
    return this.http.request<DecideReviewProposalResponse>({
      method: "POST",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/review-proposals`,
      body,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Resolve an Instagram conversation's IGSID to @username/name/photo. A GET
   * with real side effects (a live Graph API call plus a cache write-through)
   * — requires `conversations:write` despite the verb.
   */
  async resolveUser(
    id: string,
    options: ReadExtras = {},
  ): Promise<ResolveConversationUserResponse> {
    return this.http.request<ResolveConversationUserResponse>({
      method: "GET",
      path: `/api/v1/conversations/${encodeURIComponent(id)}/resolve-user`,
      signal: options.signal,
    });
  }
}

import type { HttpClientLike } from "../../http";
import { InstagramTriggersResource } from "./triggers";
import { InstagramContactsResource } from "./contacts";
import { InstagramMediaResource } from "./media";
import { InstagramConversationsResource } from "./conversations";
import {
  InstagramAccountsResource,
  InstagramBioMediaResource,
  InstagramCompetitorSourcesResource,
  InstagramInsightsResource,
  InstagramShortLinksResource,
} from "./console";

/**
 * Instagram-specific resource namespace. Mounted on `AtribuClient.instagram`.
 * Cross-channel messaging stays on `AtribuClient.messages` and
 * `AtribuClient.comments`.
 *
 * TWO GENERATIONS OF SURFACE LIVE HERE, and the split is a fact about the API,
 * not a tidiness problem to solve:
 *
 *   `triggers` / `contacts` / `media` / `conversations` are the ORIGINAL
 *   consumer surface — connection-keyed, and `media` proxies Meta's Graph live.
 *
 *   `accounts` / `competitorSources` / `shortLinks` / `bioMedia` / `insights`
 *   are the console surface folded onto v1 by #489 — ACCOUNT-keyed, and every
 *   one of them reads or writes our own database rather than calling Meta.
 *
 * `accounts.listTriggers` and `triggers.list` therefore return the same rows
 * through different keys. Use whichever id you hold.
 */
export class InstagramNamespace {
  readonly triggers: InstagramTriggersResource;
  readonly contacts: InstagramContactsResource;
  readonly media: InstagramMediaResource;
  readonly conversations: InstagramConversationsResource;
  readonly accounts: InstagramAccountsResource;
  readonly competitorSources: InstagramCompetitorSourcesResource;
  readonly shortLinks: InstagramShortLinksResource;
  readonly bioMedia: InstagramBioMediaResource;
  readonly insights: InstagramInsightsResource;

  constructor(http: HttpClientLike) {
    this.triggers = new InstagramTriggersResource(http);
    this.contacts = new InstagramContactsResource(http);
    this.media = new InstagramMediaResource(http);
    this.conversations = new InstagramConversationsResource(http);
    this.accounts = new InstagramAccountsResource(http);
    this.competitorSources = new InstagramCompetitorSourcesResource(http);
    this.shortLinks = new InstagramShortLinksResource(http);
    this.bioMedia = new InstagramBioMediaResource(http);
    this.insights = new InstagramInsightsResource(http);
  }
}

export type {
  InstagramTrigger,
  InstagramTriggerCreateInput,
  InstagramTriggerUpdateInput,
} from "./triggers";
export type { InstagramContact, GetContactOptions } from "./contacts";
export type {
  InstagramMedia,
  InstagramMediaChild,
  InstagramMediaPage,
  InstagramMediaContainerInput,
  InstagramMediaContainer,
  InstagramMediaPublishInput,
  InstagramMediaPublishResult,
  InstagramMediaListOptions,
  InstagramMediaReadOptions,
  InstagramMediaWriteOptions,
} from "./media";
export type {
  InstagramConversation,
  InstagramConversationParticipant,
  InstagramConversationMessage,
  InstagramConversationPage,
  InstagramConversationMessagePage,
  InstagramMessageParty,
  InstagramMessageAttachment,
  InstagramConversationListOptions,
  InstagramConversationMessagesOptions,
} from "./conversations";
// #489 — the console surface's types.
export type {
  IgAccount,
  IgAccountCommentTrigger,
  IgAccountCommentTriggerCreateInput,
  IgAccountCommentTriggerUpdateInput,
  IgAccountMediaOptions,
  IgAccountMediaPage,
  IgBioMediaVisibility,
  IgCompetitorMedia,
  IgCompetitorRefreshResult,
  IgCompetitorSource,
  IgCompetitorSourceCreateInput,
  IgCompetitorSourceUpdateInput,
  IgCtmHealth,
  IgCtmInventory,
  IgFollowProxyInput,
  IgFollowProxyLink,
  IgFollowerAttribution,
  IgIdentityReviewDecision,
  IgIdentityReviews,
  IgShortLink,
  IgShortLinkCreateInput,
  IgShortLinkCreated,
  IgShortLinkList,
  IgSyncResult,
  IgWindowOptions,
} from "./console";

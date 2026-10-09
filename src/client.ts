import { resolveConfig, type AtribuClientConfig } from "./config";
import { HttpClient, type HttpClientLike } from "./http";
import { MessagesResource } from "./resources/messages";
import { EmailResource } from "./resources/email";
import { CalendarResource } from "./resources/calendar";
import { ExternalCalendarsResource } from "./resources/calendar-read";
import { CommentsResource } from "./resources/comments";
import { ConnectionsResource } from "./resources/connections";
import { ShopifyResource } from "./resources/shopify";
// #489 (m6 fold-integrations) — the "Settings → Integrations" connection
// surface: Fintoc, GoHighLevel's outcome-mapping prefill, ManyChat, Meta Pages.
import { IntegrationConnectionsResource } from "./resources/integration-connections";
import { HandoffsResource } from "./resources/handoffs";
import { LegalResource } from "./resources/legal";
import { WebhookSubscriptionsResource } from "./resources/webhook-subscriptions";
import { WebhookDeliveriesResource } from "./resources/webhook-deliveries";
import { OutcomesRecordedResource } from "./resources/outcomes-recorded";
import { WhatsAppNamespace } from "./resources/whatsapp";
import { InstagramNamespace } from "./resources/instagram";
import { EventsResource } from "./resources/events";
import { PaymentsResource } from "./resources/payments";
import { AnalyticsResource } from "./resources/analytics";
import { ProfileResource } from "./resources/profile";
import { MeResource } from "./resources/me";
import { WorkspacesResource } from "./resources/workspaces";
import { AttributionResource } from "./resources/attribution";
import { OrganicResource } from "./resources/organic";
import { AdsResource } from "./resources/ads";
import { DmAdsResource } from "./resources/dm-ads";
import { QualityResource } from "./resources/quality";
// #643 — customer identity: the suggested-merge review queue and the
// profile-wide repair scan.
import { IdentityResource } from "./resources/identity";
// #588 — the two control-bar reads that are neither window aggregates nor
// profile context: the definition catalogs and the filter-value picker.
import { GoalsResource } from "./resources/goals";
import { ChannelRulesResource } from "./resources/channel-rules";
// #391 — a connected store's catalogue and orders. Pairs with the five
// `shopify` webhook event kinds in ./webhooks.
import { CommerceNamespace } from "./resources/commerce";
import { FiltersResource } from "./resources/filters";
import { AppointmentsResource } from "./resources/appointments";
import { RecommendationsResource } from "./resources/recommendations";
import { ExportsResource } from "./resources/exports";
import { TrackingResource } from "./resources/tracking";
// #489 — the Conversion Sync console's read surface. Named `conversionSync`,
// not `exports`: that name is already taken by `ExportsResource` above (the
// `/api/v1/exports/*` conversion-EXPORT ledger/trigger surface) — a
// different domain despite the coincidental overlap with this one's
// `exports:read` scope.
import { ConversionSyncResource } from "./resources/conversion-sync";
import { ReportsResource } from "./resources/reports";
// #649 — the unified inbox reads: conversations, message threads,
// organic/ad matches, review proposals and the Instagram DM↔payment worklist.
import { ConversationsResource } from "./resources/conversations";
// #656 — the credential-less endpoints. Present on THIS client too, not only on
// `AtribuPublicClient`: a consumer that already holds a key should not have to
// build a second client to follow a share link. Its methods send no
// Authorization header either way — see `PublicNamespace`.
import { PublicNamespace } from "./resources/public";
import { RetryingHttpClient, type RetryOptions } from "./retry-wrapper";

interface ResourceBundle {
  messages: MessagesResource;
  email: EmailResource;
  calendar: CalendarResource;
  externalCalendars: ExternalCalendarsResource;
  comments: CommentsResource;
  connections: ConnectionsResource;
  shopify: ShopifyResource;
  integrationConnections: IntegrationConnectionsResource;
  /** #1045 — poll a hand-off you gave a human. There is no create(). */
  handoffs: HandoffsResource;
  /** #1051 — DPA/BAA signing: mint a hand-off, or accept as a signed-in admin. */
  legal: LegalResource;
  events: EventsResource;
  payments: PaymentsResource;
  analytics: AnalyticsResource;
  profile: ProfileResource;
  /** #487 / #617 — workspace-scoped reads. Session bearers only. */
  workspaces: WorkspacesResource;
  me: MeResource;
  attribution: AttributionResource;
  organic: OrganicResource;
  ads: AdsResource;
  /** #646 — the click-to-message board. */
  dmAds: DmAdsResource;
  quality: QualityResource;
  identity: IdentityResource;
  goals: GoalsResource;
  channelRules: ChannelRulesResource;
  commerce: CommerceNamespace;
  filters: FiltersResource;
  appointments: AppointmentsResource;
  recommendations: RecommendationsResource;
  exports: ExportsResource;
  tracking: TrackingResource;
  conversionSync: ConversionSyncResource;
  reports: ReportsResource;
  /** #649 — the unified inbox (reads). */
  conversations: ConversationsResource;
  /** #656 — the endpoints that take no credential. */
  public: PublicNamespace;
  webhooks: {
    subscriptions: WebhookSubscriptionsResource;
    deliveries: WebhookDeliveriesResource;
    outcomesRecorded: OutcomesRecordedResource;
  };
  whatsapp: WhatsAppNamespace;
  instagram: InstagramNamespace;
}

function buildResources(http: HttpClientLike): ResourceBundle {
  return {
    messages: new MessagesResource(http),
    email: new EmailResource(http),
    calendar: new CalendarResource(http),
    externalCalendars: new ExternalCalendarsResource(http),
    comments: new CommentsResource(http),
    connections: new ConnectionsResource(http),
    shopify: new ShopifyResource(http),
    integrationConnections: new IntegrationConnectionsResource(http),
    handoffs: new HandoffsResource(http),
    legal: new LegalResource(http),
    events: new EventsResource(http),
    payments: new PaymentsResource(http),
    analytics: new AnalyticsResource(http),
    profile: new ProfileResource(http),
    workspaces: new WorkspacesResource(http),
    me: new MeResource(http),
    attribution: new AttributionResource(http),
    organic: new OrganicResource(http),
    ads: new AdsResource(http),
    dmAds: new DmAdsResource(http),
    quality: new QualityResource(http),
    identity: new IdentityResource(http),
    goals: new GoalsResource(http),
    channelRules: new ChannelRulesResource(http),
    commerce: new CommerceNamespace(http),
    filters: new FiltersResource(http),
    appointments: new AppointmentsResource(http),
    recommendations: new RecommendationsResource(http),
    exports: new ExportsResource(http),
    tracking: new TrackingResource(http),
    conversionSync: new ConversionSyncResource(http),
    reports: new ReportsResource(http),
    conversations: new ConversationsResource(http),
    public: new PublicNamespace(http),
    webhooks: {
      subscriptions: new WebhookSubscriptionsResource(http),
      deliveries: new WebhookDeliveriesResource(http),
      outcomesRecorded: new OutcomesRecordedResource(http),
    },
    whatsapp: new WhatsAppNamespace(http),
    instagram: new InstagramNamespace(http),
  };
}

export class AtribuClient {
  readonly messages: MessagesResource;
  readonly email: EmailResource;
  readonly calendar: CalendarResource;
  readonly externalCalendars: ExternalCalendarsResource;
  readonly comments: CommentsResource;
  readonly connections: ConnectionsResource;
  readonly shopify: ShopifyResource;
  readonly integrationConnections: IntegrationConnectionsResource;
  readonly handoffs: HandoffsResource;
  readonly legal: LegalResource;
  readonly events: EventsResource;
  readonly payments: PaymentsResource;
  readonly analytics: AnalyticsResource;
  readonly profile: ProfileResource;
  readonly workspaces: WorkspacesResource;
  readonly me: MeResource;
  readonly attribution: AttributionResource;
  readonly organic: OrganicResource;
  readonly ads: AdsResource;
  readonly dmAds: DmAdsResource;
  readonly quality: QualityResource;
  readonly identity: IdentityResource;
  readonly goals: GoalsResource;
  readonly channelRules: ChannelRulesResource;
  readonly commerce: CommerceNamespace;
  readonly filters: FiltersResource;
  readonly appointments: AppointmentsResource;
  readonly recommendations: RecommendationsResource;
  readonly exports: ExportsResource;
  readonly tracking: TrackingResource;
  readonly conversionSync: ConversionSyncResource;
  readonly reports: ReportsResource;
  readonly conversations: ConversationsResource;
  readonly public: PublicNamespace;
  readonly webhooks: ResourceBundle["webhooks"];
  readonly whatsapp: WhatsAppNamespace;
  readonly instagram: InstagramNamespace;

  /** @internal — exposed for `withRetry` chaining; do not depend on this. */
  protected readonly _http: HttpClientLike;

  constructor(config: AtribuClientConfig) {
    this._http = new HttpClient(resolveConfig(config));
    const r = buildResources(this._http);
    this.messages = r.messages;
    this.email = r.email;
    this.calendar = r.calendar;
    this.externalCalendars = r.externalCalendars;
    this.comments = r.comments;
    this.connections = r.connections;
    this.shopify = r.shopify;
    this.integrationConnections = r.integrationConnections;
    this.handoffs = r.handoffs;
    this.legal = r.legal;
    this.events = r.events;
    this.payments = r.payments;
    this.analytics = r.analytics;
    this.profile = r.profile;
    this.workspaces = r.workspaces;
    this.me = r.me;
    this.attribution = r.attribution;
    this.organic = r.organic;
    this.ads = r.ads;
    this.dmAds = r.dmAds;
    this.quality = r.quality;
    this.identity = r.identity;
    this.goals = r.goals;
    this.channelRules = r.channelRules;
    this.commerce = r.commerce;
    this.filters = r.filters;
    this.appointments = r.appointments;
    this.recommendations = r.recommendations;
    this.exports = r.exports;
    this.tracking = r.tracking;
    this.conversionSync = r.conversionSync;
    this.reports = r.reports;
    this.conversations = r.conversations;
    this.public = r.public;
    this.webhooks = r.webhooks;
    this.whatsapp = r.whatsapp;
    this.instagram = r.instagram;
  }

  /**
   * Returns a new AtribuClient that retries on transient errors. The
   * original client is not mutated. The wrapper respects the typed
   * `retry` hint on AtribuApiError — `do_not_retry`, `fix_and_retry`,
   * and `refresh_token` are NOT retried (those need caller action, not
   * a repeat call).
   *
   * @example
   *   const client = new AtribuClient({...}).withRetry({
   *     maxAttempts: 3,
   *     backoff: "exponential",
   *     baseDelayMs: 500,
   *   });
   *   await client.messages.send({...});
   */
  withRetry(options: RetryOptions): AtribuClient {
    const wrapped = new RetryingHttpClient(this._http, options);
    return AtribuClient._fromHttp(wrapped);
  }

  private static _fromHttp(http: HttpClientLike): AtribuClient {
    const proto = Object.create(AtribuClient.prototype) as object;
    const r = buildResources(http);
    Object.assign(proto, {
      _http: http,
      messages: r.messages,
      email: r.email,
      calendar: r.calendar,
      externalCalendars: r.externalCalendars,
      comments: r.comments,
      connections: r.connections,
      shopify: r.shopify,
      integrationConnections: r.integrationConnections,
      handoffs: r.handoffs,
      legal: r.legal,
      events: r.events,
      // The fourth resource this block forgot, after `dmAds`, `channelRules`
      // and `commerce`: #960's Webpay route added `payments` to
      // `buildResources` and the constructor and not here, so
      // `client.withRetry().payments` was `undefined` and `webpay()` threw a
      // TypeError on any retrying client. `retry-wrapper.test.ts` has compared
      // the two key sets since #656 and is what caught it.
      //
      // #970 and #962 then each added it back, independently, in DIFFERENT
      // slots — and the second to merge made this object literal name
      // `payments` twice, which is a TS1117 that turned `build` red on main for
      // every open PR. Fixed by keeping ONE entry, in the slot `buildResources`
      // itself uses (right after `events`), so the two lists read in the same
      // order and a future addition is diffable against its twin.
      payments: r.payments,
      analytics: r.analytics,
      profile: r.profile,
      workspaces: r.workspaces,
      me: r.me,
      attribution: r.attribution,
      organic: r.organic,
      ads: r.ads,
      // `dmAds` was missing here too (same trap as `channelRules` below): a
      // retrying client's `.dmAds` was `undefined`, so `board()` threw a
      // TypeError on any client built with `withRetry`. Found while wiring
      // the #901/#903 routes, which is what finally exercised this resource
      // through `ROUTE_INVOCATIONS`.
      dmAds: r.dmAds,
      quality: r.quality,
      identity: r.identity,
      goals: r.goals,
      // `channelRules` was missing here until #656 — a retrying client's
      // `.channelRules` was `undefined`, so the four classification reads threw
      // a TypeError on any client built with `withRetry`. Every OTHER resource
      // is listed, which is exactly why it went unnoticed.
      channelRules: r.channelRules,
      // Listed HERE as well as above — the trap the two comments on
      // `dmAds`/`channelRules` describe. A resource missing from this block is
      // `undefined` on any client built with `withRetry`, and only there.
      commerce: r.commerce,
      filters: r.filters,
      appointments: r.appointments,
      recommendations: r.recommendations,
      exports: r.exports,
      tracking: r.tracking,
      conversionSync: r.conversionSync,
      reports: r.reports,
      // Listed here too — the same trap `dmAds`/`channelRules`/`commerce`
      // above describe. Omitting it would make `client.withRetry().conversations`
      // `undefined`.
      conversations: r.conversations,
      public: r.public,
      webhooks: r.webhooks,
      whatsapp: r.whatsapp,
      instagram: r.instagram,
    });
    return proto as AtribuClient;
  }
}

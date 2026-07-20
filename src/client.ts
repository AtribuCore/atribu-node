import { resolveConfig, type AtribuClientConfig } from "./config";
import { HttpClient, type HttpClientLike } from "./http";
import { MessagesResource } from "./resources/messages";
import { EmailResource } from "./resources/email";
import { CalendarResource } from "./resources/calendar";
import { CommentsResource } from "./resources/comments";
import { ConnectionsResource } from "./resources/connections";
import { WebhookSubscriptionsResource } from "./resources/webhook-subscriptions";
import { WebhookDeliveriesResource } from "./resources/webhook-deliveries";
import { WhatsAppNamespace } from "./resources/whatsapp";
import { InstagramNamespace } from "./resources/instagram";
import { EventsResource } from "./resources/events";
import { RetryingHttpClient, type RetryOptions } from "./retry-wrapper";

interface ResourceBundle {
  messages: MessagesResource;
  email: EmailResource;
  calendar: CalendarResource;
  comments: CommentsResource;
  connections: ConnectionsResource;
  events: EventsResource;
  webhooks: {
    subscriptions: WebhookSubscriptionsResource;
    deliveries: WebhookDeliveriesResource;
  };
  whatsapp: WhatsAppNamespace;
  instagram: InstagramNamespace;
}

function buildResources(http: HttpClientLike): ResourceBundle {
  return {
    messages: new MessagesResource(http),
    email: new EmailResource(http),
    calendar: new CalendarResource(http),
    comments: new CommentsResource(http),
    connections: new ConnectionsResource(http),
    events: new EventsResource(http),
    webhooks: {
      subscriptions: new WebhookSubscriptionsResource(http),
      deliveries: new WebhookDeliveriesResource(http),
    },
    whatsapp: new WhatsAppNamespace(http),
    instagram: new InstagramNamespace(http),
  };
}

export class AtribuClient {
  readonly messages: MessagesResource;
  readonly email: EmailResource;
  readonly calendar: CalendarResource;
  readonly comments: CommentsResource;
  readonly connections: ConnectionsResource;
  readonly events: EventsResource;
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
    this.comments = r.comments;
    this.connections = r.connections;
    this.events = r.events;
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
      comments: r.comments,
      connections: r.connections,
      events: r.events,
      webhooks: r.webhooks,
      whatsapp: r.whatsapp,
      instagram: r.instagram,
    });
    return proto as AtribuClient;
  }
}

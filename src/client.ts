import { resolveConfig, type AtribuClientConfig } from "./config";
import { HttpClient, type HttpClientLike } from "./http";
import { MessagesResource } from "./resources/messages";
import { EmailResource } from "./resources/email";
import { CommentsResource } from "./resources/comments";
import { ConnectionsResource } from "./resources/connections";
import { WebhookSubscriptionsResource } from "./resources/webhook-subscriptions";
import { WebhookDeliveriesResource } from "./resources/webhook-deliveries";
import { WhatsAppNamespace } from "./resources/whatsapp";
import { InstagramNamespace } from "./resources/instagram";
import { RetryingHttpClient, type RetryOptions } from "./retry-wrapper";

interface ResourceBundle {
  messages: MessagesResource;
  email: EmailResource;
  comments: CommentsResource;
  connections: ConnectionsResource;
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
    comments: new CommentsResource(http),
    connections: new ConnectionsResource(http),
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
  readonly comments: CommentsResource;
  readonly connections: ConnectionsResource;
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
    this.comments = r.comments;
    this.connections = r.connections;
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
      comments: r.comments,
      connections: r.connections,
      webhooks: r.webhooks,
      whatsapp: r.whatsapp,
      instagram: r.instagram,
    });
    return proto as AtribuClient;
  }
}

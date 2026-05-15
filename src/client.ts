import { resolveConfig, type AtribuClientConfig } from "./config";
import { HttpClient, type HttpClientLike } from "./http";
import { MessagesResource } from "./resources/messages";
import { CommentsResource } from "./resources/comments";
import { WebhookSubscriptionsResource } from "./resources/webhook-subscriptions";
import { WebhookDeliveriesResource } from "./resources/webhook-deliveries";
import { RetryingHttpClient, type RetryOptions } from "./retry-wrapper";

interface ResourceBundle {
  messages: MessagesResource;
  comments: CommentsResource;
  webhooks: {
    subscriptions: WebhookSubscriptionsResource;
    deliveries: WebhookDeliveriesResource;
  };
}

function buildResources(http: HttpClientLike): ResourceBundle {
  return {
    messages: new MessagesResource(http),
    comments: new CommentsResource(http),
    webhooks: {
      subscriptions: new WebhookSubscriptionsResource(http),
      deliveries: new WebhookDeliveriesResource(http),
    },
  };
}

export class AtribuClient {
  readonly messages: MessagesResource;
  readonly comments: CommentsResource;
  readonly webhooks: ResourceBundle["webhooks"];

  /** @internal — exposed for `withRetry` chaining; do not depend on this. */
  protected readonly _http: HttpClientLike;

  constructor(config: AtribuClientConfig) {
    this._http = new HttpClient(resolveConfig(config));
    const r = buildResources(this._http);
    this.messages = r.messages;
    this.comments = r.comments;
    this.webhooks = r.webhooks;
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
      comments: r.comments,
      webhooks: r.webhooks,
    });
    return proto as AtribuClient;
  }
}

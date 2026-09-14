/**
 * The CREDENTIAL-LESS client (#656).
 *
 * Built with no `apiKey` and no `accessToken`, and — this is the whole point —
 * exposing only `public`. There is no `analytics`, no `reports`, no `customers`
 * to reach for, so `client.reports.list()` on one of these is a COMPILE ERROR
 * naming the property that does not exist, not a 401 discovered by a reader who
 * opened a share link.
 *
 * WHY A SEPARATE CLASS AND NOT A FLAG. `AtribuClient` already tolerates being
 * built with neither credential — the WhatsApp Embedded Signup surfaces exist
 * before a key does — and every other resource on it throws
 * `AtribuConfigError` at the point of use. That is the right shape for "the key
 * has not been minted YET": the failure names the call that needed one. It is
 * the wrong shape here, because nothing about a share page will ever grow a
 * credential, and a runtime error is a worse answer than a type error to a
 * question that is decidable at compile time.
 *
 * There is a second, load-bearing consequence: {@link PublicClientConfig} has
 * no credential FIELD at all. A caller cannot pass an API key to this client by
 * accident (or on purpose), so an anonymous surface cannot quietly start
 * carrying one — which is exactly how a share page would end up sending a
 * service credential to a route that ignores it, and logging it on the way.
 */
import { resolveConfig, type AtribuClientConfig } from "./config";
import { HttpClient, type HttpClientLike } from "./http";
import { PublicNamespace } from "./resources/public";
import { RetryingHttpClient, type RetryOptions } from "./retry-wrapper";

/**
 * Everything {@link AtribuClientConfig} carries EXCEPT the credential and the
 * tenant scope.
 *
 * `profileId` / `workspaceId` / `userScoped` are absent for the same reason
 * `apiKey` is: a public route names its resource in the path, and a client that
 * threaded `?profile_id=` onto an anonymous request would be asserting a scope
 * it cannot prove and the route does not read.
 */
export type PublicClientConfig = Pick<
  AtribuClientConfig,
  "baseUrl" | "fetch" | "timeoutMs" | "userAgent"
>;

export class AtribuPublicClient {
  readonly public: PublicNamespace;

  /** @internal — exposed for `withRetry` chaining; do not depend on this. */
  protected readonly _http: HttpClientLike;

  constructor(config: PublicClientConfig = {}) {
    // The same `resolveConfig` every other client runs through, so `baseUrl`
    // normalisation, the `fetch` check and the timeout default cannot drift
    // into a second implementation. It resolves `credential: null` here, and
    // nothing on this client ever asks for a token: every `public.*` method
    // sends `anonymous: true`.
    this._http = new HttpClient(resolveConfig(config));
    this.public = new PublicNamespace(this._http);
  }

  /**
   * A copy that retries transient failures. The original is not mutated.
   *
   * Worth having on this client specifically: its caller is usually a server
   * rendering a page for someone who followed a link, and a blind 502 there is
   * a blank page for a customer's customer. Reads only, so a replay is safe by
   * construction — there is no write on the public surface to make idempotent.
   */
  withRetry(options: RetryOptions): AtribuPublicClient {
    const wrapped = new RetryingHttpClient(this._http, options);
    // Same shape `AtribuClient._fromHttp` uses: build off the prototype so
    // `withRetry` is still there, and assign the fields rather than re-running
    // the constructor, which would build a second `HttpClient` and discard the
    // wrapper.
    const copy = Object.create(AtribuPublicClient.prototype) as object;
    Object.assign(copy, { _http: wrapped, public: new PublicNamespace(wrapped) });
    return copy as AtribuPublicClient;
  }
}

import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type ListResponse =
  paths["/api/v1/connections"]["get"]["responses"][200]["content"]["application/json"];
type GetResponse =
  paths["/api/v1/connections/{id}"]["get"]["responses"][200]["content"]["application/json"];
type RevokeResponse =
  paths["/api/v1/connections/{id}"]["delete"]["responses"][200]["content"]["application/json"];
type PixelsResponse =
  paths["/api/v1/connections/{id}/pixels"]["get"]["responses"][200]["content"]["application/json"];

export type Connection = ListResponse["data"][number];

/**
 * One pixel on a Meta Ads connection's ad account — what {@link
 * ConnectionsResource.pixels} returns.
 *
 * `id` is the value `metaPixelId` takes when you create a Meta CAPI export
 * destination. Every other field is `null` when Meta did not answer it, which
 * is NOT the same as `false`: a `null` `is_unavailable` means Meta gave no
 * verdict, and a `null` `last_fired_at` usually means the pixel has never
 * fired. Derived from the generated types, not restated.
 */
export type ConnectionPixel = PixelsResponse["data"]["pixels"][number];

/**
 * The `sync` sub-object every {@link Connection} carries (#486).
 *
 * When the connector last completed a run (`lastSyncedAt`'s wire name is
 * `last_synced_at` — this surface stays snake_case, like every other DTO), what
 * the in-flight run is doing, and the provider's own error text when it failed.
 * It is the whole of a connection-health poll: there is no separate health
 * endpoint, so poll `list()` — narrowed with `channel` when only one matters.
 *
 * Derived from the generated types, not restated, so a field added to the
 * contract arrives with `npm run gen`.
 */
export type ConnectionSync = Connection["sync"];

/**
 * The pending-connection picker (#590). After an OAuth return the provider may
 * expose several accounts the user could bind — `pending()` lists the
 * candidates, `finalizePending()` commits the one they chose. Unlike the rest
 * of this file these resolve with the whole envelope, for the reason in
 * `./common.ts`.
 */
export type PendingConnectionResponse =
  paths["/api/v1/connections/pending/{provider}"]["get"]["responses"][200]["content"]["application/json"];

export type FinalizePendingConnectionInput = NonNullable<
  paths["/api/v1/connections/pending/{provider}/finalize"]["post"]["requestBody"]
>["content"]["application/json"];
export type FinalizePendingConnectionResponse =
  paths["/api/v1/connections/pending/{provider}/finalize"]["post"]["responses"][200]["content"]["application/json"];

/**
 * The connect hand-off (#1046) — how an agent starts a provider consent it
 * cannot grant. Body optional; see {@link ConnectionsResource.handoff}.
 */
export type ConnectHandoffInput = NonNullable<
  NonNullable<
    paths["/api/v1/connections/{provider}/handoff"]["post"]["requestBody"]
  >["content"]["application/json"]
>;
export type ConnectHandoffResponse =
  paths["/api/v1/connections/{provider}/handoff"]["post"]["responses"][200]["content"]["application/json"];

/**
 * Every value `Connection["channel"]` can take, and everything `?channel=`
 * accepts — derived from the generated types rather than restated, so #542's
 * four ad-platform channels and #622's five commerce/payments/integration ones
 * (and the next one added) arrive with `npm run gen` instead of silently going
 * missing here.
 *
 * As of #622 it is exactly the Postgres `connection_provider` enum: every
 * provider a profile can hold is listable and filterable.
 */
export type ConnectionChannel = Connection["channel"];

/**
 * What class a connection belongs to (#622).
 *
 * `messaging` is the one that gates behaviour: those connections are delegated
 * to your app one at a time (so an OAuth-app key sees only what it was
 * authorized for) and are the only ones {@link ConnectionsResource.revoke} acts
 * on. `ad_platform` / `crm` / `commerce` / `payments` / `integration` are
 * profile-scoped, carry no `authorizedAt`, and answer 404 to a revoke.
 *
 * It carried only `"messaging" | "ad_platform"` between #542 and #622, and
 * `gohighlevel` reported `ad_platform` in that window — it reports `crm` now.
 * Derived, not restated, so a future kind arrives with `npm run gen`.
 */
export type ConnectionKind = Connection["kind"];

export interface ListOptions {
  channel?: ConnectionChannel;
  signal?: AbortSignal;
}

/** What {@link ConnectionsResource.revoke} reports (#501). */
export interface RevokeResult {
  /**
   * How many API keys the revocation cut, INCLUDING (usually) the one this call
   * was made with. `0` when the authorization was already revoked, or belongs
   * to a newer key generation than the caller's.
   *
   * `0` is also what an Atribu deployment that predates #501 reports: it
   * answered 204 with no body, and this reads that as "nothing counted" rather
   * than failing.
   */
  revokedKeys: number;
}

export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// #489 — the connection OPERATIONS: start a sync, read its progress, disconnect.
// ---------------------------------------------------------------------------

export type SyncInput = NonNullable<
  paths["/api/v1/connections/sync"]["post"]["requestBody"]
>["content"]["application/json"];
export type SyncResponse =
  paths["/api/v1/connections/sync"]["post"]["responses"][202]["content"]["application/json"];

type SyncStatusQuery = NonNullable<
  paths["/api/v1/connections/sync/status"]["get"]["parameters"]["query"]
>;
export type SyncStatusResponse =
  paths["/api/v1/connections/sync/status"]["get"]["responses"][200]["content"]["application/json"];
export type SyncStatusOptions = Omit<SyncStatusQuery, "provider"> & { signal?: AbortSignal };

export type DisconnectResponse =
  paths["/api/v1/connections/{id}/disconnect"]["post"]["responses"][200]["content"]["application/json"];

export class ConnectionsResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(opts: ListOptions = {}): Promise<Connection[]> {
    const qs = opts.channel ? `?channel=${encodeURIComponent(opts.channel)}` : "";
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: `/api/v1/connections${qs}`,
      signal: opts.signal,
    });
    return res.data;
  }

  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Connection> {
    const res = await this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/connections/${encodeURIComponent(id)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * The Meta pixels on a `meta_ads` connection's ad account.
   *
   * This is how you discover the `metaPixelId` an export destination needs —
   * there is no other read that produces one: the dataset endpoint only
   * reconciles a dataset you have ALREADY configured, and the setup-link mint
   * is for a signed-in human and refuses API keys.
   *
   * ```ts
   * const [meta] = await client.connections.list({ channel: "meta_ads" });
   * const pixels = await client.connections.pixels(meta.id);
   * const live = pixels.filter((p) => p.last_fired_at !== null);
   * ```
   *
   * One live Meta call per request and never cached, so it is a read to make at
   * the moment of choosing — not one to hold onto.
   *
   * Throws `invalid_state` (409) when the id names a connection that is not
   * `meta_ads`, `not_found` (404) for an id on another profile or no id at all,
   * and `unauthorized` (401, `reconnectRequired`) when the connection's Meta
   * token is dead — the same shape every other dead-connector answer has.
   *
   * **An empty array means the ad account has no pixels**, never "we could not
   * ask": a failure throws.
   *
   * Requires `exports:read`.
   */
  async pixels(id: string, opts: { signal?: AbortSignal } = {}): Promise<ConnectionPixel[]> {
    const res = await this.http.request<PixelsResponse>({
      method: "GET",
      path: `/api/v1/connections/${encodeURIComponent(id)}/pixels`,
      signal: opts.signal,
    });
    return res.data.pixels;
  }

  /**
   * The accounts a just-returned OAuth grant could be bound to, for the picker.
   * 404 when there is no pending connection for that provider — which is the
   * normal state, not an error condition.
   */
  async pending(
    provider: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<PendingConnectionResponse> {
    return this.http.request<PendingConnectionResponse>({
      method: "GET",
      path: `/api/v1/connections/pending/${encodeURIComponent(provider)}`,
      signal: opts.signal,
    });
  }

  /**
   * Hand a provider connect to a human and get a URL for them (#1046).
   *
   * ```ts
   * const { data } = await client.connections.handoff("meta_ads");
   * console.log("ask your user to open:", data.url);
   * // …then poll:
   * const { data: state } = await client.handoffs.get(data.id);
   * ```
   *
   * The page is session-less — whoever holds the link completes it, signed in
   * or not. `status: "completed"` means the browser half is done, which is
   * either `result.connection_id` (one account, connected) or
   * `result.pending_selection` (several, finish with {@link pending} +
   * {@link finalizePending}).
   *
   * Resolves with the whole envelope, like {@link pending} — see `./common.ts`.
   */
  async handoff(
    provider: string,
    input: ConnectHandoffInput = {},
    opts: MutationOptions = {},
  ): Promise<ConnectHandoffResponse> {
    return this.http.request<ConnectHandoffResponse>({
      method: "POST",
      path: `/api/v1/connections/${encodeURIComponent(provider)}/handoff`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /** Commit one candidate from {@link pending} as the connection. */
  async finalizePending(
    provider: string,
    input: FinalizePendingConnectionInput,
    opts: MutationOptions = {},
  ): Promise<FinalizePendingConnectionResponse> {
    return this.http.request<FinalizePendingConnectionResponse>({
      method: "POST",
      path: `/api/v1/connections/pending/${encodeURIComponent(provider)}/finalize`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /**
   * Revoke this OAuth app's authorization for the connection, and every API key
   * that authorization minted (#501).
   *
   * When this is your app's LAST live authorization on the profile, older key
   * generations that no authorization names go with it and are counted in
   * `revokedKeys` (#502) — so the count can exceed what you minted under this
   * one authorization. While you hold another authorization here, they are left
   * alone.
   *
   * Does NOT disconnect the underlying data_connection (other consumers + the
   * Atribu UI still see it). Direct admin keys reject this call with 400, and
   * any other `kind` answers 404 — only messaging connections carry a
   * per-connection authorization to revoke.
   *
   * **The key on this client is usually one of the keys revoked.** This call
   * completes; the next one with the same key throws `unauthorized`. Mint a
   * fresh key (`client_credentials`) before continuing, or hold a separate key
   * per authorization.
   *
   * NOT `expectEmpty`: the response carries `revoked_keys`. An older Atribu
   * answering 204 parses to nothing and reports `revokedKeys: 0`, so this stays
   * safe to call against either.
   */
  /**
   * Start a sync (#489).
   *
   * Pass `provider` for one connector, or nothing at all to sync every
   * connected provider on the profile — which is what a freshly provisioned
   * profile wants.
   *
   * **Asynchronous.** The 202 means queued; follow it with {@link syncStatus},
   * or read {@link list} for `sync.lastSyncedAt`.
   *
   * **Not keyed by connection id, on purpose:** a profile can hold several
   * connections for one provider and a sync covers all of them.
   *
   * A sync already in flight throws `invalid_state` (409) rather than starting
   * a second one.
   */
  async sync(input: SyncInput = {}, opts: MutationOptions = {}): Promise<SyncResponse> {
    return this.http.request<SyncResponse>({
      method: "POST",
      path: "/api/v1/connections/sync",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  /**
   * Where one provider's sync has got to (#489). Safe to poll — the response is
   * never cached.
   *
   * A profile with no connection for that provider answers 200 with
   * `connection_status: "disconnected"`, not 404: "not connected" and "wrong
   * profile" are different facts and only one of them is an error.
   *
   * `resources` carries per-resource progress for GoHighLevel, the only
   * connector that reports it; `[]` elsewhere.
   */
  async syncStatus(
    provider: ConnectionChannel,
    options: SyncStatusOptions = {},
  ): Promise<SyncStatusResponse> {
    const { signal, ...rest } = options;
    return this.http.request<SyncStatusResponse>({
      method: "GET",
      path: "/api/v1/connections/sync/status",
      query: { ...rest, provider },
      signal,
    });
  }

  /**
   * Disconnect the integration (#489) — stop the provider's push channel,
   * trigger the GoHighLevel Marketplace uninstall where one applies, delete the
   * connection, emit `connection.revoked` and write an audit event.
   *
   * **This is not {@link revoke}.** That one is an OAuth app giving up its own
   * grant and leaves the tenant's connection in place; this one removes it.
   *
   * **Requires a person, or a delegated key on a profile its own app
   * provisioned.** A signed-in session, an MCP user token, or an
   * `attribution:write` key whose app provisioned this profile may call this.
   * Every other API key is a 403 — including that same key on a human-owned
   * profile, or on a profile another app provisioned: deleting a customer's
   * connection is not something a delegated credential should otherwise be
   * able to do.
   *
   * A sync in flight throws `invalid_state` (409); wait for it to finish.
   */
  async disconnect(id: string, opts: MutationOptions = {}): Promise<DisconnectResponse> {
    return this.http.request<DisconnectResponse>({
      method: "POST",
      path: `/api/v1/connections/${encodeURIComponent(id)}/disconnect`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }

  async revoke(id: string, opts: MutationOptions = {}): Promise<RevokeResult> {
    const res = await this.http.request<RevokeResponse | null>({
      method: "DELETE",
      path: `/api/v1/connections/${encodeURIComponent(id)}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return { revokedKeys: res?.data?.revoked_keys ?? 0 };
  }
}

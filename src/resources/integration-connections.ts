import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

// ---------------------------------------------------------------------------
// Fintoc
// ---------------------------------------------------------------------------

type FintocLinkStartResponse =
  paths["/api/v1/integrations/fintoc/link/start"]["post"]["responses"][200]["content"]["application/json"];
export type FintocLinkStart = FintocLinkStartResponse["data"];

export type FintocLinkConnectInput = NonNullable<
  paths["/api/v1/integrations/fintoc/link/connect"]["post"]["requestBody"]
>["content"]["application/json"];
type FintocLinkConnectResponse =
  paths["/api/v1/integrations/fintoc/link/connect"]["post"]["responses"][200]["content"]["application/json"];
export type FintocConnectedAccount = FintocLinkConnectResponse["data"];

// ---------------------------------------------------------------------------
// GoHighLevel — outcome-mapping prefill
// ---------------------------------------------------------------------------

type GhlOutcomePrefillResponse =
  paths["/api/v1/integrations/lhg/outcomes/prefill"]["get"]["responses"][200]["content"]["application/json"];
export type GhlOutcomePrefill = GhlOutcomePrefillResponse["data"];

// ---------------------------------------------------------------------------
// ManyChat
// ---------------------------------------------------------------------------

type ManyChatConnectionGetResponse =
  paths["/api/v1/integrations/manychat/connection"]["get"]["responses"][200]["content"]["application/json"];
export type ManyChatConnection = NonNullable<ManyChatConnectionGetResponse["data"]["connection"]>;

export type UpsertManyChatConnectionInput = NonNullable<
  paths["/api/v1/integrations/manychat/connection"]["post"]["requestBody"]
>["content"]["application/json"];
type ManyChatConnectionPostResponse =
  paths["/api/v1/integrations/manychat/connection"]["post"]["responses"][200]["content"]["application/json"];
export type UpsertedManyChatConnection = ManyChatConnectionPostResponse["data"]["connection"];

// ---------------------------------------------------------------------------
// Meta Pages
// ---------------------------------------------------------------------------

type MetaPagesGetResponse =
  paths["/api/v1/integrations/meta/pages"]["get"]["responses"][200]["content"]["application/json"];
export type MetaPageRow = MetaPagesGetResponse["data"]["pages"][number];

export type SaveMetaPagesInput = NonNullable<
  paths["/api/v1/integrations/meta/pages"]["post"]["requestBody"]
>["content"]["application/json"];
type MetaPagesPostResponse =
  paths["/api/v1/integrations/meta/pages"]["post"]["responses"][200]["content"]["application/json"];
export type SaveMetaPagesResult = MetaPagesPostResponse["data"];

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface MutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/**
 * The "Settings → Integrations" connection surface (#489) — Fintoc,
 * GoHighLevel's outcome-mapping prefill, ManyChat, and Meta Pages. Four
 * unrelated providers under one namespace because each is a small,
 * settings-panel-only surface with no other natural home; see
 * `services/api/src/dal/integration-connections.ts`'s header for the same
 * reasoning on the server side.
 *
 * Every method here requires a PERSON principal — a signed-in session or an
 * MCP user token, never a bare API key.
 */
export class IntegrationConnectionsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Mint a one-shot Fintoc Link Intent for the widget. Nothing is persisted. */
  async fintocLinkStart(opts: MutationOptions = {}): Promise<FintocLinkStart> {
    const res = await this.http.request<FintocLinkStartResponse>({
      method: "POST",
      path: "/api/v1/integrations/fintoc/link/start",
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Exchange the widget's `exchange_token` and persist the connection. */
  async fintocLinkConnect(
    input: FintocLinkConnectInput,
    opts: MutationOptions = {},
  ): Promise<FintocConnectedAccount> {
    const res = await this.http.request<FintocLinkConnectResponse>({
      method: "POST",
      path: "/api/v1/integrations/fintoc/link/connect",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Suggest outcome-event mappings from GoHighLevel's pipeline stages —
   * one live provider round trip per connected location, run in parallel.
   */
  async ghlOutcomePrefill(opts: RequestOptions = {}): Promise<GhlOutcomePrefill> {
    const res = await this.http.request<GhlOutcomePrefillResponse>({
      method: "GET",
      path: "/api/v1/integrations/lhg/outcomes/prefill",
      signal: opts.signal,
    });
    return res.data;
  }

  /** `revealSecret: true` includes the webhook secret — omitted by default. */
  async manychatGetConnection(
    opts: RequestOptions & { revealSecret?: boolean } = {},
  ): Promise<ManyChatConnection | null> {
    const res = await this.http.request<ManyChatConnectionGetResponse>({
      method: "GET",
      path: `/api/v1/integrations/manychat/connection${opts.revealSecret ? "?reveal_secret=1" : ""}`,
      signal: opts.signal,
    });
    return res.data.connection;
  }

  /** Create (or update) the ManyChat connection. Mints fresh secrets on first connect. */
  async manychatUpsertConnection(
    input: UpsertManyChatConnectionInput,
    opts: MutationOptions = {},
  ): Promise<UpsertedManyChatConnection> {
    const res = await this.http.request<ManyChatConnectionPostResponse>({
      method: "POST",
      path: "/api/v1/integrations/manychat/connection",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data.connection;
  }

  /** The currently SAVED tracked Pages (from `meta_page_connections`), not the live Meta list. */
  async metaPagesList(opts: RequestOptions = {}): Promise<MetaPageRow[]> {
    const res = await this.http.request<MetaPagesGetResponse>({
      method: "GET",
      path: "/api/v1/integrations/meta/pages",
      signal: opts.signal,
    });
    return res.data.pages;
  }

  /** Reconcile tracked Pages to the requested set; ids left out are disabled, not deleted. */
  async metaPagesSave(
    input: SaveMetaPagesInput,
    opts: MutationOptions = {},
  ): Promise<SaveMetaPagesResult> {
    const res = await this.http.request<MetaPagesPostResponse>({
      method: "POST",
      path: "/api/v1/integrations/meta/pages",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

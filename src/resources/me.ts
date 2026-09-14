/**
 * The USER-scoped surface (#648) — the caller's own account.
 *
 * **Session bearers only.** An `atb_live_` key is minted for exactly one profile
 * — it is not a person, has no sessions and no linked identities — so every
 * method here answers `403 insufficient_scope` for one. Construct the client
 * with an `accessToken` and `userScoped: true` (the scope form that names no
 * tenant) to call them.
 *
 * ```ts
 * const client = new AtribuClient({ accessToken, userScoped: true });
 * const { data } = await client.me.get();
 * ```
 *
 * **What IS here since #489: `deleteAccount`, `updatePassword`, the email
 * pair, and the MCP-credential methods below.** They were not originally —
 * this class used to say all four "stay in the Atribu web app rather than
 * becoming a second, divergent implementation of a flow GoTrue owns." That
 * held for the ONE write that really was nothing but an `auth.*` proxy —
 * linking/unlinking an OAuth identity, still a browser
 * `supabase.auth.unlinkIdentity()` call and not on this client — but not for
 * the other three, each of which does real work beyond the GoTrue call: a
 * server-side membership cascade before deletion, a breach check and rate
 * limit around the password change, a rate limit around the email change.
 * See `services/api/src/dal/me.ts`'s `#489` header for the full accounting.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras } from "./common";

type MeGetResponseAny = paths["/api/v1/me"]["get"]["responses"][200]["content"]["application/json"];

/**
 * The SESSION shape of `GET /api/v1/me` — the only one this client can receive,
 * because `client.me.get()` is called with a person's bearer token. The route
 * also answers an OAuth app's HTTP Basic credential with the smaller
 * {@link MeAppResponse} (#1048, `return_url_supported`); that caller does not go
 * through this SDK method, so the two are kept apart here rather than forcing
 * every console read of `data.user` to narrow a union.
 */
export type MeResponse = Extract<MeGetResponseAny, { meta: unknown }>;

/** The app-credential shape of `GET /api/v1/me` (#1048). */
export type MeAppResponse = Exclude<MeGetResponseAny, { meta: unknown }>;

export type MeUpdateBody = NonNullable<
  paths["/api/v1/me"]["patch"]["requestBody"]
>["content"]["application/json"];
export type MeUpdateResponse =
  paths["/api/v1/me"]["patch"]["responses"][200]["content"]["application/json"];

export type MeSessionsResponse =
  paths["/api/v1/me/sessions"]["delete"]["responses"][200]["content"]["application/json"];

export type MeDeleteResponse =
  paths["/api/v1/me"]["delete"]["responses"][200]["content"]["application/json"];

export type UpdateMePasswordBody = NonNullable<
  paths["/api/v1/me/password"]["post"]["requestBody"]
>["content"]["application/json"];
export type UpdateMePasswordResponse =
  paths["/api/v1/me/password"]["post"]["responses"][200]["content"]["application/json"];

export type RequestMeEmailChangeBody = NonNullable<
  paths["/api/v1/me/email"]["post"]["requestBody"]
>["content"]["application/json"];
export type RequestMeEmailChangeResponse =
  paths["/api/v1/me/email"]["post"]["responses"][200]["content"]["application/json"];
export type CancelMeEmailChangeResponse =
  paths["/api/v1/me/email"]["delete"]["responses"][200]["content"]["application/json"];

export type MeMcpTokensResponse =
  paths["/api/v1/me/mcp-tokens"]["get"]["responses"][200]["content"]["application/json"];
export type CreateMcpTokenBody = NonNullable<
  paths["/api/v1/me/mcp-tokens"]["post"]["requestBody"]
>["content"]["application/json"];
export type CreateMcpTokenResponse =
  paths["/api/v1/me/mcp-tokens"]["post"]["responses"][201]["content"]["application/json"];
export type RevokeMcpTokenResponse =
  paths["/api/v1/me/mcp-tokens/{tokenId}/revoke"]["post"]["responses"][200]["content"]["application/json"];
export type RotateMcpTokenBody = NonNullable<
  paths["/api/v1/me/mcp-tokens/{tokenId}/rotate"]["post"]["requestBody"]
>["content"]["application/json"];
export type RotateMcpTokenResponse =
  paths["/api/v1/me/mcp-tokens/{tokenId}/rotate"]["post"]["responses"][201]["content"]["application/json"];

export type MeMcpOauthGrantsResponse =
  paths["/api/v1/me/mcp-oauth-grants"]["get"]["responses"][200]["content"]["application/json"];
export type RevokeMcpOauthGrantResponse =
  paths["/api/v1/me/mcp-oauth-grants/{id}/revoke"]["post"]["responses"][200]["content"]["application/json"];

export type MeMcpUsageResponse =
  paths["/api/v1/me/mcp-usage"]["get"]["responses"][200]["content"]["application/json"];

export type AcceptInvitationBody = NonNullable<
  paths["/api/v1/invitations/accept"]["post"]["requestBody"]
>["content"]["application/json"];
export type AcceptInvitationResponse =
  paths["/api/v1/invitations/accept"]["post"]["responses"][200]["content"]["application/json"];

export class MeResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Who the caller is, how they can sign in, where they are signed in, and what
   * would block them deleting the account — in one round trip.
   *
   * `sessions[].is_current` is resolved server-side from the bearer token this
   * request carried, so a client never has to decode its own JWT to know which
   * device not to offer a revoke on.
   */
  async get(options: ReadExtras = {}): Promise<MeResponse> {
    return this.http.request<MeResponse>({
      method: "GET",
      path: "/api/v1/me",
      signal: options.signal,
    });
  }

  /**
   * Update the display name and/or the console locale.
   *
   * Partial: omit a field to leave it alone. An empty `full_name` is a 400
   * rather than a silent clear. Email and password are deliberately not
   * settable here — see the class doc.
   */
  async update(body: MeUpdateBody, options: ReadExtras = {}): Promise<MeUpdateResponse> {
    return this.http.request<MeUpdateResponse>({
      method: "PATCH",
      path: "/api/v1/me",
      body,
      signal: options.signal,
    });
  }

  /**
   * Sign out every OTHER device, keeping the one this client is talking
   * through. Returns the sessions that remain, so a list can be redrawn without
   * a second call.
   */
  async revokeOtherSessions(options: ReadExtras = {}): Promise<MeSessionsResponse> {
    return this.http.request<MeSessionsResponse>({
      method: "DELETE",
      path: "/api/v1/me/sessions",
      signal: options.signal,
    });
  }

  /**
   * Revoke one session. Scoped to your own in SQL, so an id belonging to
   * someone else revokes nothing and answers exactly as a nonexistent one does.
   * Returns the sessions that remain.
   */
  async revokeSession(
    sessionId: string,
    options: ReadExtras = {},
  ): Promise<MeSessionsResponse> {
    return this.http.request<MeSessionsResponse>({
      method: "DELETE",
      path: `/api/v1/me/sessions/${encodeURIComponent(sessionId)}`,
      signal: options.signal,
    });
  }

  /**
   * Irreversibly delete the caller's account.
   *
   * Answers `{deleted: false, blockers}` rather than throwing when the caller
   * is the sole active owner of one or more workspaces — check `data.deleted`
   * before treating the response as success. Transfer ownership of each
   * `blockers` entry, then retry.
   */
  async deleteAccount(options: ReadExtras = {}): Promise<MeDeleteResponse> {
    return this.http.request<MeDeleteResponse>({
      method: "DELETE",
      path: "/api/v1/me",
      signal: options.signal,
    });
  }

  /**
   * Change the caller's password. `current_password` is REQUIRED whenever the
   * caller has an email/password identity — omit only for an OAuth-only user
   * setting a password for the first time.
   */
  async updatePassword(
    body: UpdateMePasswordBody,
    options: ReadExtras = {},
  ): Promise<UpdateMePasswordResponse> {
    return this.http.request<UpdateMePasswordResponse>({
      method: "POST",
      path: "/api/v1/me/password",
      body,
      signal: options.signal,
    });
  }

  /**
   * Start a GoTrue dual-confirmation email change — mail to both the old and
   * the new address. The change lands only once the new address confirms;
   * `get().data.user.pending_email` shows it in the meantime.
   */
  async requestEmailChange(
    body: RequestMeEmailChangeBody,
    options: ReadExtras = {},
  ): Promise<RequestMeEmailChangeResponse> {
    return this.http.request<RequestMeEmailChangeResponse>({
      method: "POST",
      path: "/api/v1/me/email",
      body,
      signal: options.signal,
    });
  }

  /** Cancel a pending email change, clearing `user.pending_email`. */
  async cancelEmailChange(options: ReadExtras = {}): Promise<CancelMeEmailChangeResponse> {
    return this.http.request<CancelMeEmailChangeResponse>({
      method: "DELETE",
      path: "/api/v1/me/email",
      signal: options.signal,
    });
  }

  // ---------------------------------------------------------------------
  // MCP credentials (#489). Same user grain as everything above — an MCP
  // token is itself a credential a PERSON mints, so it lives on this
  // resource rather than a separate top-level one.
  // ---------------------------------------------------------------------

  /** The caller's MCP tokens, prefix only — never the secret. */
  async mcpTokens(options: ReadExtras = {}): Promise<MeMcpTokensResponse> {
    return this.http.request<MeMcpTokensResponse>({
      method: "GET",
      path: "/api/v1/me/mcp-tokens",
      signal: options.signal,
    });
  }

  /**
   * Mint a new MCP token. Capped at 10 active per user. Returns the
   * plaintext secret exactly ONCE — save it now, it will not be shown again.
   */
  async createMcpToken(
    body: CreateMcpTokenBody = {},
    options: ReadExtras = {},
  ): Promise<CreateMcpTokenResponse> {
    return this.http.request<CreateMcpTokenResponse>({
      method: "POST",
      path: "/api/v1/me/mcp-tokens",
      body,
      signal: options.signal,
    });
  }

  /** Revoke one MCP token; returns its new state. */
  async revokeMcpToken(
    tokenId: string,
    options: ReadExtras = {},
  ): Promise<RevokeMcpTokenResponse> {
    return this.http.request<RevokeMcpTokenResponse>({
      method: "POST",
      path: `/api/v1/me/mcp-tokens/${encodeURIComponent(tokenId)}/revoke`,
      signal: options.signal,
    });
  }

  /**
   * Rotate one MCP token. Same plaintext-once contract as create. The OLD
   * token keeps working for a 48h grace window.
   */
  async rotateMcpToken(
    tokenId: string,
    body: RotateMcpTokenBody = {},
    options: ReadExtras = {},
  ): Promise<RotateMcpTokenResponse> {
    return this.http.request<RotateMcpTokenResponse>({
      method: "POST",
      path: `/api/v1/me/mcp-tokens/${encodeURIComponent(tokenId)}/rotate`,
      body,
      signal: options.signal,
    });
  }

  /** The caller's connected MCP OAuth clients ("connected apps"). */
  async mcpOauthGrants(options: ReadExtras = {}): Promise<MeMcpOauthGrantsResponse> {
    return this.http.request<MeMcpOauthGrantsResponse>({
      method: "GET",
      path: "/api/v1/me/mcp-oauth-grants",
      signal: options.signal,
    });
  }

  /** Disconnect an MCP app — revokes the grant and every token minted under it. */
  async revokeMcpOauthGrant(
    grantId: string,
    options: ReadExtras = {},
  ): Promise<RevokeMcpOauthGrantResponse> {
    return this.http.request<RevokeMcpOauthGrantResponse>({
      method: "POST",
      path: `/api/v1/me/mcp-oauth-grants/${encodeURIComponent(grantId)}/revoke`,
      signal: options.signal,
    });
  }

  /**
   * The caller's current-period MCP unit usage, summed across every
   * workspace they belong to.
   */
  async mcpUsage(options: ReadExtras = {}): Promise<MeMcpUsageResponse> {
    return this.http.request<MeMcpUsageResponse>({
      method: "GET",
      path: "/api/v1/me/mcp-usage",
      signal: options.signal,
    });
  }

  /**
   * Accept a workspace or profile invitation (#489).
   *
   * The caller must already be signed in with the SAME email the invitation
   * was sent to — this never creates an account; a brand-new user signs up
   * through the console's own signup-and-accept flow first. Idempotent
   * membership creation: re-activates a removed/invited row rather than
   * duplicating it, and never downgrades an existing higher-tier role.
   *
   * Throws `invalid_state` (409) already accepted, `invalid_state` (410)
   * revoked or expired, `forbidden` (403) signed in as a different email.
   */
  async acceptInvitation(
    body: AcceptInvitationBody,
    options: ReadExtras = {},
  ): Promise<AcceptInvitationResponse> {
    return this.http.request<AcceptInvitationResponse>({
      method: "POST",
      path: "/api/v1/invitations/accept",
      body,
      signal: options.signal,
    });
  }
}

import { AtribuConfigError } from "./errors";

export const DEFAULT_BASE_URL = "https://www.atribu.app";
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Which credential the client was built with. `null` = none of them. */
export type CredentialKind = "api_key" | "access_token" | "user_token";

/**
 * `accessToken` as a value, or a function that RESOLVES to one (#610).
 *
 * The callback form exists for a browser client acting as a signed-in user: a
 * Supabase session token rotates for as long as the page is open, and is not
 * knowable at construction time the way an `apiKey` is. Before this, a browser
 * factory had to satisfy the constructor with a placeholder string and rely on
 * a custom `fetch` to overwrite the `Authorization` header on every request
 * (`src/lib/api-client/browser.ts`'s `sessionFetch`) — which worked, but meant
 * the credential the client was BUILT with was never the one that reached the
 * wire, and every consumer of this config had to know that. The callback lets
 * the client say what it means: "call this for the current token", resolved
 * fresh on every request by the HTTP layer, never cached across requests.
 *
 * Sync or async, because some callers have the token in memory (sync) and
 * others need to read it off an async session store — the HTTP layer awaits
 * either.
 */
export type AccessTokenInput = string | (() => string | Promise<string>);

export interface AtribuClientConfig {
  /**
   * The API key every resource authenticates with.
   *
   * OPTIONAL only because a small number of surfaces exist BEFORE a key does:
   * `whatsapp.otpCapture` runs while a dealer is still inside Meta's Embedded
   * Signup popup, i.e. before the OAuth exchange that mints the key, and
   * authenticates with the app's client credentials instead. A client built
   * without a key can call those and nothing else — every other resource throws
   * at the point of use rather than at construction, so the failure names the
   * call that actually needed a key.
   *
   * Mutually exclusive with {@link accessToken}: passing both is a
   * construction-time error, because only one of them can reach the wire and
   * silently picking a winner is how the wrong tenant gets read.
   */
  apiKey?: string | null;
  /**
   * A Supabase **session** access token, for a client acting as the signed-in
   * user rather than as a machine.
   *
   * It travels in the same `Authorization: Bearer` header an `apiKey` does —
   * the API tells the two apart by shape (`atb_live_` prefix vs. a three-segment
   * JWT), not by a second header. This is a distinct field anyway because the
   * two credentials are not interchangeable in one respect that matters:
   *
   *   an API key IS a tenant (it is minted against exactly one Profile), a
   *   session token is a PERSON, who may reach several.
   *
   * So a session-authenticated request has to name the profile it means, and
   * {@link profileId} becomes REQUIRED — the client threads it onto every
   * request's query string. Calling it `apiKey` would have hidden that.
   *
   * Accepts a CALLBACK (#610) — see {@link AccessTokenInput} — resolved fresh
   * by the HTTP layer on every request, never once at construction. Pass a
   * plain string only when the token is genuinely static for the client's
   * whole lifetime (server-to-server, a short-lived script); a browser client
   * that stays open across a token refresh should pass a function.
   */
  accessToken?: AccessTokenInput | null;
  /**
   * An Atribu **MCP user token** (`atb_user_…`) — the credential a person's own
   * AI agent holds after the MCP OAuth flow (#1084).
   *
   * It rides the SAME `Authorization: Bearer` header the other two do; the API
   * tells all three apart by shape (`atb_live_` prefix, `atb_user_` prefix, or
   * a three-segment JWT). It is a distinct field for exactly the reason
   * {@link accessToken} is: like a session token and unlike an API key, it
   * names a PERSON rather than a tenant, so a request has to say which profile
   * or workspace it means and {@link profileId} (or {@link workspaceId}, or
   * {@link userScoped}) becomes REQUIRED.
   *
   * WHERE IT DIFFERS FROM `accessToken`, and why it is not just an alias:
   *
   *   - it is LONG-LIVED and opaque, so there is no callback form — a session
   *     JWT rotates while a page is open, an MCP token does not rotate under
   *     you (a rotation mints a new one and grants the old a 48h grace);
   *   - its scopes are the INTERSECTION of the holder's membership and the
   *     `mcp:read` / `mcp:read_pii` / `mcp:write` grant they consented to, so a
   *     403 `insufficient_scope` can mean the grant is too narrow even when the
   *     person's own access is not.
   *
   * Mutually exclusive with {@link apiKey} and {@link accessToken}: only one
   * credential can reach the wire, and silently picking a winner is how the
   * wrong tenant gets read.
   */
  userToken?: string | null;
  /**
   * The Profile every request is scoped to, sent as `?profile_id=`.
   *
   * REQUIRED with {@link accessToken} (see above) and optional with an
   * {@link apiKey}, where the key already carries the scope and the API ignores
   * the parameter. When set it is applied AFTER any per-call query, so a
   * resource method can never talk to a different tenant than the one the
   * client was built for.
   */
  profileId?: string | null;
  /**
   * The WORKSPACE every request is scoped to, sent as `?workspace_id=` (#487).
   *
   * The alternative to {@link profileId} for a client built to read the
   * workspace-grain routes (`client.workspaces.*`), where there is no profile to
   * name — the leaderboard spans every profile in the workspace and the cold
   * boot has not chosen one yet.
   *
   * MUTUALLY EXCLUSIVE with {@link profileId}, and exactly one of the two is
   * required with an {@link accessToken}. A client is one tenant scope; letting
   * it carry both would mean every request asserts two scopes and the route
   * silently picks which one it honours.
   *
   * On the `/api/v1/workspaces/{workspaceId}/…` routes the workspace also
   * appears in the PATH, and the path wins server-side. The query parameter is
   * still sent, for the same reason `profile_id` is: it is what makes the
   * client's scope visible on the wire rather than implied by a URL a resource
   * method built.
   */
  workspaceId?: string | null;
  /**
   * Declare that this client reads the USER-scoped routes (`client.me.*`), which
   * name no tenant at all (#648).
   *
   * WHY IT HAS TO BE EXPLICIT. An `accessToken` client normally MUST name a
   * tenant, and that requirement is load-bearing: a session token identifies a
   * person, who can reach several profiles, so a client that named none would
   * silently send profile-scoped reads with no `?profile_id=` and get a 400 —
   * or, worse, a future default. Simply relaxing the check so "neither" is
   * allowed would turn a forgotten `profileId` from a construction-time error
   * into a runtime one, which is the bug this rule exists to catch.
   *
   * So user scope is a THIRD, positive statement rather than the absence of the
   * other two: mutually exclusive with both {@link profileId} and
   * {@link workspaceId}, and exactly one of the three is required with an
   * {@link accessToken}. `/api/v1/me` has no tenant parameter to thread, so
   * nothing is added to the query string.
   *
   * It does NOT restrict which resources a client exposes — calling a
   * profile-scoped read on a user-scoped client is a 400 from the API, the same
   * answer any un-scoped session request gets.
   */
  userScoped?: boolean;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  userAgent?: string;
  defaultIdempotencyKeyGenerator?: () => string;
}

export interface ResolvedConfig {
  /**
   * Resolves the bearer credential, whichever kind it is — ALWAYS a function
   * (#610), even when the config supplied a plain string: the HTTP layer has
   * one code path regardless of which form `accessToken` took, and calls this
   * fresh on every request rather than reading a value cached at construction.
   * Resolves to `""` when the client was built for client-credential surfaces
   * only (`whatsapp.otpCapture`).
   */
  getToken: () => string | Promise<string>;
  /** `null` when the client was built without any credential. */
  credential: CredentialKind | null;
  /** Threaded onto every request as `?profile_id=`. */
  profileId: string | null;
  /** Threaded onto every request as `?workspace_id=` (#487). */
  workspaceId: string | null;
  /** The client named USER scope (#648): no tenant parameter is threaded. */
  userScoped: boolean;
  baseUrl: string;
  fetch: typeof fetch;
  timeoutMs: number;
  userAgentSuffix: string | null;
  generateIdempotencyKey: () => string;
}

/**
 * `null` and `undefined` both mean "not provided" — a config built from env
 * vars produces one or the other depending on how it was read, and they must
 * not behave differently. Anything else that is not a string is a mistake
 * worth failing on immediately.
 */
function optionalString(
  value: string | null | undefined,
  field: string,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new AtribuConfigError(`${field} must be a string when provided`);
  }
  return value === "" ? null : value;
}

/**
 * Splits `accessToken` into its static-string form (validated the same way
 * every other string field is) and its callback form — never both, since the
 * raw config value is one or the other. A value that is neither a string, a
 * function, `null` nor `undefined` (a `42`, say) is the same mistake
 * `optionalString` already fails fast on for every other field.
 */
function resolveAccessToken(
  value: AtribuClientConfig["accessToken"],
): { token: string | null; fn: (() => string | Promise<string>) | null } {
  if (value === undefined || value === null) return { token: null, fn: null };
  if (typeof value === "function") return { token: null, fn: value };
  return { token: optionalString(value, "accessToken"), fn: null };
}

export function resolveConfig(config: AtribuClientConfig): ResolvedConfig {
  const apiKey = optionalString(config.apiKey, "apiKey");
  const { token: accessToken, fn: accessTokenFn } = resolveAccessToken(config.accessToken);
  const hasAccessToken = accessToken !== null || accessTokenFn !== null;
  const userToken = optionalString(config.userToken, "userToken");
  const profileId = optionalString(config.profileId, "profileId");
  const workspaceId = optionalString(config.workspaceId, "workspaceId");
  const userScoped = config.userScoped === true;

  // Counted rather than compared pairwise, the same shape the tenant-scope
  // check below already uses: with three credential forms an `if (a && b)`
  // chain is three conditions, and #1084's addition would have made it six.
  const namedCredentials = [apiKey !== null, hasAccessToken, userToken !== null].filter(
    Boolean,
  ).length;
  if (namedCredentials > 1) {
    throw new AtribuConfigError(
      "pass exactly one of apiKey, accessToken or userToken — more than one was provided, " +
        "and only one can be sent",
    );
  }
  // Neither is deliberately NOT an error here: the client-credential surfaces
  // (whatsapp.otpCapture) are built before any credential exists. That failure
  // is raised at the call instead, naming the call that needed one.

  // Exactly one tenant scope, counted rather than compared pairwise: with three
  // mutually-exclusive forms (#648 added `userScoped`) an `if (a && b)` chain is
  // three conditions that drift apart the next time a fourth appears.
  const namedScopes = [profileId !== null, workspaceId !== null, userScoped].filter(
    Boolean,
  ).length;
  if (namedScopes > 1) {
    throw new AtribuConfigError(
      "pass exactly one of profileId, workspaceId or userScoped — a client is one scope, " +
        "and carrying two would make every request assert two",
    );
  }

  // `hasAccessToken`, not the destructured `accessToken` string — #610's
  // callback form resolves `accessToken` to null (only `accessTokenFn` is
  // set), so checking the bare string here would let a callback-based client
  // through with neither scope named.
  //
  // #1084 puts `userToken` under the SAME requirement, for the same reason: an
  // MCP token identifies a person, who may reach several profiles, so a client
  // that named no scope would send profile reads with no `?profile_id=` and
  // collect a 400 on every one.
  if ((hasAccessToken || userToken !== null) && namedScopes === 0) {
    throw new AtribuConfigError(
      "profileId (or workspaceId for the workspace-grain routes, or userScoped: true for " +
        "the /me routes) is required when the client is built with accessToken or userToken " +
        "— both identify a person, not a tenant, so every request must name the scope it " +
        "reads",
    );
  }

  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new AtribuConfigError(
      "globalThis.fetch is not available; pass a `fetch` implementation in config",
    );
  }
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

  const getToken: () => string | Promise<string> = accessTokenFn
    ? accessTokenFn
    : () => accessToken ?? userToken ?? apiKey ?? "";

  return {
    getToken,
    credential: hasAccessToken
      ? "access_token"
      : userToken !== null
        ? "user_token"
        : apiKey !== null
          ? "api_key"
          : null,
    profileId,
    workspaceId,
    userScoped,
    baseUrl,
    fetch: fetchImpl,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    userAgentSuffix: config.userAgent ?? null,
    generateIdempotencyKey: config.defaultIdempotencyKeyGenerator ?? defaultUuid,
  };
}

function defaultUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes — a v4-ish UUID via Math.random. Not
  // cryptographically strong; idempotency keys don't need to be.
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) {
    const c = Math.floor(Math.random() * 16);
    out += hex[i === 12 ? 4 : i === 16 ? (c & 0x3) | 0x8 : c];
    if (i === 7 || i === 11 || i === 15 || i === 19) out += "-";
  }
  return out;
}

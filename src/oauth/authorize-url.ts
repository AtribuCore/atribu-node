import { AtribuConfigError } from "../errors";

export type OauthProvider = "whatsapp" | "instagram" | "calendar";
export type OauthScope = "whatsapp" | "instagram" | "calendar";

export interface BuildAuthorizeUrlInput {
  baseUrl?: string;
  clientId: string;
  redirectUri: string;
  provider: OauthProvider;
  scope: OauthScope | OauthScope[];
  state: string;
  /** Pre-signed `id_token_hint` JWT — use `signIdTokenHint` to mint. */
  idTokenHint: string;
  /** PKCE challenge (base64url of SHA-256). */
  codeChallenge?: string;
  codeChallengeMethod?: "S256" | "plain";
  /**
   * Instagram login type (only meaningful when provider/scope is `instagram`):
   * `"facebook"` → Facebook Login (default; requires a linked Facebook Page),
   * `"instagram"` → native Instagram Login (no Facebook Page).
   */
  instagramLogin?: "facebook" | "instagram";
  /** Forwards extra query params unchanged. */
  extras?: Record<string, string>;
}

const DEFAULT_BASE_URL = "https://www.atribu.app";

/**
 * Build the `/oauth/authorize` URL the user should be redirected to.
 *
 * Pure function — returns a string. No network calls, no crypto. The only
 * runtime check is required-arg validation.
 */
export function buildAuthorizeUrl(input: BuildAuthorizeUrlInput): string {
  for (const key of ["clientId", "redirectUri", "provider", "state", "idTokenHint"] as const) {
    if (!input[key]) throw new AtribuConfigError(`buildAuthorizeUrl: ${key} is required`);
  }
  if (input.codeChallenge && !input.codeChallengeMethod) {
    throw new AtribuConfigError("codeChallengeMethod is required when codeChallenge is set");
  }
  const baseUrl = (input.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const scope = Array.isArray(input.scope) ? input.scope.join(" ") : input.scope;

  const url = new URL("/oauth/authorize", baseUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("provider", input.provider);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", input.state);
  url.searchParams.set("id_token_hint", input.idTokenHint);
  if (input.codeChallenge && input.codeChallengeMethod) {
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", input.codeChallengeMethod);
  }
  if (input.instagramLogin) {
    url.searchParams.set("instagram_login", input.instagramLogin);
  }
  if (input.extras) {
    for (const [k, v] of Object.entries(input.extras)) url.searchParams.set(k, v);
  }
  return url.toString();
}

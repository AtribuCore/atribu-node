/**
 * Exchange an authorization code for an Atribu access token.
 *
 * Calls `POST /oauth/token` with form-urlencoded body (RFC 6749 default).
 * Tries `client_secret_basic` (Authorization header) by default; consumers
 * can opt into `client_secret_post` via `authMethod: "body"`.
 */

import {
  AtribuConfigError,
  AtribuOauthError,
  AtribuTransportError,
} from "../errors";
import { SDK_VERSION } from "../version";
import { runtimeTag } from "../runtime";

export interface ExchangeCodeInput {
  baseUrl?: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
  /** "basic" (default) sends Authorization: Basic; "body" puts creds in form body. */
  authMethod?: "basic" | "body";
  fetch?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ExchangeCodeResult {
  accessToken: string;
  tokenType: "bearer";
  scope: string[];
  connectionId: string | null;
  profileId: string;
  workspaceId: string;
}

const DEFAULT_BASE_URL = "https://www.atribu.app";

export async function exchangeCode(input: ExchangeCodeInput): Promise<ExchangeCodeResult> {
  for (const key of ["clientId", "clientSecret", "code", "redirectUri"] as const) {
    if (!input[key]) throw new AtribuConfigError(`exchangeCode: ${key} is required`);
  }
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new AtribuConfigError("globalThis.fetch is not available; pass a `fetch` impl");
  }
  const baseUrl = (input.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = `${baseUrl}/oauth/token`;
  const authMethod = input.authMethod ?? "basic";

  const form: Record<string, string> = {
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
  };
  if (input.codeVerifier) form.code_verifier = input.codeVerifier;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": `@atribu/node/${SDK_VERSION} (${runtimeTag()})`,
  };

  if (authMethod === "basic") {
    headers.Authorization = `Basic ${base64(`${input.clientId}:${input.clientSecret}`)}`;
  } else {
    form.client_id = input.clientId;
    form.client_secret = input.clientSecret;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 30_000);
  const signal = input.signal ?? controller.signal;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers,
      body: new URLSearchParams(form).toString(),
      signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new AtribuTransportError(
      err instanceof Error ? err.message : "fetch failed",
      err,
    );
  }
  clearTimeout(timeout);

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    const body = (parsed ?? {}) as { error?: unknown; error_description?: unknown };
    throw new AtribuOauthError({
      code: typeof body.error === "string" ? body.error : "server_error",
      description: typeof body.error_description === "string" ? body.error_description : null,
      status: res.status,
    });
  }
  const body = parsed as {
    access_token: string;
    token_type: string;
    scope?: string;
    connection_id?: string;
    profile_id: string;
    workspace_id: string;
  };
  return {
    accessToken: body.access_token,
    tokenType: "bearer",
    scope: typeof body.scope === "string" ? body.scope.split(/\s+/).filter(Boolean) : [],
    connectionId: body.connection_id ?? null,
    profileId: body.profile_id,
    workspaceId: body.workspace_id,
  };
}

function base64(input: string): string {
  if (typeof btoa === "function") return btoa(input);
  return Buffer.from(input, "utf8").toString("base64");
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

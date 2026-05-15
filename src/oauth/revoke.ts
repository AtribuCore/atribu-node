/**
 * Revoke an Atribu access token via RFC 7009.
 *
 * Always returns void on success — the server returns 200 regardless of
 * whether the token existed (RFC §2.2; no enumeration). Authentication
 * errors (bad client credentials) still throw AtribuOauthError.
 */

import {
  AtribuConfigError,
  AtribuOauthError,
  AtribuTransportError,
} from "../errors";
import { SDK_VERSION } from "../version";
import { runtimeTag } from "../runtime";

export interface RevokeTokenInput {
  baseUrl?: string;
  clientId: string;
  clientSecret: string;
  token: string;
  authMethod?: "basic" | "body";
  fetch?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_BASE_URL = "https://www.atribu.app";

export async function revokeToken(input: RevokeTokenInput): Promise<void> {
  for (const key of ["clientId", "clientSecret", "token"] as const) {
    if (!input[key]) throw new AtribuConfigError(`revokeToken: ${key} is required`);
  }
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new AtribuConfigError("globalThis.fetch is not available; pass a `fetch` impl");
  }
  const baseUrl = (input.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = `${baseUrl}/oauth/revoke`;
  const authMethod = input.authMethod ?? "basic";

  const form: Record<string, string> = {
    token: input.token,
    token_type_hint: "access_token",
  };
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

  if (res.ok) return;
  const text = await res.text();
  let body: { error?: unknown; error_description?: unknown } = {};
  try {
    body = text ? (JSON.parse(text) as typeof body) : {};
  } catch {
    body = {};
  }
  throw new AtribuOauthError({
    code: typeof body.error === "string" ? body.error : "server_error",
    description: typeof body.error_description === "string" ? body.error_description : null,
    status: res.status,
  });
}

function base64(input: string): string {
  if (typeof btoa === "function") return btoa(input);
  return Buffer.from(input, "utf8").toString("base64");
}

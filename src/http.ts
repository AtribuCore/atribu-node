/**
 * HTTP request layer.
 *
 * Single entry point for every API call: handles auth headers, timeout via
 * AbortController, idempotency-key generation, error envelope parsing, and
 * RetryHint derivation. Resources call `request()` and parse `data` from the
 * envelope.
 */

import {
  AtribuApiError,
  AtribuOauthError,
  AtribuTransportError,
  type ApiErrorBody,
  type ApiErrorCode,
  type OauthErrorCode,
} from "./errors";
import { deriveRetryHint } from "./retry";
import { SDK_VERSION } from "./version";
import { runtimeTag } from "./runtime";
import type { ResolvedConfig } from "./config";

export interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Form-urlencoded body (used by /oauth/token, /oauth/revoke). */
  form?: Record<string, string>;
  /** Override the Authorization header (used by /oauth/* with client-credentials). */
  authOverride?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** When true, parse 200-body as RFC 6749/7009 OAuth response shape. */
  oauthErrorShape?: boolean;
  /** When true, return raw Response without JSON parse (used by 204 / RFC 7009 empty 200). */
  expectEmpty?: boolean;
  /** Extra headers to merge. */
  headers?: Record<string, string>;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

const SDK_UA = `@atribu/node/${SDK_VERSION} (${runtimeTag()})`;

/**
 * Minimum surface a transport needs to be usable by resources. Lets us
 * stack RetryingHttpClient on top of HttpClient without inheritance.
 */
export interface HttpClientLike {
  request<T>(opts: RequestOptions): Promise<T>;
}

export class HttpClient implements HttpClientLike {
  constructor(private readonly cfg: ResolvedConfig) {}

  async request<T>(opts: RequestOptions): Promise<T> {
    const url = this.buildUrl(opts.path, opts.query);
    const headers = this.buildHeaders(opts);

    let body: BodyInit | undefined;
    if (opts.form) {
      body = new URLSearchParams(opts.form).toString();
    } else if (opts.body !== undefined && opts.method !== "GET") {
      body = JSON.stringify(opts.body);
    }

    const userSignal = opts.signal;
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), this.cfg.timeoutMs);
    const signal = userSignal ? mergeSignals(userSignal, timeoutController.signal) : timeoutController.signal;

    let res: Response;
    try {
      res = await this.cfg.fetch(url, {
        method: opts.method,
        headers,
        body,
        signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        throw new AtribuTransportError(`Request aborted (timeout ${this.cfg.timeoutMs}ms)`, err);
      }
      throw new AtribuTransportError(
        err instanceof Error ? err.message : "fetch failed",
        err,
      );
    }
    clearTimeout(timeout);

    if (opts.expectEmpty && res.ok) {
      return undefined as T;
    }

    const requestId = res.headers.get("x-request-id");
    const text = await res.text();
    const parsed = text ? safeJson(text) : null;

    if (!res.ok) {
      if (opts.oauthErrorShape) {
        const { code, description } = parseOauthError(parsed);
        throw new AtribuOauthError({ code, description, status: res.status });
      }
      const body = (parsed as { error?: ApiErrorBody } | null)?.error ?? null;
      const code: ApiErrorCode = body?.code ?? `http_${res.status}`;
      const message = body?.message ?? `HTTP ${res.status}`;
      const retry = deriveRetryHint({
        status: res.status,
        retryAfterHeader: res.headers.get("retry-after"),
        errorCode: code,
      });
      throw new AtribuApiError({
        code,
        message,
        status: res.status,
        requestId: requestId ?? body?.request_id ?? null,
        retry,
        responseBody: parsed,
      });
    }

    return parsed as T;
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const url = new URL(path.startsWith("/") ? path : `/${path}`, this.cfg.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private buildHeaders(opts: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": this.cfg.userAgentSuffix
        ? `${SDK_UA} ${this.cfg.userAgentSuffix}`
        : SDK_UA,
    };
    if (opts.form) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (opts.body !== undefined && opts.method !== "GET") {
      headers["Content-Type"] = "application/json";
    }
    headers.Authorization = opts.authOverride ?? `Bearer ${this.cfg.apiKey}`;
    if (mutating(opts.method)) {
      headers["Idempotency-Key"] = opts.idempotencyKey ?? this.cfg.generateIdempotencyKey();
    }
    if (opts.headers) {
      for (const [k, v] of Object.entries(opts.headers)) headers[k] = v;
    }
    return headers;
  }
}

function mutating(method: RequestOptions["method"]): boolean {
  return method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseOauthError(parsed: unknown): { code: OauthErrorCode; description: string | null } {
  if (parsed && typeof parsed === "object") {
    const obj = parsed as { error?: unknown; error_description?: unknown };
    const code = typeof obj.error === "string" ? obj.error : "server_error";
    const description = typeof obj.error_description === "string" ? obj.error_description : null;
    return { code, description };
  }
  return { code: "server_error", description: null };
}

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "any" in AbortSignal) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (AbortSignal as unknown as { any: (s: AbortSignal[]) => AbortSignal }).any([a, b]);
  }
  const c = new AbortController();
  const onA = (): void => c.abort(a.reason);
  const onB = (): void => c.abort(b.reason);
  if (a.aborted) c.abort(a.reason);
  else a.addEventListener("abort", onA, { once: true });
  if (b.aborted) c.abort(b.reason);
  else b.addEventListener("abort", onB, { once: true });
  return c.signal;
}

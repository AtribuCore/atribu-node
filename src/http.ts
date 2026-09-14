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
  AtribuConfigError,
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
  /**
   * multipart/form-data body (used by media uploads). Passed to fetch as-is;
   * the runtime sets the `Content-Type` with the boundary, so we must NOT set
   * it ourselves. Takes precedence over `body`/`form`.
   */
  multipart?: FormData;
  /** Override the Authorization header (used by /oauth/* with client-credentials). */
  authOverride?: string;
  /**
   * Send NO `Authorization` header, and never resolve a credential to build one.
   *
   * The `public.*` resources set this. It is the difference between "this client
   * has no credential yet" — which is `authOverride`'s absence, and which throws
   * a helpful `AtribuConfigError` naming the call that needed one — and "this
   * ROUTE takes no credential", which is a property of the endpoint and true
   * however the client was built.
   *
   * Deliberately opt-IN per request rather than a client-wide flag: a
   * credentialed client may legitimately call a public route (see
   * `AtribuClient.public`), and it must not stop sending its credential
   * everywhere else because it did.
   */
  anonymous?: boolean;
  idempotencyKey?: string;
  /**
   * When `false`, the opt-in `RetryingHttpClient` must NOT replay this
   * request — even on a transient 5xx or a transport error. Set by resource
   * methods that wrap a single, attempt-limited upstream action (e.g. the
   * WhatsApp OTP request/verify + /register) where a blind replay would
   * re-fire the action against Meta. Default (`undefined`) is retryable.
   */
  retryable?: boolean;
  /**
   * Per-call cap on how many times the opt-in `RetryingHttpClient` may replay
   * this request AFTER the initial attempt — `0` means "one attempt, ever".
   * Overrides the client-level `maxAttempts`, which counts the initial call
   * (`maxAttempts === maxRetries + 1`). Inert when no retry layer is installed,
   * since an unwrapped `HttpClient` never replays anything.
   *
   * Distinct from `retryable: false`, which is absolute: that flag says the
   * upstream action must never be replayed no matter what the caller wants.
   * `maxRetries` is a *default* a resource method sets on the caller's behalf,
   * and the caller may raise or lower it. A resource whose endpoint is merely
   * best-effort (e.g. `messages.typing`) wants this one; a resource wrapping a
   * one-shot upstream action (the WhatsApp OTP calls) wants `retryable: false`.
   */
  maxRetries?: number;
  /**
   * Per-call deadline in ms, overriding the client's `timeoutMs` ABSOLUTELY —
   * up or down. This is the caller's explicit choice, so it wins even over a
   * resource method's `maxTimeoutMs` ceiling.
   *
   * Must be a positive finite number. `0` is NOT "no timeout" — it, along with
   * `NaN`, `Infinity` and negatives, is treated as "not provided" and falls
   * back. There is deliberately no way to disable the timeout: pass an
   * `AbortSignal` if you want to own cancellation.
   */
  timeoutMs?: number;
  /**
   * A CEILING on the effective deadline — it can only lower the client's
   * `timeoutMs`, never raise it (`min(cfg.timeoutMs, maxTimeoutMs)`).
   *
   * This is what a resource method uses to express "my endpoint expires in
   * seconds, don't wait 30 of them on it". Using `timeoutMs` for that would be
   * wrong in the other direction: a consumer who configured a 300ms client-wide
   * budget would find one resource silently waiting 5000ms — the SDK raising a
   * limit its user deliberately set. A ceiling can only ever be stricter than
   * what the caller asked for.
   *
   * Same numeric rules as `timeoutMs`: non-finite or < 1 means "not provided".
   */
  maxTimeoutMs?: number;
  signal?: AbortSignal;
  /** When true, parse 200-body as RFC 6749/7009 OAuth response shape. */
  oauthErrorShape?: boolean;
  /** When true, return raw Response without JSON parse (used by 204 / RFC 7009 empty 200). */
  expectEmpty?: boolean;
  /**
   * When true, resolve with the response body as a raw string instead of
   * parsing it as JSON. For the endpoints that render a second, non-JSON body
   * of the same rows — `analytics.drillCsv()` today.
   *
   * `safeJson` would already hand back the raw text for anything that fails to
   * parse, but that is an accident of the error path, not a contract: a
   * one-column CSV of bare numbers parses fine as JSON and would come back as a
   * number. Asking for text explicitly is the difference between a guarantee
   * and a coincidence.
   */
  expectText?: boolean;
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
    const headers = await this.buildHeaders(opts);

    let body: BodyInit | undefined;
    if (opts.multipart) {
      body = opts.multipart;
    } else if (opts.form) {
      body = new URLSearchParams(opts.form).toString();
    } else if (opts.body !== undefined && opts.method !== "GET") {
      body = JSON.stringify(opts.body);
    }

    // Both the abort timer and the error message below must read this same
    // number, or a timeout reports a budget it did not actually enforce.
    const timeoutMs = resolveTimeout(this.cfg.timeoutMs, opts);

    const userSignal = opts.signal;
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
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
        // Two very different events arrive as the same AbortError. Reporting a
        // caller's own `signal.abort()` as "timeout 5000ms" sends whoever reads
        // the log hunting a latency problem that never happened.
        throw new AtribuTransportError(
          timeoutController.signal.aborted
            ? `Request aborted (timeout ${timeoutMs}ms)`
            : "Request aborted by caller",
          err,
        );
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
    // A non-JSON success body still has to go through the error branch below
    // when the status says so — an error envelope is always JSON, whatever the
    // 200 body would have been.
    const parsed = opts.expectText && res.ok ? null : text ? safeJson(text) : null;

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
        reconnectRequired: body?.reconnect_required ?? false,
        reconnectUrl: body?.reconnect_url ?? null,
        upgradeRequired: body?.upgrade_required ?? false,
        upgradePlan: body?.upgrade?.plan ?? null,
        docsUrl: body?.docs_url ?? null,
        requiredScopes: body?.required_scopes ?? null,
      });
    }

    if (opts.expectText) return text as T;

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
    // LAST, and `set` rather than `append`: the profile a client was built for
    // is not a default a caller may talk over. A session token reaches every
    // profile its owner is a member of, so a resource method that could steer
    // `profile_id` would be a cross-tenant read one typo away.
    if (this.cfg.profileId) {
      url.searchParams.set("profile_id", this.cfg.profileId);
    }
    // #487 — the same rule one grain up, and mutually exclusive with the above
    // by construction (`resolveConfig` refuses a client carrying both).
    if (this.cfg.workspaceId) {
      url.searchParams.set("workspace_id", this.cfg.workspaceId);
    }
    return url.toString();
  }

  private async buildHeaders(opts: RequestOptions): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": this.cfg.userAgentSuffix
        ? `${SDK_UA} ${this.cfg.userAgentSuffix}`
        : SDK_UA,
    };
    if (opts.multipart) {
      // Leave Content-Type unset — the runtime adds it with the boundary.
    } else if (opts.form) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (opts.body !== undefined && opts.method !== "GET") {
      headers["Content-Type"] = "application/json";
    }
    if (opts.anonymous) {
      // Nothing. NOT `Authorization: ""` and not a resolved-then-dropped token:
      // `getToken()` is a callback that can throw (no live session), and a
      // public route must answer for a signed-out reader whatever the client
      // around it is carrying.
    } else if (opts.authOverride) {
      headers.Authorization = opts.authOverride;
    } else {
      // A client may legitimately be built with no credential — the
      // client-credential surfaces (whatsapp.otpCapture) exist precisely because
      // the key does not exist yet. Anything else must fail HERE, naming the call
      // that needed one, rather than sending `Bearer ` and collecting a
      // confusing 401.
      //
      // All three credentials ride the same header: the API distinguishes an
      // `atb_live_` key from an `atb_user_` MCP token (#1084) from a
      // three-segment session JWT by shape, never by a second header.
      //
      // #610 — `getToken()` is resolved fresh on EVERY request, never cached:
      // that is the entire point of the callback form of `accessToken`. A
      // caller whose token throws (e.g. no live session) sees that error here,
      // BEFORE `fetch` is ever called — same failure mode as the "constructed
      // with neither" case below, just discovered a request later.
      const token = await this.cfg.getToken();
      if (!token) {
        throw new AtribuConfigError(
          `apiKey or accessToken is required for ${opts.method} ${opts.path} — this client was constructed with neither`,
        );
      }
      headers.Authorization = `Bearer ${token}`;
    }
    if (mutating(opts.method)) {
      headers["Idempotency-Key"] = opts.idempotencyKey ?? this.cfg.generateIdempotencyKey();
    }
    if (opts.headers) {
      for (const [k, v] of Object.entries(opts.headers)) headers[k] = v;
    }
    return headers;
  }
}

/** A usable millisecond budget: finite and at least 1ms. `0` is not "off". */
function usableMs(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1;
}

/**
 * Effective deadline for one request.
 *
 *   1. An explicit per-call `timeoutMs` is the caller's own choice — it wins
 *      outright, in either direction.
 *   2. Otherwise a resource's `maxTimeoutMs` CAPS the client budget. It can
 *      only lower it, so a consumer's deliberately tight client-wide timeout is
 *      never silently widened by whichever resource they happened to call.
 *   3. Otherwise the client budget stands.
 *
 * Anything non-finite or under 1ms counts as absent at every step.
 */
function resolveTimeout(configured: number, opts: RequestOptions): number {
  if (usableMs(opts.timeoutMs)) return opts.timeoutMs;
  if (usableMs(opts.maxTimeoutMs)) return Math.min(configured, opts.maxTimeoutMs);
  return configured;
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

/**
 * Opt-in retry layer.
 *
 * Why opt-in: hiding retries inside the SDK by default obscures backpressure
 * signals and amplifies load on a failing server. Consumers that want them
 * call `.withRetry({...})`; others write their own retry logic against the
 * typed `retry` hint on AtribuApiError.
 *
 * What gets retried:
 *   - `AtribuApiError` with `retry.action === "retry"` (5xx, 408)
 *   - `AtribuApiError` with `retry.action === "retry_after"` (429, 503 w/
 *     Retry-After) — honors retryAfterMs
 *   - `AtribuTransportError` (network glitches, ECONNRESET, timeouts)
 *
 * What does NOT retry:
 *   - any request flagged `retryable: false` (single, attempt-limited upstream
 *     actions such as the WhatsApp OTP request/verify + /register) — never
 *     replayed, even on a transient 5xx or a transport error
 *   - any request carrying `maxRetries: 0` — the per-call budget, which a
 *     resource method sets when its endpoint is best-effort by contract
 *     (`messages.typing`) and which the caller may override
 *   - `AtribuApiError` with `retry.action === "do_not_retry"` (403)
 *   - `AtribuApiError` with `retry.action === "fix_and_retry"` (422 etc — the
 *     caller's input is wrong; retrying with the same body won't help)
 *   - `AtribuApiError` with `retry.action === "refresh_token"` (401 — needs
 *     credential refresh, not a retry)
 *   - `AtribuConfigError`, `AtribuWebhookError`, anything else
 */

import {
  AtribuApiError,
  AtribuConfigError,
  AtribuTransportError,
  type AtribuError,
} from "./errors";
import type { HttpClientLike, RequestOptions } from "./http";

export type BackoffStrategy = "exponential" | "fixed" | "none";

export interface RetryOptions {
  /**
   * Max attempts including the initial call. `maxAttempts: 3` = initial + 2
   * retries. Must be ≥ 1. Default 3.
   *
   * A single request may override this with `RequestOptions.maxRetries`, which
   * counts replays rather than attempts (`maxAttempts === maxRetries + 1`).
   */
  maxAttempts?: number;
  /**
   * Backoff strategy between retries. "exponential" = `baseDelayMs * 2^n`
   * (capped by `maxDelayMs`). "fixed" = `baseDelayMs`. "none" = no delay.
   * Default "exponential".
   */
  backoff?: BackoffStrategy;
  /** Base delay between retries in ms. Default 500. */
  baseDelayMs?: number;
  /** Cap on the delay between retries. Default 30000 (30s). */
  maxDelayMs?: number;
  /**
   * Jitter factor 0..1. Multiplies the computed delay by `1 + random*jitter`
   * (jitter=0 means deterministic). Default 0.3.
   */
  jitter?: number;
  /** Inject for tests. Default `(ms) => new Promise(r => setTimeout(r, ms))`. */
  sleep?: (ms: number) => Promise<void>;
  /** Inject for jitter tests. Default Math.random. */
  random?: () => number;
}

interface ResolvedRetry {
  maxAttempts: number;
  backoff: BackoffStrategy;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
}

function resolveRetry(o: RetryOptions): ResolvedRetry {
  return {
    maxAttempts: Math.max(1, o.maxAttempts ?? 3),
    backoff: o.backoff ?? "exponential",
    baseDelayMs: Math.max(0, o.baseDelayMs ?? 500),
    maxDelayMs: Math.max(0, o.maxDelayMs ?? 30_000),
    jitter: Math.min(1, Math.max(0, o.jitter ?? 0.3)),
    sleep: o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
    random: o.random ?? Math.random,
  };
}

export class RetryingHttpClient implements HttpClientLike {
  private readonly r: ResolvedRetry;
  constructor(private readonly base: HttpClientLike, options: RetryOptions) {
    this.r = resolveRetry(options);
  }

  async request<T>(opts: RequestOptions): Promise<T> {
    // A per-call `maxRetries` counts replays AFTER the initial attempt, so it
    // is one less than `maxAttempts`. It overrides the client budget in both
    // directions — a resource can pin a best-effort endpoint to a single
    // attempt, and a caller can hand that resource a larger budget back.
    //
    // Garbage in falls back to the client budget rather than throwing or
    // guessing. This is a published SDK: `NaN` (the shape a `parseInt` of a
    // missing env var takes) would otherwise skip the loop entirely and send
    // ZERO requests, and `Infinity` would retry forever. Both are worse than
    // quietly doing what the client was configured to do. `Math.trunc` keeps
    // 1.5 from meaning "1.5 retries", and `Math.max(1, …)` keeps a negative
    // from meaning "no attempts".
    const maxAttempts = Number.isFinite(opts.maxRetries)
      ? Math.max(1, Math.trunc(opts.maxRetries as number) + 1)
      : this.r.maxAttempts;

    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.base.request<T>(opts);
      } catch (err) {
        lastErr = err;
        // Attempt-limited actions opt out of replay entirely — a retry would
        // re-fire the upstream action (e.g. a second Meta OTP request).
        if (opts.retryable === false) throw err;
        if (attempt >= maxAttempts) throw err;
        const delay = this.computeDelay(err, attempt);
        if (delay === null) throw err; // non-retryable
        if (delay > 0) await this.r.sleep(delay);
      }
    }
    // Unreachable: `maxAttempts` is ≥ 1, so the loop either returns or throws.
    // Kept honest anyway — `throw undefined` would be the single worst thing to
    // surface from a transport, and a named error beats a mystery.
    throw (
      lastErr ??
      new AtribuConfigError(
        `RetryingHttpClient exhausted ${maxAttempts} attempts without a result or an error`,
      )
    );
  }

  /**
   * Returns the delay in ms before the next attempt, or null if the error
   * is non-retryable (caller should throw immediately).
   */
  private computeDelay(err: unknown, attempt: number): number | null {
    // Transport errors (network glitches, timeouts) → backoff-based retry
    if (err instanceof AtribuTransportError) {
      return this.applyJitter(this.backoffDelay(attempt));
    }
    if (err instanceof AtribuApiError) {
      const action = err.retry.action;
      if (action === "retry") return this.applyJitter(this.backoffDelay(attempt));
      if (action === "retry_after") {
        // Honor the server's instruction exactly (no jitter on this one).
        const capped = Math.min(err.retry.retryAfterMs, this.r.maxDelayMs);
        return Math.max(0, capped);
      }
      // do_not_retry / fix_and_retry / refresh_token — caller must handle
      return null;
    }
    return null;
  }

  private backoffDelay(attempt: number): number {
    if (this.r.backoff === "none") return 0;
    if (this.r.backoff === "fixed") return this.r.baseDelayMs;
    // exponential: base * 2^(attempt-1), capped at maxDelayMs
    const raw = this.r.baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(raw, this.r.maxDelayMs);
  }

  private applyJitter(delay: number): number {
    if (this.r.jitter === 0) return delay;
    return Math.round(delay * (1 + this.r.random() * this.r.jitter));
  }
}

export function isRetryableError(err: unknown): err is AtribuError {
  if (err instanceof AtribuTransportError) return true;
  if (err instanceof AtribuApiError) {
    return err.retry.action === "retry" || err.retry.action === "retry_after";
  }
  return false;
}

/**
 * Retry hints derived from HTTP status + headers.
 *
 * The SDK never retries automatically. It derives a hint and surfaces it on
 * AtribuApiError.retry so consumers' queue systems can decide. Hiding retry
 * logic in the SDK hides backpressure signals.
 */

export type RetryHint =
  | { action: "retry" }
  | { action: "retry_after"; retryAfterMs: number }
  | { action: "refresh_token" }
  | { action: "fix_and_retry" }
  | { action: "do_not_retry" };

export interface DeriveRetryInput {
  status: number;
  retryAfterHeader: string | null;
  errorCode: string | null;
}

export function deriveRetryHint(input: DeriveRetryInput): RetryHint {
  const retryAfterMs = parseRetryAfter(input.retryAfterHeader);
  if (retryAfterMs !== null) {
    return { action: "retry_after", retryAfterMs };
  }
  if (input.status === 401) return { action: "refresh_token" };
  if (input.status === 403 || input.errorCode === "forbidden" || input.errorCode === "insufficient_scope") {
    return { action: "do_not_retry" };
  }
  if (input.status === 408) return { action: "retry" };
  if (input.status === 409) return { action: "fix_and_retry" };
  if (input.status === 422 || input.errorCode === "validation_error" || input.errorCode === "invalid_content") {
    return { action: "fix_and_retry" };
  }
  if (input.status === 429 || input.errorCode === "rate_limit_exceeded") {
    return { action: "retry_after", retryAfterMs: 1000 };
  }
  if (input.status >= 500) return { action: "retry" };
  if (input.status >= 400) return { action: "fix_and_retry" };
  return { action: "do_not_retry" };
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const asInt = Number(header);
  if (Number.isFinite(asInt) && asInt >= 0) return Math.round(asInt * 1000);
  const asDate = Date.parse(header);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

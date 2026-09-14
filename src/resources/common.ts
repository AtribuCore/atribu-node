/**
 * Shared option shapes for the analytics-area resources (#590).
 *
 * WHY THESE RESOURCES RETURN THE WHOLE ENVELOPE. The messaging resources
 * unwrap `data` because their envelope carries nothing else. The analytics
 * reads do: `pagination.cursor` on `/customers`, `/visitors`, `/organic/posts`
 * and `/exports/ledger`, `status_counts` on the export ledger, `meta.count` on
 * `/recommendations`. Unwrapping would drop the cursor — the one field a
 * paginated list cannot be used without — so every method here resolves with
 * the response body as sent, and callers read `.data`.
 */

/** Extras every read accepts on top of its query parameters. */
export interface ReadExtras {
  signal?: AbortSignal;
}

/** Extras every write accepts on top of its body. */
export interface WriteExtras {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

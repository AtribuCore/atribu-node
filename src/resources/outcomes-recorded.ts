import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

/** #1800 A3 — one page of `outcome.recorded` events, oldest first. */
export type OutcomesRecordedPage =
  paths["/api/v1/outcomes/recorded"]["get"]["responses"][200]["content"]["application/json"];

export type OutcomesRecordedOptions = NonNullable<
  paths["/api/v1/outcomes/recorded"]["get"]["parameters"]["query"]
> & { signal?: AbortSignal };

/**
 * The replay of the `outcome.recorded` webhook: the same events, same ids,
 * same order.
 *
 * Returns the whole page (`data` + `pagination`) because the cursor is the
 * point: store `pagination.cursor` — it is present even on the last page — and
 * pass it back later to continue; `has_next: false` means caught up.
 *
 * ```ts
 * let cursor = await loadCursor();
 * do {
 *   const page = await atribu.webhooks.outcomesRecorded.list({ cursor });
 *   for (const event of page.data) await handle(event); // de-dupe on event.id
 *   cursor = page.pagination.cursor ?? cursor;
 *   await saveCursor(cursor);
 *   if (!page.pagination.has_next) break;
 * } while (true);
 * ```
 */
export class OutcomesRecordedResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(options: OutcomesRecordedOptions = {}): Promise<OutcomesRecordedPage> {
    const { signal, ...query } = options;
    return this.http.request<OutcomesRecordedPage>({
      method: "GET",
      path: "/api/v1/outcomes/recorded",
      query,
      signal,
    });
  }
}

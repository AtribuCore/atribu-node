import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras } from "./common";

type GetResponse =
  paths["/api/v1/handoffs/{id}"]["get"]["responses"][200]["content"]["application/json"];

/**
 * One hand-off — a step of the golden path only a human can take.
 *
 * Derived from the generated types rather than restated, so a field added to
 * the contract arrives with `npm run gen`.
 */
export type Handoff = GetResponse["data"];

/** `pending` until the human finishes; then terminal. `expired` is derived. */
export type HandoffStatus = Handoff["status"];

/** What the human is being asked to do. */
export type HandoffKind = Handoff["kind"];

/**
 * The hand-off poll (#1045).
 *
 * Your agent cannot grant an OAuth consent, sign a DPA or pay for a plan. It
 * can mint a **hand-off** for one — through the route for that thing, not
 * through this resource — hand `url` to a person, and watch here:
 *
 * ```ts
 * const { data } = await client.handoffs.get(handoffId);
 * if (data.status === "pending") console.log("send them:", data.url);
 * ```
 *
 * There is deliberately no `create()`: only the flow that knows what completing
 * a hand-off means can mint one. This resource is the single poll they share.
 *
 * Resolves with the whole envelope, like every other analytics-area read — see
 * `./common.ts`.
 */
export class HandoffsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Read one hand-off by the id its mint returned.
   *
   * An EXPIRED hand-off resolves normally with `status: "expired"` and a null
   * `url` — it is not an error, and distinguishing it from a wrong id is the
   * whole point. A 404 means the id names nothing this workspace minted.
   */
  async get(id: string, opts: ReadExtras = {}): Promise<GetResponse> {
    return this.http.request<GetResponse>({
      method: "GET",
      path: `/api/v1/handoffs/${encodeURIComponent(id)}`,
      signal: opts.signal,
    });
  }
}

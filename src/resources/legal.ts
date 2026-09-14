/**
 * DPA / BAA signing (#1051) — the two acts an agreement needs.
 *
 * **Your agent cannot sign.** `signDpa()` / `signBaa()` mint a **hand-off**: a
 * session-less URL for a person and an id to poll. `acceptDpa()` /
 * `acceptBaa()` record an acceptance for the SIGNED-IN caller and answer 403
 * for an API key — which is the point, not an omission. A signature that a
 * machine credential could have produced records nothing.
 *
 * ```ts
 * const handoff = await client.legal.signDpa();
 * if (handoff.status === "pending") sendToCustomer(handoff.url);
 * // …later
 * const { data } = await client.handoffs.get(handoff.id);
 * ```
 *
 * The record reads back from `client.conversionSync.legal()`.
 *
 * Methods here unwrap `data` rather than returning the envelope: a hand-off and
 * an acceptance are single objects an integrator acts on, the same shape
 * `client.handoffs.get()` is polled for.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { WriteExtras } from "./common";

export type LegalHandoff =
  paths["/api/v1/legal/dpa/handoff"]["post"]["responses"][200]["content"]["application/json"]["data"];

export type LegalAcceptance =
  paths["/api/v1/legal/dpa/accept"]["post"]["responses"][200]["content"]["application/json"]["data"];

/**
 * The optional accept body. `document_version` names WHICH of the shipped texts
 * you displayed — omit it to accept the current one. Unknown values are a 422:
 * the recorded version has to be a text this build can actually render.
 */
export type LegalAcceptInput = NonNullable<
  paths["/api/v1/legal/dpa/accept"]["post"]["requestBody"]
>["content"]["application/json"];

/** `dpa` is the platform-safe agreement; `baa` is the combined DPA & HIPAA BAA. */
export type LegalDocument = "dpa" | "baa";

export class LegalResource {
  constructor(private readonly http: HttpClientLike) {}

  private mint(document: LegalDocument, options: WriteExtras): Promise<LegalHandoff> {
    return this.http
      .request<{ data: LegalHandoff }>({
        method: "POST",
        path: `/api/v1/legal/${document}/handoff`,
        idempotencyKey: options.idempotencyKey,
        signal: options.signal,
      })
      .then((res) => res.data);
  }

  private accept(
    document: LegalDocument,
    input: LegalAcceptInput,
    options: WriteExtras,
  ): Promise<LegalAcceptance> {
    return this.http
      .request<{ data: LegalAcceptance }>({
        method: "POST",
        path: `/api/v1/legal/${document}/accept`,
        body: input,
        idempotencyKey: options.idempotencyKey,
        signal: options.signal,
      })
      .then((res) => res.data);
  }

  /**
   * Mint a signing hand-off for the Data Processing Agreement.
   *
   * An already-accepted DPA answers `status: "completed"` with
   * `result.already_accepted` and no URL — never a second signature.
   */
  signDpa(options: WriteExtras = {}): Promise<LegalHandoff> {
    return this.mint("dpa", options);
  }

  /** The same, for the combined DPA & HIPAA BAA that Healthcare Mode requires. */
  signBaa(options: WriteExtras = {}): Promise<LegalHandoff> {
    return this.mint("baa", options);
  }

  /**
   * Accept the DPA **as the signed-in owner or admin making this call**.
   *
   * API keys are refused with 403: use {@link signDpa} and hand the URL to a
   * person. Idempotent — accepting twice writes nothing and returns
   * `already_accepted: true` with the original timestamp.
   *
   * Pass `{ document_version }` when you rendered a text other than the current
   * one; omit it otherwise.
   */
  acceptDpa(
    input: LegalAcceptInput = {},
    options: WriteExtras = {},
  ): Promise<LegalAcceptance> {
    return this.accept("dpa", input, options);
  }

  /** The same, for the combined DPA & HIPAA BAA. */
  acceptBaa(
    input: LegalAcceptInput = {},
    options: WriteExtras = {},
  ): Promise<LegalAcceptance> {
    return this.accept("baa", input, options);
  }
}

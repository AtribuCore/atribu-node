/**
 * Customer identity (#643) — the suggested-merge review queue and the identity
 * repair scan.
 *
 * TWO SURFACES, one resource, and they answer different questions:
 *
 *   {@link IdentityResource.mergeProposals} and its `preview`/`decide` pair are
 *   the PER-PAIR review: "are these two customers the same person, and do you
 *   want them merged?". A merge moves one customer's events onto the other and
 *   re-runs attribution, so it is a decision, never a sweep.
 *
 *   {@link IdentityResource.repairScan} and {@link IdentityResource.repair} are
 *   the PROFILE-WIDE audit: which customers are missing a primary email or
 *   phone, and the safe backfills that fill them in. Merges are deliberately
 *   not part of the automatic set.
 *
 * SCOPES. Every read needs `customers:read` — these responses are named people.
 * Both writes need `customers:read` AND `attribution:write`, because a merge
 * moves attribution credit between customers.
 *
 * Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

type MergeProposalsQuery = NonNullable<
  paths["/api/v1/identity/merge-proposals"]["get"]["parameters"]["query"]
>;
export type MergeProposalsResponse =
  paths["/api/v1/identity/merge-proposals"]["get"]["responses"][200]["content"]["application/json"];
export type MergeProposalsOptions = MergeProposalsQuery & ReadExtras;

export type MergeProposalScanResponse =
  paths["/api/v1/identity/merge-proposals/scan"]["post"]["responses"][200]["content"]["application/json"];

export type MergeProposalPreviewResponse =
  paths["/api/v1/identity/merge-proposals/{id}/preview"]["get"]["responses"][200]["content"]["application/json"];

export type MergeProposalDecisionInput = NonNullable<
  paths["/api/v1/identity/merge-proposals/{id}/decide"]["post"]["requestBody"]
>["content"]["application/json"];
export type MergeProposalDecisionResponse =
  paths["/api/v1/identity/merge-proposals/{id}/decide"]["post"]["responses"][200]["content"]["application/json"];

type RepairScanQuery = NonNullable<
  paths["/api/v1/identity/repair-scan"]["get"]["parameters"]["query"]
>;
export type IdentityRepairScanResponse =
  paths["/api/v1/identity/repair-scan"]["get"]["responses"][200]["content"]["application/json"];
export type IdentityRepairScanOptions = RepairScanQuery & ReadExtras;

export type IdentityRepairInput = NonNullable<
  paths["/api/v1/identity/repair"]["post"]["requestBody"]
>["content"]["application/json"];
export type IdentityRepairResponse =
  paths["/api/v1/identity/repair"]["post"]["responses"][200]["content"]["application/json"];

type MergeHistoryQuery = NonNullable<
  paths["/api/v1/identity/merge-history"]["get"]["parameters"]["query"]
>;
export type MergeHistoryResponse =
  paths["/api/v1/identity/merge-history"]["get"]["responses"][200]["content"]["application/json"];
export type MergeHistoryOptions = Omit<MergeHistoryQuery, "survivor_profile_id"> & ReadExtras;

/** #489 — an ad-hoc preview of two customers you picked yourself. */
type MergePreviewQuery = NonNullable<
  paths["/api/v1/identity/merge-preview"]["get"]["parameters"]["query"]
>;
export type MergePreviewResponse =
  paths["/api/v1/identity/merge-preview"]["get"]["responses"][200]["content"]["application/json"];
export type MergePreviewOptions = Omit<
  MergePreviewQuery,
  "survivor_profile_id" | "merged_profile_id"
> &
  ReadExtras;

/** #489 — reversing one merge, keyed on the merge-history `audit_log_id`. */
export type UndoMergeResponse =
  paths["/api/v1/identity/merges/{auditLogId}/undo"]["post"]["responses"][200]["content"]["application/json"];

export type CustomerImportInput = NonNullable<
  paths["/api/v1/customers"]["post"]["requestBody"]
>["content"]["application/json"];
export type CustomerImportResponse =
  paths["/api/v1/customers"]["post"]["responses"][200]["content"]["application/json"];
/** One entry of `CustomerImportInput["rows"]`, named for callers that build rows before they have a full request. */
export type CustomerImportRow = CustomerImportInput["rows"][number];

/** #1693 — `POST /api/v1/customers/link-tokens`, the `atb_t` bulk mint. */
export type LinkTokenMintInput = NonNullable<
  paths["/api/v1/customers/link-tokens"]["post"]["requestBody"]
>["content"]["application/json"];
export type LinkTokenMintResponse =
  paths["/api/v1/customers/link-tokens"]["post"]["responses"][200]["content"]["application/json"];

/** #1770 — `POST /api/v1/customers/erasures`, a partner key's erasure by its own key. */
export type CustomerErasureInput = NonNullable<
  paths["/api/v1/customers/erasures"]["post"]["requestBody"]
>["content"]["application/json"];
/** The receipt, from the POST (202 or a 200 replay) or from `getCustomerErasure`. */
export type CustomerErasureReceiptResponse =
  paths["/api/v1/customers/erasures/{erasure_id}"]["get"]["responses"][200]["content"]["application/json"];

export class IdentityResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * One page of the suggested-merge queue, newest first.
   *
   * Keyset paginated: pass `pagination.cursor` from the previous response to
   * walk older pages. There is no total, on purpose — the queue is being
   * resolved while you walk it, so an offset page would shift under you.
   *
   * `status_counts` sits beside `data` and covers the WHOLE queue regardless of
   * the `status` you asked for, so a caller showing one tab can still label the
   * others.
   */
  async mergeProposals(
    options: MergeProposalsOptions = {},
  ): Promise<MergeProposalsResponse> {
    const { signal, ...query } = options;
    return this.http.request<MergeProposalsResponse>({
      method: "GET",
      path: "/api/v1/identity/merge-proposals",
      query,
      signal,
    });
  }

  /**
   * Re-run the proposer and refill the queue.
   *
   * A write — it mints, supersedes and resurfaces proposals — but it merges
   * nothing, so no attribution recompute follows it. Call {@link
   * mergeProposals} afterwards to read what it found.
   */
  async rescanMergeProposals(
    options: WriteExtras = {},
  ): Promise<MergeProposalScanResponse> {
    return this.http.request<MergeProposalScanResponse>({
      method: "POST",
      path: "/api/v1/identity/merge-proposals/scan",
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * What merging this proposal would move, computed NOW.
   *
   * Not the same numbers as the proposal's stored `evidence`: that is what was
   * true when the proposal was raised. Read this before {@link decideMerge} if
   * the proposal has been sitting in the queue.
   */
  async mergeProposalPreview(
    proposalId: string,
    options: ReadExtras = {},
  ): Promise<MergeProposalPreviewResponse> {
    return this.http.request<MergeProposalPreviewResponse>({
      method: "GET",
      path: `/api/v1/identity/merge-proposals/${encodeURIComponent(proposalId)}/preview`,
      signal: options.signal,
    });
  }

  /**
   * Merge, dismiss or snooze one proposal.
   *
   * `merge` is not reversible from here: it moves the merged customer's events,
   * identifiers, touches and conversions onto the survivor and enqueues an
   * attribution recompute. Pass `survivor_profile_id` when the proposal picked
   * the wrong side.
   *
   * Idempotent — an already-decided proposal answers 200 with `changed: false`
   * and the status it already holds, so a retry after a dropped response is
   * safe and does not read as an error.
   */
  async decideMerge(
    proposalId: string,
    input: MergeProposalDecisionInput,
    options: WriteExtras = {},
  ): Promise<MergeProposalDecisionResponse> {
    return this.http.request<MergeProposalDecisionResponse>({
      method: "POST",
      path: `/api/v1/identity/merge-proposals/${encodeURIComponent(proposalId)}/decide`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * The profile-wide identity audit: how many customers are missing a primary
   * email or phone, how many duplicate groups exist, and what a backfill would
   * write for each.
   *
   * `auto_repairable_count` counts BACKFILLS only. `auto_merge_count` is
   * reported for awareness — merges go through the proposal queue, not
   * {@link repair}.
   */
  async repairScan(
    options: IdentityRepairScanOptions = {},
  ): Promise<IdentityRepairScanResponse> {
    const { signal, ...query } = options;
    return this.http.request<IdentityRepairScanResponse>({
      method: "GET",
      path: "/api/v1/identity/repair-scan",
      query,
      signal,
    });
  }

  /**
   * Preview or apply identity repairs.
   *
   * Omit `operations` for the automatic set — every safe primary-email /
   * primary-phone backfill the scan found. Pass them to name repairs yourself,
   * including `merge_profiles` for a manual merge of two specific customers.
   *
   * A skipped operation is the normal outcome, not an error: one whose
   * precondition moved since the preview lands in `skipped` with the reason
   * while the rest apply, which is what makes the whole call safe to retry.
   */
  async repair(
    input: IdentityRepairInput,
    options: WriteExtras = {},
  ): Promise<IdentityRepairResponse> {
    return this.http.request<IdentityRepairResponse>({
      method: "POST",
      path: "/api/v1/identity/repair",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * What merging two customers YOU picked would move (#489).
   *
   * The same document {@link mergeProposalPreview} returns — events,
   * identifiers, touches, conversions, cash and the three collision flags — for
   * a pair you named rather than one the proposer raised. Nothing is written.
   *
   * To perform it, call {@link repair} with
   * `{ action: "apply", operations: [{ type: "merge_profiles", ... }] }`.
   */
  async mergePreview(
    survivorProfileId: string,
    mergedProfileId: string,
    options: MergePreviewOptions = {},
  ): Promise<MergePreviewResponse> {
    const { signal, ...rest } = options;
    return this.http.request<MergePreviewResponse>({
      method: "GET",
      path: "/api/v1/identity/merge-preview",
      query: {
        ...rest,
        survivor_profile_id: survivorProfileId,
        merged_profile_id: mergedProfileId,
      },
      signal,
    });
  }

  /**
   * Reverse one merge and put the two customers back (#489).
   *
   * Keyed on the `audit_log_id` {@link mergeHistory} returns — it identifies
   * the MERGE, not either customer. Everything the merge moved goes back, the
   * merged side's collapsed `lead_created` is restored, and both customers are
   * re-attributed.
   *
   * Two refusals are 409 and the message says which: the entry is itself an
   * undo, or the pair is no longer merged. Neither is retryable as-is.
   */
  async undoMerge(
    auditLogId: string,
    options: WriteExtras = {},
  ): Promise<UndoMergeResponse> {
    return this.http.request<UndoMergeResponse>({
      method: "POST",
      path: `/api/v1/identity/merges/${encodeURIComponent(auditLogId)}/undo`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Every merge that landed on one customer, newest first.
   *
   * `is_currently_merged` is false for a merge that was later undone — the row
   * stays as the audit record, not as current state.
   */
  async mergeHistory(
    survivorProfileId: string,
    options: MergeHistoryOptions = {},
  ): Promise<MergeHistoryResponse> {
    const { signal, ...query } = options;
    return this.http.request<MergeHistoryResponse>({
      method: "GET",
      path: "/api/v1/identity/merge-history",
      query: { ...query, survivor_profile_id: survivorProfileId },
      signal,
    });
  }

  /**
   * Batch-import customer identities from your own records — a PMS/CRM export
   * or a CSV, not an event (#1035). No `outcome_events` row is written; this
   * upserts phone/email/national_id/external_id directly into the identity
   * graph, up to 1,000 rows per call.
   *
   * Every row needs at least one of `phone`, `email` or `national_id` — a row
   * with only `external_id` is rejected, never used to mint an orphan profile.
   * The response reports every row's own outcome (`created` / `matched` /
   * `rejected`) in request order, so one bad row never hides the rest.
   *
   * Requires the `attribution:write` scope.
   */
  async importCustomers(
    input: CustomerImportInput,
    options: WriteExtras = {},
  ): Promise<CustomerImportResponse> {
    return this.http.request<CustomerImportResponse>({
      method: "POST",
      path: "/api/v1/customers",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Mint `atb_t` link-identity tokens for customers this profile already
   * knows (#1693), to append to e-mail / WhatsApp / CRM links. Read-only on
   * the identity graph: a row naming nobody answers `not_found`. The response
   * carries the GoHighLevel / Klaviyo / WhatsApp merge-tag recipes.
   *
   * Requires the `attribution:write` scope.
   */
  async mintLinkTokens(
    input: LinkTokenMintInput,
    options: WriteExtras = {},
  ): Promise<LinkTokenMintResponse> {
    return this.http.request<LinkTokenMintResponse>({
      method: "POST",
      path: "/api/v1/customers/link-tokens",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Erase one customer of this profile by your own key (#1770) — for a partner
   * app cascading its own contact deletion or a data-subject request. TERMINAL.
   * Idempotent on `request_ref`: the same value again returns the original
   * receipt. The receipt never carries `customer_profile_id`.
   *
   * Requires the `attribution:write` scope.
   */
  async eraseCustomer(
    input: CustomerErasureInput,
    options: WriteExtras = {},
  ): Promise<CustomerErasureReceiptResponse> {
    return this.http.request<CustomerErasureReceiptResponse>({
      method: "POST",
      path: "/api/v1/customers/erasures",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Read an erasure receipt: its current `status` and `completed_at` (#1770). */
  async getCustomerErasure(
    erasureId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<CustomerErasureReceiptResponse> {
    return this.http.request<CustomerErasureReceiptResponse>({
      method: "GET",
      path: `/api/v1/customers/erasures/${encodeURIComponent(erasureId)}`,
      signal: options.signal,
    });
  }
}

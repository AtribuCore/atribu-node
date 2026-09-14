/**
 * The WORKSPACE-scoped reads (#487 / #617) — the first methods in this SDK
 * whose answer is not about one Profile.
 *
 * **Session bearers only, all four.** An `atb_live_` key is minted for exactly
 * one profile — the credential IS the scope — so it has no workspace to read
 * across and no membership list to enumerate, and every method here answers
 * `403 insufficient_scope` for one. Construct the client with an `accessToken`
 * (a Supabase session token) to call them; hold an API key and use
 * `client.profile.get()` / `client.analytics.*` instead.
 *
 * `client.workspaces.list()` is the COLD-BOOT read: it names neither a
 * workspace nor a profile, because it is what you call before you have either.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

export type WorkspacesResponse =
  paths["/api/v1/workspaces"]["get"]["responses"][200]["content"]["application/json"];

type WorkspaceTopPerformersQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/top-performers"]["get"]["parameters"]["query"]
>;
export type WorkspaceTopPerformersResponse =
  paths["/api/v1/workspaces/{workspaceId}/top-performers"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceTopPerformersOptions = WorkspaceTopPerformersQuery & ReadExtras;

type WorkspaceCreativePatternsQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/creative-patterns"]["get"]["parameters"]["query"]
>;
export type WorkspaceCreativePatternsResponse =
  paths["/api/v1/workspaces/{workspaceId}/creative-patterns"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceCreativePatternsOptions = WorkspaceCreativePatternsQuery & ReadExtras;

export type WorkspaceProfilesListResponse =
  paths["/api/v1/workspaces/{workspaceId}/profiles"]["get"]["responses"][200]["content"]["application/json"];

type WorkspaceAuditQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/audit"]["get"]["parameters"]["query"]
>;
export type WorkspaceAuditResponse =
  paths["/api/v1/workspaces/{workspaceId}/audit"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceAuditOptions = WorkspaceAuditQuery & ReadExtras;

// #452 (Phase 4 scaffolding) — the PII-scope access audit read.
type WorkspacePiiAccessLogQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/pii-access-log"]["get"]["parameters"]["query"]
>;
export type WorkspacePiiAccessLogResponse =
  paths["/api/v1/workspaces/{workspaceId}/pii-access-log"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspacePiiAccessLogOptions = WorkspacePiiAccessLogQuery & ReadExtras;

// #452 (Phase 4) — per-key API usage for a workspace.
type WorkspaceApiUsageQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/api-usage"]["get"]["parameters"]["query"]
>;
export type WorkspaceApiUsageResponse =
  paths["/api/v1/workspaces/{workspaceId}/api-usage"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceApiUsageOptions = WorkspaceApiUsageQuery & ReadExtras;

// #488 (PR-2) — the workspace subscription read.
export type WorkspaceSubscription =
  paths["/api/v1/workspaces/{workspaceId}/subscription"]["get"]["responses"][200]["content"]["application/json"]["data"];

// #1052 — the plan-checkout hand-off.
export type CheckoutSessionInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/checkout-session"]["post"]["requestBody"]
>["content"]["application/json"];
export type CheckoutHandoff =
  paths["/api/v1/workspaces/{workspaceId}/checkout-session"]["post"]["responses"][200]["content"]["application/json"]["data"];

// #489 slice B — the Customer Portal and the Shopify plan picker. Two rails,
// mutually exclusive: which one a workspace uses is set by how it was acquired,
// and each route refuses the other's workspaces.
export type BillingPortalSession =
  paths["/api/v1/workspaces/{workspaceId}/billing-portal-session"]["post"]["responses"][200]["content"]["application/json"]["data"];
export type ShopifyPlanSelectionInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/shopify-plan-selection"]["post"]["requestBody"]
>["content"]["application/json"];
export type ShopifyPlanSelection =
  paths["/api/v1/workspaces/{workspaceId}/shopify-plan-selection"]["post"]["responses"][200]["content"]["application/json"]["data"];

// #659 — the rest of the Top Performers workspace surface. Every one is
// session-only for the same reason the four above are.

type WorkspacePatternDimensionsQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/creative-patterns/dimensions"]["get"]["parameters"]["query"]
>;
export type WorkspacePatternDimensionsResponse =
  paths["/api/v1/workspaces/{workspaceId}/creative-patterns/dimensions"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspacePatternDimensionsOptions = WorkspacePatternDimensionsQuery & ReadExtras;

type WorkspaceArchetypesQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/creative-archetypes"]["get"]["parameters"]["query"]
>;
export type WorkspaceArchetypesResponse =
  paths["/api/v1/workspaces/{workspaceId}/creative-archetypes"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceArchetypesOptions = WorkspaceArchetypesQuery & ReadExtras;

export type WorkspaceExperimentsResponse =
  paths["/api/v1/workspaces/{workspaceId}/experiments"]["get"]["responses"][200]["content"]["application/json"];

type WorkspaceTestRoadmapQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/test-roadmap"]["get"]["parameters"]["query"]
>;
export type WorkspaceTestRoadmapResponse =
  paths["/api/v1/workspaces/{workspaceId}/test-roadmap"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceTestRoadmapOptions = WorkspaceTestRoadmapQuery & ReadExtras;

type WorkspaceTopPerformersBriefQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/top-performers/brief"]["get"]["parameters"]["query"]
>;
export type WorkspaceTopPerformersBriefResponse =
  paths["/api/v1/workspaces/{workspaceId}/top-performers/brief"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceTopPerformersBriefOptions = WorkspaceTopPerformersBriefQuery & ReadExtras;

export type WorkspaceTabCountsResponse =
  paths["/api/v1/workspaces/{workspaceId}/tab-counts"]["get"]["responses"][200]["content"]["application/json"];

export type WorkspacePacingResponse =
  paths["/api/v1/workspaces/{workspaceId}/pacing"]["get"]["responses"][200]["content"]["application/json"];

type WorkspaceRecommendationsQuery = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/recommendations"]["get"]["parameters"]["query"]
>;
export type WorkspaceRecommendationsResponse =
  paths["/api/v1/workspaces/{workspaceId}/recommendations"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceRecommendationsOptions = WorkspaceRecommendationsQuery & ReadExtras;

export type WorkspaceReplicateRunResponse =
  paths["/api/v1/workspaces/{workspaceId}/replicate-runs/{runId}"]["get"]["responses"][200]["content"]["application/json"];

export type ReplicateHandoffInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/replicate-runs/{runId}/handoff"]["post"]["requestBody"]
>["content"]["application/json"];
export type ReplicateHandoffResponse =
  paths["/api/v1/workspaces/{workspaceId}/replicate-runs/{runId}/handoff"]["post"]["responses"][200]["content"]["application/json"];

export type CreativeTestDecisionInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/creative-tests/decisions"]["post"]["requestBody"]
>["content"]["application/json"];
export type CreativeTestDecisionResponse =
  paths["/api/v1/workspaces/{workspaceId}/creative-tests/decisions"]["post"]["responses"][200]["content"]["application/json"];

export type ExperimentPromotionInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/experiment-promotions"]["post"]["requestBody"]
>["content"]["application/json"];
export type ExperimentPromotionResponse =
  paths["/api/v1/workspaces/{workspaceId}/experiment-promotions"]["post"]["responses"][200]["content"]["application/json"];

// #489 — a profile's `atb_live_` API keys, managed at workspace scope. See
// `@atribu/api-contract/dto-api-keys`'s header (mirrored in the OpenAPI
// registry) for why a profile-grain resource sits on the workspace surface:
// who may mint/revoke/rotate a key is a workspace-membership question, and
// scoping it here is what makes an API KEY categorically unable to reach
// these methods at all — same refusal every other method on this resource
// gets.
export type WorkspaceApiKeysResponse =
  paths["/api/v1/workspaces/{workspaceId}/api-keys"]["get"]["responses"][200]["content"]["application/json"];
export type CreateApiKeyBody = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/api-keys"]["post"]["requestBody"]
>["content"]["application/json"];
export type CreateApiKeyResponse =
  paths["/api/v1/workspaces/{workspaceId}/api-keys"]["post"]["responses"][201]["content"]["application/json"];
export type RevokeApiKeyResponse =
  paths["/api/v1/workspaces/{workspaceId}/api-keys/{id}/revoke"]["post"]["responses"][200]["content"]["application/json"];
export type RotateApiKeyResponse =
  paths["/api/v1/workspaces/{workspaceId}/api-keys/{id}/rotate"]["post"]["responses"][201]["content"]["application/json"];

// #488 — the workspace MCP privacy panel: PII default + write-back toggle,
// and the write-back audit log.

export type McpSettings =
  paths["/api/v1/workspaces/{workspaceId}/mcp-settings"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type McpSettingsUpdateInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/mcp-settings"]["put"]["requestBody"]
>["content"]["application/json"];

export type McpWritebackAudit =
  paths["/api/v1/workspaces/{workspaceId}/mcp-writeback-audits"]["get"]["responses"][200]["content"]["application/json"]["data"][number];

// #661 — the workspace Reports hub + its two bulk writes.

export type WorkspaceReportsHubResponse =
  paths["/api/v1/workspaces/{workspaceId}/reports/hub"]["get"]["responses"][200]["content"]["application/json"];

export type ReportSchedulesBulkInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/reports/schedules/bulk"]["post"]["requestBody"]
>["content"]["application/json"];
export type ReportSchedulesBulkResponse =
  paths["/api/v1/workspaces/{workspaceId}/reports/schedules/bulk"]["post"]["responses"][200]["content"]["application/json"];

export type ReportBulkGenerateInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/reports/bulk-generate"]["post"]["requestBody"]
>["content"]["application/json"];
export type ReportBulkGenerateResponse =
  paths["/api/v1/workspaces/{workspaceId}/reports/bulk-generate"]["post"]["responses"][200]["content"]["application/json"];

// #489 — the workspace-ADMINISTRATION surface: branding, invitations,
// sender-domain, shared snapshots, connected apps, compliance overview.
// Every WRITE below is operator-only (owner/admin) — see the class doc.

export type WorkspaceBrandingResponse =
  paths["/api/v1/workspaces/{workspaceId}/branding"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceBrandingUpdateBody = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/branding"]["put"]["requestBody"]
>["content"]["application/json"];
export type WorkspaceBrandingUpdateResponse =
  paths["/api/v1/workspaces/{workspaceId}/branding"]["put"]["responses"][200]["content"]["application/json"];
export type WorkspaceBrandingLogoResponse =
  paths["/api/v1/workspaces/{workspaceId}/branding/logo"]["post"]["responses"][200]["content"]["application/json"];
export type WorkspaceBrandingLogoDeleteResponse =
  paths["/api/v1/workspaces/{workspaceId}/branding/logo"]["delete"]["responses"][200]["content"]["application/json"];

export type WorkspaceInvitationsListResponse =
  paths["/api/v1/workspaces/{workspaceId}/invitations"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceInvitationCreateBody = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/invitations"]["post"]["requestBody"]
>["content"]["application/json"];
export type WorkspaceInvitationCreateResponse =
  paths["/api/v1/workspaces/{workspaceId}/invitations"]["post"]["responses"][201]["content"]["application/json"];
export type WorkspaceInvitationDeleteResponse =
  paths["/api/v1/workspaces/{workspaceId}/invitations/{invitationId}"]["delete"]["responses"][200]["content"]["application/json"];

export type WorkspaceSenderDomainResponse =
  paths["/api/v1/workspaces/{workspaceId}/sender-domain"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceSenderDomainCreateBody = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/sender-domain"]["post"]["requestBody"]
>["content"]["application/json"];
export type WorkspaceSenderDomainCreateResponse =
  paths["/api/v1/workspaces/{workspaceId}/sender-domain"]["post"]["responses"][201]["content"]["application/json"];
export type WorkspaceSenderDomainDeleteResponse =
  paths["/api/v1/workspaces/{workspaceId}/sender-domain"]["delete"]["responses"][200]["content"]["application/json"];
export type WorkspaceSenderDomainVerifyResponse =
  paths["/api/v1/workspaces/{workspaceId}/sender-domain/verify"]["post"]["responses"][200]["content"]["application/json"];

export type WorkspaceSnapshotsListResponse =
  paths["/api/v1/workspaces/{workspaceId}/snapshots"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceSnapshotCreateBody = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/snapshots"]["post"]["requestBody"]
>["content"]["application/json"];
export type WorkspaceSnapshotCreateResponse =
  paths["/api/v1/workspaces/{workspaceId}/snapshots"]["post"]["responses"][201]["content"]["application/json"];
export type WorkspaceSnapshotDeleteResponse =
  paths["/api/v1/workspaces/{workspaceId}/snapshots/{snapshotId}"]["delete"]["responses"][200]["content"]["application/json"];

export type WorkspaceConnectedAppsListResponse =
  paths["/api/v1/workspaces/{workspaceId}/connected-apps"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceConnectedAppRevokeResponse =
  paths["/api/v1/workspaces/{workspaceId}/connected-apps/{id}"]["delete"]["responses"][200]["content"]["application/json"];

export type WorkspaceComplianceOverviewResponse =
  paths["/api/v1/workspaces/{workspaceId}/compliance-overview"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceComplianceOverviewUpdateBody = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/compliance-overview"]["patch"]["requestBody"]
>["content"]["application/json"];
export type WorkspaceComplianceOverviewUpdateResponse =
  paths["/api/v1/workspaces/{workspaceId}/compliance-overview"]["patch"]["responses"][200]["content"]["application/json"];

export type WorkspaceReportingCurrencyResponse =
  paths["/api/v1/workspaces/{workspaceId}/reporting-currency"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceReportingCurrencyUpdateBody = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/reporting-currency"]["patch"]["requestBody"]
>["content"]["application/json"];
export type WorkspaceReportingCurrencyUpdateResponse =
  paths["/api/v1/workspaces/{workspaceId}/reporting-currency"]["patch"]["responses"][200]["content"]["application/json"];


/**
 * #1053 — `POST /api/v1/workspaces`'s SESSION branch: a signed-in person (or,
 * since #1084, an MCP user token) creates their own new workspace.
 * Hand-typed rather than derived from `paths[...]`, for the same reason
 * `CreateProfileInput` in `./profile.ts` is: the generated type at this path
 * is a UNION with the app-credential shape (`email` / `locale`), and this is
 * the one branch the SDK's own client exposes — matching
 * `SessionWorkspaceRequest` / `CreatedWorkspace` in the OpenAPI registry
 * field-for-field.
 *
 * IDEMPOTENT on `(caller, name)` for a short window (#1085) — `create()`
 * called again with the same `name` returns the SAME workspace
 * (`created: false`) instead of a duplicate; `created: true` on either a
 * genuinely new name or a retry outside the window.
 */
export interface CreateWorkspaceInput {
  name: string;
  timezone?: string;
  /**
   * Defaults to `starter` (Free). `growth` / `agency` immediately create a
   * `trialing` subscription at that plan's real limits rather than waiting
   * for the workspace's first profile, AND mint a Stripe Checkout hand-off.
   * See `checkout` on the response.
   */
  plan?: "starter" | "growth" | "agency";
}

/** A real Stripe Checkout hand-off — give `url` to a human, poll
 *  `GET /api/v1/handoffs/{id}` (or `client.handoffs.get(id)`) the way
 *  `client.workspaces.checkoutSession(...)` already works. */
export interface WorkspaceCheckoutHandoff {
  id: string;
  url: string;
  expires_at: string;
}

export interface WorkspaceCreationWarning {
  code: string;
  message: string;
}

export interface CreatedWorkspace {
  workspace_id: string;
  name: string;
  /** `false` on an idempotent replay — see this interface's doc above. */
  created: boolean;
  /**
   * A real Checkout hand-off for a `plan: "growth" | "agency"` request.
   * `null` for `starter`/absent, always `null` on the app-credential branch,
   * and `null` when a mint was attempted but could not complete — see
   * `warnings`. Workspace creation is never blocked on it either way.
   */
  checkout: WorkspaceCheckoutHandoff | null;
  /**
   * Present only when something degraded without blocking creation — today,
   * a single `checkout_unavailable` entry when `plan` asked for a mint that
   * did not happen. Omitted, not an empty array, when nothing degraded.
   */
  warnings?: WorkspaceCreationWarning[];
  /**
   * `true` only when this call authenticated as an MCP user token whose
   * grant carries `mcp:write` (#1180) — that person already consented to
   * writes on the MCP OAuth screen and is this workspace's only member and
   * owner, so it starts writable rather than needing a human to flip a
   * setting a user token can never reach. Always `false` for a session
   * bearer or an `mcp:read`-only token. On an idempotent replay this is the
   * workspace's actual current value, not re-derived from this call.
   */
  mcp_writeback_enabled: boolean;
}


/**
 * #1176 — `DELETE /api/v1/workspaces/{workspaceId}`. Hand-typed off the
 * generated `paths` entry, the same way the rest of this file's response types
 * are.
 */
export type ArchivedWorkspace =
  paths["/api/v1/workspaces/{workspaceId}"]["delete"]["responses"][200]["content"]["application/json"]["data"];

/**
 * #1381 — `POST /api/v1/workspaces/{workspaceId}/customer-erasures`. Hand-typed
 * off the generated `paths` entry, like everything else in this file.
 */
export type CustomerErasureInput = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/customer-erasures"]["post"]["requestBody"]
>["content"]["application/json"];
export type CustomerErasure =
  paths["/api/v1/workspaces/{workspaceId}/customer-erasures"]["post"]["responses"][200]["content"]["application/json"]["data"];

// #489 — PROFILE membership administration, nested under the workspace. Session
// bearers only: `manage:members` has no API-key scope at all, so a key answers
// 403 on every one of these.
export type ProfileInvitationsListResponse =
  paths["/api/v1/workspaces/{workspaceId}/profiles/{profileId}/invitations"]["get"]["responses"][200]["content"]["application/json"];
export type ProfileInvitationCreateBody = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/profiles/{profileId}/invitations"]["post"]["requestBody"]
>["content"]["application/json"];
export type ProfileInvitationCreateResponse =
  paths["/api/v1/workspaces/{workspaceId}/profiles/{profileId}/invitations"]["post"]["responses"][201]["content"]["application/json"];
export type ProfileInvitationDeleteResponse =
  paths["/api/v1/workspaces/{workspaceId}/profiles/{profileId}/invitations/{invitationId}"]["delete"]["responses"][200]["content"]["application/json"];
export type ProfileMemberUpdateBody = NonNullable<
  paths["/api/v1/workspaces/{workspaceId}/profiles/{profileId}/members/{membershipId}"]["patch"]["requestBody"]
>["content"]["application/json"];
export type ProfileMemberUpdateResponse =
  paths["/api/v1/workspaces/{workspaceId}/profiles/{profileId}/members/{membershipId}"]["patch"]["responses"][200]["content"]["application/json"];
export type ProfileMemberRemoveResponse =
  paths["/api/v1/workspaces/{workspaceId}/profiles/{profileId}/members/{membershipId}"]["delete"]["responses"][200]["content"]["application/json"];


export class WorkspacesResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Create a new workspace and become its owner. Session bearers (and MCP
   * user tokens, #1084) only; an API key has no workspace to be scoped to
   * and cannot call this. Pairs with `client.profile.create({ workspace_id,
   * name })` to add a profile to it, and
   * `POST /api/v1/workspaces/{id}/api-keys` to mint a key.
   */
  async create(input: CreateWorkspaceInput, options: WriteExtras = {}): Promise<CreatedWorkspace> {
    const res = await this.http.request<{ data: CreatedWorkspace }>({
      method: "POST",
      path: "/api/v1/workspaces",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }


  /**
   * Archive a workspace — **owner only, and terminal: there is no un-archive.**
   *
   * "Delete" here means ARCHIVE, and the response says so. A workspace that has
   * ever exported holds `conversion_exports` rows that a database trigger
   * refuses to let any path erase (they are the record of what Atribu
   * transmitted on a customer's behalf), so this call stamps `archived_at`,
   * removes every membership, revokes pending invitations, archives every
   * profile and purges their non-audit data, revokes the workspace's API keys
   * and pauses its webhook subscriptions. What survived is in
   * `counts.retained_*`.
   *
   * **Idempotent.** The first call returns `archived: true`; every later one
   * returns `archived: false` with the ORIGINAL `archived_at`. Both are 200.
   *
   * Session bearers and MCP user tokens with the `workspaces:write` grant. An
   * `atb_live_` API key cannot call it. A member who is not an owner gets 403;
   * a non-member gets 404, the same answer an unknown id gets.
   */
  async archive(workspaceId: string, options: ReadExtras = {}): Promise<ArchivedWorkspace> {
    const res = await this.http.request<{ data: ArchivedWorkspace }>({
      method: "DELETE",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}`,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Erase one person's personal data from this workspace — **owner or admin
   * only, and terminal: there is no un-erase.**
   *
   * Provider-agnostic: GoHighLevel, Stripe, MercadoPago, Shopify, WhatsApp or
   * the browser tracker. It empties the identifying columns and deletes the
   * identifier rows across every store that holds the person's data, and stamps
   * `redacted_at`. It does NOT delete the customer row — its id is what keeps
   * your conversions, outcome events and attribution touchpoints whole, so
   * revenue history and attribution totals are unchanged.
   *
   * `conversion_exports` rows survive by design: they are the record of what
   * Atribu transmitted to an ad platform on your behalf. The raw personal
   * fields inside their payloads are stripped and the hashes that were actually
   * sent remain; a not-yet-sent export for this person is marked `skipped`.
   *
   * Supply whichever selector you hold — `customer_profile_id`, `email`,
   * `phone`, or `identifier_type` + `identifier_value`. At least one is
   * required and all matching is EXACT, because an over-match here would erase
   * somebody who did not ask.
   *
   * **Idempotent.** A repeat returns `erased: false` with `already_redacted`
   * counting what was already done, and keeps the ORIGINAL `redacted_at`.
   *
   * Session bearers and MCP user tokens with the `workspaces:write` grant. An
   * `atb_live_` API key cannot call it — a key names one profile and no person,
   * and this operation's audit row has to name a person.
   */
  async eraseCustomer(
    workspaceId: string,
    input: CustomerErasureInput,
    options: WriteExtras = {},
  ): Promise<CustomerErasure> {
    const res = await this.http.request<{ data: CustomerErasure }>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/customer-erasures`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Every workspace the signed-in user holds an ACTIVE membership in, with
   * their role in each, the workspace's unarchived profile count and active
   * member count, its `default_timezone`, and the `28d` attention counters.
   *
   * `brief` is NULLABLE and the two falsy-looking answers are different:
   * the ZERO row means nothing needs attention, `null` means the counters
   * could not be computed. Do not draw `null` as calm — it is nullable
   * precisely so this cold-boot read still answers when the creative-scoring
   * pipeline does not.
   *
   * `default_timezone` is the WORKSPACE's zone, not the caller's browser zone;
   * every date boundary on the surfaces behind a workspace uses it.
   *
   * A user with no memberships gets an empty list, not an error — there is
   * nothing here to be unauthorized for.
   */
  async list(options: ReadExtras = {}): Promise<WorkspacesResponse> {
    return this.http.request<WorkspacesResponse>({
      method: "GET",
      path: "/api/v1/workspaces",
      signal: options.signal,
    });
  }

  /**
   * The workspace's best-performing ads, across every profile the caller can
   * open.
   *
   * **Three distinct measures per ad; present them separately.**
   * `composite_score` (0–100) is a transparent rule blend of within-cohort
   * percentiles. `top_performer_likelihood` (0–1) is a PROBABILITY — a
   * likelihood, not a guarantee, and never ROAS. `attributed_revenue`/`roas` is
   * real cash Atribu attributed, present when `truth_grade === "attributed"`.
   * `meta_reported_conversions` is a fourth thing again: Meta's OWN last-click
   * count, never folded into `truth_grade`.
   *
   * Read `primary_outcome_kind` before choosing what to show. A lead-gen
   * workspace's headline is `pipeline` (attributed leads +
   * `attributed_pipeline_value`, a projection that is never in ROAS), a
   * WhatsApp one's is `messaging` — sorting either by ROAS ranks a column of
   * nulls. `outcome_kinds` filters on it.
   *
   * `window` is a rolling lookback (`7d` | `14d` | `28d` | `lifetime`), not a
   * date range: scores exist only for those four.
   *
   * Each row also carries five nested groups — `identity` (external ids,
   * creative copy, the delivery days and the attribution model the
   * `attributed_*` legs were credited under), `metrics` (`delivery` / `video` /
   * `messaging` / `outcomes`), `score` (within-cohort `pct_*` percentiles and
   * empirical-Bayes `smoothed_*` estimates), `creative` and `forecast`. Read
   * `metrics.delivery.days_active` before dividing by the window: a `28d` row on
   * an ad that ran six days is not a 28-day average.
   *
   * `include: "internals"` is DELIBERATELY NOT DOCUMENTED AS A CONTRACT. It
   * attaches an unstable `internals` block (today `composite_score_breakdown`)
   * that Atribu's own console draws one drawer panel from; it is honoured for
   * session credentials only, silently omitted otherwise, and its shape may
   * change or disappear in any release. The generated type is `unknown` so
   * nothing can harden around it — do not build against it.
   */
  async topPerformers(
    workspaceId: string,
    options: WorkspaceTopPerformersOptions = {},
  ): Promise<WorkspaceTopPerformersResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspaceTopPerformersResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/top-performers`,
      query,
      signal,
    });
  }

  /**
   * Which creative patterns beat the workspace baseline — and, in
   * `gap_profile_ids`, which profiles are not running them.
   *
   * `lift_vs_baseline` is an ASSOCIATION, which every row says in
   * `confidence_note`. Render it with `roas_ci_low`/`roas_ci_high`: the point
   * estimate alone is a claim the sample does not support.
   */
  async creativePatterns(
    workspaceId: string,
    options: WorkspaceCreativePatternsOptions = {},
  ): Promise<WorkspaceCreativePatternsResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspaceCreativePatternsResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/creative-patterns`,
      query,
      signal,
    });
  }

  /**
   * The profiles the signed-in user may open in this workspace, ordered by
   * name — the profile switcher's list.
   *
   * The cold-boot companion to `client.profile.list()`, which answers the same
   * question but only once a profile is already in context. Both return the
   * same rows.
   */
  async profiles(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceProfilesListResponse> {
    return this.http.request<WorkspaceProfilesListResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/profiles`,
      signal: options.signal,
    });
  }

  /**
   * Recorded changes to the workspace's classification settings (#647) — who
   * edited the channel rules or the conversion definitions, and when.
   *
   * `entity` is REQUIRED and is an allowlist (`channel_rules` |
   * `conversion_definitions`), not a passthrough over the audit log: that table
   * also records integration connects and member invites, and serving it by
   * arbitrary event type would make an analytics credential a tenant-activity
   * feed.
   *
   * Rows are narrowed to the profiles the caller can actually open. Pass
   * `profile_id` to scope to one — a profile you cannot open answers 404,
   * identical to one that does not exist.
   *
   * `metadata` is OPAQUE and versionless: whatever the writing path recorded.
   * Render what you recognise, ignore the rest, and never compute from it.
   */
  async audit(
    workspaceId: string,
    options: WorkspaceAuditOptions,
  ): Promise<WorkspaceAuditResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspaceAuditResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/audit`,
      query,
      signal,
    });
  }

  /**
   * Who read this workspace's customer/visitor PII, when, through which
   * route, and what the response status was (#452, Phase 4 scaffolding) — a
   * row for every request whose route required `customers:read` or
   * `visitors:read`, durable for 365 days by default.
   *
   * **Operators only, by construction.** This method's own gate is
   * `customers:read`, the workspace-grain PII scope — a `guest` session never
   * holds it, so there is no separate "is this caller an operator" check
   * anywhere. Calling it is itself a `customers:read` request and writes its
   * own row into the log it just read.
   *
   * `date_from`/`date_to` are REQUIRED, like every other date-ranged read on
   * this surface. `cursor` is the opaque `pagination.cursor` from the
   * previous page.
   */
  async piiAccessLog(
    workspaceId: string,
    options: WorkspacePiiAccessLogOptions,
  ): Promise<WorkspacePiiAccessLogResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspacePiiAccessLogResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/pii-access-log`,
      query,
      signal,
    });
  }

  /**
   * What each of this workspace's API keys did over a date range (#452, Phase
   * 4): request count, the 4xx/5xx split, p50/p95 latency, and when it was
   * last seen. `api_key_id` joins to {@link apiKeys}.
   *
   * **Workspace-scoped, so a session bearer or an MCP user token only.** An
   * API key names exactly one profile and has no workspace to read across; it
   * receives 403 `insufficient_scope`.
   *
   * Counts are within one flush window of live (the writer batches, at most 5
   * seconds or 200 requests behind); the 4xx/5xx SHARE is unaffected by that
   * lag. Rows older than 90 days are pruned, so a window reaching further back
   * returns only what is still retained.
   *
   * A key with NO requests in the window is ABSENT from the array — it is not
   * returned as a row of zeros, which a reader would take as a measured fact
   * rather than the absence of one.
   */
  async apiUsage(
    workspaceId: string,
    options: WorkspaceApiUsageOptions,
  ): Promise<WorkspaceApiUsageResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspaceApiUsageResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/api-usage`,
      query,
      signal,
    });
  }

  /**
   * The workspace's current subscription — plan tier, status, billing
   * period, trial dates and cancellation state. `null` when the workspace
   * has no `subscriptions` row at all (a real state, not an error).
   *
   * Deliberately narrower than the full row: no Stripe/Shopify ids, no
   * entitlement amounts. No `cancel_at` — that field lives on the LIVE
   * Stripe `Subscription` object, never persisted; only the stored
   * `cancel_at_period_end` boolean is served here.
   */
  async subscription(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceSubscription> {
    const res = await this.http.request<{ data: WorkspaceSubscription }>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/subscription`,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Start a plan upgrade (#1052) — mint a Stripe Checkout hand-off.
   *
   * Your agent cannot enter a card. This returns a hand-off: give `url` to a
   * person, poll `client.handoffs.get(id)` until `status` leaves `pending`, and
   * read `result.subscription` for the tier they landed on.
   *
   * ```ts
   * const { data: sub } = await client.workspaces.subscription(workspaceId);
   * const [next] = sub?.upgrade_available ?? [];
   * if (next) {
   *   const handoff = await client.workspaces.startCheckout(workspaceId, { plan: next.plan });
   *   console.log("send them:", handoff.url);
   * }
   * ```
   *
   * Already on that plan? The hand-off comes back `completed` with
   * `result.no_change` and no URL — never a second subscription.
   *
   * Session bearers only, like every method here, and the caller must be a
   * workspace `owner` or `admin`. `interval` defaults to `monthly`.
   */
  async startCheckout(
    workspaceId: string,
    input: CheckoutSessionInput,
    options: WriteExtras = {},
  ): Promise<CheckoutHandoff> {
    const res = await this.http.request<{ data: CheckoutHandoff }>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/checkout-session`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  // -------------------------------------------------------------------------
  // #659 — the rest of the Top Performers workspace surface.
  //
  // Four of these publish a win rate against the workspace's own baseline with
  // a Wilson interval. `lift_vs_workspace` alone is a point estimate presented
  // as a fact; render it with `confidence_interval_low`/`_high` or not at all.
  // None of them is a causal claim — the only causal evidence here is
  // `experiments()`.
  // -------------------------------------------------------------------------

  /**
   * Which single creative-dimension VALUES win — hook type, narrative arc, CTA
   * and so on, one dimension at a time.
   *
   * The companion to {@link creativePatterns}, which mines COMBINATIONS and
   * tells you which profiles are not running them. Two questions, two shapes.
   *
   * `min_cluster_size` (3–50, default 3) is an honesty floor, not a page size.
   */
  async creativePatternDimensions(
    workspaceId: string,
    options: WorkspacePatternDimensionsOptions = {},
  ): Promise<WorkspacePatternDimensionsResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspacePatternDimensionsResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/creative-patterns/dimensions`,
      query,
      signal,
    });
  }

  /**
   * The workspace's creative archetypes — learned clusters over the creative
   * fingerprint — and how often each one wins.
   *
   * `archetype_cluster` is an opaque id: stable inside a workspace, meaningless
   * across one. Never compare it between workspaces.
   */
  async creativeArchetypes(
    workspaceId: string,
    options: WorkspaceArchetypesOptions = {},
  ): Promise<WorkspaceArchetypesResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspaceArchetypesResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/creative-archetypes`,
      query,
      signal,
    });
  }

  /**
   * The Meta lift and split studies running across the workspace's profiles —
   * the only rows on this surface backed by an EXPERIMENT rather than a score.
   *
   * `primary_incremental_conversions` is a conversion COUNT, not money and not
   * a percentage. It takes no `window`: an experiment has its own start and end.
   */
  async experiments(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceExperimentsResponse> {
    return this.http.request<WorkspaceExperimentsResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/experiments`,
      signal: options.signal,
    });
  }

  /**
   * What each profile should test next (`gaps`), and how much scored creative
   * it has to judge on (`coverage`).
   *
   * Read both. An empty `gaps` means either "already doing everything that
   * works" or "four scored ads and nothing can be concluded", and only
   * `coverage[].scored_ad_count` separates them.
   *
   * `test_key` is the stable id to record a decision against — never the
   * exemplar ad, which rotates on every rebuild.
   */
  async testRoadmap(
    workspaceId: string,
    options: WorkspaceTestRoadmapOptions = {},
  ): Promise<WorkspaceTestRoadmapResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspaceTestRoadmapResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/test-roadmap`,
      query,
      signal,
    });
  }

  /**
   * The six counters that summarise the leaderboard for a window.
   *
   * None is a lifetime total — they describe the same window
   * {@link topPerformers} reads. `lift_backed_count` is the honest one to read
   * first: how many ads have an experiment behind them rather than a score.
   */
  async topPerformersBrief(
    workspaceId: string,
    options: WorkspaceTopPerformersBriefOptions = {},
  ): Promise<WorkspaceTopPerformersBriefResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspaceTopPerformersBriefResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/top-performers/brief`,
      query,
      signal,
    });
  }

  /**
   * How much is new on each console tab since the CALLER last opened it.
   *
   * Counted against your own watermark, so two members of one workspace get
   * different numbers. Do not cache it under a key that names only the
   * workspace.
   */
  async tabCounts(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceTabCountsResponse> {
    return this.http.request<WorkspaceTabCountsResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/tab-counts`,
      signal: options.signal,
    });
  }

  /**
   * Month-to-date spend and outcomes against budget, per profile.
   *
   * `pace_spend_pct` is spend over the budget PRO-RATED to the day of the
   * month, so `1.0` is on track — not percent-of-budget-spent. It is NULL when
   * no budget is set, which is not zero. Amounts are in each row's own
   * `currency` and must not be summed across profiles without converting.
   */
  async pacing(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspacePacingResponse> {
    return this.http.request<WorkspacePacingResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/pacing`,
      signal: options.signal,
    });
  }

  /**
   * Open recommendations across every profile the caller can open.
   *
   * `expected_impact_dollars` is a FORECAST; `realized_impact_dollars` is what
   * happened, and `calibration_error` is the gap. Both are null until measured
   * — which is not zero, and showing only the forecast reports a hope as a
   * result.
   *
   * Applying or dismissing one is `client.recommendations.*` — profile-scoped,
   * because a money move names one profile.
   */
  async recommendations(
    workspaceId: string,
    options: WorkspaceRecommendationsOptions = {},
  ): Promise<WorkspaceRecommendationsResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspaceRecommendationsResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/recommendations`,
      query,
      signal,
    });
  }

  /**
   * One Replicate run — a winning ad adapted into a draft for another profile.
   *
   * A run names TWO profiles and you must be able to open both. A run that does
   * not exist, one in another workspace and one whose profiles you cannot open
   * all answer the same 404.
   */
  async replicateRun(
    workspaceId: string,
    runId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceReplicateRunResponse> {
    return this.http.request<WorkspaceReplicateRunResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/replicate-runs/${encodeURIComponent(runId)}`,
      signal: options.signal,
    });
  }

  /**
   * Bind a finished Replicate run to the creative session it was handed to.
   *
   * **Idempotent on the run, not on an `Idempotency-Key`.** A run carries at
   * most one session, so a second call answers with the FIRST one and
   * `already_handed_off: true` — your id was NOT stored. Open the id in the
   * response, never the one you sent.
   *
   * A compare-and-set from `review`: a run whose status moved underneath you (a
   * cancel racing the send) answers 409 rather than coming back as `sent`.
   */
  async recordReplicateHandoff(
    workspaceId: string,
    runId: string,
    body: ReplicateHandoffInput,
    options: ReadExtras = {},
  ): Promise<ReplicateHandoffResponse> {
    return this.http.request<ReplicateHandoffResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/replicate-runs/${encodeURIComponent(runId)}/handoff`,
      body,
      signal: options.signal,
    });
  }

  /**
   * Dismiss or draft one testing-roadmap gap.
   *
   * Keyed on `(profile_id, score_window, test_key)`, never on the exemplar ad.
   * Idempotent: repeating a decision is a 200, not a 409, and a `drafted` may
   * flip a prior `dismissed` without erasing its columns.
   */
  async recordCreativeTestDecision(
    workspaceId: string,
    body: CreativeTestDecisionInput,
    options: ReadExtras = {},
  ): Promise<CreativeTestDecisionResponse> {
    return this.http.request<CreativeTestDecisionResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/creative-tests/decisions`,
      body,
      signal: options.signal,
    });
  }

  /**
   * Record an ad's promotion to a Meta experiment, before handing the operator
   * off to Ads Manager.
   *
   * Idempotent on `(profile_id, ad_external_id)` — re-posting returns the same
   * `promotion_id`. **Check `advanced_beyond_write`**: when it is `true` the
   * promotion had already moved to `live`/`linked` and YOUR DRAFT WAS NOT
   * STORED, so telling the operator it was saved would be false.
   */
  async recordExperimentPromotion(
    workspaceId: string,
    body: ExperimentPromotionInput,
    options: ReadExtras = {},
  ): Promise<ExperimentPromotionResponse> {
    return this.http.request<ExperimentPromotionResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/experiment-promotions`,
      body,
      signal: options.signal,
    });
  }

  /**
   * A profile's `atb_live_` API keys, prefix only — never the secret.
   * `profileId` must be one the caller can open in this workspace; one they
   * cannot answers 404, identical to a profile that does not exist.
   */
  async apiKeys(
    workspaceId: string,
    profileId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceApiKeysResponse> {
    return this.http.request<WorkspaceApiKeysResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/api-keys`,
      query: { profile_id: profileId },
      signal: options.signal,
    });
  }

  /**
   * Mint a new API key for a profile in this workspace. Capped at 10 active
   * keys per profile. Returns the plaintext `atb_live_...` secret exactly
   * ONCE — save it now, it will not be shown again.
   */
  async createApiKey(
    workspaceId: string,
    body: CreateApiKeyBody,
    options: ReadExtras = {},
  ): Promise<CreateApiKeyResponse> {
    return this.http.request<CreateApiKeyResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/api-keys`,
      body,
      signal: options.signal,
    });
  }

  /**
   * Revoke one API key. Must belong to a profile in THIS workspace, one the
   * caller can open; either mismatch answers 404.
   */
  async revokeApiKey(
    workspaceId: string,
    id: string,
    options: ReadExtras = {},
  ): Promise<RevokeApiKeyResponse> {
    return this.http.request<RevokeApiKeyResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/api-keys/${encodeURIComponent(id)}/revoke`,
      signal: options.signal,
    });
  }

  /**
   * Rotate one API key. Same plaintext-once contract as create. The OLD key
   * keeps working for a 48h grace window.
   */
  async rotateApiKey(
    workspaceId: string,
    id: string,
    options: ReadExtras = {},
  ): Promise<RotateApiKeyResponse> {
    return this.http.request<RotateApiKeyResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/api-keys/${encodeURIComponent(id)}/rotate`,
      signal: options.signal,
    });
  }

  /**
   * The workspace's MCP data-plane settings — the PII default and the
   * write-back enablement for agent (MCP) tools acting on this workspace.
   * Workspace grain, like {@link audit} beside it: an agency's own
   * operational settings, not a dealer's marketing.
   */
  async mcpSettings(workspaceId: string, options: ReadExtras = {}): Promise<McpSettings> {
    const res = await this.http.request<{ data: McpSettings }>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp-settings`,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Update the workspace's MCP data-plane settings. **Owner/admin only** — an
   * analyst may read {@link mcpSettings} but not change it, refused beyond
   * the route's own scope gate. A partial update: an omitted key is left as
   * it was.
   */
  async updateMcpSettings(
    workspaceId: string,
    input: McpSettingsUpdateInput,
    options: WriteExtras = {},
  ): Promise<McpSettings> {
    const res = await this.http.request<{ data: McpSettings }>({
      method: "PUT",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp-settings`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * The last 50 MCP write-back tool operations for this workspace (e.g.
   * `send_meta_conversions`), newest first. Preview rows are informational;
   * confirm rows reached the ad platform.
   */
  async mcpWritebackAudits(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<McpWritebackAudit[]> {
    const res = await this.http.request<{ data: McpWritebackAudit[] }>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp-writeback-audits`,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * The workspace Reports hub: one row per reachable client profile — its
   * schedule status, cadence, recipient count, last/next send and most recent
   * generated report — plus the workspace's report templates for a bulk-apply
   * picker. Bundled into one call because the hub page needs both on first
   * paint.
   */
  async reportsHub(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceReportsHubResponse> {
    return this.http.request<WorkspaceReportsHubResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/reports/hub`,
      signal: options.signal,
    });
  }

  /**
   * Apply a partial schedule patch across many profiles — cadence, hour,
   * model, language, template. `recipient_emails` cannot be sent here and is
   * rejected outright; recipients are per-client.
   *
   * **Per-profile results, never a transaction.** A 200 means "the batch
   * ran" — read `data.results` for what actually happened to each profile.
   */
  async applyReportSchedulesBulk(
    workspaceId: string,
    body: ReportSchedulesBulkInput,
    options: ReadExtras = {},
  ): Promise<ReportSchedulesBulkResponse> {
    return this.http.request<ReportSchedulesBulkResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/reports/schedules/bulk`,
      body,
      signal: options.signal,
    });
  }

  /**
   * Generate — and, when `send_email` is true, mail — one report per profile,
   * each under THAT profile's own attribution model and to THAT profile's own
   * schedule recipients. Never a model or recipient list shared across the
   * batch.
   *
   * **Per-profile results, never a transaction.** `generated: true, emailed:
   * false` with an `error` is a normal outcome — the report exists, only the
   * email had nowhere to go or failed to send.
   */
  async bulkGenerateReports(
    workspaceId: string,
    body: ReportBulkGenerateInput,
    options: ReadExtras = {},
  ): Promise<ReportBulkGenerateResponse> {
    return this.http.request<ReportBulkGenerateResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/reports/bulk-generate`,
      body,
      signal: options.signal,
    });
  }
  // -------------------------------------------------------------------------
  // #489 — branding, invitations, sender-domain, shared snapshots, connected
  // apps, compliance overview. EVERY WRITE HERE is operator-only (owner/admin)
  // on top of the session-bearer requirement every method on this resource
  // carries — an analyst or guest reads the same resources fine but gets
  // `403 forbidden` on a write, distinct from the `403 insufficient_scope` a
  // key gets.
  // -------------------------------------------------------------------------

  /** The workspace's report/email branding: accent color, footer visibility, sender identity, logo. */
  async branding(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceBrandingResponse> {
    return this.http.request<WorkspaceBrandingResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/branding`,
      signal: options.signal,
    });
  }

  /**
   * Update non-logo branding fields. `hideAtribuFooter: true` and a non-empty
   * `emailFromName`/`emailReplyTo` both require an Agency/Enterprise plan and
   * throw `plan_upgrade_required` (402) otherwise.
   */
  async updateBranding(
    workspaceId: string,
    body: WorkspaceBrandingUpdateBody,
    options: ReadExtras = {},
  ): Promise<WorkspaceBrandingUpdateResponse> {
    return this.http.request<WorkspaceBrandingUpdateResponse>({
      method: "PUT",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/branding`,
      body,
      signal: options.signal,
    });
  }

  /** Upload the workspace's logo (PNG/JPEG/SVG, up to 2MB). */
  async uploadBrandingLogo(
    workspaceId: string,
    logo: Blob,
    options: ReadExtras = {},
  ): Promise<WorkspaceBrandingLogoResponse> {
    const form = new FormData();
    form.append("logo", logo);
    return this.http.request<WorkspaceBrandingLogoResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/branding/logo`,
      multipart: form,
      signal: options.signal,
    });
  }

  /** Remove the workspace's logo. */
  async deleteBrandingLogo(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceBrandingLogoDeleteResponse> {
    return this.http.request<WorkspaceBrandingLogoDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/branding/logo`,
      signal: options.signal,
    });
  }

  /** Pending workspace-level invitations. Operator-only, unlike most reads here. */
  async invitations(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceInvitationsListResponse> {
    return this.http.request<WorkspaceInvitationsListResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/invitations`,
      signal: options.signal,
    });
  }

  /**
   * Invite someone to the workspace. `email_sent` in the response says whether
   * the mailer actually fired — the row is created either way, so a re-invite
   * within the 60s cooldown still succeeds without a second email.
   */
  async createInvitation(
    workspaceId: string,
    body: WorkspaceInvitationCreateBody,
    options: ReadExtras = {},
  ): Promise<WorkspaceInvitationCreateResponse> {
    return this.http.request<WorkspaceInvitationCreateResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/invitations`,
      body,
      signal: options.signal,
    });
  }

  /** Revoke a pending invitation. No-ops (still 200) if never accepted; 404 if already accepted. */
  async deleteInvitation(
    workspaceId: string,
    invitationId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceInvitationDeleteResponse> {
    return this.http.request<WorkspaceInvitationDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitationId)}`,
      signal: options.signal,
    });
  }

  /**
   * The workspace's verified sending domain, if any. `entitled` says whether
   * the PLAN allows one at all; `can_manage` says whether THIS caller may
   * write to it.
   */
  async senderDomain(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceSenderDomainResponse> {
    return this.http.request<WorkspaceSenderDomainResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/sender-domain`,
      signal: options.signal,
    });
  }

  /** Register a sending domain. Requires an Agency/Enterprise plan. */
  async createSenderDomain(
    workspaceId: string,
    body: WorkspaceSenderDomainCreateBody,
    options: ReadExtras = {},
  ): Promise<WorkspaceSenderDomainCreateResponse> {
    return this.http.request<WorkspaceSenderDomainCreateResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/sender-domain`,
      body,
      signal: options.signal,
    });
  }

  /** Remove the workspace's sending domain. Idempotent: already-gone is a 200. */
  async deleteSenderDomain(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceSenderDomainDeleteResponse> {
    return this.http.request<WorkspaceSenderDomainDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/sender-domain`,
      signal: options.signal,
    });
  }

  /** Re-check DNS verification for the sending domain. Cheap to poll while waiting on DNS propagation. */
  async verifySenderDomain(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceSenderDomainVerifyResponse> {
    return this.http.request<WorkspaceSenderDomainVerifyResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/sender-domain/verify`,
      signal: options.signal,
    });
  }

  /** The workspace's shared Top Performers snapshot links, newest first. */
  async snapshots(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceSnapshotsListResponse> {
    return this.http.request<WorkspaceSnapshotsListResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/snapshots`,
      signal: options.signal,
    });
  }

  /**
   * Capture a shareable, public, expiring Top Performers snapshot. The
   * underlying data is queried fresh at capture time, never trusted from the
   * client.
   */
  async createSnapshot(
    workspaceId: string,
    body: WorkspaceSnapshotCreateBody,
    options: ReadExtras = {},
  ): Promise<WorkspaceSnapshotCreateResponse> {
    return this.http.request<WorkspaceSnapshotCreateResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/snapshots`,
      body,
      signal: options.signal,
    });
  }

  /** Revoke a shared snapshot link early. Any operator may revoke any member's link. */
  async deleteSnapshot(
    workspaceId: string,
    snapshotId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceSnapshotDeleteResponse> {
    return this.http.request<WorkspaceSnapshotDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/snapshots/${encodeURIComponent(snapshotId)}`,
      signal: options.signal,
    });
  }

  /**
   * OAuth-app authorizations across the workspace's profiles — "what has
   * access to my data." `kind: "connection"` is one messaging connection;
   * `kind: "profile"` is an analytics delegation over the whole Profile.
   */
  async connectedApps(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceConnectedAppsListResponse> {
    return this.http.request<WorkspaceConnectedAppsListResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/connected-apps`,
      signal: options.signal,
    });
  }

  /**
   * Revoke an OAuth-app authorization. Cascades to every key minted under it
   * — `keys_revoked` in the response counts them.
   */
  async revokeConnectedApp(
    workspaceId: string,
    authorizationId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceConnectedAppRevokeResponse> {
    return this.http.request<WorkspaceConnectedAppRevokeResponse>({
      method: "DELETE",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/connected-apps/${encodeURIComponent(authorizationId)}`,
      signal: options.signal,
    });
  }

  /** Per-profile privacy/HIPAA compliance posture, plus the workspace's own `is_healthcare_agency` flag. */
  async complianceOverview(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceComplianceOverviewResponse> {
    return this.http.request<WorkspaceComplianceOverviewResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/compliance-overview`,
      signal: options.signal,
    });
  }

  /** Set whether this workspace is a healthcare agency (drives the HIPAA-specific gates elsewhere). */
  async updateComplianceOverview(
    workspaceId: string,
    body: WorkspaceComplianceOverviewUpdateBody,
    options: ReadExtras = {},
  ): Promise<WorkspaceComplianceOverviewUpdateResponse> {
    return this.http.request<WorkspaceComplianceOverviewUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/compliance-overview`,
      body,
      signal: options.signal,
    });
  }

  /**
   * The ISO-4217 code this workspace's CROSS-PROFILE money totals are reported
   * in (#1162). Per-profile amounts keep `profiles.currency` and are never
   * converted.
   */
  async reportingCurrency(
    workspaceId: string,
    options: ReadExtras = {},
  ): Promise<WorkspaceReportingCurrencyResponse> {
    return this.http.request<WorkspaceReportingCurrencyResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/reporting-currency`,
      signal: options.signal,
    });
  }

  /** Set it. Operator-only; re-denominates every workspace-grain total on the next read. */
  async updateReportingCurrency(
    workspaceId: string,
    body: WorkspaceReportingCurrencyUpdateBody,
    options: ReadExtras = {},
  ): Promise<WorkspaceReportingCurrencyUpdateResponse> {
    return this.http.request<WorkspaceReportingCurrencyUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/reporting-currency`,
      body,
      signal: options.signal,
    });
  }

  // -------------------------------------------------------------------------
  // #489 — PROFILE membership administration. Nested under the workspace
  // because the console's workspace-settings page administers members across
  // every profile at once, and because `manage:members` has no key scope: a
  // workspace-scoped route is what makes "no API key may mint a colleague" a
  // structural fact rather than a check someone has to remember.
  //
  // Every one of these needs `manage:members` on THAT profile — inherited by a
  // workspace owner/admin/analyst, explicit for anyone else.
  // -------------------------------------------------------------------------

  /** Pending invitations to one profile (neither accepted, revoked, nor expired). */
  async profileInvitations(
    workspaceId: string,
    profileId: string,
    options: ReadExtras = {},
  ): Promise<ProfileInvitationsListResponse> {
    return this.http.request<ProfileInvitationsListResponse>({
      method: "GET",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/profiles/${encodeURIComponent(profileId)}/invitations`,
      signal: options.signal,
    });
  }

  /**
   * Invite someone to one profile. `email_sent` says whether the mailer
   * actually fired — the row and its accept link exist either way, so a
   * re-invite inside the 60s cooldown still succeeds without a second email.
   * Omit `permissions` to grant the role's default bundle.
   */
  async createProfileInvitation(
    workspaceId: string,
    profileId: string,
    body: ProfileInvitationCreateBody,
    options: ReadExtras = {},
  ): Promise<ProfileInvitationCreateResponse> {
    return this.http.request<ProfileInvitationCreateResponse>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/profiles/${encodeURIComponent(profileId)}/invitations`,
      body,
      signal: options.signal,
    });
  }

  /** Revoke a pending profile invitation. 404 if it never existed or was already accepted. */
  async deleteProfileInvitation(
    workspaceId: string,
    profileId: string,
    invitationId: string,
    options: ReadExtras = {},
  ): Promise<ProfileInvitationDeleteResponse> {
    return this.http.request<ProfileInvitationDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/profiles/${encodeURIComponent(profileId)}/invitations/${encodeURIComponent(invitationId)}`,
      signal: options.signal,
    });
  }

  /**
   * Change a profile member's role or permissions. Changing the role WITHOUT
   * naming permissions resets them to that role's default bundle.
   */
  async updateProfileMember(
    workspaceId: string,
    profileId: string,
    membershipId: string,
    body: ProfileMemberUpdateBody,
    options: ReadExtras = {},
  ): Promise<ProfileMemberUpdateResponse> {
    return this.http.request<ProfileMemberUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/profiles/${encodeURIComponent(profileId)}/members/${encodeURIComponent(membershipId)}`,
      body,
      signal: options.signal,
    });
  }

  /** Remove someone from a profile. The membership row is kept, with `status: "removed"`. */
  async removeProfileMember(
    workspaceId: string,
    profileId: string,
    membershipId: string,
    options: ReadExtras = {},
  ): Promise<ProfileMemberRemoveResponse> {
    return this.http.request<ProfileMemberRemoveResponse>({
      method: "DELETE",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/profiles/${encodeURIComponent(profileId)}/members/${encodeURIComponent(membershipId)}`,
      signal: options.signal,
    });
  }

  /**
   * Open Stripe's Customer Portal — change the card, switch or cancel the plan,
   * download invoices (#489).
   *
   * **Give the URL to the person who asked for it, or to nobody.** It is not a
   * hand-off: unlike {@link startCheckout}, there is nothing to poll and nothing
   * to settle, and a portal link is account management on a subscription its
   * holder may not own. It is also where a DOWNGRADE happens — opening a second
   * checkout for a lower tier would double-bill, which is why
   * `upgrade_available` lists only what is above the current plan.
   *
   * Session bearers only, `owner`/`admin` only, like {@link startCheckout}. A
   * workspace billed through Shopify is a 403 and a workspace with no Stripe
   * customer is a 409 — start a subscription first.
   */
  async billingPortalSession(
    workspaceId: string,
    options: WriteExtras = {},
  ): Promise<BillingPortalSession> {
    const res = await this.http.request<{ data: BillingPortalSession }>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/billing-portal-session`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Choose a plan on a workspace that arrived through the Shopify App Store
   * (#489) — the Shopify counterpart to {@link startCheckout}.
   *
   * **Paid tiers are sold by Shopify.** Managed Pricing rejects
   * `appSubscriptionCreate`, so `growth` and `agency` both resolve to the same
   * absolute link to Shopify's hosted plan page; the merchant confirms the tier
   * there and a webhook mirrors it back. `free` is the one that decides
   * anything here — it writes a $0 subscription and answers with a relative app
   * path.
   *
   * A workspace on the Stripe rail is a 403: use {@link startCheckout} instead.
   */
  async selectShopifyPlan(
    workspaceId: string,
    input: ShopifyPlanSelectionInput,
    options: WriteExtras = {},
  ): Promise<ShopifyPlanSelection> {
    const res = await this.http.request<{ data: ShopifyPlanSelection }>({
      method: "POST",
      path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/shopify-plan-selection`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }
}

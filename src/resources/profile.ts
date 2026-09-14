/**
 * The caller's rendering context (#587) — who am I acting for, and what may I
 * do here? Responses are the full envelope (`./common.ts`).
 *
 * See {@link ProfileResource.creativeAnalysisBackfill} for "Analyze history".
 *
 * Read {@link ProfileResource.get} before rendering anything numeric: every
 * money field this API returns is denominated in the profile's `currency` and
 * every date range is bucketed by day in its `timezone`, so a client that
 * assumes USD/UTC will silently mis-label a Chilean dealer's revenue.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

export type ProfileContextResponse =
  paths["/api/v1/profile"]["get"]["responses"][200]["content"]["application/json"];

type WorkspaceProfilesQuery = NonNullable<
  paths["/api/v1/profiles"]["get"]["parameters"]["query"]
>;
export type WorkspaceProfilesResponse =
  paths["/api/v1/profiles"]["get"]["responses"][200]["content"]["application/json"];
export type WorkspaceProfilesOptions = WorkspaceProfilesQuery & ReadExtras;

export type ProfileFreshnessResponse =
  paths["/api/v1/profile/freshness"]["get"]["responses"][200]["content"]["application/json"];

/** #1054 — the golden-path checklist. See {@link ProfileResource.readiness}. */
export type ProfileReadinessResponse =
  paths["/api/v1/profile/readiness"]["get"]["responses"][200]["content"]["application/json"];

/** #489 — the attribution recompute pair. See {@link ProfileResource.recompute}. */
export type RecomputeInput = NonNullable<
  paths["/api/v1/profile/recompute"]["post"]["requestBody"]
>["content"]["application/json"];
export type RecomputeResponse =
  paths["/api/v1/profile/recompute"]["post"]["responses"][202]["content"]["application/json"];
export type RecomputeStatusResponse =
  paths["/api/v1/profile/recompute-status"]["get"]["responses"][200]["content"]["application/json"];

/**
 * #1056 — the full onboarding draft `GET`/`PATCH /api/v1/profile` carry.
 * `null` before its first write; never present on {@link WorkspaceProfilesResponse}
 * rows (see {@link OnboardingSummary}).
 */
export type OnboardingState = NonNullable<ProfileContextResponse["data"]["onboarding_state"]>;

/** The reduced onboarding summary both `GET /api/v1/profile` and `GET /api/v1/profiles`
 * carry — `{completed, current_step, updated_at}`. */
export type OnboardingSummary = ProfileContextResponse["data"]["onboarding"];

/**
 * #488 (PR-2) — `POST /api/v1/profiles`'s SESSION branch: an owner/admin
 * adds a profile to a workspace they already run. Hand-typed rather than
 * derived from `paths[...]`, because the generated request/response types at
 * this path are a UNION with the app-credential shape (`external_ref` /
 * `email` / …) — this route is the one place in the whole surface where two
 * genuinely different operations share a URL, and a generated Extract<> over
 * that union would be more fragile than restating the session shape once,
 * here, matching `SessionProvisionProfileRequest` /
 * `SessionProvisionedProfile` in the OpenAPI registry field-for-field.
 */

// ---------------------------------------------------------------------------
// #489 — the profile-ADMINISTRATION surface, folded off the internal
// `/api/workspaces/{w}/profiles/{p}/**` routes the console used to call.
// ---------------------------------------------------------------------------

export type ProfileBrandingResponse =
  paths["/api/v1/profile/branding"]["get"]["responses"][200]["content"]["application/json"];
export type ProfileBrandingUpdateBody = NonNullable<
  paths["/api/v1/profile/branding"]["put"]["requestBody"]
>["content"]["application/json"];
export type ProfileBrandingUpdateResponse =
  paths["/api/v1/profile/branding"]["put"]["responses"][200]["content"]["application/json"];
export type ProfileBrandingLogoResponse =
  paths["/api/v1/profile/branding/logo"]["post"]["responses"][200]["content"]["application/json"];
export type ProfileBrandingLogoDeleteResponse =
  paths["/api/v1/profile/branding/logo"]["delete"]["responses"][200]["content"]["application/json"];

export type ProfilePacingResponse =
  paths["/api/v1/profile/pacing"]["get"]["responses"][200]["content"]["application/json"];
export type ProfilePacingUpdateBody = NonNullable<
  paths["/api/v1/profile/pacing"]["put"]["requestBody"]
>["content"]["application/json"];

export type ProfileBioPageResponse =
  paths["/api/v1/profile/bio-page"]["get"]["responses"][200]["content"]["application/json"];
export type ProfileBioPageUpdateBody = NonNullable<
  paths["/api/v1/profile/bio-page"]["put"]["requestBody"]
>["content"]["application/json"];
export type BioSlugAvailabilityResponse =
  paths["/api/v1/profile/bio-page/slug-availability"]["get"]["responses"][200]["content"]["application/json"];

export type ShareDestinationResponse =
  paths["/api/v1/profile/share-destination"]["get"]["responses"][200]["content"]["application/json"];
export type ShareDestinationUpdateResponse =
  paths["/api/v1/profile/share-destination"]["put"]["responses"][200]["content"]["application/json"];

export type RecomputeFxResponse =
  paths["/api/v1/profile/recompute-fx"]["post"]["responses"][200]["content"]["application/json"];

/** #489 (#1233) — "Analyze history". See {@link ProfileResource.creativeAnalysisBackfill}. */
export type CreativeAnalysisBackfillInput = NonNullable<
  paths["/api/v1/profile/creative-analysis/backfill"]["post"]["requestBody"]
>["content"]["application/json"];
export type CreativeAnalysisBackfillResponse =
  paths["/api/v1/profile/creative-analysis/backfill"]["post"]["responses"][200]["content"]["application/json"];
export type CreativeAnalysisBackfillPlan = CreativeAnalysisBackfillResponse["data"];

/** #489 — the profile knowledge-base document surface. See {@link ProfileResource.knowledgeBaseDocuments}. */
export type KnowledgeBaseDocumentsListResponse =
  paths["/api/v1/profile/knowledge-base/documents"]["get"]["responses"][200]["content"]["application/json"];
export type KnowledgeBaseDocumentListItem = KnowledgeBaseDocumentsListResponse["data"]["items"][number];

export type KnowledgeBaseDocumentCreateInput = NonNullable<
  paths["/api/v1/profile/knowledge-base/documents"]["post"]["requestBody"]
>["content"]["application/json"];
export type KnowledgeBaseDocumentCreateResponse =
  paths["/api/v1/profile/knowledge-base/documents"]["post"]["responses"][202]["content"]["application/json"];
export type KnowledgeBaseDocumentQueuedResult = KnowledgeBaseDocumentCreateResponse["data"];

export type KnowledgeBaseDocumentGetResponse =
  paths["/api/v1/profile/knowledge-base/documents/{documentId}"]["get"]["responses"][200]["content"]["application/json"];
export type KnowledgeBaseDocumentDetail = KnowledgeBaseDocumentGetResponse["data"];

export type KnowledgeBaseDocumentUpdateInput = NonNullable<
  paths["/api/v1/profile/knowledge-base/documents/{documentId}"]["patch"]["requestBody"]
>["content"]["application/json"];
export type KnowledgeBaseDocumentUpdateResponse =
  paths["/api/v1/profile/knowledge-base/documents/{documentId}"]["patch"]["responses"][200]["content"]["application/json"];
export type KnowledgeBaseDocumentUpdateResult = KnowledgeBaseDocumentUpdateResponse["data"];

export type KnowledgeBaseDocumentDeleteResponse =
  paths["/api/v1/profile/knowledge-base/documents/{documentId}"]["delete"]["responses"][200]["content"]["application/json"];
export type KnowledgeBaseDocumentDeleteResult = KnowledgeBaseDocumentDeleteResponse["data"];

export interface CreateProfileInput {
  /** The EXISTING workspace to add this profile to. You must hold an ACTIVE owner or admin membership on it. */
  workspace_id: string;
  name: string;
  timezone?: string;
  currency?: string;
  site_domain?: string;
}
export interface CreatedProfile {
  profile_id: string;
  workspace_id: string;
  created: true;
}

/**
 * #1069 — the seeded demo profile. Derived from the generated paths rather than
 * hand-typed (unlike {@link CreateProfileInput} above, whose URL carries a
 * union of two operations): `/api/v1/profiles/demo` is one operation with one
 * request and one response shape.
 */
export type CreateDemoProfileInput = NonNullable<
  paths["/api/v1/profiles/demo"]["post"]["requestBody"]
>["content"]["application/json"];
export type DemoProfileCreatedResponse =
  paths["/api/v1/profiles/demo"]["post"]["responses"][201]["content"]["application/json"];
export type DemoProfileDeletedResponse =
  paths["/api/v1/profiles/demo"]["delete"]["responses"][200]["content"]["application/json"];

// #488 — the settings/onboarding batch: the last profile-scoped writes/reads
// the console made straight off the browser Supabase client.

export type ProfileUpdateInput = NonNullable<
  paths["/api/v1/profile"]["patch"]["requestBody"]
>["content"]["application/json"];

export type OutcomeDefinitionRow =
  paths["/api/v1/outcome-definitions/{id}"]["patch"]["responses"][200]["content"]["application/json"]["data"];
export type OutcomeDefinitionUpdateInput = NonNullable<
  paths["/api/v1/outcome-definitions/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];

export type OutcomeDefinitionsReplaceInput = NonNullable<
  paths["/api/v1/profile/outcome-definitions"]["put"]["requestBody"]
>["content"]["application/json"];
export type OutcomeDefinitionsReplaceResult =
  paths["/api/v1/profile/outcome-definitions"]["put"]["responses"][200]["content"]["application/json"]["data"];

export type ProfileAuditEventType =
  ProfileAuditEventInput["event_type"];
type ProfileAuditEventInput = NonNullable<
  paths["/api/v1/profile/audit-events"]["post"]["requestBody"]
>["content"]["application/json"];

export type DarkMessagingSpend =
  paths["/api/v1/profile/dark-messaging-spend"]["get"]["responses"][200]["content"]["application/json"]["data"];

// #1060 — the attribution WINDOW settings: `click_window_days`,
// `view_window_hours`, `first_touch_window_days`, `cash_window_days`. A
// narrow slice of `profile_attribution_settings` — session timeout/mode,
// enrichment toggles and the export switches on that same row have no v1
// surface yet and stay behind the console's internal tracking-settings page.

export type AttributionSettings =
  paths["/api/v1/profile/attribution-settings"]["get"]["responses"][200]["content"]["application/json"]["data"];

export type AttributionSettingsUpdateInput = NonNullable<
  paths["/api/v1/profile/attribution-settings"]["patch"]["requestBody"]
>["content"]["application/json"];

export type AttributionSettingsUpdateResult =
  paths["/api/v1/profile/attribution-settings"]["patch"]["responses"][200]["content"]["application/json"]["data"];

export class ProfileResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * The authenticated profile's identity and settings, the caller's own
   * permissions on it, and the workspace's plan tier.
   *
   * Contains no secrets, no billing amounts and no credit balances. The
   * `permissions` array is ADVISORY — it describes what a UI should offer; the
   * enforced gate is the credential's scopes, which the API checks at the route
   * and again at the read.
   */
  async get(options: ReadExtras = {}): Promise<ProfileContextResponse> {
    return this.http.request<ProfileContextResponse>({
      method: "GET",
      path: "/api/v1/profile",
      signal: options.signal,
    });
  }

  /**
   * Every profile in the workspace that the SIGNED-IN USER may open — the
   * profile switcher's list, ordered by name.
   *
   * **Session bearers only.** An `atb_live_` key is minted for exactly one
   * profile — the credential IS the scope — so it has no set of profiles to
   * enumerate, and this method answers `403 insufficient_scope` for one. Call
   * it with a client constructed from an `accessToken` (a Supabase session
   * token); use {@link get} when you hold an API key.
   *
   * `workspace_id` is an optional ASSERTION, not a selector: the workspace is
   * fixed by the profile you authenticated against, and naming a different one
   * answers 404 rather than reading it.
   */
  /**
   * When this profile's attribution data was last recomputed (#588) — the
   * number behind a "data updated" badge, and the one to poll between
   * recomputes.
   *
   * Separate from {@link get} because it is a property of the profile's DATA
   * rather than of its settings: it moves several times a day, while everything
   * `get` returns changes when a human changes it. Folding it in would make the
   * context read uncacheable.
   *
   * It is the ATTRIBUTION PROJECTION's watermark, not an ad connector's last
   * sync; the two routinely differ by hours and users read "last updated" as
   * *their data's* freshness. `recomputed_at` is null when the profile has never
   * been projected, which `status: "pending"` says in words.
   */
  async freshness(options: ReadExtras = {}): Promise<ProfileFreshnessResponse> {
    return this.http.request<ProfileFreshnessResponse>({
      method: "GET",
      path: "/api/v1/profile/freshness",
      signal: options.signal,
    });
  }

  /**
   * What this profile still needs before ads, outcomes and attribution work
   * end to end — an ordered checklist, and for each unfinished step the one
   * next action (#1054).
   *
   * Every step is DERIVED at read time from connections, tracker events,
   * conversion definitions, attribution windows, export destinations and rules,
   * the DPA, the plan and the profile's entitlement. Nothing is stored, so a
   * connection that broke an hour ago reads `degraded` on the next call.
   *
   * `wizard_finished` is NOT the answer to this question. It is the legacy
   * `onboarding_completed` boolean — a person pressed Finish in Atribu's own
   * console — and every wizard step is skippable, so it is reported beside the
   * steps rather than folded into them.
   *
   * A step's `next` is either `{method, path}` — a call you can make now with
   * the credential you hold — or `{handoff_kind}`, a class of action only a
   * person can take (`connect`, `sign_dpa`, `checkout`, `contact_support`).
   * Read `summary.next_step` for the single thing to do now.
   *
   * A profile provisioned through a partner application answers
   * `attribution_enabled: "blocked"` rather than an empty checklist: Atribu's
   * pipeline is a deliberate no-op for it, so every other step can be finished
   * and still produce no attributed conversions.
   */
  async readiness(options: ReadExtras = {}): Promise<ProfileReadinessResponse> {
    return this.http.request<ProfileReadinessResponse>({
      method: "GET",
      path: "/api/v1/profile/readiness",
      signal: options.signal,
    });
  }

  /**
   * Re-run sessions → paths → attribution for this profile (#489).
   *
   * Queue this after anything that changes who gets credit: a customer merge,
   * a channel rule, an attribution-window change. Omit `model` — the default —
   * to recompute every model, which is almost always what you want.
   *
   * **Asynchronous.** The 202 means queued; poll {@link recomputeStatus}.
   *
   * It runs ahead of the background freshness cadence, because someone is
   * waiting on it. `jobs_enqueued: 0` means it coalesced onto a run already
   * queued — success, not a refusal.
   */
  async recompute(
    input: RecomputeInput = {},
    options: WriteExtras = {},
  ): Promise<RecomputeResponse> {
    return this.http.request<RecomputeResponse>({
      method: "POST",
      path: "/api/v1/profile/recompute",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Is a recompute still outstanding (#489)?
   *
   * One boolean, cheap enough to poll. While `pending` is true the numbers
   * every read returns are the PREVIOUS run's — correct, but not yet reflecting
   * whatever you just changed.
   */
  async recomputeStatus(options: ReadExtras = {}): Promise<RecomputeStatusResponse> {
    return this.http.request<RecomputeStatusResponse>({
      method: "GET",
      path: "/api/v1/profile/recompute-status",
      signal: options.signal,
    });
  }

  async list(options: WorkspaceProfilesOptions = {}): Promise<WorkspaceProfilesResponse> {
    const { signal, ...query } = options;
    return this.http.request<WorkspaceProfilesResponse>({
      method: "GET",
      path: "/api/v1/profiles",
      query,
      signal,
    });
  }

  /**
   * Add a profile to a workspace you already run (#488, PR-2). **Session
   * bearers only**, and you must hold an ACTIVE owner or admin membership on
   * `workspace_id` — an analyst, a guest, or a workspace you do not belong to
   * all answer 404, identical to a workspace that does not exist.
   *
   * Unlike a consumer app's `POST /api/v1/profiles` (Basic auth), this
   * creates NEITHER a new workspace NOR a shadow user — both are already
   * real. Always creates (no idempotency key on this branch), so it always
   * resolves `created: true` on success.
   */
  async create(input: CreateProfileInput, options: WriteExtras = {}): Promise<CreatedProfile> {
    const res = await this.http.request<{ data: CreatedProfile }>({
      method: "POST",
      path: "/api/v1/profiles",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Create and seed this workspace's DEMO profile (#1069) — sixty days of one
   * fictional clinic's Meta traffic, run through the real attribution engine,
   * with a Meta CAPI destination that RECORDS what it would have sent instead
   * of sending it.
   *
   * It exists so a developer or an agent can exercise rules → attribution →
   * export before connecting a live Meta/GHL/Stripe account. Poll
   * `GET /api/v1/overview` after this resolves: the seed writes the pipeline's
   * INPUTS and enqueues an ordinary recompute, so the conversions and
   * attribution it reports are what the engine WILL produce, asynchronously.
   *
   * A workspace holds at most one demo profile, and this is idempotent: a
   * second call re-seeds the existing one. **Session bearers and user tokens
   * only**, and you must hold an ACTIVE owner or admin membership on
   * `workspaceId` — an analyst, a guest, or a workspace you do not belong to
   * all answer 404.
   *
   * A demo profile does not consume an `active_profiles` plan seat, and
   * creating one is not gated by that limit.
   */
  async createDemo(
    workspaceId: string,
    input: CreateDemoProfileInput = {},
    options: WriteExtras = {},
  ): Promise<DemoProfileCreatedResponse> {
    return this.http.request<DemoProfileCreatedResponse>({
      method: "POST",
      path: "/api/v1/profiles/demo",
      query: { workspace_id: workspaceId },
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Delete this workspace's demo profile (#1069).
   *
   * **Archive + purge, not a row removal (#1170).** The seeded data — touches,
   * outcome events, conversions, attribution, spend, the ad structure, the
   * customers, the definitions — is deleted and the profile is archived.
   * `conversion_exports` is audit evidence that a database trigger refuses to
   * let any user-facing path erase, so those rows and the few their foreign
   * keys pin in place stay attached to the archived profile;
   * `data.retained_audit_rows` counts them and `data.archived` is always true
   * alongside `data.deleted`.
   *
   * The archived profile is gone from every read, and the workspace's demo slot
   * is released — {@link createDemo} succeeds immediately afterwards.
   *
   * The `is_demo` predicate lives inside the statement, so it can never reach a
   * real profile. Deleting nothing resolves with `data.deleted: false` rather
   * than throwing: a workspace with no demo profile is the state you asked for.
   *
   * Rejects with `demo_purge_blocked` (409) if a trigger refuses part of the
   * purge — the profile is archived regardless and a retry changes nothing.
   */
  async deleteDemo(
    workspaceId: string,
    options: WriteExtras = {},
  ): Promise<DemoProfileDeletedResponse> {
    return this.http.request<DemoProfileDeletedResponse>({
      method: "DELETE",
      path: "/api/v1/profiles/demo",
      query: { workspace_id: workspaceId },
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * A PARTIAL update of `mode` / `default_attribution_model` / `currency` /
   * `onboarding_completed` — an omitted key is left untouched. Returns the
   * same {@link ProfileContextResponse} envelope {@link get} does, so a caller
   * can render off either with no reshaping.
   *
   * Setting `onboarding_completed: true` stamps a `PROFILE_ONBOARDING_COMPLETED`
   * audit row server-side, in the same call — `onboarding_skip_reason:
   * "reviewer_skip"` records the reviewer-skip path rather than a normal
   * finish. Neither field triggers an attribution recompute: nothing here
   * redefines which historical rows are attributed to what, unlike a
   * channel-rule or conversion-definition change.
   */
  async update(
    input: ProfileUpdateInput,
    options: WriteExtras = {},
  ): Promise<ProfileContextResponse> {
    return this.http.request<ProfileContextResponse>({
      method: "PATCH",
      path: "/api/v1/profile",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Update one `outcome_definitions` row's `event_key` — the settings page's
   * inline editor. `outcome_definitions` are CRM pipeline-stage LABELS, not
   * `conversion_definitions` (see `GET /api/v1/goals/definitions`'s
   * description for that distinction). A definition belonging to another
   * profile answers 404, identical to one that does not exist.
   */
  async updateOutcomeDefinition(
    id: string,
    input: OutcomeDefinitionUpdateInput,
    options: WriteExtras = {},
  ): Promise<OutcomeDefinitionRow> {
    const res = await this.http.request<{ data: OutcomeDefinitionRow }>({
      method: "PATCH",
      path: `/api/v1/outcome-definitions/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Delete-then-insert one WHOLE family (`pipeline_stage` | `order_event`) of
   * this profile's `outcome_definitions`, replacing it with the given list —
   * the shape onboarding's finish/skip step and the settings page's
   * mode-switch seeding both use. There is no per-row create; pass the
   * family's full desired list, including rows that are not changing.
   * `sort_order` is assigned from array position. An empty `definitions` array
   * clears the family.
   *
   * NOT run inside a database transaction: a failure between the delete and
   * the insert can leave the family empty.
   */
  async replaceOutcomeDefinitions(
    input: OutcomeDefinitionsReplaceInput,
    options: WriteExtras = {},
  ): Promise<OutcomeDefinitionsReplaceResult> {
    const res = await this.http.request<{ data: OutcomeDefinitionsReplaceResult }>({
      method: "PUT",
      path: "/api/v1/profile/outcome-definitions",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Stamp one allowlisted UI-interaction audit event. NOT a general
   * audit-log proxy — `event_type` must be one of a closed allowlist (today
   * the dark-messaging-spend banner's two interaction stamps, which have no
   * accompanying data write of their own). The actor is always the
   * authenticated session; it can never be named in the body.
   */
  async recordAuditEvent(
    eventType: ProfileAuditEventType,
    metadata?: Record<string, unknown>,
    options: WriteExtras = {},
  ): Promise<void> {
    await this.http.request<unknown>({
      method: "POST",
      path: "/api/v1/profile/audit-events",
      body: { event_type: eventType, ...(metadata ? { metadata } : {}) },
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Estimate revenue at risk from unattributed Instagram DM conversations —
   * `null` when there is nothing to flag (already connected, below the
   * 50-unobserved-conversation threshold, or nothing to report). Backs
   * `DarkMessagingSpendBanner`; `estimated_unattributed_revenue` is an exact
   * decimal STRING (ADR 0018).
   */
  async darkMessagingSpend(options: ReadExtras = {}): Promise<DarkMessagingSpend> {
    const res = await this.http.request<{ data: DarkMessagingSpend }>({
      method: "GET",
      path: "/api/v1/profile/dark-messaging-spend",
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * The profile's attribution WINDOWS: how many days/hours after a touch a
   * conversion still counts as attributed to it. Returns the table's own
   * defaults (30 / 24 / 90 / null) when the profile has no
   * `profile_attribution_settings` row yet.
   */
  async attributionSettings(options: ReadExtras = {}): Promise<AttributionSettings> {
    const res = await this.http.request<{ data: AttributionSettings }>({
      method: "GET",
      path: "/api/v1/profile/attribution-settings",
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * A PARTIAL update of the four attribution windows — an omitted key is left
   * untouched. `cash_window_days: null` clears the override so cash
   * conversions fall back to the normal windows.
   *
   * A window change redefines which touches attach to which conversion
   * RETROACTIVELY, so every successful call enqueues ONE full-profile
   * attribution replay, reported on the result as `replay_queued` (+
   * `replay_error` when it could not be queued) — the change itself is always
   * saved even when the replay could not be.
   */
  async updateAttributionSettings(
    input: AttributionSettingsUpdateInput,
    options: WriteExtras = {},
  ): Promise<AttributionSettingsUpdateResult> {
    const res = await this.http.request<{ data: AttributionSettingsUpdateResult }>({
      method: "PATCH",
      path: "/api/v1/profile/attribution-settings",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  // -------------------------------------------------------------------------
  // #489 — profile administration. Every WRITE here needs `attribution:write`
  // (what `manage:settings` grants a session), so a view-only guest gets
  // `403 insufficient_scope` — tighter than the internal routes these replace,
  // which gated writes on profile membership alone.
  // -------------------------------------------------------------------------

  /** The profile's report/email branding: accent color, footer visibility, workspace fallback, logo. */
  async branding(options: ReadExtras = {}): Promise<ProfileBrandingResponse> {
    return this.http.request<ProfileBrandingResponse>({
      method: "GET",
      path: "/api/v1/profile/branding",
      signal: options.signal,
    });
  }

  /**
   * Update non-logo branding fields. `hideAtribuFooter: true` requires an
   * Agency/Enterprise plan and throws `plan_upgrade_required` (402) otherwise.
   */
  async updateBranding(
    body: ProfileBrandingUpdateBody,
    options: ReadExtras = {},
  ): Promise<ProfileBrandingUpdateResponse> {
    return this.http.request<ProfileBrandingUpdateResponse>({
      method: "PUT",
      path: "/api/v1/profile/branding",
      body,
      signal: options.signal,
    });
  }

  /** Upload the profile's logo (PNG/JPEG/SVG, up to 2MB). Also clears `useWorkspaceBranding`. */
  async uploadBrandingLogo(
    logo: Blob,
    options: ReadExtras = {},
  ): Promise<ProfileBrandingLogoResponse> {
    const form = new FormData();
    form.append("logo", logo);
    return this.http.request<ProfileBrandingLogoResponse>({
      method: "POST",
      path: "/api/v1/profile/branding/logo",
      multipart: form,
      signal: options.signal,
    });
  }

  /** Remove the profile's logo. */
  async deleteBrandingLogo(
    options: ReadExtras = {},
  ): Promise<ProfileBrandingLogoDeleteResponse> {
    return this.http.request<ProfileBrandingLogoDeleteResponse>({
      method: "DELETE",
      path: "/api/v1/profile/branding/logo",
      signal: options.signal,
    });
  }

  /** The monthly budget + outcome goal behind the spend-pacing card. */
  async pacing(options: ReadExtras = {}): Promise<ProfilePacingResponse> {
    return this.http.request<ProfilePacingResponse>({
      method: "GET",
      path: "/api/v1/profile/pacing",
      signal: options.signal,
    });
  }

  /** Set the monthly budget / outcome goal. An omitted key is left alone; `null` clears it. */
  async updatePacing(
    body: ProfilePacingUpdateBody,
    options: ReadExtras = {},
  ): Promise<ProfilePacingResponse> {
    return this.http.request<ProfilePacingResponse>({
      method: "PUT",
      path: "/api/v1/profile/pacing",
      body,
      signal: options.signal,
    });
  }

  /** The hosted bio page's handle + rendering config. */
  async bioPage(options: ReadExtras = {}): Promise<ProfileBioPageResponse> {
    return this.http.request<ProfileBioPageResponse>({
      method: "GET",
      path: "/api/v1/profile/bio-page",
      signal: options.signal,
    });
  }

  /** Set the bio handle + config. `slug: null` clears the handle; a taken handle throws 409. */
  async updateBioPage(
    body: ProfileBioPageUpdateBody,
    options: ReadExtras = {},
  ): Promise<ProfileBioPageResponse> {
    return this.http.request<ProfileBioPageResponse>({
      method: "PUT",
      path: "/api/v1/profile/bio-page",
      body,
      signal: options.signal,
    });
  }

  /** Whether a bio handle is free. Answers `available` for a handle this profile already owns. */
  async bioSlugAvailability(
    candidate: string,
    options: ReadExtras = {},
  ): Promise<BioSlugAvailabilityResponse> {
    return this.http.request<BioSlugAvailabilityResponse>({
      method: "GET",
      path: "/api/v1/profile/bio-page/slug-availability",
      query: { candidate },
      signal: options.signal,
    });
  }

  /** The default destination organic share links redirect to. */
  async shareDestination(options: ReadExtras = {}): Promise<ShareDestinationResponse> {
    return this.http.request<ShareDestinationResponse>({
      method: "GET",
      path: "/api/v1/profile/share-destination",
      signal: options.signal,
    });
  }

  /**
   * Set or clear (`null`) the default share destination. Setting one also
   * backfills short links reserved before it existed — `backfilled` counts them.
   */
  async updateShareDestination(
    destinationUrl: string | null,
    options: ReadExtras = {},
  ): Promise<ShareDestinationUpdateResponse> {
    return this.http.request<ShareDestinationUpdateResponse>({
      method: "PUT",
      path: "/api/v1/profile/share-destination",
      body: { destination_url: destinationUrl },
      signal: options.signal,
    });
  }

  /**
   * Re-normalise conversions after changing the profile's currency: resets the
   * mismatched ones to `pending` and enqueues an interactive recompute.
   */
  async recomputeFx(options: ReadExtras = {}): Promise<RecomputeFxResponse> {
    return this.http.request<RecomputeFxResponse>({
      method: "POST",
      path: "/api/v1/profile/recompute-fx",
      signal: options.signal,
    });
  }

  /**
   * "Analyze history" (#1233) — mark ads with spend in `lookback_days` that
   * have no current-version creative analysis; the daily background pass
   * drains them inside the workspace's `creative_analysis` allowance. This
   * never runs a model itself. `dry_run` defaults to `true` — pass `false` to
   * commit the plan. Requires the `creatives:write` scope.
   */
  async creativeAnalysisBackfill(
    input: CreativeAnalysisBackfillInput,
    options: WriteExtras = {},
  ): Promise<CreativeAnalysisBackfillPlan> {
    const res = await this.http.request<CreativeAnalysisBackfillResponse>({
      method: "POST",
      path: "/api/v1/profile/creative-analysis/backfill",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  // -------------------------------------------------------------------------
  // #489 — the profile knowledge-base document surface: an AI-searchable
  // reference library a profile's assistants can draw on. Metadata-only list;
  // `getKnowledgeBaseDocument` for the full `content`.
  // -------------------------------------------------------------------------

  /** The profile's knowledge-base documents (metadata only), newest-updated first. */
  async knowledgeBaseDocuments(
    options: ReadExtras = {},
  ): Promise<KnowledgeBaseDocumentListItem[]> {
    const res = await this.http.request<KnowledgeBaseDocumentsListResponse>({
      method: "GET",
      path: "/api/v1/profile/knowledge-base/documents",
      signal: options.signal,
    });
    return res.data.items;
  }

  /**
   * Add a document. Returns `202 queued` immediately — chunking, an LLM
   * contextualise pass and embedding all happen asynchronously; poll
   * {@link getKnowledgeBaseDocument} and watch `processing_status`.
   * `content` is raw text, not a file — extract it client-side first.
   */
  async createKnowledgeBaseDocument(
    input: KnowledgeBaseDocumentCreateInput,
    options: WriteExtras = {},
  ): Promise<KnowledgeBaseDocumentQueuedResult> {
    const res = await this.http.request<KnowledgeBaseDocumentCreateResponse>({
      method: "POST",
      path: "/api/v1/profile/knowledge-base/documents",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /** One document, including its full `content`. */
  async getKnowledgeBaseDocument(
    documentId: string,
    options: ReadExtras = {},
  ): Promise<KnowledgeBaseDocumentDetail> {
    const res = await this.http.request<KnowledgeBaseDocumentGetResponse>({
      method: "GET",
      path: `/api/v1/profile/knowledge-base/documents/${encodeURIComponent(documentId)}`,
      signal: options.signal,
    });
    return res.data;
  }

  /**
   * Edit a document. Every field is optional. Sending `content` different
   * from the stored value re-queues chunking + embedding.
   */
  async updateKnowledgeBaseDocument(
    documentId: string,
    input: KnowledgeBaseDocumentUpdateInput,
    options: WriteExtras = {},
  ): Promise<KnowledgeBaseDocumentUpdateResult> {
    const res = await this.http.request<KnowledgeBaseDocumentUpdateResponse>({
      method: "PATCH",
      path: `/api/v1/profile/knowledge-base/documents/${encodeURIComponent(documentId)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }

  /** Soft-delete a document (excludes it from search). */
  async deleteKnowledgeBaseDocument(
    documentId: string,
    options: WriteExtras = {},
  ): Promise<KnowledgeBaseDocumentDeleteResult> {
    const res = await this.http.request<KnowledgeBaseDocumentDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/profile/knowledge-base/documents/${encodeURIComponent(documentId)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return res.data;
  }
}

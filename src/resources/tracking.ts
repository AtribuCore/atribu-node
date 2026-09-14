/**
 * Tracking installation (#590) — the write keys the browser tracker
 * authenticates with, and the three installer renderings of them. Responses are
 * the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

export type TrackingKeysResponse =
  paths["/api/v1/tracking/keys"]["get"]["responses"][200]["content"]["application/json"];

export type IssueTrackingKeyInput = NonNullable<
  paths["/api/v1/tracking/keys"]["post"]["requestBody"]
>["content"]["application/json"];
export type IssueTrackingKeyResponse =
  paths["/api/v1/tracking/keys"]["post"]["responses"][200]["content"]["application/json"];

type SnippetQuery = NonNullable<
  paths["/api/v1/tracking/snippet"]["get"]["parameters"]["query"]
>;
export type TrackingSnippetResponse =
  paths["/api/v1/tracking/snippet"]["get"]["responses"][200]["content"]["application/json"];
export type TrackingSnippetOptions = SnippetQuery & ReadExtras;

type GtmQuery = NonNullable<
  paths["/api/v1/tracking/installers/gtm"]["get"]["parameters"]["query"]
>;
export type GtmInstallerResponse =
  paths["/api/v1/tracking/installers/gtm"]["get"]["responses"][200]["content"]["application/json"];
export type GtmInstallerOptions = GtmQuery & ReadExtras;

type ShopifyPixelQuery = NonNullable<
  paths["/api/v1/tracking/installers/shopify-pixel"]["get"]["parameters"]["query"]
>;
export type ShopifyPixelInstallerResponse =
  paths["/api/v1/tracking/installers/shopify-pixel"]["get"]["responses"][200]["content"]["application/json"];
export type ShopifyPixelInstallerOptions = ShopifyPixelQuery & ReadExtras;

// ---------------------------------------------------------------------------
// #489 — the tracking CONSOLE surface, folded off `src/app/api/tracking/**`.
// ---------------------------------------------------------------------------

export type TrackingSettingsResponse =
  paths["/api/v1/tracking/settings"]["get"]["responses"][200]["content"]["application/json"];
export type TrackingSettingsUpdateInput = NonNullable<
  paths["/api/v1/tracking/settings"]["patch"]["requestBody"]
>["content"]["application/json"];
export type TrackingSettingsUpdateResponse =
  paths["/api/v1/tracking/settings"]["patch"]["responses"][200]["content"]["application/json"];

export type TrackingOriginResponse =
  paths["/api/v1/tracking/origin"]["get"]["responses"][200]["content"]["application/json"];

type TrackingEventsQuery = NonNullable<
  paths["/api/v1/tracking/events"]["get"]["parameters"]["query"]
>;
export type TrackingEventsOptions = TrackingEventsQuery & ReadExtras;
export type TrackingEventsResponse =
  paths["/api/v1/tracking/events"]["get"]["responses"][200]["content"]["application/json"];

export type TrackingReplayStatusResponse =
  paths["/api/v1/tracking/replay-status"]["get"]["responses"][200]["content"]["application/json"];

export type TrackingVerificationResponse =
  paths["/api/v1/tracking/verification"]["get"]["responses"][200]["content"]["application/json"];
export type StartTrackingVerificationResponse =
  paths["/api/v1/tracking/verification"]["post"]["responses"][201]["content"]["application/json"];

export type RevokeTrackingKeyResponse =
  paths["/api/v1/tracking/keys/{id}"]["delete"]["responses"][200]["content"]["application/json"];

type TrackingOpsQuery = NonNullable<paths["/api/v1/tracking/ops"]["get"]["parameters"]["query"]>;
export type TrackingOpsOptions = TrackingOpsQuery & ReadExtras;
export type TrackingOpsResponse =
  paths["/api/v1/tracking/ops"]["get"]["responses"][200]["content"]["application/json"];

type TrackingQualityQuery = NonNullable<
  paths["/api/v1/tracking/quality"]["get"]["parameters"]["query"]
>;
export type TrackingQualityOptions = TrackingQualityQuery & ReadExtras;
export type TrackingQualityResponse =
  paths["/api/v1/tracking/quality"]["get"]["responses"][200]["content"]["application/json"];

export type TrackingDomainsResponse =
  paths["/api/v1/tracking/custom-domains"]["get"]["responses"][200]["content"]["application/json"];
export type CreateTrackingDomainInput = NonNullable<
  paths["/api/v1/tracking/custom-domains"]["post"]["requestBody"]
>["content"]["application/json"];
export type CreateTrackingDomainResponse =
  paths["/api/v1/tracking/custom-domains"]["post"]["responses"][201]["content"]["application/json"];
export type VerifyTrackingDomainResponse =
  paths["/api/v1/tracking/custom-domains/{id}/verify"]["post"]["responses"][200]["content"]["application/json"];
export type DeleteTrackingDomainResponse =
  paths["/api/v1/tracking/custom-domains/{id}"]["delete"]["responses"][200]["content"]["application/json"];

export class TrackingResource {
  constructor(private readonly http: HttpClientLike) {}

  /** The profile's tracking write keys. Secrets are never returned by the list. */
  async keys(options: ReadExtras = {}): Promise<TrackingKeysResponse> {
    return this.http.request<TrackingKeysResponse>({
      method: "GET",
      path: "/api/v1/tracking/keys",
      signal: options.signal,
    });
  }

  /**
   * Mint a tracking key. The plaintext key is in THIS response and nowhere
   * else — the API stores a hash — so a caller that drops it has to issue a new
   * one.
   */
  async issueKey(
    input: IssueTrackingKeyInput,
    options: WriteExtras = {},
  ): Promise<IssueTrackingKeyResponse> {
    return this.http.request<IssueTrackingKeyResponse>({
      method: "POST",
      path: "/api/v1/tracking/keys",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** The `<script>` snippet for a key + domain, ready to paste into a `<head>`. */
  async snippet(options: TrackingSnippetOptions = {}): Promise<TrackingSnippetResponse> {
    const { signal, ...query } = options;
    return this.http.request<TrackingSnippetResponse>({
      method: "GET",
      path: "/api/v1/tracking/snippet",
      query,
      signal,
    });
  }

  /** The same install as a Google Tag Manager container import. */
  async gtmInstaller(options: GtmInstallerOptions = {}): Promise<GtmInstallerResponse> {
    const { signal, ...query } = options;
    return this.http.request<GtmInstallerResponse>({
      method: "GET",
      path: "/api/v1/tracking/installers/gtm",
      query,
      signal,
    });
  }

  /** The same install as a Shopify Web Pixel extension. */
  async shopifyPixelInstaller(
    options: ShopifyPixelInstallerOptions = {},
  ): Promise<ShopifyPixelInstallerResponse> {
    const { signal, ...query } = options;
    return this.http.request<ShopifyPixelInstallerResponse>({
      method: "GET",
      path: "/api/v1/tracking/installers/shopify-pixel",
      query,
      signal,
    });
  }

  /**
   * Revoke one key. Refuses (400) on the profile's LAST active key — the
   * tracker authenticates with it, so revoking the only one takes the site
   * dark. Issue a replacement with `issueKey({ force_new: true })` first.
   */
  async revokeKey(
    keyId: string,
    options: WriteExtras = {},
  ): Promise<RevokeTrackingKeyResponse> {
    return this.http.request<RevokeTrackingKeyResponse>({
      method: "DELETE",
      path: `/api/v1/tracking/keys/${encodeURIComponent(keyId)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** How the tracker sessionises visits and what enrichment resolves. */
  async settings(options: ReadExtras = {}): Promise<TrackingSettingsResponse> {
    return this.http.request<TrackingSettingsResponse>({
      method: "GET",
      path: "/api/v1/tracking/settings",
      signal: options.signal,
    });
  }

  /**
   * Partial update. Every successful save enqueues one full-profile replay —
   * see `replay_queued` / `replay_error` on the response, which report rather
   * than throw.
   */
  async updateSettings(
    input: TrackingSettingsUpdateInput,
    options: WriteExtras = {},
  ): Promise<TrackingSettingsUpdateResponse> {
    return this.http.request<TrackingSettingsUpdateResponse>({
      method: "PATCH",
      path: "/api/v1/tracking/settings",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** The host this profile's tracker collects on. */
  async origin(options: ReadExtras = {}): Promise<TrackingOriginResponse> {
    return this.http.request<TrackingOriginResponse>({
      method: "GET",
      path: "/api/v1/tracking/origin",
      signal: options.signal,
    });
  }

  /** The raw enriched-event feed. Requires `visitors:read` — payloads carry PII. */
  async events(options: TrackingEventsOptions = {}): Promise<TrackingEventsResponse> {
    const { signal, ...query } = options;
    return this.http.request<TrackingEventsResponse>({
      method: "GET",
      path: "/api/v1/tracking/events",
      query,
      signal,
    });
  }

  /** The most recent attribution replay, or `data: null` when there has never been one. */
  async replayStatus(options: ReadExtras = {}): Promise<TrackingReplayStatusResponse> {
    return this.http.request<TrackingReplayStatusResponse>({
      method: "GET",
      path: "/api/v1/tracking/replay-status",
      signal: options.signal,
    });
  }

  /** The latest install-verification attempt, or `data: null`. */
  async verification(options: ReadExtras = {}): Promise<TrackingVerificationResponse> {
    return this.http.request<TrackingVerificationResponse>({
      method: "GET",
      path: "/api/v1/tracking/verification",
      signal: options.signal,
    });
  }

  /** Mint a 15-minute verification nonce to append as `?atb_verify=`. */
  async startVerification(
    options: WriteExtras = {},
  ): Promise<StartTrackingVerificationResponse> {
    return this.http.request<StartTrackingVerificationResponse>({
      method: "POST",
      path: "/api/v1/tracking/verification",
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** What ingestion and enrichment rejected or repaired over the window. */
  async ops(options: TrackingOpsOptions = {}): Promise<TrackingOpsResponse> {
    const { signal, ...query } = options;
    return this.http.request<TrackingOpsResponse>({
      method: "GET",
      path: "/api/v1/tracking/ops",
      query,
      signal,
    });
  }

  /** Is this profile's tracking healthy? */
  async quality(options: TrackingQualityOptions = {}): Promise<TrackingQualityResponse> {
    const { signal, ...query } = options;
    return this.http.request<TrackingQualityResponse>({
      method: "GET",
      path: "/api/v1/tracking/quality",
      query,
      signal,
    });
  }

  /** The profile's first-party tracking domains, and the CNAME they point at. */
  async domains(options: ReadExtras = {}): Promise<TrackingDomainsResponse> {
    return this.http.request<TrackingDomainsResponse>({
      method: "GET",
      path: "/api/v1/tracking/custom-domains",
      signal: options.signal,
    });
  }

  /**
   * Register a domain as `pending` and get the CNAME to create. Nothing
   * collects on it until {@link verifyDomain} confirms the DNS.
   */
  async createDomain(
    input: CreateTrackingDomainInput,
    options: WriteExtras = {},
  ): Promise<CreateTrackingDomainResponse> {
    return this.http.request<CreateTrackingDomainResponse>({
      method: "POST",
      path: "/api/v1/tracking/custom-domains",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Re-resolve the domain and store the verdict. `verified: false` is a 200. */
  async verifyDomain(
    domainId: string,
    options: WriteExtras = {},
  ): Promise<VerifyTrackingDomainResponse> {
    return this.http.request<VerifyTrackingDomainResponse>({
      method: "POST",
      path: `/api/v1/tracking/custom-domains/${encodeURIComponent(domainId)}/verify`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /** Remove a domain. Regenerate the snippet first — a deployed one keeps using it. */
  async deleteDomain(
    domainId: string,
    options: WriteExtras = {},
  ): Promise<DeleteTrackingDomainResponse> {
    return this.http.request<DeleteTrackingDomainResponse>({
      method: "DELETE",
      path: `/api/v1/tracking/custom-domains/${encodeURIComponent(domainId)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }
}

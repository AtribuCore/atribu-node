/**
 * Atribu error class hierarchy.
 *
 * Why typed errors: consumers need to branch on auth-failure vs rate-limit vs
 * server-error vs validation-error to decide whether to retry, refresh
 * credentials, or surface to the user. A single `Error` with a status code
 * forces every consumer to write the same `if (err.status === 401)` ladder.
 *
 * Why no automatic retries: the SDK derives a `retry` hint from status +
 * Retry-After + error code, but consumers' queue/job systems decide whether
 * to act on it. Auto-retry inside the SDK hides backpressure signals and
 * makes error budgets opaque.
 */

import type { RetryHint } from "./retry";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "insufficient_scope"
  | "not_found"
  | "invalid_parameter"
  | "invalid_request"
  | "validation_error"
  | "invalid_content"
  | "invalid_date_range"
  | "rate_limit_exceeded"
  | "connection_not_ready"
  | "provider_error"
  | "service_unavailable"
  | "internal_error"
  // #1653 — email send verdicts from the mailbox's provider.
  | "account_suspended"
  | "auth_revoked"
  | "mailbox_disabled"
  | "quota_exceeded"
  | "recipient_rejected"
  // The partner Ads operations (ad pause/resume, ad-set budget).
  | "meta_write_permission_missing"
  | "budget_change_out_of_bounds"
  | "adset_not_editable"
  // #1771 / #1770 — link tokens and partner erasure by customer_key.
  | "link_tokens_disabled"
  | "api_key_required"
  | "customer_not_found"
  | "account_connected_elsewhere"
  | "erasure_not_found"
  | "conversion_not_found"
  // POST /api/v1/events/retractions — unknown key, and the two refusals.
  | "event_not_found"
  | "event_already_exported"
  | "event_linked_to_conversation"
  // #1776 — campaign pause/resume refusals specific to the campaign.
  | "campaign_not_found"
  | "campaign_not_pausable"
  | "campaign_not_resumable"
  // Partner historical ad referrals — the ad is not one of the profile's Meta ads.
  | "unknown_ad"
  // A Conversion Sync audience on a Platform-Safe profile (refused before any Meta call).
  | "platform_safe_audiences_disabled"
  // Conversion Sync data sources — the profile has no live WhatsApp Business Account.
  | "whatsapp_connection_required"
  | "instagram_connection_required"
  | "instagram_facebook_login_required"
  // POST /api/v1/exports/destinations, PATCH …/{id} — another destination holds this instance.
  | "destination_conflict"
  | string;

export class AtribuError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AtribuConfigError extends AtribuError {}

export class AtribuTransportError extends AtribuError {
  readonly cause: unknown;
  constructor(message: string, cause: unknown) {
    super(message);
    this.cause = cause;
  }
}

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  status: number;
  request_id?: string;
  /** Deep link to the docs section explaining this exact code (#1065). Always
   * present on a real Atribu error envelope — derived from `code` server-side. */
  docs_url?: string;
  /** Present on `insufficient_scope` when the missing scope(s) are known by name. */
  required_scopes?: string[];
  /** Present + true when the connection's token was revoked and re-auth is needed. */
  reconnect_required?: boolean;
  /** Where to send the user to re-authorize, when the channel can build one. */
  reconnect_url?: string;
  /**
   * #1067 — present + true on a resource-limit denial (e.g.
   * `profile_limit_reached`) the caller can fix by upgrading the plan or
   * freeing up the resource.
   */
  upgrade_required?: boolean;
  /** Present when `upgrade_required` is true. */
  upgrade?: { plan: string };
  /** #1653 — the upstream provider that refused the request (`gmail` | `outlook`). */
  provider?: string;
  /** The provider's HTTP status; null when it never answered. Present with `provider`. */
  provider_status?: number | null;
  /** The provider's own error code, verbatim (e.g. `ErrorAccountSuspend`). */
  provider_code?: string | null;
  /** The provider's own message, verbatim — what the mailbox owner needs to read. */
  provider_message?: string;
  /**
   * #306 — present on `consent_required` (409): the CURRENT duplicate-and-swap
   * consent text version and the SHA-256 of each locale's text. Render that
   * text verbatim, have a person accept it, and re-send with
   * `consent: { version, text_hash, accepted_by, accepted_at }`.
   */
  consent?: SwapConsentRequirement;
  /** #1776 — which case of a shared class `code` this is (e.g. `meta_permission_denied`). */
  reason?: string;
  /** Present on `destination_conflict` (409): the export destination that already holds this instance. */
  conflicting_destination_id?: string;
}

/** #306 — what a `consent_required` error names as the current consent. */
export interface SwapConsentRequirement {
  version: string;
  text_hashes: { en: string; es: string };
}

export class AtribuApiError extends AtribuError {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly requestId: string | null;
  readonly retry: RetryHint;
  readonly responseBody: unknown;
  /** True when the API signalled the connection must be re-authorized (#204). */
  readonly reconnectRequired: boolean;
  /** Where to send the user to reconnect, when the API provided one. */
  readonly reconnectUrl: string | null;
  /** #1067 — true on a resource-limit denial fixable by upgrading. */
  readonly upgradeRequired: boolean;
  /** #1067 — the plan the denial was evaluated against, when upgradeRequired is true. */
  readonly upgradePlan: string | null;
  /** Deep link to the docs section explaining this exact `code` (#1065). Null
   * only when the response body didn't carry one (e.g. a non-Atribu proxy
   * error) — every real Atribu error envelope sets it. */
  readonly docsUrl: string | null;
  /** The scope(s) missing on an `insufficient_scope` error, when named (#1065). */
  readonly requiredScopes: string[] | null;
  /** #1653 — the upstream provider that refused the request, when the API named one. */
  readonly provider: string | null;
  /** #1653 — the provider's own HTTP status, when it answered. */
  readonly providerStatus: number | null;
  /** #1653 — the provider's own error code, verbatim. */
  readonly providerCode: string | null;
  /** #1653 — the provider's own message, verbatim (show it to the mailbox owner). */
  readonly providerMessage: string | null;
  /** #306 — the current swap consent on a `consent_required` error; null otherwise. */
  readonly consent: SwapConsentRequirement | null;
  /**
   * #1776 — a stable refinement of a SHARED class code (`forbidden` +
   * `meta_permission_denied` vs `forbidden` + `applied_by_not_allowed`). A
   * refusal specific to one resource has its own `code` instead. Pick copy from
   * `(code, reason)`, never from the message. Null when there is one case.
   */
  readonly reason: string | null;
  /**
   * On `destination_conflict` (409): the id of the export destination that
   * already holds this kind + connection + pixel. Update or re-enable that one
   * instead of creating a duplicate. Null otherwise.
   */
  readonly conflictingDestinationId: string | null;

  constructor(args: {
    code: ApiErrorCode;
    message: string;
    status: number;
    requestId: string | null;
    retry: RetryHint;
    responseBody: unknown;
    reconnectRequired?: boolean;
    reconnectUrl?: string | null;
    upgradeRequired?: boolean;
    upgradePlan?: string | null;
    docsUrl?: string | null;
    requiredScopes?: string[] | null;
    provider?: string | null;
    providerStatus?: number | null;
    providerCode?: string | null;
    providerMessage?: string | null;
    consent?: SwapConsentRequirement | null;
    reason?: string | null;
    conflictingDestinationId?: string | null;
  }) {
    super(`[${args.code}] ${args.message}`);
    this.code = args.code;
    this.status = args.status;
    this.requestId = args.requestId;
    this.retry = args.retry;
    this.responseBody = args.responseBody;
    this.reconnectRequired = args.reconnectRequired ?? false;
    this.reconnectUrl = args.reconnectUrl ?? null;
    this.upgradeRequired = args.upgradeRequired ?? false;
    this.upgradePlan = args.upgradePlan ?? null;
    this.docsUrl = args.docsUrl ?? null;
    this.requiredScopes = args.requiredScopes ?? null;
    this.provider = args.provider ?? null;
    this.providerStatus = args.providerStatus ?? null;
    this.providerCode = args.providerCode ?? null;
    this.providerMessage = args.providerMessage ?? null;
    this.consent = args.consent ?? null;
    this.reason = args.reason ?? null;
    this.conflictingDestinationId = args.conflictingDestinationId ?? null;
  }

  isRetryable(): boolean {
    return this.retry.action === "retry" || this.retry.action === "retry_after";
  }
  isAuthFailure(): boolean {
    return this.status === 401 || this.code === "unauthorized";
  }
  isRateLimit(): boolean {
    return this.status === 429 || this.code === "rate_limit_exceeded";
  }
  /** True when re-authorization is required; pair with `reconnectUrl`. */
  isReconnectRequired(): boolean {
    return this.reconnectRequired;
  }
}

export type OauthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "invalid_scope"
  | "server_error"
  | "unsupported_token_type"
  | string;

export class AtribuOauthError extends AtribuError {
  readonly code: OauthErrorCode;
  readonly status: number;
  readonly description: string | null;

  constructor(args: { code: OauthErrorCode; description: string | null; status: number }) {
    super(`[oauth/${args.code}] ${args.description ?? args.code}`);
    this.code = args.code;
    this.status = args.status;
    this.description = args.description;
  }
}

export type WebhookErrorCode =
  | "missing_signature"
  | "malformed_header"
  | "expired_timestamp"
  | "invalid_signature";

export class AtribuWebhookError extends AtribuError {
  readonly code: WebhookErrorCode;
  constructor(code: WebhookErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

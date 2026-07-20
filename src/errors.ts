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
  /** Present + true when the connection's token was revoked and re-auth is needed. */
  reconnect_required?: boolean;
  /** Where to send the user to re-authorize, when the channel can build one. */
  reconnect_url?: string;
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

  constructor(args: {
    code: ApiErrorCode;
    message: string;
    status: number;
    requestId: string | null;
    retry: RetryHint;
    responseBody: unknown;
    reconnectRequired?: boolean;
    reconnectUrl?: string | null;
  }) {
    super(`[${args.code}] ${args.message}`);
    this.code = args.code;
    this.status = args.status;
    this.requestId = args.requestId;
    this.retry = args.retry;
    this.responseBody = args.responseBody;
    this.reconnectRequired = args.reconnectRequired ?? false;
    this.reconnectUrl = args.reconnectUrl ?? null;
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

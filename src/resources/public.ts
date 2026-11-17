/**
 * The `public.*` namespace (#656) — the endpoints that take NO credential.
 *
 * One today: `GET /api/v1/public/reports/{share_slug}`, which serves the report
 * behind a share link to the agency's client, who has no Atribu account.
 *
 * WHY IT IS A NAMESPACE AND NOT JUST ANOTHER METHOD. It is what makes
 * {@link AtribuPublicClient} expressible: a client built with no credential
 * exposes this namespace and nothing else, so calling a credentialed read on it
 * is a TYPE ERROR rather than a 401 discovered in production. Every method here
 * sets `anonymous: true`, so a call from that client never resolves a token it
 * does not have — and a call from a fully-credentialed `AtribuClient` does not
 * send one it does not need.
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras } from "./common";

export type PublicSharedReportResponse =
  paths["/api/v1/public/reports/{share_slug}"]["get"]["responses"][200]["content"]["application/json"];

export class PublicReportsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * The report behind a share link.
   *
   * `shareSlug` IS the credential — 128 bits behind a unique constraint —
   * so treat it like a secret: anyone you hand it to can read the report.
   *
   * Throws `AtribuApiError` with `status: 404` for any slug that does not
   * resolve. The API answers the same 404 whether the slug never existed, was
   * deleted, or is malformed, so there is nothing to branch on and nothing to
   * learn from trying. The one distinct answer is `status: 410` /
   * `code: "share_revoked"` for a link the agency revoked (#2579).
   *
   * Returns the document and the branding to draw it with — never the report's
   * id, its workspace or profile, the schedule that produced it, or the
   * addresses it was mailed to. Those are on `client.reports.*`, behind
   * `analytics:read`.
   */
  async get(
    shareSlug: string,
    options: ReadExtras = {},
  ): Promise<PublicSharedReportResponse> {
    return this.http.request<PublicSharedReportResponse>({
      method: "GET",
      path: `/api/v1/public/reports/${encodeURIComponent(shareSlug)}`,
      anonymous: true,
      signal: options.signal,
    });
  }

  /**
   * Count one human open of a shared report (#2579) — for the hosted page, not
   * a consumer. `viewer` is a SHA-256 hex of the reader's address and user
   * agent; the API keys it again with the report and the UTC day, so nothing
   * identifying is stored. Throws 404 / 410 `share_revoked` like `get`.
   */
  async recordView(
    shareSlug: string,
    viewer: string,
    options: ReadExtras = {},
  ): Promise<PublicSharedReportViewResponse> {
    return this.http.request<PublicSharedReportViewResponse>({
      method: "POST",
      path: `/api/v1/public/reports/${encodeURIComponent(shareSlug)}/views`,
      body: { viewer },
      anonymous: true,
      signal: options.signal,
    });
  }
}

/**
 * #2579 — the unsubscribe link in a scheduled report email. The token is the
 * credential; an unknown one answers 404. `get` changes nothing (mail scanners
 * prefetch links); `unsubscribe` is the RFC 8058 one-click target.
 */
export class PublicReportUnsubscribeResource {
  constructor(private readonly http: HttpClientLike) {}

  async get(token: string, options: ReadExtras = {}): Promise<PublicReportUnsubscribeResponse> {
    return this.http.request<PublicReportUnsubscribeResponse>({
      method: "GET",
      path: `/api/v1/public/report-unsubscribe/${encodeURIComponent(token)}`,
      anonymous: true,
      signal: options.signal,
    });
  }

  async unsubscribe(token: string, options: ReadExtras = {}): Promise<PublicReportUnsubscribeResponse> {
    return this.http.request<PublicReportUnsubscribeResponse>({
      method: "POST",
      path: `/api/v1/public/report-unsubscribe/${encodeURIComponent(token)}`,
      anonymous: true,
      signal: options.signal,
    });
  }

  async resubscribe(token: string, options: ReadExtras = {}): Promise<PublicReportUnsubscribeResponse> {
    return this.http.request<PublicReportUnsubscribeResponse>({
      method: "DELETE",
      path: `/api/v1/public/report-unsubscribe/${encodeURIComponent(token)}`,
      anonymous: true,
      signal: options.signal,
    });
  }
}

export type PublicSharedReportViewResponse =
  paths["/api/v1/public/reports/{share_slug}/views"]["post"]["responses"][200]["content"]["application/json"];
export type PublicReportUnsubscribeResponse =
  paths["/api/v1/public/report-unsubscribe/{token}"]["get"]["responses"][200]["content"]["application/json"];

export type PublicGhlDentalinkBookingResponse =
  paths["/api/v1/public/ghl-dentalink/bookings/{token}"]["post"]["responses"][202]["content"]["application/json"];

/**
 * #2523 — where the recipe «Crear cita en Dentalink al reservar» (a GoHighLevel
 * workflow's webhook step) posts each appointment. The per-Profile `token` IS
 * the credential; an unknown token answers 404.
 */
export class PublicGhlDentalinkResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Record one GoHighLevel appointment for the worker to book in Dentalink. */
  async recordBooking(
    token: string,
    payload: Record<string, unknown>,
    options: ReadExtras = {},
  ): Promise<PublicGhlDentalinkBookingResponse> {
    return this.http.request<PublicGhlDentalinkBookingResponse>({
      method: "POST",
      path: `/api/v1/public/ghl-dentalink/bookings/${encodeURIComponent(token)}`,
      body: payload,
      anonymous: true,
      signal: options.signal,
    });
  }
}

/** `client.public.reports.get(slug)`, `client.public.ghlDentalink.recordBooking(token, payload)`. */
export class PublicNamespace {
  readonly reports: PublicReportsResource;
  readonly ghlDentalink: PublicGhlDentalinkResource;
  readonly reportUnsubscribe: PublicReportUnsubscribeResource;

  constructor(http: HttpClientLike) {
    this.reportUnsubscribe = new PublicReportUnsubscribeResource(http);
    this.reports = new PublicReportsResource(http);
    this.ghlDentalink = new PublicGhlDentalinkResource(http);
  }
}

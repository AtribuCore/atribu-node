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
   * learn from trying.
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
}

/** `client.public.reports.get(slug)`. */
export class PublicNamespace {
  readonly reports: PublicReportsResource;

  constructor(http: HttpClientLike) {
    this.reports = new PublicReportsResource(http);
  }
}

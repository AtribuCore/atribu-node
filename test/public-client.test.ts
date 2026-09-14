/**
 * `AtribuPublicClient` (#656) — the credential-less client.
 *
 * `route-coverage.test.ts` proves it calls the right URL with no credential.
 * This file is about the SHAPE of the guard: what a caller can and cannot do
 * with one, and what happens when they try.
 *
 * The strongest guarantee is not testable at runtime at all — `client.reports`
 * does not exist on this type, so a credentialed call is a compile error and
 * `npx tsc --noEmit` is what enforces it. What IS testable is that the escape
 * hatches are closed: no credential field to pass, no tenant threaded, no
 * Authorization header even under `withRetry`.
 */
import { describe, expect, it, vi } from "vitest";
import { AtribuPublicClient } from "../src/public-client";
import { AtribuApiError } from "../src/errors";

const BASE = "https://public.atribu.test";
const SLUG = "9f1c2b7d4e6a08f35c21d9be47a03f16";

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AtribuPublicClient", () => {
  it("exposes public.* and nothing else", () => {
    const client = new AtribuPublicClient({ baseUrl: BASE });

    expect(client.public.reports).toBeDefined();
    // The compile-time guarantee, restated at runtime so a refactor that
    // widened the class — say, by extending AtribuClient "for convenience" —
    // fails here as well as in tsc.
    for (const forbidden of [
      "analytics",
      "reports",
      "customers",
      "messages",
      "whatsapp",
      "instagram",
      "exports",
      "tracking",
      "connections",
    ]) {
      expect(
        (client as unknown as Record<string, unknown>)[forbidden],
        `AtribuPublicClient must not expose "${forbidden}" — it has no credential to call it with`,
      ).toBeUndefined();
    }
  });

  it("returns the envelope as sent — `{ data }`, no meta", async () => {
    const payload = {
      data: {
        type: "weekly",
        date_from: "2026-08-01",
        date_to: "2026-08-20",
        created_at: "2026-08-21T00:00:00Z",
        document: { summary: { totalSpend: 1234.56 } },
        template_snapshot: { version: 1, sections: [] },
        branding: {
          logo_url: null,
          accent_color: null,
          hide_atribu_footer: false,
          branded: false,
        },
      },
    };
    const fetchSpy = vi.fn().mockResolvedValue(ok(payload));

    const res = await new AtribuPublicClient({
      baseUrl: BASE,
      fetch: fetchSpy as unknown as typeof fetch,
    }).public.reports.get(SLUG);

    expect(res).toEqual(payload);
  });

  it("percent-encodes the slug rather than pasting it into the path", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ data: {} }));
    await new AtribuPublicClient({
      baseUrl: BASE,
      fetch: fetchSpy as unknown as typeof fetch,
    }).public.reports.get("../reports/templates");

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(new URL(url).pathname).toBe(
      "/api/v1/public/reports/..%2Freports%2Ftemplates",
    );
  });

  it("surfaces the API's 404 as an AtribuApiError, not a null", async () => {
    // The share page has to tell "no such report" from "the request failed" —
    // one is `notFound()`, the other is an error boundary. A resolved null
    // would collapse the two.
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "not_found", message: "Report not found", status: 404, request_id: "r" },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );

    const call = new AtribuPublicClient({
      baseUrl: BASE,
      fetch: fetchSpy as unknown as typeof fetch,
    }).public.reports.get(SLUG);

    await expect(call).rejects.toBeInstanceOf(AtribuApiError);
    await expect(call).rejects.toMatchObject({ status: 404, code: "not_found" });
  });

  it("still sends no credential through withRetry", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(ok({ data: {} }));

    await new AtribuPublicClient({
      baseUrl: BASE,
      fetch: fetchSpy as unknown as typeof fetch,
    })
      .withRetry({ maxAttempts: 2, backoff: "fixed", baseDelayMs: 0 })
      .public.reports.get(SLUG);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchSpy.mock.calls as [string, RequestInit][]) {
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    }
  });
});

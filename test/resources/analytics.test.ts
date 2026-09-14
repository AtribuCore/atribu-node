/**
 * Per-resource unit tests for the analytics-area resources (#590).
 *
 * `route-coverage.test.ts` already proves every route has a method that hits
 * the right path. This file covers what that one cannot: the query string a
 * method actually builds, the body it sends, the headers, and the two things
 * that are easy to get wrong once — the envelope being returned WHOLE (so a
 * pagination cursor survives) and the drill's CSV rendering coming back as
 * text rather than a JSON parse artefact.
 */
import { describe, expect, it, vi } from "vitest";
import { AtribuClient } from "../../src/client";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://analytics.atribu.test";
const RANGE = { date_from: "2026-08-01", date_to: "2026-08-26" } as const;

type Call = [string, RequestInit];

function jsonBody(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "x-request-id": "req_1" },
  });
}

function newClient(fetchSpy: ReturnType<typeof vi.fn>): AtribuClient {
  return new AtribuClient({
    apiKey: "atb_live_test",
    baseUrl: BASE,
    fetch: fetchSpy as unknown as typeof fetch,
  });
}

function spy(body: unknown = { data: {}, meta: { profile_id: "p" } }): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation(async () => jsonBody(body));
}

describe("analytics resource", () => {
  it("puts every query parameter on the URL and nothing else", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).analytics.overview({ ...RANGE, model: "linear" });
    const [url, init] = fetchSpy.mock.calls[0] as Call;
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/api/v1/overview");
    expect([...parsed.searchParams.entries()]).toEqual([
      ["date_from", "2026-08-01"],
      ["date_to", "2026-08-26"],
      ["model", "linear"],
    ]);
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("forwards ?grain=day and narrows the response to the daily shape (#584)", async () => {
    const fetchSpy = spy({
      data: { days: [{ date: "2026-08-01" }], previous_days: [] },
      meta: { profile_id: "p" },
    });
    const res = await newClient(fetchSpy).analytics.overview({ ...RANGE, grain: "day" });

    const [url] = fetchSpy.mock.calls[0] as Call;
    expect([...new URL(url).searchParams.entries()]).toEqual([
      ["date_from", "2026-08-01"],
      ["date_to", "2026-08-26"],
      ["grain", "day"],
    ]);
    // The overload is the point: `res.data.days` compiles without a narrowing
    // step, and `res.data.current` would not compile at all.
    expect(res.data.days[0]?.date).toBe("2026-08-01");
  });

  it("keeps the totals shape when no grain is named (#584)", async () => {
    const fetchSpy = spy({
      data: { current: { spend: 10 }, previous: { spend: 5 } },
      meta: { profile_id: "p" },
    });
    const res = await newClient(fetchSpy).analytics.overview({ ...RANGE });

    expect([...new URL((fetchSpy.mock.calls[0] as Call)[0]).searchParams.keys()]).toEqual([
      "date_from",
      "date_to",
    ]);
    // Pre-#584 call sites read `data.current` directly; the overload is what
    // keeps that compiling now that the wire type is a union.
    expect(res.data.current.spend).toBe(10);
  });

  it("omits an undefined optional rather than sending the string 'undefined'", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).analytics.campaigns({ ...RANGE, model: undefined, limit: "10" });
    const [url] = fetchSpy.mock.calls[0] as Call;
    const parsed = new URL(url);
    expect(parsed.searchParams.has("model")).toBe(false);
    expect(parsed.searchParams.get("limit")).toBe("10");
  });

  it("never sends `signal` as a query parameter", async () => {
    const fetchSpy = spy();
    const controller = new AbortController();
    await newClient(fetchSpy).analytics.ltv({ ...RANGE, signal: controller.signal });
    const [url, init] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).searchParams.has("signal")).toBe(false);
    expect(init.signal).toBeDefined();
  });

  it("url-encodes a path parameter", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).analytics.campaignConversions("a/b c", RANGE);
    const [url] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).pathname).toBe("/api/v1/campaigns/a%2Fb%20c/conversions");
  });

  it("passes bracketed filter keys through verbatim", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).analytics.customers({
      ...RANGE,
      goal: "payment_received",
      "filter[channel]": "is:Paid Social",
    });
    const [url] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).searchParams.get("filter[channel]")).toBe("is:Paid Social");
  });

  // #586 — campaigns() gained typed `filter[<dimension>]` keys the same way
  // customers()/visitors() already had them (`journeyFilterQueryParams`), so
  // this literal object compiling at all IS half the assertion.
  it("types and sends filter[…] keys on campaigns() too (#586)", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).analytics.campaigns({
      ...RANGE,
      level: "campaign",
      "filter[channel]": "is:Paid Social",
    });
    const [url] = fetchSpy.mock.calls[0] as Call;
    const parsed = new URL(url);
    expect(parsed.searchParams.get("level")).toBe("campaign");
    expect(parsed.searchParams.get("filter[channel]")).toBe("is:Paid Social");
  });

  it("returns the WHOLE envelope, so a pagination cursor survives", async () => {
    const fetchSpy = spy({
      data: [{ visitor_id: "v1" }],
      pagination: { has_next: true, cursor: "opaque-token" },
      meta: { profile_id: "p" },
    });
    const page = await newClient(fetchSpy).analytics.visitors(RANGE);
    expect(page.data).toHaveLength(1);
    expect(page.pagination?.cursor).toBe("opaque-token");
  });

  describe("customer payments + first-payment override (#589)", () => {
    it("sends NO query string on the payments read — it takes no window", async () => {
      const fetchSpy = spy();
      await newClient(fetchSpy).analytics.customerPayments("cus_1");
      const [url, init] = fetchSpy.mock.calls[0] as Call;
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/api/v1/customers/cus_1/payments");
      expect(parsed.search).toBe("");
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();
    });

    it("url-encodes the customer id", async () => {
      const fetchSpy = spy();
      await newClient(fetchSpy).analytics.customerPayments("a/b c");
      const [url] = fetchSpy.mock.calls[0] as Call;
      expect(new URL(url).pathname).toBe("/api/v1/customers/a%2Fb%20c/payments");
    });

    it("posts the override as a JSON body, id in the path", async () => {
      const fetchSpy = spy();
      await newClient(fetchSpy).analytics.setFirstPaymentOverride("cus_1", {
        outcome_event_id: "oe_1",
        manual_override: true,
      });
      const [url, init] = fetchSpy.mock.calls[0] as Call;
      expect(new URL(url).pathname).toBe("/api/v1/customers/cus_1/first-payment-override");
      expect(init.method).toBe("POST");
      expect(init.body).toBe(
        JSON.stringify({ outcome_event_id: "oe_1", manual_override: true }),
      );
    });

    it("serializes an explicit null override rather than dropping the key", async () => {
      // `manual_override: null` is the CLEAR operation. A body serializer that
      // stripped nulls would silently turn "clear it" into a 422.
      const fetchSpy = spy();
      await newClient(fetchSpy).analytics.setFirstPaymentOverride("cus_1", {
        outcome_event_id: "oe_1",
        manual_override: null,
      });
      const [, init] = fetchSpy.mock.calls[0] as Call;
      expect(init.body).toBe(
        JSON.stringify({ outcome_event_id: "oe_1", manual_override: null }),
      );
    });

    it("returns the envelope whole, so `changed` survives", async () => {
      const fetchSpy = spy({
        data: { outcome_event_id: "oe_1", manual_override: false, changed: false },
        meta: { profile_id: "p" },
      });
      const res = await newClient(fetchSpy).analytics.setFirstPaymentOverride("cus_1", {
        outcome_event_id: "oe_1",
        manual_override: false,
      });
      expect(res.data.changed).toBe(false);
    });
  });

  describe("drill", () => {
    it("sends no `format` on the JSON call", async () => {
      const fetchSpy = spy();
      await newClient(fetchSpy).analytics.drill({ ...RANGE, kind: "refunded" });
      const [url] = fetchSpy.mock.calls[0] as Call;
      const parsed = new URL(url);
      expect(parsed.searchParams.get("kind")).toBe("refunded");
      expect(parsed.searchParams.has("format")).toBe(false);
    });

    it("asks for CSV with ?format=csv and resolves the raw text", async () => {
      // `?format=csv`, NOT `Accept: text/csv` — the operation description says
      // the header is unreachable from the `<a download>` links that consume
      // this, so the API refuses to hide the second body behind one.
      const csv = "conversion_id,amount\nc1,100\n";
      const fetchSpy = vi.fn().mockImplementation(
        async () =>
          new Response(csv, { status: 200, headers: { "Content-Type": "text/csv" } }),
      );
      const out = await newClient(fetchSpy).analytics.drillCsv({
        ...RANGE,
        kind: "first_payment",
      });
      const [url, init] = fetchSpy.mock.calls[0] as Call;
      expect(new URL(url).searchParams.get("format")).toBe("csv");
      expect((init.headers as Record<string, string>).Accept).toBe("text/csv");
      expect(out).toBe(csv);
    });

    it("does not mistake a numeric CSV cell for JSON", async () => {
      // The reason `expectText` exists rather than leaning on safeJson's
      // parse-failure fallback: this body parses cleanly as the number 42.
      const fetchSpy = vi.fn().mockImplementation(
        async () => new Response("42", { status: 200, headers: { "Content-Type": "text/csv" } }),
      );
      const out = await newClient(fetchSpy).analytics.drillCsv({
        ...RANGE,
        kind: "cac_by_channel",
      });
      expect(out).toBe("42");
      expect(typeof out).toBe("string");
    });

    it("still surfaces an error envelope on a failed CSV request", async () => {
      const fetchSpy = vi.fn().mockImplementation(async () =>
        jsonBody(
          { error: { code: "insufficient_scope", message: "needs customers:read", status: 403 } },
          403,
        ),
      );
      await expect(
        newClient(fetchSpy).analytics.drillCsv({ ...RANGE, kind: "first_payment" }),
      ).rejects.toBeInstanceOf(AtribuApiError);
    });
  });
});

describe("attribution resource", () => {
  it("sends the comma-joined model list as given", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).attribution.models({ ...RANGE, models: "last_touch,linear" });
    const [url] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).searchParams.get("models")).toBe("last_touch,linear");
  });

  it("keys explore on outcome_event_id", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).attribution.explore({ outcome_event_id: "oe_1", compare: "true" });
    const [url] = fetchSpy.mock.calls[0] as Call;
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/api/v1/attribution/explore");
    expect(parsed.searchParams.get("outcome_event_id")).toBe("oe_1");
    expect(parsed.searchParams.get("compare")).toBe("true");
  });
});

describe("organic resource", () => {
  it("sends the cursor back verbatim", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).organic.posts({ ...RANGE, cursor: "opaque+token/=" });
    const [url] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).searchParams.get("cursor")).toBe("opaque+token/=");
  });

  it("takes no date range on a story", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).organic.story("story_1", { model: "first_touch" });
    const [url] = fetchSpy.mock.calls[0] as Call;
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/api/v1/organic/stories/story_1");
    expect([...parsed.searchParams.keys()]).toEqual(["model"]);
  });
});

describe("recommendations resource", () => {
  it("always carries an Idempotency-Key on apply, generated when not given", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).recommendations.apply("rec_1", { applied_by: "u1" });
    const [url, init] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).pathname).toBe("/api/v1/recommendations/rec_1/apply");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ applied_by: "u1" }));
    const headers = init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toMatch(/.+/);
  });

  it("uses the caller's Idempotency-Key when given", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).recommendations.apply(
      "rec_1",
      {},
      { idempotencyKey: "apply-rec_1-attempt-3" },
    );
    const [, init] = fetchSpy.mock.calls[0] as Call;
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
      "apply-rec_1-attempt-3",
    );
  });

  it("sends an empty body rather than none when dismiss has no reason", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).recommendations.dismiss("rec_1");
    const [, init] = fetchSpy.mock.calls[0] as Call;
    expect(init.body).toBe("{}");
  });
});

describe("exports resource", () => {
  it("posts the trigger body as JSON", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).exports.create({ destination: "meta_capi", ...RANGE });
    const [url, init] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).pathname).toBe("/api/v1/exports");
    expect(init.body).toBe(
      JSON.stringify({
        destination: "meta_capi",
        date_from: "2026-08-01",
        date_to: "2026-08-26",
      }),
    );
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns status_counts alongside data on the ledger", async () => {
    const fetchSpy = spy({
      data: [],
      pagination: { has_next: false },
      status_counts: { sent: 412, failed: 3 },
      meta: { profile_id: "p" },
    });
    const ledger = await newClient(fetchSpy).exports.ledger({ status: "failed" });
    expect(ledger.status_counts).toEqual({ sent: 412, failed: 3 });
  });
});

describe("tracking resource", () => {
  it("issues a key with a JSON body", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).tracking.issueKey({ name: "storefront" });
    const [url, init] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).pathname).toBe("/api/v1/tracking/keys");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "storefront" }));
  });

  it("passes installer selectors as query parameters", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).tracking.snippet({
      key_id: "k1",
      domain_id: "d1",
      include_meta_pixel: "true",
    });
    const [url] = fetchSpy.mock.calls[0] as Call;
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/api/v1/tracking/snippet");
    expect(parsed.searchParams.get("key_id")).toBe("k1");
    expect(parsed.searchParams.get("include_meta_pixel")).toBe("true");
  });
});

describe("reports resource", () => {
  it("PATCHes a schedule with the id in the path", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).reports.updateSchedule("sch_1", { enabled: false });
    const [url, init] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).pathname).toBe("/api/v1/reports/schedules/sch_1");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ enabled: false }));
  });

  it("DELETEs a schedule with no body", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).reports.deleteSchedule("sch_1");
    const [, init] = fetchSpy.mock.calls[0] as Call;
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("sends generate's date range as query, not body", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).reports.generate({ ...RANGE, model: "last_touch" });
    const [url, init] = fetchSpy.mock.calls[0] as Call;
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/api/v1/reports/generate");
    expect(parsed.searchParams.get("date_from")).toBe("2026-08-01");
    expect(parsed.searchParams.get("model")).toBe("last_touch");
    expect(init.body).toBeUndefined();
    // `idempotencyKey` is an SDK-side option, never a query parameter.
    expect(parsed.searchParams.has("idempotencyKey")).toBe(false);
  });
});

describe("connections pending picker", () => {
  it("gets the candidates for a provider", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).connections.pending("meta_ads");
    const [url, init] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).pathname).toBe("/api/v1/connections/pending/meta_ads");
    expect(init.method).toBe("GET");
  });

  it("finalizes the chosen candidate", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).connections.finalizePending("meta_ads", {
      candidate_id: "act_123",
    });
    const [url, init] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).pathname).toBe("/api/v1/connections/pending/meta_ads/finalize");
    expect(init.body).toBe(JSON.stringify({ candidate_id: "act_123" }));
  });
});

describe("quality + ads resources", () => {
  it("sends no query at all when utm is called bare", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).quality.utm();
    const [url] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).search).toBe("");
  });

  it("encodes the ad id in the creative-analysis path", async () => {
    const fetchSpy = spy();
    await newClient(fetchSpy).ads.creativeAnalysis("120#33");
    const [url] = fetchSpy.mock.calls[0] as Call;
    expect(new URL(url).pathname).toBe("/api/v1/ads/120%2333/creative-analysis");
  });
});

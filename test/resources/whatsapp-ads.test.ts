import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-wa-ads.atribu.test";
const AD_ID = "120248453968470719";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

const WELCOME = {
  text: "Hola 👋, soy la Dra. Valentina Moreira. ¿En qué te puedo ayudar?",
  autofill_message: "Quiero agendar una evaluación",
  ice_breakers: [] as string[],
  landing_screen_type: "welcome_message",
};

const CTWA_AD = {
  ad_id: AD_ID,
  ad_name: "Auva · Evaluación",
  ad_status: "ACTIVE",
  ad_set_id: "120248453968470100",
  ad_set_name: "Auva · Evaluación · WhatsApp",
  campaign_id: "120248453968470000",
  campaign_name: "Auva · Septiembre",
  destination: {
    type: "WHATSAPP",
    whatsapp_phone_number: "+56922222222",
    page_id: "102938475610293",
  },
  optimization_goal: "CONVERSATIONS",
  call_to_action_type: "WHATSAPP_MESSAGE",
  creative_id: "120248453968470720",
  greeting: WELCOME,
  greeting_status: "present" as const,
  last_synced_at: "2026-09-14T03:00:00.000Z",
};

describe("whatsapp.ads resource", () => {
  let requestedUrl = "";
  let listUrl = "";

  const server = setupServer(
    http.get(`${BASE}/api/v1/partner/whatsapp/ads`, ({ request }) => {
      listUrl = request.url;
      const after = new URL(request.url).searchParams.get("after");
      if (after) {
        return HttpResponse.json(
          {
            data: [
              {
                ...CTWA_AD,
                ad_id: "120248453968470999",
                greeting: null,
                greeting_status: "unreadable",
                creative_id: null,
              },
            ],
            pagination: { has_next: false },
            meta: { profile_id: "p1" },
          },
          { status: 200 },
        );
      }
      return HttpResponse.json(
        {
          data: [CTWA_AD],
          pagination: { has_next: true, cursor: AD_ID },
          meta: { profile_id: "p1" },
        },
        { status: 200 },
      );
    }),
    http.get(
      `${BASE}/api/v1/partner/whatsapp/ads/:adId/welcome-message`,
      ({ request, params }) => {
        requestedUrl = request.url;
        if (params.adId === "404") {
          return HttpResponse.json(
            {
              error: {
                code: "not_found",
                message: "Ad not found, or not visible to this workspace",
                status: 404,
                request_id: "req-1",
              },
            },
            { status: 404 },
          );
        }
        if (params.adId === "409") {
          return HttpResponse.json(
            {
              error: {
                code: "connection_not_ready",
                message: "This profile has no usable Meta Ads connection",
                status: 409,
                request_id: "req-2",
              },
            },
            { status: 409 },
          );
        }
        return HttpResponse.json(
          {
            data: {
              ad_id: params.adId,
              creative_id: "120248453968470720",
              welcome: params.adId === "120" ? null : WELCOME,
              fetched_at: "2026-09-11T21:00:00.000Z",
              cached: false,
            },
            meta: { profile_id: "p1" },
          },
          { status: 200 },
        );
      },
    ),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("reads an ad's welcome message", async () => {
    const res = await newClient().whatsapp.ads.welcomeMessage(AD_ID);

    expect(res.ad_id).toBe(AD_ID);
    expect(res.creative_id).toBe("120248453968470720");
    expect(res.welcome?.text).toBe(WELCOME.text);
    expect(res.welcome?.autofill_message).toBe(WELCOME.autofill_message);
    expect(res.welcome?.ice_breakers).toEqual([]);
    expect(res.cached).toBe(false);
    // `fetched_at` is when Atribu read it from Meta, not when we called.
    expect(res.fetched_at).toBe("2026-09-11T21:00:00.000Z");
    expect(new URL(requestedUrl).search).toBe("");
  });

  it("sends connection_id only when given", async () => {
    await newClient().whatsapp.ads.welcomeMessage(AD_ID, { connectionId: "conn-1" });
    expect(new URL(requestedUrl).searchParams.get("connection_id")).toBe("conn-1");
  });

  it("returns welcome: null for an ad with no greeting, rather than throwing", async () => {
    // The common case for an ad whose advertiser never configured one. A caller
    // that relies on a throw here would treat a normal ad as a failure.
    const res = await newClient().whatsapp.ads.welcomeMessage("120");
    expect(res.welcome).toBeNull();
  });

  it("throws a 404 when Meta will not show Atribu the ad", async () => {
    const err = await newClient()
      .whatsapp.ads.welcomeMessage("404")
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AtribuApiError);
    expect((err as AtribuApiError).status).toBe(404);
  });

  it("throws a 409 when the profile has no usable Meta Ads connection", async () => {
    const err = await newClient()
      .whatsapp.ads.welcomeMessage("409")
      .catch((e: unknown) => e);
    expect((err as AtribuApiError).status).toBe(409);
    expect((err as AtribuApiError).code).toBe("connection_not_ready");
  });

  it("lists the profile's click-to-WhatsApp ads with destination and greeting", async () => {
    const page = await newClient().whatsapp.ads.list();

    expect(page.ads).toHaveLength(1);
    const ad = page.ads[0]!;
    expect(ad.ad_id).toBe(AD_ID);
    expect(ad.destination.whatsapp_phone_number).toBe("+56922222222");
    expect(ad.call_to_action_type).toBe("WHATSAPP_MESSAGE");
    expect(ad.greeting_status).toBe("present");
    expect(ad.greeting?.autofill_message).toBe(WELCOME.autofill_message);
    // How stale the row is, stated rather than left to be inferred.
    expect(ad.last_synced_at).toBe("2026-09-14T03:00:00.000Z");
    // No query at all by default — the credential is the tenant selection.
    expect(new URL(listUrl).search).toBe("");
  });

  it("hands back a keyset cursor and resumes from it", async () => {
    const first = await newClient().whatsapp.ads.list({ limit: 1 });
    expect(first.hasNext).toBe(true);
    expect(first.nextCursor).toBe(AD_ID);
    expect(new URL(listUrl).searchParams.get("limit")).toBe("1");

    const second = await newClient().whatsapp.ads.list({ after: first.nextCursor ?? undefined });
    expect(new URL(listUrl).searchParams.get("after")).toBe(AD_ID);
    expect(second.hasNext).toBe(false);
    expect(second.nextCursor).toBeNull();
  });

  it("keeps `no greeting` and `cannot read the greeting` apart", async () => {
    // Both carry `greeting: null`; only the status says which is worth
    // retrying after someone fixes the Meta connection.
    const page = await newClient().whatsapp.ads.list({ after: AD_ID });
    const ad = page.ads[0]!;
    expect(ad.greeting).toBeNull();
    expect(ad.greeting_status).toBe("unreadable");
  });
});

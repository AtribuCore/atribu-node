import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";

const BASE = "https://mock-wa-calling.atribu.test";
const CONN = "11111111-1111-1111-1111-111111111111";
const PHONE = "123456789012345";

/** The recipe the POC proved: both non-defaults are load-bearing. */
const SETTINGS = {
  status: "ENABLED",
  call_icon_visibility: "DEFAULT",
  srtp_key_exchange_protocol: "SDES",
  sip: { status: "ENABLED", servers: [{ hostname: "sip.rtc.elevenlabs.io", port: 5061 }] },
  audio: { additional_codecs: ["PCMA", "PCMU"] },
};

let lastGetUrl = "";
let lastPostBody: unknown = null;

let lastCredsUrl = "";

const CREDS = {
  username: "16065177691",
  servers: [
    { hostname: "sip.rtc.elevenlabs.io", port: 5061, sip_user_password: "meta-secret" },
  ],
};

const handlers = [
  http.get(`${BASE}/api/v1/whatsapp/calling/sip-credentials`, ({ request }) => {
    lastCredsUrl = request.url;
    return HttpResponse.json({ data: CREDS });
  }),
  http.get(`${BASE}/api/v1/whatsapp/calling`, ({ request }) => {
    lastGetUrl = request.url;
    return HttpResponse.json({ data: { calling: SETTINGS } });
  }),
  http.post(`${BASE}/api/v1/whatsapp/calling`, async ({ request }) => {
    lastPostBody = await request.json();
    // Meta normalizes and fills defaults, so the route re-reads and returns
    // what Meta HOLDS — deliberately not an echo of the request.
    return HttpResponse.json({
      data: { calling: { ...SETTINGS, call_hours: { status: "DISABLED" } } },
    });
  }),
];

const server = setupServer(...handlers);
const newClient = () => new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

describe("whatsapp.calling resource", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers(...handlers));
  afterAll(() => server.close());

  it("reads settings, sending BOTH ids", async () => {
    // `connection_id` is the token resolver's key — a phone_number_id alone
    // resolves nothing, so omitting it is a 400 rather than a lookup.
    const calling = await newClient().whatsapp.calling.get(CONN, PHONE);

    expect(calling).toMatchObject({ srtp_key_exchange_protocol: "SDES" });
    const url = new URL(lastGetUrl);
    expect(url.searchParams.get("connection_id")).toBe(CONN);
    expect(url.searchParams.get("phone_number_id")).toBe(PHONE);
  });

  it("passes the settings object through VERBATIM", async () => {
    // Atribu holds no opinion about Meta's payload. If the SDK reshaped it,
    // the two non-default fields that make SIP work (SDES key exchange and the
    // G.711 codec list) would be the first casualties — and the symptom is a
    // number that rings and never answers, not an error.
    await newClient().whatsapp.calling.update(CONN, PHONE, SETTINGS);

    expect(lastPostBody).toEqual({
      connection_id: CONN,
      phone_number_id: PHONE,
      settings: SETTINGS,
    });
  });

  it("returns what META holds, not what was sent", async () => {
    const out = await newClient().whatsapp.calling.update(CONN, PHONE, SETTINGS);

    // The handler adds a field Meta filled in. Echoing the request instead
    // would report settings that were never applied.
    expect(out).toMatchObject({ call_hours: { status: "DISABLED" } });
  });

  it("reads SIP credentials from their OWN endpoint, sending both ids", async () => {
    // A separate route, not a flag on `get()`. That is what keeps "the settings
    // read never requests credentials" a property of the code rather than of an
    // argument someone might pass.
    const creds = await newClient().whatsapp.calling.sipCredentials(CONN, PHONE);

    expect(creds).toEqual(CREDS);
    const url = new URL(lastCredsUrl);
    expect(url.pathname).toBe("/api/v1/whatsapp/calling/sip-credentials");
    expect(url.searchParams.get("connection_id")).toBe(CONN);
    expect(url.searchParams.get("phone_number_id")).toBe(PHONE);
  });

  it("does NOT pull credentials in through the plain settings read", async () => {
    // The sibling route's whole promise. If `get()` ever grew an
    // include_sip_credentials flag, a routine read would start returning a
    // secret into callers' logs.
    await newClient().whatsapp.calling.get(CONN, PHONE);

    expect(new URL(lastGetUrl).searchParams.has("include_sip_credentials")).toBe(false);
  });
});

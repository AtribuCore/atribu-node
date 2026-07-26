import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures, responseFixtures } from "../../src/test";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-wa-registration.atribu.test";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

describe("whatsapp.registration resource", () => {
  describe("happy path", () => {
    const server = setupServer(...atribuMockHandlers({ baseUrl: BASE }));
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(...atribuMockHandlers({ baseUrl: BASE })));
    afterAll(() => server.close());

    it("adds a phone number (plain add)", async () => {
      const res = await newClient().whatsapp.registration.addPhoneNumber({
        connection_id: fixtures.ids.connectionId,
        cc: "56",
        phone_number: "912345678",
        verified_name: "La Autería",
      });
      expect(typeof res.phone_number_id).toBe("string");
      expect(res.migrated).toBe(false);
    });

    it("migrates a phone number (migrate: true)", async () => {
      server.use(
        ...atribuMockHandlers({
          baseUrl: BASE,
          whatsapp: {
            registration: {
              addPhoneNumber: {
                status: 201,
                body: responseFixtures.whatsappNumberAdded({ migrated: true }),
              },
            },
          },
        }),
      );
      const res = await newClient().whatsapp.registration.addPhoneNumber({
        connection_id: fixtures.ids.connectionId,
        cc: "56",
        phone_number: "912345678",
        verified_name: "La Autería",
        migrate: true,
      });
      expect(res.migrated).toBe(true);
    });

    it("requests a voice OTP", async () => {
      const res = await newClient().whatsapp.registration.requestCode({
        connection_id: fixtures.ids.connectionId,
        phone_number_id: "109876543210987",
        language: "es",
      });
      expect(res.requested).toBe(true);
      expect(res.code_method).toBe("VOICE");
    });

    it("verifies an OTP", async () => {
      const res = await newClient().whatsapp.registration.verifyCode({
        connection_id: fixtures.ids.connectionId,
        phone_number_id: "109876543210987",
        code: "123456",
      });
      expect(res.verified).toBe(true);
    });

    it("registers + subscribes", async () => {
      const res = await newClient().whatsapp.registration.register({
        connection_id: fixtures.ids.connectionId,
        phone_number_id: "109876543210987",
        pin: "654321",
      });
      expect(res.registered).toBe(true);
      expect(res.subscribed).toBe(true);
    });

    it("subscribe-only (already-registered WABA)", async () => {
      const res = await newClient().whatsapp.registration.subscribe({
        connection_id: fixtures.ids.connectionId,
      });
      expect(res.subscribed).toBe(true);
    });

    it("lists subscribed apps (incumbent detection)", async () => {
      server.use(
        ...atribuMockHandlers({
          baseUrl: BASE,
          whatsapp: {
            registration: {
              subscribedApps: {
                status: 200,
                body: responseFixtures.whatsappSubscribedApps({ items: 2 }),
              },
            },
          },
        }),
      );
      const apps = await newClient().whatsapp.registration.listSubscribedApps({
        connectionId: fixtures.ids.connectionId,
      });
      expect(apps).toHaveLength(2);
      expect(apps[0]?.name).toBe("Atribu");
      expect(apps[1]?.name).toBe("Chatwoot");
    });

    it("reads funding", async () => {
      const funding = await newClient().whatsapp.registration.getFunding({
        connectionId: fixtures.ids.connectionId,
      });
      expect(funding.primary_funding_id).toBe("1234567890");
      expect(funding.status).toBe("APPROVED");
    });

    it("lists the WABA's phone numbers (already-connected detection)", async () => {
      server.use(
        ...atribuMockHandlers({
          baseUrl: BASE,
          whatsapp: {
            registration: {
              phoneNumbers: {
                status: 200,
                body: responseFixtures.whatsappPhoneNumbers({ items: 2 }),
              },
            },
          },
        }),
      );
      const phones = await newClient().whatsapp.registration.listPhoneNumbers({
        connectionId: fixtures.ids.connectionId,
      });
      expect(phones).toHaveLength(2);
      expect(phones[0]?.verified_name).toBe("La Autería");
      expect(phones[0]?.display_phone_number).toBe("+56 2 2914 5100");
      expect(phones[0]?.quality_rating).toBe("GREEN");
    });

    it("reads funding empty-state (no primary_funding_id) raw", async () => {
      server.use(
        ...atribuMockHandlers({
          baseUrl: BASE,
          whatsapp: {
            registration: {
              funding: {
                status: 200,
                body: responseFixtures.whatsappFunding({
                  primary_funding_id: null,
                  status: "PENDING",
                }),
              },
            },
          },
        }),
      );
      const funding = await newClient().whatsapp.registration.getFunding({
        connectionId: fixtures.ids.connectionId,
      });
      expect(funding.primary_funding_id).toBeUndefined();
      expect(funding.status).toBe("PENDING");
    });
  });

  describe("typed error surfacing", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        whatsapp: {
          registration: {
            register: {
              status: 429,
              body: responseFixtures.apiError(
                "whatsapp_register_limit",
                "phone number register: (#133016) registration capped at 10 attempts per number per 72h",
                429,
              ),
            },
          },
        },
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("register → 429 whatsapp_register_limit (Meta 133016)", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().whatsapp.registration.register({
          connection_id: fixtures.ids.connectionId,
          phone_number_id: "109876543210987",
          pin: "654321",
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.code).toBe("whatsapp_register_limit");
      expect(caught?.status).toBe(429);
      expect(caught?.isRateLimit()).toBe(true);
      // 10/72h cap → wait out the window; NOT a "retry in 1s" signal.
      expect(caught?.retry.action).toBe("do_not_retry");
    });

    it("register → 402 whatsapp_payment_required (Meta 131042)", async () => {
      server.use(
        ...atribuMockHandlers({
          baseUrl: BASE,
          whatsapp: {
            registration: {
              register: {
                status: 402,
                body: responseFixtures.apiError(
                  "whatsapp_payment_required",
                  "phone number register: (#131042) add a payment method",
                  402,
                ),
              },
            },
          },
        }),
      );
      let caught: AtribuApiError | null = null;
      try {
        await newClient().whatsapp.registration.register({
          connection_id: fixtures.ids.connectionId,
          phone_number_id: "109876543210987",
          pin: "654321",
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.code).toBe("whatsapp_payment_required");
      expect(caught?.status).toBe(402);
      // 402 → fix_and_retry (add a card), NOT auto-retried by withRetry.
      expect(caught?.retry.action).toBe("fix_and_retry");
    });
  });

  describe("opt-in withRetry never replays attempt-limited steps", () => {
    // A transient 502 would normally be replayed by withRetry (5xx → retry).
    // request-code / verify-code / register are flagged retryable:false, so a
    // logical "request OTP" / "verify" / "register" fires the upstream Meta
    // call exactly once — honoring the spec's "never auto-retry the OTP".
    let requestCodeCalls = 0;
    let verifyCodeCalls = 0;
    let registerCalls = 0;
    const server = setupServer(
      http.post(`${BASE}/api/v1/whatsapp/registration/request-code`, () => {
        requestCodeCalls++;
        return HttpResponse.json(
          { error: { code: "provider_error", message: "upstream", status: 502 } },
          { status: 502 },
        );
      }),
      http.post(`${BASE}/api/v1/whatsapp/registration/verify-code`, () => {
        verifyCodeCalls++;
        return HttpResponse.json(
          { error: { code: "provider_error", message: "upstream", status: 502 } },
          { status: 502 },
        );
      }),
      http.post(`${BASE}/api/v1/whatsapp/registration/register`, () => {
        registerCalls++;
        return HttpResponse.json(
          { error: { code: "provider_error", message: "upstream", status: 502 } },
          { status: 502 },
        );
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    const retryClient = (): AtribuClient =>
      new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE }).withRetry({
        maxAttempts: 3,
        baseDelayMs: 1,
        jitter: 0,
        sleep: () => Promise.resolve(),
      });

    it("requestCode fires exactly once on a transient 502", async () => {
      await expect(
        retryClient().whatsapp.registration.requestCode({
          connection_id: fixtures.ids.connectionId,
          phone_number_id: "109876543210987",
          language: "es",
        }),
      ).rejects.toBeInstanceOf(AtribuApiError);
      expect(requestCodeCalls).toBe(1);
    });

    it("verifyCode fires exactly once on a transient 502", async () => {
      await expect(
        retryClient().whatsapp.registration.verifyCode({
          connection_id: fixtures.ids.connectionId,
          phone_number_id: "109876543210987",
          code: "123456",
        }),
      ).rejects.toBeInstanceOf(AtribuApiError);
      expect(verifyCodeCalls).toBe(1);
    });

    it("register fires exactly once on a transient 502", async () => {
      await expect(
        retryClient().whatsapp.registration.register({
          connection_id: fixtures.ids.connectionId,
          phone_number_id: "109876543210987",
          pin: "654321",
        }),
      ).rejects.toBeInstanceOf(AtribuApiError);
      expect(registerCalls).toBe(1);
    });
  });
});

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures, responseFixtures } from "../../src/test";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-wa-health.atribu.test";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

describe("whatsapp.health resource", () => {
  describe("happy path", () => {
    const server = setupServer(...atribuMockHandlers({ baseUrl: BASE }));
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(...atribuMockHandlers({ baseUrl: BASE })));
    afterAll(() => server.close());

    it("gets a healthy channel with cache metadata", async () => {
      const health = await newClient().whatsapp.health.get(fixtures.ids.connectionId);
      expect(health.canSend).toBe("AVAILABLE");
      expect(health.tokenValid).toBe(true);
      expect(health.webhookSubscribed).toBe(true);
      expect(health.phone.qualityRating).toBe("GREEN");
      expect(health.issues).toEqual([]);
      expect(health.stale).toBe(false);
      expect(health.refreshedAt).toBeTruthy();
    });

    it("refresh() resolves (hits the same path with refresh=true)", async () => {
      const health = await newClient().whatsapp.health.refresh(fixtures.ids.connectionId);
      expect(health.stale).toBe(false);
      expect(health.canSend).toBe("AVAILABLE");
    });
  });

  describe("degraded / broken channel", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        whatsapp: {
          health: {
            get: {
              body: responseFixtures.whatsappAccountHealth({
                canSend: null,
                tokenValid: false,
                webhookSubscribed: false,
                issues: [
                  {
                    entityType: "APP",
                    code: "token_invalid",
                    description: "The WhatsApp access token is invalid or expired.",
                    remediation: "Reconnect the WhatsApp account to mint a fresh token.",
                    severity: "critical",
                  },
                ],
              }),
            },
          },
        },
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("surfaces token/webhook problems as data, not a throw", async () => {
      const health = await newClient().whatsapp.health.get(fixtures.ids.connectionId);
      expect(health.tokenValid).toBe(false);
      expect(health.canSend).toBeNull();
      expect(health.issues[0]?.code).toBe("token_invalid");
      expect(health.issues[0]?.severity).toBe("critical");
    });
  });

  describe("error paths", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        whatsapp: {
          health: {
            get: {
              status: 403,
              body: responseFixtures.apiError(
                "forbidden",
                "This OAuth app is not authorized for the requested connection",
                403,
              ),
            },
          },
        },
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("get → 403 surfaces with do_not_retry", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().whatsapp.health.get(fixtures.ids.connectionId);
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.code).toBe("forbidden");
      expect(caught?.status).toBe(403);
      expect(caught?.retry.action).toBe("do_not_retry");
    });
  });

  describe("reconnect signal (#204)", () => {
    const RECONNECT_URL =
      "https://www.atribu.app/oauth/connect/whatsapp?flow=reconnect&connection_id=x";
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        whatsapp: {
          health: {
            get: {
              status: 401,
              body: responseFixtures.apiError("unauthorized", "Meta token rejected", 401, {
                reconnect_required: true,
                reconnect_url: RECONNECT_URL,
              }),
            },
          },
        },
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("exposes reconnectRequired + reconnectUrl as typed fields, distinct from generic errors", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().whatsapp.health.get(fixtures.ids.connectionId);
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.isReconnectRequired()).toBe(true);
      expect(caught?.reconnectRequired).toBe(true);
      expect(caught?.reconnectUrl).toBe(RECONNECT_URL);
    });
  });
});

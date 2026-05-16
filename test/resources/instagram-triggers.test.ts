import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures, responseFixtures } from "../../src/test";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-ig-triggers.atribu.test";
const TRIGGER_ID = "00000000-0000-0000-0000-000000000aaa";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

describe("instagram.triggers resource", () => {
  describe("happy path", () => {
    const server = setupServer(...atribuMockHandlers({ baseUrl: BASE }));
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(...atribuMockHandlers({ baseUrl: BASE })));
    afterAll(() => server.close());

    it("lists triggers", async () => {
      const list = await newClient().instagram.triggers.list({
        connectionId: fixtures.ids.connectionId,
      });
      expect(list).toHaveLength(1);
      expect(list[0]?.keyword).toBe("PRICE");
    });

    it("creates a trigger", async () => {
      const result = await newClient().instagram.triggers.create({
        connection_id: fixtures.ids.connectionId,
        keyword: "INFO",
        opening_message: "Sending you info now!",
      });
      expect(result.enabled).toBe(true);
    });

    it("updates a trigger", async () => {
      const result = await newClient().instagram.triggers.update(TRIGGER_ID, {
        enabled: false,
      });
      expect(typeof result.id).toBe("string");
    });

    it("deletes a trigger", async () => {
      await expect(newClient().instagram.triggers.delete(TRIGGER_ID)).resolves.toBeUndefined();
    });

    it("testDm returns the provider message id", async () => {
      const result = await newClient().instagram.triggers.testDm(TRIGGER_ID, {
        recipient_igsid: "1234567890",
      });
      expect(result.provider_message_id).toBe("mid.fixture");
    });

    it("resumeCircuit returns resumed: true", async () => {
      const result = await newClient().instagram.triggers.resumeCircuit({
        connectionId: fixtures.ids.connectionId,
      });
      expect(result.resumed).toBe(true);
    });
  });

  describe("error paths", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        instagram: {
          triggers: {
            create: {
              status: 409,
              body: responseFixtures.apiError(
                "forbidden",
                "A trigger with this keyword already exists",
                409,
              ),
            },
            testDm: {
              status: 502,
              body: responseFixtures.apiError(
                "provider_error",
                "Upstream Meta send failed: recipient outside 7-day window",
                502,
              ),
            },
          },
        },
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("create → duplicate keyword surfaces as 409", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().instagram.triggers.create({
          connection_id: fixtures.ids.connectionId,
          keyword: "PRICE",
          opening_message: "duplicate",
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.status).toBe(409);
    });

    it("testDm → 502 surfaces with retry hint", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().instagram.triggers.testDm(TRIGGER_ID, {
          recipient_igsid: "1234567890",
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.code).toBe("provider_error");
      expect(caught?.status).toBe(502);
      expect(caught?.retry.action).toBe("retry");
    });
  });
});

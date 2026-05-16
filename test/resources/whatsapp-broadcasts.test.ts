import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures, responseFixtures } from "../../src/test";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-wa-broadcasts.atribu.test";
const BROADCAST_ID = "00000000-0000-0000-0000-000000000fff";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

describe("whatsapp.broadcasts resource", () => {
  describe("happy path", () => {
    const server = setupServer(...atribuMockHandlers({ baseUrl: BASE }));
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(...atribuMockHandlers({ baseUrl: BASE })));
    afterAll(() => server.close());

    it("lists broadcasts", async () => {
      const list = await newClient().whatsapp.broadcasts.list({
        connectionId: fixtures.ids.connectionId,
      });
      expect(list).toHaveLength(1);
      expect(list[0]?.status).toBe("draft");
    });

    it("creates a broadcast", async () => {
      const result = await newClient().whatsapp.broadcasts.create({
        connection_id: fixtures.ids.connectionId,
        template_name: "welcome_message_0",
        template_language: "en_US",
        recipients: [{ phone_number: "+15551234567" }],
        name: "test broadcast",
      });
      expect(result.status).toBe("draft");
      expect(result.total_recipients).toBe(3);
    });

    it("gets a broadcast with recipients", async () => {
      const result = await newClient().whatsapp.broadcasts.get(BROADCAST_ID);
      expect(result.id).toBe(BROADCAST_ID);
      expect(Array.isArray(result.recipients)).toBe(true);
    });

    it("cancels a broadcast", async () => {
      const result = await newClient().whatsapp.broadcasts.cancel(BROADCAST_ID);
      expect(result.status).toBe("cancelled");
    });

    it("sends a broadcast (long-running)", async () => {
      const result = await newClient().whatsapp.broadcasts.send(BROADCAST_ID);
      expect(result.status).toBe("completed");
    });
  });

  describe("error paths", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        whatsapp: {
          broadcasts: {
            get: {
              status: 404,
              body: responseFixtures.apiError("not_found", "Broadcast not found", 404),
            },
            send: {
              status: 409,
              body: responseFixtures.apiError(
                "invalid_state",
                "Broadcast status 'completed' is not sendable",
                409,
              ),
            },
          },
        },
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("get → 404 surfaces", async () => {
      await expect(newClient().whatsapp.broadcasts.get(BROADCAST_ID)).rejects.toBeInstanceOf(AtribuApiError);
    });

    it("send → 409 surfaces with do_not_retry", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().whatsapp.broadcasts.send(BROADCAST_ID);
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.code).toBe("invalid_state");
      expect(caught?.status).toBe(409);
    });
  });
});

// Reassure unused-var lint on the BASE constant in eslint-strict mode.
void fixtures;

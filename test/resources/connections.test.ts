import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures, responseFixtures } from "../../src/test";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-connections.atribu.test";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

describe("connections resource", () => {
  describe("happy path", () => {
    const server = setupServer(...atribuMockHandlers({ baseUrl: BASE }));
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(...atribuMockHandlers({ baseUrl: BASE })));
    afterAll(() => server.close());

    it("lists connections", async () => {
      const list = await newClient().connections.list();
      expect(list).toHaveLength(1);
      expect(list[0]?.channel).toBe("whatsapp");
      expect(list[0]?.external_id).toBe("12345678901234");
    });

    it("filters by channel via query param", async () => {
      const list = await newClient().connections.list({ channel: "instagram" });
      expect(Array.isArray(list)).toBe(true);
    });

    it("gets a single connection", async () => {
      const conn = await newClient().connections.get(fixtures.ids.connectionId);
      expect(conn.id).toBe(fixtures.ids.connectionId);
      expect(conn.status).toBe("connected");
    });

    it("revokes returns void (204)", async () => {
      await expect(newClient().connections.revoke(fixtures.ids.connectionId)).resolves.toBeUndefined();
    });
  });

  describe("error paths", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        connections: {
          get: { status: 404, body: responseFixtures.apiError("not_found", "Connection not found", 404) },
          revoke: { status: 400, body: responseFixtures.apiError("invalid_request", "Direct admin keys cannot self-revoke", 400) },
        },
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("get → 404 surfaces as AtribuApiError with not_found", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().connections.get("00000000-0000-0000-0000-000000000999");
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught).toBeInstanceOf(AtribuApiError);
      expect(caught?.code).toBe("not_found");
      expect(caught?.status).toBe(404);
    });

    it("revoke → 400 (admin key) → fix_and_retry hint", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().connections.revoke(fixtures.ids.connectionId);
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.status).toBe(400);
      expect(caught?.retry.action).toBe("fix_and_retry");
    });
  });
});

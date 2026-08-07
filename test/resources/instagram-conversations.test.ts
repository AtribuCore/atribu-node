import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures, responseFixtures } from "../../src/test";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-ig-conversations.atribu.test";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

const CONVERSATION_ID = "aWdfZAG06MTpJR01lc3NhZ2VUaHJlYWQ6MQ";

describe("instagram.conversations resource", () => {
  describe("happy path", () => {
    const server = setupServer(...atribuMockHandlers({ baseUrl: BASE }));
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(...atribuMockHandlers({ baseUrl: BASE })));
    afterAll(() => server.close());

    it("lists conversations and surfaces Meta's cursor", async () => {
      const page = await newClient().instagram.conversations.list({
        connectionId: fixtures.ids.connectionId,
      });
      expect(page.conversations).toHaveLength(2);
      expect(page.conversations[0]?.id).toBe(CONVERSATION_ID);
      expect(page.hasNext).toBe(true);
      expect(page.nextCursor).toBe("QVFIUmNvbnZv...");
    });

    it("exposes participants so a thread can be attributed to an IGSID", async () => {
      const page = await newClient().instagram.conversations.list({
        connectionId: fixtures.ids.connectionId,
      });
      expect(page.conversations[0]?.participants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "9001", username: "jane.doe" }),
        ]),
      );
    });

    it("accepts the userId single-thread filter and paging options", async () => {
      const page = await newClient().instagram.conversations.list({
        connectionId: fixtures.ids.connectionId,
        userId: "9001",
        limit: 50,
        after: "PREV",
      });
      expect(page.conversations.length).toBeGreaterThan(0);
    });

    it("reads a thread's messages", async () => {
      const page = await newClient().instagram.conversations.messages(CONVERSATION_ID, {
        connectionId: fixtures.ids.connectionId,
      });
      expect(page.messages).toHaveLength(2);
      expect(page.messages[0]?.message).toBe("¿Sigue disponible el Corolla?");
      expect(page.messages[0]?.from?.username).toBe("jane.doe");
      expect(page.hasNext).toBe(false);
      expect(page.nextCursor).toBeNull();
    });

    it("surfaces an out-of-window message as id + created_time with a null body", async () => {
      // Meta serves content for the 20 most recent messages only. The older row
      // must arrive intact-but-empty so a consumer can tell "no body available"
      // apart from "empty message" — and so nothing here looks like a record
      // the SDK invented.
      const page = await newClient().instagram.conversations.messages(CONVERSATION_ID, {
        connectionId: fixtures.ids.connectionId,
      });
      const older = page.messages[1]!;
      expect(older.id).toBeTruthy();
      expect(older.created_time).toBe("2025-02-11T08:00:00+0000");
      expect(older.message).toBeNull();
      expect(older.from).toBeNull();
      expect(older.attachments).toBeNull();
    });
  });

  describe("error paths", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        instagram: {
          conversations: {
            list: {
              status: 403,
              body: responseFixtures.apiError(
                "forbidden",
                "This OAuth app is not authorized for the requested connection",
                403,
              ),
            },
            messages: {
              status: 422,
              body: responseFixtures.apiError(
                "invalid_request",
                "conversation messages read: Unsupported get request. Object with ID 'x' does not exist, cannot be loaded due to missing permissions, or does not support this operation. (Meta code 100/33)",
                422,
              ),
            },
          },
        },
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("list → 403 surfaces with do_not_retry", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().instagram.conversations.list({
          connectionId: fixtures.ids.connectionId,
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.code).toBe("forbidden");
      expect(caught?.status).toBe(403);
      expect(caught?.retry.action).toBe("do_not_retry");
    });

    it("messages → an unresolvable node is an actionable 422, never a bare 502", async () => {
      // The whole point of putting Meta's not-found pair on the fatal list: a
      // 502 would have had its body stripped by Cloudflare and reached here as
      // an unactionable transport error.
      let caught: AtribuApiError | null = null;
      try {
        await newClient().instagram.conversations.messages(CONVERSATION_ID, {
          connectionId: fixtures.ids.connectionId,
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.status).toBe(422);
      expect(caught?.code).toBe("invalid_request");
      expect(caught?.message).toContain("Meta code 100/33");
    });
  });
});

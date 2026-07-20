import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures, responseFixtures } from "../../src/test";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-wa-templates.atribu.test";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

describe("whatsapp.templates resource", () => {
  describe("happy path", () => {
    const server = setupServer(...atribuMockHandlers({ baseUrl: BASE }));
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(...atribuMockHandlers({ baseUrl: BASE })));
    afterAll(() => server.close());

    it("lists templates", async () => {
      const list = await newClient().whatsapp.templates.list({
        connectionId: fixtures.ids.connectionId,
      });
      expect(list).toHaveLength(1);
      expect(list[0]?.name).toBe("welcome_message_0");
      expect(list[0]?.status).toBe("APPROVED");
    });

    it("creates a template", async () => {
      const result = await newClient().whatsapp.templates.create({
        connection_id: fixtures.ids.connectionId,
        name: "test_template",
        category: "MARKETING",
        language: "en_US",
        body_text: "Hello {{name}}",
      });
      expect(result.status).toBe("PENDING");
      expect(typeof result.id).toBe("string");
    });

    it("deletes a template", async () => {
      await expect(
        newClient().whatsapp.templates.delete("welcome_message", {
          connectionId: fixtures.ids.connectionId,
        }),
      ).resolves.toBeUndefined();
    });

    it("lists from cache with quality + sync metadata", async () => {
      const list = await newClient().whatsapp.templates.list({
        connectionId: fixtures.ids.connectionId,
      });
      expect(list[0]?.quality_score).toBe("GREEN");
      expect(list[0]?.last_synced_at).toBeTruthy();
    });

    it("syncs and returns the reconciled list", async () => {
      const synced = await newClient().whatsapp.templates.sync({
        connectionId: fixtures.ids.connectionId,
      });
      expect(synced).toHaveLength(2);
      expect(synced[0]?.name).toBe("welcome_message_0");
    });

    it("syncWithSummary exposes the reconcile summary", async () => {
      const res = await newClient().whatsapp.templates.syncWithSummary({
        connectionId: fixtures.ids.connectionId,
      });
      expect(res.meta.summary).toEqual({ upserted: 2, deleted: 0, statusChanges: 1 });
    });
  });

  describe("error paths", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        whatsapp: {
          templates: {
            list: {
              status: 403,
              body: responseFixtures.apiError(
                "forbidden",
                "This OAuth app is not authorized for the requested connection",
                403,
              ),
            },
            create: {
              status: 422,
              body: responseFixtures.apiError(
                "validation_error",
                "name must be lowercase letters, digits and underscores only",
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
        await newClient().whatsapp.templates.list({ connectionId: fixtures.ids.connectionId });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.code).toBe("forbidden");
      expect(caught?.status).toBe(403);
      expect(caught?.retry.action).toBe("do_not_retry");
    });

    it("create → 422 surfaces with fix_and_retry", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().whatsapp.templates.create({
          connection_id: fixtures.ids.connectionId,
          name: "Bad Name",
          category: "MARKETING",
          language: "en_US",
          body_text: "x",
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.status).toBe(422);
      expect(caught?.retry.action).toBe("fix_and_retry");
    });
  });
});

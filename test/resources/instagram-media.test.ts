import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures, responseFixtures } from "../../src/test";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-ig-media.atribu.test";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

const CONTAINER_ID = "17889455560051444";
const MEDIA_ID = "17920000000000000";

describe("instagram.media resource", () => {
  describe("happy path", () => {
    const server = setupServer(...atribuMockHandlers({ baseUrl: BASE }));
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(...atribuMockHandlers({ baseUrl: BASE })));
    afterAll(() => server.close());

    it("lists media and surfaces Meta's cursor", async () => {
      const page = await newClient().instagram.media.list({
        connectionId: fixtures.ids.connectionId,
      });
      expect(page.media).toHaveLength(2);
      expect(page.media[0]?.media_type).toBe("IMAGE");
      expect(page.hasNext).toBe(true);
      expect(page.nextCursor).toBe("QVFIUmZ...");
    });

    it("expands carousel children and leaves non-carousel media null", async () => {
      const page = await newClient().instagram.media.list({
        connectionId: fixtures.ids.connectionId,
        limit: 10,
        after: "PREV",
      });
      expect(page.media[0]?.children).toBeNull();
      expect(page.media[1]?.media_type).toBe("CAROUSEL_ALBUM");
      expect(page.media[1]?.children).toHaveLength(2);
    });

    it("reads one media by id", async () => {
      const media = await newClient().instagram.media.get(MEDIA_ID, {
        connectionId: fixtures.ids.connectionId,
      });
      expect(media.id).toBe(MEDIA_ID);
      expect(media.permalink).toContain("instagram.com/p/");
    });

    it("creates an image container, then publishes it (two explicit steps)", async () => {
      const client = newClient();
      const container = await client.instagram.media.createContainer({
        connection_id: fixtures.ids.connectionId,
        media_type: "IMAGE",
        image_url: "https://cdn.example.com/car.jpg",
        caption: "Recién llegado 🚗",
      });
      expect(container.container_id).toBe(CONTAINER_ID);

      const published = await client.instagram.media.publish({
        connection_id: fixtures.ids.connectionId,
        creation_id: container.container_id,
      });
      expect(published.media_id).toBe(MEDIA_ID);
      expect(published.creation_id).toBe(CONTAINER_ID);
    });

    it("creates a carousel parent from child container ids", async () => {
      const container = await newClient().instagram.media.createContainer({
        connection_id: fixtures.ids.connectionId,
        media_type: "CAROUSEL",
        children: ["1", "2"],
        caption: "Galería",
      });
      expect(container.container_id).toBeTruthy();
    });
  });

  describe("error paths", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        instagram: {
          media: {
            list: {
              status: 403,
              body: responseFixtures.apiError(
                "forbidden",
                "This OAuth app is not authorized for the requested connection",
                403,
              ),
            },
            publish: {
              status: 429,
              body: responseFixtures.apiError(
                "rate_limit_exceeded",
                "media publish rate-limited by Meta (retry in 30m)",
                429,
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
        await newClient().instagram.media.list({ connectionId: fixtures.ids.connectionId });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.code).toBe("forbidden");
      expect(caught?.status).toBe(403);
      expect(caught?.retry.action).toBe("do_not_retry");
    });

    it("publish → 429 surfaces Meta's 25-posts-per-24h cap", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().instagram.media.publish({
          connection_id: fixtures.ids.connectionId,
          creation_id: CONTAINER_ID,
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.status).toBe(429);
      expect(caught?.code).toBe("rate_limit_exceeded");
    });
  });
});

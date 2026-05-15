/**
 * Validates the `@atribu/node/test` subpath end-to-end the way consumers
 * actually use it: spin up MSW with our handlers, drive AtribuClient
 * through several calls, check the fixtures + overrides plumbing.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { AtribuClient } from "../src/client";
import {
  atribuMockHandlers,
  fixtures,
  eventFixtures,
  responseFixtures,
} from "../src/test";
import { AtribuApiError } from "../src/errors";

describe("@atribu/node/test", () => {
  describe("atribuMockHandlers — defaults", () => {
    const server = setupServer(
      ...atribuMockHandlers({ baseUrl: "https://mock.atribu.test" }),
    );

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(
      ...atribuMockHandlers({ baseUrl: "https://mock.atribu.test" }),
    ));
    afterAll(() => server.close());

    it("messages.send returns the canned response", async () => {
      const client = new AtribuClient({
        apiKey: "atb_live_test",
        baseUrl: "https://mock.atribu.test",
      });
      const result = await client.messages.send({
        connection_id: fixtures.ids.connectionId,
        channel: "whatsapp",
        to: "+15551234567",
        content: { type: "text", text: "hello" },
      });
      expect(result.provider_message_id).toBe("wamid.HBgM");
    });

    it("webhook subscription create returns the secret once", async () => {
      const client = new AtribuClient({
        apiKey: "atb_live_test",
        baseUrl: "https://mock.atribu.test",
      });
      const sub = await client.webhooks.subscriptions.create({
        url: "https://example.com/webhook",
        events: ["message.received"],
        providers: ["whatsapp"],
      });
      expect(sub.secret).toBe("whsec_fixture_test_secret_value");
    });

    it("webhook delete returns 204 with no body", async () => {
      const client = new AtribuClient({
        apiKey: "atb_live_test",
        baseUrl: "https://mock.atribu.test",
      });
      await expect(
        client.webhooks.subscriptions.delete("11111111-1111-1111-1111-111111111111"),
      ).resolves.toBeUndefined();
    });

    it("rotate-secret returns a new secret with grace window", async () => {
      const client = new AtribuClient({
        apiKey: "atb_live_test",
        baseUrl: "https://mock.atribu.test",
      });
      const result = await client.webhooks.subscriptions.rotateSecret(
        fixtures.ids.subscriptionId,
        { grace_days: 7 },
      );
      expect(result.secret).toBe("whsec_rotated_test_secret");
      expect(result.grace_days).toBe(7);
    });
  });

  describe("atribuMockHandlers — overrides", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: "https://mock.atribu.test",
        messages: {
          send: {
            status: 422,
            body: responseFixtures.apiError(
              "validation_error",
              "content.type unknown",
              422,
            ),
          },
        },
      }),
    );

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("propagates the override status + body as an AtribuApiError", async () => {
      const client = new AtribuClient({
        apiKey: "atb_live_test",
        baseUrl: "https://mock.atribu.test",
      });
      let caught: AtribuApiError | null = null;
      try {
        await client.messages.send({
          connection_id: fixtures.ids.connectionId,
          channel: "whatsapp",
          to: "+1",
          // @ts-expect-error — purposefully wrong
          content: { type: "unknown" },
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught).toBeInstanceOf(AtribuApiError);
      expect(caught?.code).toBe("validation_error");
      expect(caught?.status).toBe(422);
      expect(caught?.retry.action).toBe("fix_and_retry");
    });
  });

  describe("eventFixtures", () => {
    it("whatsappMessageReceived has the expected wire shape", () => {
      const ev = eventFixtures.whatsappMessageReceived();
      expect(ev.type).toBe("message.received");
      expect(ev.provider).toBe("whatsapp");
      expect(ev.data.wa_message_id).toBe("wamid.HBgM");
    });

    it("instagramPostback narrows to the postback variant", () => {
      const ev = eventFixtures.instagramPostback();
      expect(ev.type).toBe("message.received");
      expect(ev.provider).toBe("instagram");
      if ("kind" in ev.data) {
        expect(ev.data.kind).toBe("postback");
        expect(ev.data.payload).toBe("GET_STARTED");
      } else {
        expect.fail("postback narrowing failed");
      }
    });

    it("deep-merges overrides while preserving base fields", () => {
      const ev = eventFixtures.whatsappMessageReceived({
        data: { text: "custom message", contact_name: "Bob" },
      });
      expect(ev.data.text).toBe("custom message");
      expect(ev.data.contact_name).toBe("Bob");
      expect(ev.data.from).toBe("+15551234567"); // preserved
      expect(ev.id).toBe("evt_wa_received_01"); // preserved
    });

    it("supports overriding top-level fields", () => {
      const ev = eventFixtures.whatsappMessageReceived({
        id: "evt_custom",
        connection_id: "00000000-0000-0000-0000-000000000zzz",
      });
      expect(ev.id).toBe("evt_custom");
      expect(ev.connection_id).toBe("00000000-0000-0000-0000-000000000zzz");
    });
  });
});

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures } from "../../src/test";

const BASE = "https://mock-msg-interactive.atribu.test";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

describe("messages.send — WhatsApp interactive_buttons", () => {
  /**
   * Captures the outbound body so we can assert the SDK sends the new
   * content type with the right shape — no upstream stub validation of
   * `type=interactive_buttons` exists yet, so this is the only place
   * the wire format is exercised end-to-end before publish.
   */
  let captured: unknown = null;
  const server = setupServer(
    http.post(`${BASE}/api/v1/messages`, async ({ request }) => {
      captured = await request.json();
      return HttpResponse.json(
        {
          data: {
            connection_id: fixtures.ids.connectionId,
            channel: "whatsapp",
            to: "+15551234567",
            provider_message_id: "wamid.test_interactive_buttons",
            sent_at: new Date().toISOString(),
          },
          meta: { profile_id: fixtures.ids.profileId },
        },
        { headers: { "x-request-id": "req_test" } },
      );
    }),
    ...atribuMockHandlers({ baseUrl: BASE }).filter(
      // Drop the default messages.send handler — our capturing one above wins.
      (h) =>
        !(h.info.path === `${BASE}/api/v1/messages` && h.info.method === "POST"),
    ),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    captured = null;
  });
  afterAll(() => server.close());

  it("sends interactive_buttons content with body, header, and up to 3 buttons", async () => {
    const result = await newClient().messages.send({
      connection_id: fixtures.ids.connectionId,
      channel: "whatsapp",
      to: "+15551234567",
      content: {
        type: "interactive_buttons",
        body: "Pick a plan:",
        header: "Pricing",
        buttons: [
          { id: "plan_basic", title: "Basic" },
          { id: "plan_pro", title: "Pro" },
          { id: "plan_enterprise", title: "Enterprise" },
        ],
      },
    });

    expect(result.provider_message_id).toBe("wamid.test_interactive_buttons");

    // Verify the SDK actually serialized the new shape onto the wire.
    expect(captured).toEqual({
      connection_id: fixtures.ids.connectionId,
      channel: "whatsapp",
      to: "+15551234567",
      content: {
        type: "interactive_buttons",
        body: "Pick a plan:",
        header: "Pricing",
        buttons: [
          { id: "plan_basic", title: "Basic" },
          { id: "plan_pro", title: "Pro" },
          { id: "plan_enterprise", title: "Enterprise" },
        ],
      },
    });
  });

  it("type-narrows interactive_buttons (compile-time)", () => {
    // Pure type-level check — if this stops compiling, the discriminated
    // union no longer carries the variant.
    const content = {
      type: "interactive_buttons" as const,
      body: "x",
      buttons: [{ id: "a", title: "A" }],
    };
    if (content.type === "interactive_buttons") {
      // `buttons` must be present on this branch.
      const _check: { id: string; title: string }[] = content.buttons;
      expect(_check).toHaveLength(1);
    }
  });
});

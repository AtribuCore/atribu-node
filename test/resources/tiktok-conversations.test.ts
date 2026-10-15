import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";

const BASE = "https://mock-tiktok-conversations.atribu.test";
const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "a1AbcBdeCfghDijkEF2b3+lmGn==";
const seen: URL[] = [];

const server = setupServer(
  http.get(`${BASE}/api/v1/tiktok/conversations`, ({ request }) => {
    seen.push(new URL(request.url));
    return HttpResponse.json({
      data: [{ conversation_id: CONVERSATION_ID, update_time: 1760270400000, referral: null }],
      pagination: { has_next: true, cursor: "3" },
      meta: { profile_id: "p" },
    });
  }),
  http.get(`${BASE}/api/v1/tiktok/conversations/:id/messages`, ({ request, params }) => {
    seen.push(new URL(request.url));
    return HttpResponse.json({
      data: [
        {
          message_id: "m1",
          conversation_id: String(params.id),
          timestamp: 1760270400000,
          message_type: "TEXT",
          sender: "ana",
          recipient: "clinica",
          from_user: { id: "u1", role: "PERSONAL_ACCOUNT" },
          to_user: { id: "open-1", role: "BUSINESS_ACCOUNT" },
          source: "APP",
          auto_message_type: null,
          text: "Hola",
          image_media_id: null,
          video_media_id: null,
          share_post_embed_url: null,
          sticker_url: null,
          emoji_url: null,
          template: null,
          reactions: null,
          referenced_message_id: null,
        },
      ],
      participants: [{ id: "u1", role: "PERSONAL_ACCOUNT", display_name: "Ana", profile_image: null, is_follower: true }],
      reply_window: { open: true, reason: null, last_inbound_at: "2026-10-12T12:00:00.000Z", closes_at: "2026-10-14T12:00:00.000Z", sends_remaining: 10 },
      meta: { profile_id: "p" },
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("tiktok.conversations resource", () => {
  it("lists conversations with type/limit/cursor and turns TikTok's cursor back into a number", async () => {
    const page = await new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE }).tiktok.conversations.list({
      connectionId: CONNECTION_ID,
      type: "stranger",
      limit: 50,
      cursor: 0,
    });
    expect(page.conversations[0]?.conversation_id).toBe(CONVERSATION_ID);
    expect(page).toMatchObject({ hasNext: true, nextCursor: 3 });
    const url = seen.at(-1)!;
    expect(url.searchParams.get("type")).toBe("stranger");
    expect(url.searchParams.get("cursor")).toBe("0");
  });

  it("reads a conversation's messages, URL-encoding the id, with the reply window", async () => {
    const r = await new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE }).tiktok.conversations.messages(
      CONVERSATION_ID,
      { connectionId: CONNECTION_ID },
    );
    expect(seen.at(-1)!.pathname).toBe(
      `/api/v1/tiktok/conversations/${encodeURIComponent(CONVERSATION_ID)}/messages`,
    );
    expect(r.messages[0]?.text).toBe("Hola");
    expect(r.participants[0]?.display_name).toBe("Ana");
    expect(r.replyWindow.open).toBe(true);
  });
});

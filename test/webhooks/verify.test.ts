import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhook } from "../../src/webhooks/verify";
import { AtribuWebhookError } from "../../src/errors";
import type { AtribuWebhookEvent } from "../../src/webhooks/types";

/**
 * The linchpin test: server-side signs via `node:crypto.createHmac` (see
 * services/pipeline-worker/src/handlers/outbound-webhook.ts:buildSignatureHeader).
 * SDK verifies via Web Crypto. If they diverge by even one byte, Vitrina
 * sees every webhook fail with `invalid_signature`. Mirror the server's
 * signing fn here, sign a fixture, then verify with the SDK.
 */
function sign(secret: string, body: string, timestamp: number): string {
  const hmac = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

function makeEvent(overrides: Partial<AtribuWebhookEvent> = {}): AtribuWebhookEvent {
  return {
    id: "evt_01J",
    type: "message.received",
    occurred_at: "2026-05-14T10:00:00Z",
    app_id: "00000000-0000-0000-0000-000000000001",
    provider: "whatsapp",
    connection_id: "00000000-0000-0000-0000-000000000002",
    data: {
      wa_message_id: "wamid.x",
      from: "+15551234567",
      to: "+15559876543",
      contact_name: "Alice",
      type: "text",
      text: "hi",
      raw: {},
    },
    ...overrides,
  } as AtribuWebhookEvent;
}

describe("verifyWebhook", () => {
  const secret = "whsec_test_atribu_signature_12345678";
  const previousSecret = "whsec_previous_atribu_secret_12345678";

  it("verifies a freshly signed event", async () => {
    const event = makeEvent();
    const body = JSON.stringify(event);
    const ts = Math.floor(Date.now() / 1000);
    const signature = sign(secret, body, ts);

    const parsed = await verifyWebhook({ rawBody: body, signature, secret });
    expect(parsed.type).toBe("message.received");
    expect(parsed.provider).toBe("whatsapp");
  });

  it("rejects when signature does not match", async () => {
    const body = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000);
    const signature = sign(secret, body, ts);

    await expect(
      verifyWebhook({ rawBody: body + "tampered", signature, secret }),
    ).rejects.toMatchObject({ code: "invalid_signature" });
  });

  it("rejects expired timestamps beyond the tolerance", async () => {
    const body = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000) - 1000;
    const signature = sign(secret, body, ts);

    await expect(
      verifyWebhook({ rawBody: body, signature, secret, tolerance: 300 }),
    ).rejects.toMatchObject({ code: "expired_timestamp" });
  });

  it("accepts timestamps within tolerance", async () => {
    const body = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000) - 60;
    const signature = sign(secret, body, ts);

    const parsed = await verifyWebhook({ rawBody: body, signature, secret, tolerance: 300 });
    expect(parsed.id).toBe("evt_01J");
  });

  it("verifies with previousSecret during rotation grace", async () => {
    const body = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000);
    // Server still signs with the previous secret while consumer has new+previous both
    const signature = sign(previousSecret, body, ts);

    const parsed = await verifyWebhook({
      rawBody: body,
      signature,
      secret,
      previousSecret,
    });
    expect(parsed.id).toBe("evt_01J");
  });

  it("rejects when neither current nor previous secret matches", async () => {
    const body = JSON.stringify(makeEvent());
    const ts = Math.floor(Date.now() / 1000);
    const signature = sign("a_third_secret_we_never_authorized", body, ts);

    await expect(
      verifyWebhook({
        rawBody: body,
        signature,
        secret,
        previousSecret,
      }),
    ).rejects.toMatchObject({ code: "invalid_signature" });
  });

  it("rejects missing signature header", async () => {
    await expect(
      verifyWebhook({ rawBody: "{}", signature: null, secret }),
    ).rejects.toMatchObject({ code: "missing_signature" });
  });

  it("rejects malformed signature header", async () => {
    await expect(
      verifyWebhook({ rawBody: "{}", signature: "garbage", secret }),
    ).rejects.toMatchObject({ code: "malformed_header" });
  });

  it("accepts Uint8Array body", async () => {
    const event = makeEvent();
    const bodyString = JSON.stringify(event);
    const bodyBytes = new TextEncoder().encode(bodyString);
    const ts = Math.floor(Date.now() / 1000);
    const signature = sign(secret, bodyString, ts);

    const parsed = await verifyWebhook({ rawBody: bodyBytes, signature, secret });
    expect(parsed.id).toBe("evt_01J");
  });

  it("returns typed payload for instagram message.received", async () => {
    const event = makeEvent({
      provider: "instagram",
      type: "message.received",
      data: {
        sender_id: "ig_1",
        recipient_id: "ig_2",
        mid: "m_1",
        text: "hi",
        is_echo: false,
        attachments: null,
        referral: null,
        raw: {},
      },
    });
    const body = JSON.stringify(event);
    const ts = Math.floor(Date.now() / 1000);
    const parsed = await verifyWebhook({
      rawBody: body,
      signature: sign(secret, body, ts),
      secret,
    });
    expect(parsed.provider).toBe("instagram");
    if (parsed.type === "message.received" && parsed.provider === "instagram") {
      // discriminated narrowing
      const data = parsed.data;
      if ("kind" in data) {
        // postback branch — not this fixture
        expect.fail("expected fb_login message branch");
      } else if ("is_echo" in data) {
        expect(data.mid).toBe("m_1");
      }
    }
  });

  it("does not call AtribuWebhookError as a constructor accidentally", () => {
    const err = new AtribuWebhookError("invalid_signature", "test");
    expect(err.code).toBe("invalid_signature");
    expect(err.name).toBe("AtribuWebhookError");
  });
});

import { describe, expect, it, vi } from "vitest";
import { AtribuClient } from "../src/client";
import { AtribuApiError, AtribuTransportError } from "../src/errors";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      "x-request-id": "req_test_123",
      ...(init.headers ?? {}),
    },
  });
}

describe("HttpClient via AtribuClient.messages.send", () => {
  it("sends a POST with the right headers, body, and idempotency key", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          connection_id: "11111111-1111-1111-1111-111111111111",
          channel: "whatsapp",
          to: "+15551234567",
          provider_message_id: "wamid.xyz",
          sent_at: "2026-05-15T00:00:00Z",
        },
      }),
    );
    const client = new AtribuClient({
      apiKey: "atb_live_test_key",
      baseUrl: "https://test.atribu.example",
      fetch: fetchSpy,
    });

    const result = await client.messages.send(
      {
        connection_id: "11111111-1111-1111-1111-111111111111",
        channel: "whatsapp",
        to: "+15551234567",
        content: { type: "text", text: "hi" },
      },
      { idempotencyKey: "idem_abc" },
    );

    expect(result.provider_message_id).toBe("wamid.xyz");
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://test.atribu.example/api/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer atb_live_test_key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Idempotency-Key"]).toBe("idem_abc");
    expect(headers["User-Agent"]).toMatch(/@atribu\/node\/\d+\.\d+\.\d+/);
    expect(init.body).toBe(
      JSON.stringify({
        connection_id: "11111111-1111-1111-1111-111111111111",
        channel: "whatsapp",
        to: "+15551234567",
        content: { type: "text", text: "hi" },
      }),
    );
  });

  it("generates a default idempotency key when not provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });
    await client.messages.send({
      connection_id: "11111111-1111-1111-1111-111111111111",
      channel: "whatsapp",
      to: "+1",
      content: { type: "text", text: "x" },
    });
    const headers = fetchSpy.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toMatch(/.{8,}/);
  });

  it("throws AtribuApiError with code + status + requestId + retry on 4xx", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "validation_error",
            message: "content.type unknown",
            status: 422,
            request_id: "req_xyz",
          },
        },
        { status: 422 },
      ),
    );
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });
    let caught: unknown;
    try {
      await client.messages.send({
        connection_id: "00000000-0000-0000-0000-000000000000",
        channel: "whatsapp",
        to: "+1",
        // @ts-expect-error — bad content
        content: { type: "unknown" },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AtribuApiError);
    const apiErr = caught as AtribuApiError;
    expect(apiErr.code).toBe("validation_error");
    expect(apiErr.status).toBe(422);
    expect(apiErr.requestId).toBe("req_test_123");
    expect(apiErr.retry.action).toBe("fix_and_retry");
  });

  it("surfaces Retry-After on 429", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "rate_limit_exceeded", message: "slow down", status: 429 } }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "3" },
        },
      ),
    );
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });
    let caught: AtribuApiError | null = null;
    try {
      await client.messages.send({
        connection_id: "00000000-0000-0000-0000-000000000000",
        channel: "whatsapp",
        to: "+1",
        content: { type: "text", text: "x" },
      });
    } catch (err) {
      caught = err as AtribuApiError;
    }
    expect(caught?.isRateLimit()).toBe(true);
    if (caught?.retry.action === "retry_after") {
      expect(caught.retry.retryAfterMs).toBe(3_000);
    } else {
      expect.fail("expected retry_after");
    }
  });

  it("wraps transport errors as AtribuTransportError", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });
    await expect(
      client.messages.send({
        connection_id: "00000000-0000-0000-0000-000000000000",
        channel: "whatsapp",
        to: "+1",
        content: { type: "text", text: "x" },
      }),
    ).rejects.toBeInstanceOf(AtribuTransportError);
  });

  it("returns void on 204 for DELETE", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });
    await expect(
      client.webhooks.subscriptions.delete("11111111-1111-1111-1111-111111111111"),
    ).resolves.toBeUndefined();
  });

  it("user-supplied userAgent is appended", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    const client = new AtribuClient({
      apiKey: "atb_live_k",
      fetch: fetchSpy,
      userAgent: "MyApp/1.0",
    });
    await client.messages.send({
      connection_id: "00000000-0000-0000-0000-000000000000",
      channel: "whatsapp",
      to: "+1",
      content: { type: "text", text: "x" },
    });
    const headers = fetchSpy.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain("@atribu/node/");
    expect(headers["User-Agent"]).toContain("MyApp/1.0");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
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

  describe("timeout resolution", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Never settles on its own; only the abort signal ends it. */
    function hangingFetch() {
      return vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      );
    }

    /**
     * Still in flight at `deadlineMs - 1`, aborted with `message` at
     * `deadlineMs`. The lower bound is the load-bearing half — without it the
     * assertion would also pass for a request abandoned immediately.
     */
    async function expectAbortsAt(
      pending: Promise<unknown>,
      deadlineMs: number,
      message: RegExp,
    ): Promise<void> {
      let settled = false;
      void pending.catch(() => {}).finally(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(deadlineMs - 1);
      expect(settled, `settled before its ${deadlineMs}ms deadline`).toBe(false);

      const assertion = expect(pending).rejects.toThrow(message);
      await vi.advanceTimersByTimeAsync(1);
      await assertion;
    }

    const sendInput = {
      connection_id: "00000000-0000-0000-0000-000000000000",
      channel: "whatsapp",
      to: "+1",
      content: { type: "text", text: "x" },
    } as const;

    it("uses the client timeoutMs when a call sets none", async () => {
      // Regression pin: `messages.send` (and every other pre-existing resource)
      // passes no per-call timeout, so the client default must still bound it —
      // and the error must name that same number.
      vi.useFakeTimers();
      const client = new AtribuClient({
        apiKey: "atb_live_k",
        fetch: hangingFetch() as unknown as typeof fetch,
        timeoutMs: 1_500,
      });

      await expectAbortsAt(client.messages.send(sendInput), 1_500, /timeout 1500ms/);
    });

    it("a per-call deadline bounds only that request", async () => {
      vi.useFakeTimers();
      const client = new AtribuClient({
        apiKey: "atb_live_k",
        fetch: hangingFetch() as unknown as typeof fetch,
        timeoutMs: 30_000,
      });

      await expectAbortsAt(
        client.messages.typing(
          {
            connection_id: "00000000-0000-0000-0000-000000000000",
            channel: "whatsapp",
            to: "56912345678",
            message_id: "wamid.x",
          },
          { timeoutMs: 40 },
        ),
        40,
        /timeout 40ms/,
      );

      // The client default is untouched — the next call still gets 30s.
      await expectAbortsAt(client.messages.send(sendInput), 30_000, /timeout 30000ms/);
    });

    it("reports a caller's own abort as an abort, not as a timeout", async () => {
      // Both arrive as AbortError. Calling a caller-initiated cancellation
      // "timeout 30000ms" sends whoever reads the log chasing latency that
      // never happened.
      vi.useFakeTimers();
      const client = new AtribuClient({
        apiKey: "atb_live_k",
        fetch: hangingFetch() as unknown as typeof fetch,
        timeoutMs: 30_000,
      });

      const controller = new AbortController();
      const pending = client.messages.send(sendInput, { signal: controller.signal });
      const assertion = expect(pending).rejects.toThrow(/aborted by caller/);

      controller.abort();
      await vi.advanceTimersByTimeAsync(0);
      await assertion;
    });

    it("still reports a real timeout as a timeout", async () => {
      // The other side of the same branch — an unused caller signal must not
      // turn a genuine timeout into "aborted by caller".
      vi.useFakeTimers();
      const client = new AtribuClient({
        apiKey: "atb_live_k",
        fetch: hangingFetch() as unknown as typeof fetch,
        timeoutMs: 800,
      });

      const controller = new AbortController();
      await expectAbortsAt(
        client.messages.send(sendInput, { signal: controller.signal }),
        800,
        /timeout 800ms/,
      );
    });

    it("treats a client timeoutMs of 0 or NaN as absent on a generic request", async () => {
      // `resolveTimeout` must not let a garbage per-call value disable the
      // deadline; 0 is not "no timeout".
      vi.useFakeTimers();
      const client = new AtribuClient({
        apiKey: "atb_live_k",
        fetch: hangingFetch() as unknown as typeof fetch,
        timeoutMs: 2_000,
      });

      await expectAbortsAt(
        client.messages.typing(
          {
            connection_id: "00000000-0000-0000-0000-000000000000",
            channel: "whatsapp",
            to: "56912345678",
            message_id: "wamid.x",
          },
          { timeoutMs: 0 },
        ),
        2_000,
        /timeout 2000ms/,
      );
    });
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

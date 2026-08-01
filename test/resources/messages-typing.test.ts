import { afterEach, describe, expect, it, vi } from "vitest";
import { AtribuClient } from "../../src/client";
import { AtribuApiError, AtribuTransportError } from "../../src/errors";

/**
 * `messages.typing` is the first resource whose DEFAULTS are transport policy
 * rather than just a path and a body, so this file pins the policy as tightly
 * as the wire format: a single attempt even under a retrying client, and a 5s
 * deadline rather than the client's 30s.
 *
 * Driven through a `fetch` spy rather than MSW because the timeout and the
 * attempt count are only observable at the transport boundary.
 */

const CONNECTION_ID = "11111111-1111-1111-1111-111111111111";
const WAMID = "wamid.HBgLNTY5MTIzNDU2NzgVAgASGBQz";

/**
 * A `Response` body can only be read once, so any spy that expects more than
 * one attempt must mint a fresh one per call — never `mockResolvedValue`.
 */
function respondsWith(body: unknown, init: ResponseInit = {}): () => Promise<Response> {
  return async () => jsonResponse(body, init);
}

/** A fetch that never settles on its own — only the abort signal ends it. */
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
 * Asserts a request is STILL IN FLIGHT at `deadlineMs - 1`, then that it aborts
 * with `message` at `deadlineMs`.
 *
 * The lower-bound half is the half that matters. Only advancing to the deadline
 * proves "aborted by then" — it would pass just as happily if the request had
 * been abandoned at 1ms, which is exactly the bug a timeout-resolution change
 * would introduce. Requires fake timers.
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

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      "x-request-id": "req_test_typing",
      ...(init.headers ?? {}),
    },
  });
}

function forwardedBody(overrides?: {
  forwarded?: boolean;
  reason?: string;
  indicator?: string;
}) {
  return {
    data: {
      connection_id: CONNECTION_ID,
      channel: "whatsapp",
      to: "56912345678",
      indicator: overrides?.indicator ?? "typing",
      forwarded: overrides?.forwarded ?? true,
      ...(overrides?.reason ? { reason: overrides.reason } : {}),
      requested_at: "2026-08-01T12:00:00.000Z",
    },
    meta: { profile_id: "22222222-2222-2222-2222-222222222222" },
  };
}

const input = {
  connection_id: CONNECTION_ID,
  channel: "whatsapp",
  to: "56912345678",
  message_id: WAMID,
} as const;

describe("messages.typing — wire format", () => {
  it("POSTs the exact path, body and headers", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(forwardedBody()));
    const client = new AtribuClient({
      apiKey: "atb_live_test_key",
      baseUrl: "https://test.atribu.example",
      fetch: fetchSpy,
    });

    const result = await client.messages.typing(input);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://test.atribu.example/api/v1/messages/typing");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(input));

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer atb_live_test_key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["User-Agent"]).toMatch(/@atribu\/node\/\d+\.\d+\.\d+/);

    expect(result.forwarded).toBe(true);
    expect(result.connection_id).toBe(CONNECTION_ID);
    expect(result.requested_at).toBe("2026-08-01T12:00:00.000Z");
    expect(result.reason).toBeUndefined();
  });

  it("returns the no-op branch as data, not an error (stale wamid)", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(forwardedBody({ forwarded: false, reason: "stale_message_id" })),
      );
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });

    const result = await client.messages.typing(input);

    expect(result.forwarded).toBe(false);
    expect(result.reason).toBe("stale_message_id");
  });

  it("returns the no-op branch as data (conversation mismatch)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse(
        forwardedBody({ forwarded: false, reason: "message_id_conversation_mismatch" }),
      ),
    );
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });

    const result = await client.messages.typing(input);

    expect(result.forwarded).toBe(false);
    expect(result.reason).toBe("message_id_conversation_mismatch");
  });

  it("surfaces a 404 as a normal AtribuApiError — the endpoint predates the server", async () => {
    // The route never legitimately 404s (an unknown connection_id is a 403), so
    // a 404 means "typing is not deployed on this bridge". The SDK must not
    // dress that up as anything else; the consumer latches the feature off.
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: "not_found", message: "nope" } }, { status: 404 }));
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });

    const err = await client.messages.typing(input).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AtribuApiError);
    expect((err as AtribuApiError).status).toBe(404);
  });
});

describe("messages.markRead — wire format", () => {
  it("sends the same body as typing() plus indicator:\"read\"", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(forwardedBody({ indicator: "read" })));
    const client = new AtribuClient({
      apiKey: "atb_live_test_key",
      baseUrl: "https://test.atribu.example",
      fetch: fetchSpy,
    });

    const result = await client.messages.markRead(input);

    const [url, init] = fetchSpy.mock.calls[0]!;
    // Same endpoint, not a sibling route — markRead is sugar, not a second API.
    expect(url).toBe("https://test.atribu.example/api/v1/messages/typing");
    expect(JSON.parse(init.body as string)).toEqual({
      connection_id: CONNECTION_ID,
      channel: "whatsapp",
      to: "56912345678",
      message_id: WAMID,
      indicator: "read",
    });

    expect(result.indicator).toBe("read");
    expect(result.forwarded).toBe(true);
  });

  it("typing() OMITS indicator entirely when the caller does not set it", async () => {
    // The compatibility pin, and the reason markRead sets the field rather than
    // typing() defaulting it: an Atribu deployment that predates `indicator`
    // must receive from v1.13.0 exactly the bytes v1.12.0 sent it. Sending
    // `indicator: "typing"` unasked would be a new field on every legacy
    // request for no gain — the server's own default already covers it.
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(forwardedBody()));
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });

    await client.messages.typing(input);

    const body = JSON.parse(fetchSpy.mock.calls[0]![1].body as string);
    expect(body).not.toHaveProperty("indicator");
    expect(Object.keys(body)).toEqual(["connection_id", "channel", "to", "message_id"]);
  });

  it("typing() forwards an explicit indicator when the caller sets one", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(forwardedBody()));
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });

    await client.messages.typing({ ...input, indicator: "typing" });

    expect(JSON.parse(fetchSpy.mock.calls[0]![1].body as string).indicator).toBe("typing");
  });

  it("surfaces an older bridge as indicator: undefined, not as an error", async () => {
    // A deployment predating the field answers 200 without it — and showed a
    // bubble. The SDK must hand that back verbatim so the consumer can notice.
    const legacy = forwardedBody() as { data: Record<string, unknown> };
    delete legacy.data.indicator;
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(legacy));
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });

    const result = await client.messages.markRead(input);

    expect(result.indicator).toBeUndefined();
    expect(result.forwarded).toBe(true);
  });

  it("returns the no-op branch as data, exactly like typing()", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse(
        forwardedBody({ forwarded: false, reason: "stale_message_id", indicator: "read" }),
      ),
    );
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy });

    const result = await client.messages.markRead(input);

    expect(result.forwarded).toBe(false);
    expect(result.reason).toBe("stale_message_id");
  });
});

describe("messages.markRead — inherits typing()'s transport policy", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("makes exactly ONE attempt on a 500, even on a retrying client", async () => {
    // No retries and a 5s ceiling are properties of the ENDPOINT, not of the
    // bubble: a replayed read receipt is still a second Graph call on a signal
    // whose value expired. markRead delegates to typing() so these cannot drift.
    const fetchSpy = vi
      .fn()
      .mockImplementation(
        respondsWith({ error: { code: "internal_error", message: "boom" } }, { status: 500 }),
      );
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy }).withRetry({
      maxAttempts: 5,
      backoff: "none",
      sleep: () => Promise.resolve(),
    });

    await expect(client.messages.markRead(input)).rejects.toBeInstanceOf(AtribuApiError);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("caps the deadline at 5000ms when the client budget is looser", async () => {
    vi.useFakeTimers();
    const client = new AtribuClient({
      apiKey: "atb_live_k",
      fetch: hangingFetch() as unknown as typeof fetch,
      timeoutMs: 30_000,
    });

    await expectAbortsAt(client.messages.markRead(input), 5_000, /timeout 5000ms/);
  });

  it("still honours an explicit caller timeoutMs", async () => {
    vi.useFakeTimers();
    const client = new AtribuClient({
      apiKey: "atb_live_k",
      fetch: hangingFetch() as unknown as typeof fetch,
      timeoutMs: 30_000,
    });

    await expectAbortsAt(
      client.messages.markRead(input, { timeoutMs: 2_000 }),
      2_000,
      /timeout 2000ms/,
    );
  });
});

describe("messages.typing — transport policy defaults", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("makes exactly ONE attempt on a 500, even on a retrying client", async () => {
    const fetchSpy = vi
      .fn()
      .mockImplementation(
        respondsWith({ error: { code: "internal_error", message: "boom" } }, { status: 500 }),
      );
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy }).withRetry({
      maxAttempts: 5,
      backoff: "none",
      sleep: () => Promise.resolve(),
    });

    await expect(client.messages.typing(input)).rejects.toBeInstanceOf(AtribuApiError);

    // A 500 is `retry.action === "retry"` — the ONLY thing stopping a replay
    // here is the resource's own maxRetries: 0.
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("makes exactly ONE attempt on a transport error, even on a retrying client", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy }).withRetry({
      maxAttempts: 5,
      backoff: "none",
      sleep: () => Promise.resolve(),
    });

    await expect(client.messages.typing(input)).rejects.toBeInstanceOf(AtribuTransportError);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("does not change messages.send — it still spends the full client budget", async () => {
    // The contrast pin. `send` sets neither knob, so the same retrying client
    // that gave typing one attempt gives send all five.
    const fetchSpy = vi
      .fn()
      .mockImplementation(
        respondsWith({ error: { code: "internal_error", message: "boom" } }, { status: 500 }),
      );
    const client = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchSpy }).withRetry({
      maxAttempts: 5,
      backoff: "none",
      sleep: () => Promise.resolve(),
    });

    await expect(
      client.messages.send({
        connection_id: CONNECTION_ID,
        channel: "whatsapp",
        to: "56912345678",
        content: { type: "text", text: "hi" },
      }),
    ).rejects.toBeInstanceOf(AtribuApiError);

    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });

  it("caps the deadline at 5000ms when the client budget is looser", async () => {
    vi.useFakeTimers();
    const client = new AtribuClient({
      apiKey: "atb_live_k",
      fetch: hangingFetch() as unknown as typeof fetch,
      timeoutMs: 30_000,
    });

    await expectAbortsAt(client.messages.typing(input), 5_000, /timeout 5000ms/);
  });

  it("does NOT raise a client budget tighter than 5000ms", async () => {
    // The ceiling semantics. A consumer who set a 300ms client-wide timeout
    // means it — a resource default must never widen their limit to 5000ms.
    vi.useFakeTimers();
    const client = new AtribuClient({
      apiKey: "atb_live_k",
      fetch: hangingFetch() as unknown as typeof fetch,
      timeoutMs: 300,
    });

    await expectAbortsAt(client.messages.typing(input), 300, /timeout 300ms/);
  });

  it("an explicit caller timeoutMs wins outright, above the 5000ms ceiling", async () => {
    // A ceiling constrains the SDK's own default, not the caller's stated
    // choice. 8000 > 5000 and is honored, because they asked for it.
    vi.useFakeTimers();
    const client = new AtribuClient({
      apiKey: "atb_live_k",
      fetch: hangingFetch() as unknown as typeof fetch,
      timeoutMs: 30_000,
    });

    await expectAbortsAt(
      client.messages.typing(input, { timeoutMs: 8_000 }),
      8_000,
      /timeout 8000ms/,
    );
  });

  it("an explicit caller timeoutMs also wins downward", async () => {
    vi.useFakeTimers();
    const client = new AtribuClient({
      apiKey: "atb_live_k",
      fetch: hangingFetch() as unknown as typeof fetch,
      timeoutMs: 30_000,
    });

    await expectAbortsAt(
      client.messages.typing(input, { timeoutMs: 2_000 }),
      2_000,
      /timeout 2000ms/,
    );
  });

  it("treats timeoutMs: 0 as 'not provided' rather than 'no timeout'", async () => {
    vi.useFakeTimers();
    const client = new AtribuClient({
      apiKey: "atb_live_k",
      fetch: hangingFetch() as unknown as typeof fetch,
      timeoutMs: 30_000,
    });

    // Falls back to the ceiling, NOT to an unbounded wait.
    await expectAbortsAt(
      client.messages.typing(input, { timeoutMs: 0 }),
      5_000,
      /timeout 5000ms/,
    );
  });

  it("treats a NaN timeoutMs as 'not provided'", async () => {
    vi.useFakeTimers();
    const client = new AtribuClient({
      apiKey: "atb_live_k",
      fetch: hangingFetch() as unknown as typeof fetch,
      timeoutMs: 30_000,
    });

    await expectAbortsAt(
      client.messages.typing(input, { timeoutMs: Number.NaN }),
      5_000,
      /timeout 5000ms/,
    );
  });
});


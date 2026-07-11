import { describe, expect, it, vi } from "vitest";
import { AtribuClient } from "../src/client";
import { AtribuApiError, AtribuTransportError } from "../src/errors";
import {
  RetryingHttpClient,
  isRetryableError,
} from "../src/retry-wrapper";
import type { HttpClientLike, RequestOptions } from "../src/http";

function makeHttp(handlers: Array<() => Promise<unknown>>): HttpClientLike {
  let i = 0;
  return {
    async request<T>(_opts: RequestOptions): Promise<T> {
      if (i >= handlers.length) throw new Error("exhausted");
      return handlers[i++]!() as Promise<T>;
    },
  };
}

function apiErr(opts: { status: number; code: string; retryAfterMs?: number }): AtribuApiError {
  return new AtribuApiError({
    code: opts.code,
    message: "test",
    status: opts.status,
    requestId: null,
    retry:
      opts.retryAfterMs !== undefined
        ? { action: "retry_after", retryAfterMs: opts.retryAfterMs }
        : opts.status >= 500
          ? { action: "retry" }
          : opts.status === 401
            ? { action: "refresh_token" }
            : opts.status === 403
              ? { action: "do_not_retry" }
              : { action: "fix_and_retry" },
    responseBody: null,
  });
}

describe("RetryingHttpClient", () => {
  const noSleep = () => Promise.resolve();
  const noJitter = { jitter: 0 };

  it("succeeds on first attempt without sleeping", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([async () => ({ data: "ok" })]);
    const retrying = new RetryingHttpClient(http, { maxAttempts: 3, sleep });
    const result = await retrying.request({ method: "POST", path: "/x" });
    expect(result).toEqual({ data: "ok" });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries on 5xx and succeeds on attempt 2", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => ({ data: "ok" }),
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 3,
      sleep,
      baseDelayMs: 100,
      ...noJitter,
    });
    const result = await retrying.request({ method: "POST", path: "/x" });
    expect(result).toEqual({ data: "ok" });
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(100);
  });

  it("uses exponential backoff between retries", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => ({ data: "ok" }),
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 3,
      sleep,
      baseDelayMs: 100,
      backoff: "exponential",
      ...noJitter,
    });
    await retrying.request({ method: "POST", path: "/x" });
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });

  it("supports fixed backoff", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => ({ data: "ok" }),
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 3,
      sleep,
      baseDelayMs: 250,
      backoff: "fixed",
      ...noJitter,
    });
    await retrying.request({ method: "POST", path: "/x" });
    expect(sleep).toHaveBeenNthCalledWith(1, 250);
    expect(sleep).toHaveBeenNthCalledWith(2, 250);
  });

  it("supports no backoff", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => ({ data: "ok" }),
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 2,
      sleep,
      backoff: "none",
    });
    await retrying.request({ method: "POST", path: "/x" });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("honors Retry-After hint exactly (no jitter applied)", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 429, code: "rate_limit_exceeded", retryAfterMs: 3000 });
      },
      async () => ({ data: "ok" }),
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 3,
      sleep,
      baseDelayMs: 100,
      jitter: 0.5, // jitter set but Retry-After should ignore it
    });
    await retrying.request({ method: "POST", path: "/x" });
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it("caps Retry-After at maxDelayMs", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 429, code: "rate_limit_exceeded", retryAfterMs: 99_999 });
      },
      async () => ({ data: "ok" }),
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 2,
      sleep,
      maxDelayMs: 5000,
    });
    await retrying.request({ method: "POST", path: "/x" });
    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it("caps exponential backoff at maxDelayMs", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => ({ data: "ok" }),
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 3,
      sleep,
      baseDelayMs: 10_000,
      maxDelayMs: 12_000,
      backoff: "exponential",
      ...noJitter,
    });
    await retrying.request({ method: "POST", path: "/x" });
    expect(sleep).toHaveBeenNthCalledWith(1, 10_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 12_000); // 20000 capped to 12000
  });

  it("does NOT retry 403 do_not_retry", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 403, code: "forbidden" });
      },
    ]);
    const retrying = new RetryingHttpClient(http, { maxAttempts: 5, sleep });
    await expect(
      retrying.request({ method: "POST", path: "/x" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("does NOT retry 422 fix_and_retry (caller's input is bad)", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 422, code: "validation_error" });
      },
    ]);
    const retrying = new RetryingHttpClient(http, { maxAttempts: 5, sleep });
    await expect(
      retrying.request({ method: "POST", path: "/x" }),
    ).rejects.toMatchObject({ status: 422 });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("does NOT retry 401 refresh_token", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 401, code: "unauthorized" });
      },
    ]);
    const retrying = new RetryingHttpClient(http, { maxAttempts: 5, sleep });
    await expect(
      retrying.request({ method: "POST", path: "/x" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries on AtribuTransportError (network glitch)", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw new AtribuTransportError("ECONNRESET", new Error("reset"));
      },
      async () => ({ data: "ok" }),
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 3,
      sleep,
      baseDelayMs: 100,
      ...noJitter,
    });
    await retrying.request({ method: "POST", path: "/x" });
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("gives up after maxAttempts and rethrows the last error", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 3,
      sleep,
      baseDelayMs: 100,
      ...noJitter,
    });
    await expect(
      retrying.request({ method: "POST", path: "/x" }),
    ).rejects.toMatchObject({ status: 503 });
    expect(sleep).toHaveBeenCalledTimes(2); // 3 attempts → 2 sleeps between
  });

  it("clamps maxAttempts to 1 if zero or negative", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
    ]);
    const retrying = new RetryingHttpClient(http, { maxAttempts: 0, sleep });
    await expect(
      retrying.request({ method: "POST", path: "/x" }),
    ).rejects.toMatchObject({ status: 503 });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("never replays a request flagged retryable:false (transient 5xx)", async () => {
    const sleep = vi.fn(noSleep);
    let calls = 0;
    const http: HttpClientLike = {
      async request<T>(_opts: RequestOptions): Promise<T> {
        calls++;
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
    };
    const retrying = new RetryingHttpClient(http, { maxAttempts: 3, sleep });
    await expect(
      retrying.request({ method: "POST", path: "/x", retryable: false }),
    ).rejects.toMatchObject({ status: 503 });
    // Single, attempt-limited action — fired exactly once, never replayed.
    expect(calls).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("never replays a request flagged retryable:false (transport error)", async () => {
    const sleep = vi.fn(noSleep);
    let calls = 0;
    const http: HttpClientLike = {
      async request<T>(_opts: RequestOptions): Promise<T> {
        calls++;
        throw new AtribuTransportError("ECONNRESET", null);
      },
    };
    const retrying = new RetryingHttpClient(http, { maxAttempts: 3, sleep });
    await expect(
      retrying.request({ method: "POST", path: "/x", retryable: false }),
    ).rejects.toBeInstanceOf(AtribuTransportError);
    expect(calls).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("applies jitter to backoff delays", async () => {
    const sleep = vi.fn(noSleep);
    const http = makeHttp([
      async () => {
        throw apiErr({ status: 503, code: "service_unavailable" });
      },
      async () => ({ data: "ok" }),
    ]);
    const retrying = new RetryingHttpClient(http, {
      maxAttempts: 2,
      sleep,
      baseDelayMs: 1000,
      jitter: 0.5,
      random: () => 1, // max jitter
    });
    await retrying.request({ method: "POST", path: "/x" });
    expect(sleep).toHaveBeenCalledWith(1500); // 1000 * (1 + 1 * 0.5)
  });
});

describe("AtribuClient.withRetry", () => {
  it("returns a new client that retries; original is untouched", async () => {
    let calls = 0;
    const fetchFn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) {
        return new Response(
          JSON.stringify({ error: { code: "service_unavailable", message: "503", status: 503 } }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          data: {
            connection_id: "11111111-1111-1111-1111-111111111111",
            channel: "whatsapp",
            to: "+1",
            provider_message_id: "wamid.x",
            sent_at: "2026-05-15T00:00:00Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const base = new AtribuClient({ apiKey: "atb_live_k", fetch: fetchFn });
    const retry = base.withRetry({
      maxAttempts: 3,
      baseDelayMs: 1,
      jitter: 0,
      sleep: () => Promise.resolve(),
    });
    expect(retry).not.toBe(base);
    expect(retry).toBeInstanceOf(AtribuClient);

    const result = await retry.messages.send({
      connection_id: "11111111-1111-1111-1111-111111111111",
      channel: "whatsapp",
      to: "+1",
      content: { type: "text", text: "x" },
    });
    expect(result.provider_message_id).toBe("wamid.x");
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("does not mutate the base client", async () => {
    const base = new AtribuClient({ apiKey: "k", fetch: vi.fn() });
    const baseMessages = base.messages;
    const retry = base.withRetry({ maxAttempts: 2 });
    expect(base.messages).toBe(baseMessages); // original unchanged
    expect(retry.messages).not.toBe(baseMessages); // new resource on wrapped http
  });
});

describe("isRetryableError", () => {
  it("returns true for transport errors", () => {
    expect(isRetryableError(new AtribuTransportError("x", null))).toBe(true);
  });
  it("returns true for retryable api errors", () => {
    expect(isRetryableError(apiErr({ status: 503, code: "service_unavailable" }))).toBe(true);
    expect(
      isRetryableError(apiErr({ status: 429, code: "rate_limit_exceeded", retryAfterMs: 1000 })),
    ).toBe(true);
  });
  it("returns false for non-retryable api errors", () => {
    expect(isRetryableError(apiErr({ status: 403, code: "forbidden" }))).toBe(false);
    expect(isRetryableError(apiErr({ status: 422, code: "validation_error" }))).toBe(false);
    expect(isRetryableError(apiErr({ status: 401, code: "unauthorized" }))).toBe(false);
  });
  it("returns false for non-Atribu errors", () => {
    expect(isRetryableError(new Error("random"))).toBe(false);
    expect(isRetryableError("string")).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });
});

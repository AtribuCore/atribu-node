import { describe, expect, it } from "vitest";
import { deriveRetryHint } from "../src/retry";

describe("deriveRetryHint", () => {
  it("401 → refresh_token", () => {
    expect(deriveRetryHint({ status: 401, retryAfterHeader: null, errorCode: null }).action)
      .toBe("refresh_token");
  });

  it("403 → do_not_retry", () => {
    expect(deriveRetryHint({ status: 403, retryAfterHeader: null, errorCode: "forbidden" }).action)
      .toBe("do_not_retry");
  });

  it("422 → fix_and_retry", () => {
    expect(
      deriveRetryHint({ status: 422, retryAfterHeader: null, errorCode: "validation_error" })
        .action,
    ).toBe("fix_and_retry");
  });

  it("429 with Retry-After (seconds) → retry_after with the right delay", () => {
    const hint = deriveRetryHint({ status: 429, retryAfterHeader: "12", errorCode: null });
    expect(hint.action).toBe("retry_after");
    if (hint.action === "retry_after") expect(hint.retryAfterMs).toBe(12_000);
  });

  it("429 without Retry-After → retry_after default 1s", () => {
    const hint = deriveRetryHint({ status: 429, retryAfterHeader: null, errorCode: null });
    expect(hint.action).toBe("retry_after");
    if (hint.action === "retry_after") expect(hint.retryAfterMs).toBe(1000);
  });

  it("503 → retry", () => {
    expect(deriveRetryHint({ status: 503, retryAfterHeader: null, errorCode: null }).action)
      .toBe("retry");
  });

  it("503 with Retry-After date → retry_after", () => {
    const future = new Date(Date.now() + 5_000).toUTCString();
    const hint = deriveRetryHint({ status: 503, retryAfterHeader: future, errorCode: null });
    expect(hint.action).toBe("retry_after");
  });

  it("404 → fix_and_retry", () => {
    expect(deriveRetryHint({ status: 404, retryAfterHeader: null, errorCode: "not_found" }).action)
      .toBe("fix_and_retry");
  });

  it("200 → do_not_retry (shouldn't be called but defensive)", () => {
    expect(deriveRetryHint({ status: 200, retryAfterHeader: null, errorCode: null }).action)
      .toBe("do_not_retry");
  });

  it("insufficient_scope → do_not_retry regardless of status", () => {
    expect(
      deriveRetryHint({ status: 403, retryAfterHeader: null, errorCode: "insufficient_scope" })
        .action,
    ).toBe("do_not_retry");
  });

  it("whatsapp_register_limit → do_not_retry despite 429 (10/72h cap)", () => {
    expect(
      deriveRetryHint({
        status: 429,
        retryAfterHeader: null,
        errorCode: "whatsapp_register_limit",
      }).action,
    ).toBe("do_not_retry");
  });

  it("whatsapp_payment_required → fix_and_retry (add a card first)", () => {
    expect(
      deriveRetryHint({
        status: 402,
        retryAfterHeader: null,
        errorCode: "whatsapp_payment_required",
      }).action,
    ).toBe("fix_and_retry");
  });
});

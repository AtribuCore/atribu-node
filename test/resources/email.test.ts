import { describe, it, expect } from "vitest";
import { EmailResource } from "../../src/resources/email";
import type { HttpClientLike, RequestOptions } from "../../src/http";

/**
 * The email resource is a thin typed wrapper over the transport. These tests
 * pin the wire contract each method emits (method + path + body) and that it
 * unwraps the `data` envelope. A fake transport keeps it free of MSW/network.
 */
function fakeHttp(data: unknown = { ok: true }): {
  http: HttpClientLike;
  calls: RequestOptions[];
} {
  const calls: RequestOptions[] = [];
  const http: HttpClientLike = {
    async request<T>(opts: RequestOptions): Promise<T> {
      calls.push(opts);
      return { data, meta: {} } as unknown as T;
    },
  };
  return { http, calls };
}

/** The single recorded request, guarded so TS narrows away `undefined`. */
function only(calls: RequestOptions[]): RequestOptions {
  expect(calls).toHaveLength(1);
  const call = calls[0];
  if (!call) throw new Error("no request recorded");
  return call;
}

describe("email resource", () => {
  it("search → POST /api/v1/email/search with the body", async () => {
    const { http, calls } = fakeHttp({ threads: [{ id: "t1", snippet: "s", subject: null }], next_cursor: null });
    const out = await new EmailResource(http).search({ connection_id: "c1", query: "is:unread" });
    const call = only(calls);
    expect(call.method).toBe("POST");
    expect(call.path).toBe("/api/v1/email/search");
    expect(call.body).toEqual({ connection_id: "c1", query: "is:unread" });
    expect(out).toEqual({ threads: [{ id: "t1", snippet: "s", subject: null }], next_cursor: null });
  });

  it("getThread → GET /api/v1/email/threads/{id}?connection_id=", async () => {
    const { http, calls } = fakeHttp({ thread_id: "t1", messages: [] });
    await new EmailResource(http).getThread("t1", { connectionId: "c1" });
    const call = only(calls);
    expect(call.method).toBe("GET");
    expect(call.path).toBe("/api/v1/email/threads/t1?connection_id=c1");
  });

  it("createDraft → POST /api/v1/email/drafts with the body", async () => {
    const { http, calls } = fakeHttp({ draft_id: "d1", thread_id: "t1" });
    const out = await new EmailResource(http).createDraft({
      connection_id: "c1",
      thread_id: "t1",
      to: ["a@b.com"],
      text: "hi",
    });
    const call = only(calls);
    expect(call.method).toBe("POST");
    expect(call.path).toBe("/api/v1/email/drafts");
    expect((call.body as { to: string[] }).to).toEqual(["a@b.com"]);
    expect(out.draft_id).toBe("d1");
  });

  it("modifyLabels → POST /api/v1/email/threads/{id}/labels with the body", async () => {
    const { http, calls } = fakeHttp({ thread_id: "t1", added: ["L1"], removed: [] });
    await new EmailResource(http).modifyLabels("t1", { connection_id: "c1", add: ["Sales"] });
    const call = only(calls);
    expect(call.method).toBe("POST");
    expect(call.path).toBe("/api/v1/email/threads/t1/labels");
    expect((call.body as { add: string[] }).add).toEqual(["Sales"]);
  });

  it("listLabels → GET /api/v1/email/labels?connection_id=", async () => {
    const { http, calls } = fakeHttp({ labels: [{ id: "L1", name: "Sales", type: "user" }] });
    const out = await new EmailResource(http).listLabels({ connectionId: "c1" });
    const call = only(calls);
    expect(call.method).toBe("GET");
    expect(call.path).toBe("/api/v1/email/labels?connection_id=c1");
    expect(out.labels[0]?.name).toBe("Sales");
  });
});

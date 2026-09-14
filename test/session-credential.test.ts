/**
 * The `accessToken` credential and the profile scope that comes with it (#590).
 *
 * The API accepts two bearer credentials on the same header and tells them
 * apart by shape. What differs on this side is what they IDENTIFY: an API key
 * is a tenant, a session token is a person who may reach several — so the
 * session path has to name a profile, and the client, not the caller, is where
 * that name lives.
 */
import { describe, expect, it, vi } from "vitest";
import { AtribuClient } from "../src/client";
import { AtribuConfigError } from "../src/errors";
import { resolveConfig } from "../src/config";

const PROFILE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TOKEN = "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1In0.sig";
const REFRESHED = "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1In0.refreshed";

function okJson(): Response {
  return new Response(JSON.stringify({ data: {}, meta: { profile_id: PROFILE } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function newSessionClient(fetchSpy: ReturnType<typeof vi.fn>): AtribuClient {
  return new AtribuClient({
    accessToken: TOKEN,
    profileId: PROFILE,
    baseUrl: "https://session.atribu.test",
    fetch: fetchSpy as unknown as typeof fetch,
  });
}

describe("credential resolution", () => {
  it("rejects both credentials at construction", () => {
    expect(
      () => new AtribuClient({ apiKey: "atb_live_x", accessToken: TOKEN, profileId: PROFILE }),
    ).toThrow(AtribuConfigError);
  });

  it("requires a tenant scope when built with accessToken", () => {
    expect(() => new AtribuClient({ accessToken: TOKEN })).toThrow(AtribuConfigError);
    // #487 widened the accepted scope from "profileId" to "profileId OR
    // workspaceId": the workspace-grain routes have no profile to name.
    expect(() => new AtribuClient({ accessToken: TOKEN })).toThrow(/profileId .* is required/);
  });

  it("accepts workspaceId as that scope, and sends it as ?workspace_id=", async () => {
    const calls: string[] = [];
    const client = new AtribuClient({
      accessToken: TOKEN,
      workspaceId: "99999999-9999-4999-8999-999999999999",
      baseUrl: "https://scope.atribu.test",
      fetch: (async (input: RequestInfo | URL) => {
        calls.push(typeof input === "string" ? input : String(input));
        return new Response(JSON.stringify({ data: [], meta: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch,
    });

    await client.workspaces.list();

    expect(calls[0]).toContain("workspace_id=99999999-9999-4999-8999-999999999999");
    expect(calls[0]).not.toContain("profile_id=");
  });

  it("refuses a client carrying BOTH scopes", () => {
    // Two scopes on one client means every request asserts two and the route
    // silently picks. One client, one tenant.
    expect(
      () =>
        new AtribuClient({
          accessToken: TOKEN,
          profileId: "11111111-1111-4111-8111-111111111111",
          workspaceId: "99999999-9999-4999-8999-999999999999",
        }),
    ).toThrow(/exactly one of profileId, workspaceId or userScoped/);
  });

  it("accepts userScoped as that scope, and sends NO tenant parameter", async () => {
    // #648. `/api/v1/me` has no tenant to name — the answer IS the principal —
    // so the third scope form threads nothing onto the query string.
    const calls: string[] = [];
    const client = new AtribuClient({
      accessToken: TOKEN,
      userScoped: true,
      baseUrl: "https://scope.atribu.test",
      fetch: (async (input: RequestInfo | URL) => {
        calls.push(typeof input === "string" ? input : String(input));
        return new Response(JSON.stringify({ data: {}, meta: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch,
    });

    await client.me.get();

    expect(calls[0]).not.toContain("profile_id=");
    expect(calls[0]).not.toContain("workspace_id=");
  });

  it("refuses userScoped ALONGSIDE a tenant scope", () => {
    // The three forms are mutually exclusive, not additive: a client that named
    // a profile AND claimed user scope would assert two things about what it is.
    for (const extra of [
      { profileId: "11111111-1111-4111-8111-111111111111" },
      { workspaceId: "99999999-9999-4999-8999-999999999999" },
    ]) {
      expect(
        () => new AtribuClient({ accessToken: TOKEN, userScoped: true, ...extra }),
      ).toThrow(/exactly one of profileId, workspaceId or userScoped/);
    }
  });

  it("does NOT let userScoped: false stand in for naming a scope", () => {
    // The relaxation is a positive statement, never the absence of one — a
    // forgotten `profileId` has to stay a construction-time error, which is the
    // whole reason this check exists.
    expect(() => new AtribuClient({ accessToken: TOKEN, userScoped: false })).toThrow(
      AtribuConfigError,
    );
  });

  it("treats an empty-string credential as absent, not as a credential", () => {
    // A config assembled from env vars produces "" for an unset var as often as
    // it produces undefined. Accepting "" would send `Bearer ` and collect a
    // 401 that names nothing.
    expect(resolveConfig({ apiKey: "" }).credential).toBeNull();
    expect(() => new AtribuClient({ accessToken: "", profileId: null })).not.toThrow();
  });

  it("still constructs with neither, and fails at the call that needed one", async () => {
    const client = new AtribuClient({ baseUrl: "https://session.atribu.test" });
    await expect(client.analytics.overview({ date_from: "2026-08-01", date_to: "2026-08-26" }))
      .rejects.toThrow(/apiKey or accessToken is required for GET \/api\/v1\/overview/);
  });

  it("reports which credential it holds", () => {
    expect(resolveConfig({ apiKey: "atb_live_x" }).credential).toBe("api_key");
    expect(resolveConfig({ accessToken: TOKEN, profileId: PROFILE }).credential).toBe(
      "access_token",
    );
  });

  it("rejects a non-string accessToken / profileId", () => {
    expect(() =>
      resolveConfig({ accessToken: 42 as unknown as string, profileId: PROFILE }),
    ).toThrow(AtribuConfigError);
    expect(() =>
      resolveConfig({ accessToken: TOKEN, profileId: 42 as unknown as string }),
    ).toThrow(AtribuConfigError);
  });
});

// ---------------------------------------------------------------------------
// accessToken as a callback (#610)
// ---------------------------------------------------------------------------

describe("accessToken as a callback", () => {
  it("reports credential access_token, same as a plain string", () => {
    expect(
      resolveConfig({ accessToken: () => TOKEN, profileId: PROFILE }).credential,
    ).toBe("access_token");
  });

  it("requires a tenant scope, same as a plain string (#487)", () => {
    expect(() => new AtribuClient({ accessToken: () => TOKEN })).toThrow(
      /profileId .* is required/,
    );
  });

  it("rejects both credentials at construction, same as a plain string", () => {
    expect(
      () =>
        new AtribuClient({
          apiKey: "atb_live_x",
          accessToken: () => TOKEN,
          profileId: PROFILE,
        }),
    ).toThrow(AtribuConfigError);
  });

  it("resolves the callback per request — a sync return value", async () => {
    const fetchSpy = vi.fn().mockImplementation(async () => okJson());
    let current = TOKEN;
    const client = new AtribuClient({
      accessToken: () => current,
      profileId: PROFILE,
      baseUrl: "https://session.atribu.test",
      fetch: fetchSpy as unknown as typeof fetch,
    });

    await client.reports.templates();
    current = REFRESHED;
    await client.reports.schedules();

    expect(headerOf(fetchSpy.mock.calls[0])).toBe(`Bearer ${TOKEN}`);
    expect(headerOf(fetchSpy.mock.calls[1])).toBe(`Bearer ${REFRESHED}`);
  });

  it("resolves the callback per request — an async return value", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okJson());
    const client = new AtribuClient({
      accessToken: async () => {
        await Promise.resolve();
        return TOKEN;
      },
      profileId: PROFILE,
      baseUrl: "https://session.atribu.test",
      fetch: fetchSpy as unknown as typeof fetch,
    });

    await client.analytics.overview({ date_from: "2026-08-01", date_to: "2026-08-26" });
    expect(headerOf(fetchSpy.mock.calls[0])).toBe(`Bearer ${TOKEN}`);
  });

  it("never calls fetch when the callback throws — the failure is the credential's, not the transport's", async () => {
    const fetchSpy = vi.fn();
    const client = new AtribuClient({
      accessToken: () => {
        throw new Error("no live session");
      },
      profileId: PROFILE,
      baseUrl: "https://session.atribu.test",
      fetch: fetchSpy as unknown as typeof fetch,
    });

    await expect(client.reports.templates()).rejects.toThrow(/no live session/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("carries the credential through withRetry, same as a plain string", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okJson());
    let calls = 0;
    const client = new AtribuClient({
      accessToken: () => {
        calls += 1;
        return TOKEN;
      },
      profileId: PROFILE,
      baseUrl: "https://session.atribu.test",
      fetch: fetchSpy as unknown as typeof fetch,
    }).withRetry({ maxAttempts: 2, backoff: "none" });

    await client.analytics.overview({ date_from: "2026-08-01", date_to: "2026-08-26" });
    expect(headerOf(fetchSpy.mock.calls[0])).toBe(`Bearer ${TOKEN}`);
    expect(calls).toBe(1);
  });
});

function headerOf(call: unknown): string | null {
  const [, init] = call as [string, RequestInit];
  return new Headers(init.headers).get("authorization");
}

describe("a session-authenticated client", () => {
  it("sends the token as a plain bearer, same as an api key", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okJson());
    await newSessionClient(fetchSpy).analytics.overview({
      date_from: "2026-08-01",
      date_to: "2026-08-26",
    });
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("threads profile_id onto every request, GET and POST alike", async () => {
    // A fresh Response per call: a Body can only be read once, and this test
    // makes two requests through the same spy.
    const fetchSpy = vi.fn().mockImplementation(async () => okJson());
    const client = newSessionClient(fetchSpy);

    await client.reports.templates();
    await client.exports.create({ destination: "meta_capi", conversion_ids: ["c1"] });

    for (const call of fetchSpy.mock.calls) {
      const [url] = call as [string, RequestInit];
      expect(new URL(url).searchParams.get("profile_id")).toBe(PROFILE);
    }
  });

  it("does not let a per-call query override the profile", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okJson());
    const client = newSessionClient(fetchSpy);

    // `overview` has no `profile_id` parameter, so this reaches through the
    // untyped transport on purpose — the guard has to hold against any caller,
    // not only ones the resource types let through.
    await client.analytics.overview({
      date_from: "2026-08-01",
      date_to: "2026-08-26",
      profile_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    } as unknown as { date_from: string; date_to: string });

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const params = new URL(url).searchParams;
    expect(params.getAll("profile_id")).toEqual([PROFILE]);
  });
});

describe("an api-key client", () => {
  it("sends no profile_id when none was configured — the key IS the scope", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okJson());
    const client = new AtribuClient({
      apiKey: "atb_live_x",
      baseUrl: "https://session.atribu.test",
      fetch: fetchSpy as unknown as typeof fetch,
    });
    await client.analytics.overview({ date_from: "2026-08-01", date_to: "2026-08-26" });
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.has("profile_id")).toBe(false);
  });

  it("still threads one when a profileId was configured", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okJson());
    const client = new AtribuClient({
      apiKey: "atb_live_x",
      profileId: PROFILE,
      baseUrl: "https://session.atribu.test",
      fetch: fetchSpy as unknown as typeof fetch,
    });
    await client.analytics.overview({ date_from: "2026-08-01", date_to: "2026-08-26" });
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.get("profile_id")).toBe(PROFILE);
  });
});

describe("withRetry carries the credential and the profile", () => {
  it("keeps both across the wrapper", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okJson());
    const client = newSessionClient(fetchSpy).withRetry({ maxAttempts: 2, backoff: "none" });
    await client.analytics.overview({ date_from: "2026-08-01", date_to: "2026-08-26" });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.get("profile_id")).toBe(PROFILE);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  });
});

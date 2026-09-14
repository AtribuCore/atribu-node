/**
 * The `userToken` credential (#1084) — the MCP user token as an SDK client.
 *
 * The API accepts THREE bearer credentials on one header and tells them apart
 * by shape. What differs on this side is what each IDENTIFIES: an API key is a
 * tenant; a session token and an MCP token are both a PERSON, who may reach
 * several profiles — so both have to name a scope, and the client, not the
 * caller, is where that name lives.
 *
 * What is asserted here that a type signature cannot state: the token reaches
 * the wire VERBATIM in `Authorization: Bearer`, with no second header and no
 * transformation. That is the entire integration contract with `classifyBearer`
 * on the API side, which routes on the `atb_user_` prefix.
 */
import { describe, expect, it, vi } from "vitest";
import { AtribuClient } from "../src/client";
import { AtribuConfigError } from "../src/errors";
import { resolveConfig } from "../src/config";

const PROFILE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_TOKEN = `atb_user_${"a".repeat(64)}`;
const SESSION_TOKEN = "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1In0.sig";

/** The Authorization header one recorded `fetch` call carried, or null. */
function headersOf(call: unknown): Headers {
  const [, init] = call as [string, RequestInit];
  return new Headers(init.headers);
}

function okJson(): Response {
  return new Response(JSON.stringify({ data: {}, meta: { profile_id: PROFILE } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("credential resolution", () => {
  it("resolves to the user_token credential kind", () => {
    const resolved = resolveConfig({ userToken: USER_TOKEN, profileId: PROFILE });
    expect(resolved.credential).toBe("user_token");
    expect(resolved.getToken()).toBe(USER_TOKEN);
  });

  it("refuses userToken alongside either other credential", () => {
    for (const other of [{ apiKey: "atb_live_x" }, { accessToken: SESSION_TOKEN }]) {
      expect(
        () => new AtribuClient({ userToken: USER_TOKEN, profileId: PROFILE, ...other }),
      ).toThrow(AtribuConfigError);
      expect(
        () => new AtribuClient({ userToken: USER_TOKEN, profileId: PROFILE, ...other }),
      ).toThrow(/exactly one of apiKey, accessToken or userToken/);
    }
  });

  it("requires a tenant scope, exactly as accessToken does", () => {
    // An MCP token names a PERSON. A client that named no scope would send
    // profile reads with no `?profile_id=` and collect a 400 on every one — the
    // failure this construction-time check exists to move earlier.
    expect(() => new AtribuClient({ userToken: USER_TOKEN })).toThrow(AtribuConfigError);
    expect(() => new AtribuClient({ userToken: USER_TOKEN })).toThrow(
      /profileId .* is required/,
    );
  });

  it("accepts each of the three scope forms", () => {
    expect(() => new AtribuClient({ userToken: USER_TOKEN, profileId: PROFILE })).not.toThrow();
    expect(
      () =>
        new AtribuClient({
          userToken: USER_TOKEN,
          workspaceId: "99999999-9999-4999-8999-999999999999",
        }),
    ).not.toThrow();
    expect(() => new AtribuClient({ userToken: USER_TOKEN, userScoped: true })).not.toThrow();
  });

  it("still refuses two scopes at once", () => {
    expect(
      () =>
        new AtribuClient({
          userToken: USER_TOKEN,
          profileId: PROFILE,
          workspaceId: "99999999-9999-4999-8999-999999999999",
        }),
    ).toThrow(/exactly one of profileId, workspaceId or userScoped/);
  });
});

describe("what reaches the wire", () => {
  it("sends the token verbatim as Authorization: Bearer, and no second header", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okJson());
    const client = new AtribuClient({
      userToken: USER_TOKEN,
      profileId: PROFILE,
      baseUrl: "https://usertoken.atribu.test",
      fetch: fetchSpy as unknown as typeof fetch,
    });

    await client.profile.get();

    const headers = headersOf(fetchSpy.mock.calls[0]);
    // Verbatim: the API routes on the `atb_user_` PREFIX, so any rewriting here
    // would make the credential unrecognisable rather than merely wrong.
    expect(headers.get("authorization")).toBe(`Bearer ${USER_TOKEN}`);
    expect([...headers.keys()].filter((k) => /token|api[-_]?key/i.test(k))).toEqual([]);
  });

  it("threads the profile onto every request, as the session path does", async () => {
    const calls: string[] = [];
    const client = new AtribuClient({
      userToken: USER_TOKEN,
      profileId: PROFILE,
      baseUrl: "https://usertoken.atribu.test",
      fetch: (async (input: RequestInfo | URL) => {
        calls.push(typeof input === "string" ? input : String(input));
        return okJson();
      }) as typeof fetch,
    });

    await client.profile.get();

    expect(calls[0]).toContain(`profile_id=${PROFILE}`);
  });

  it("sends no Authorization at all on the credential-less public routes", async () => {
    // A user-token client may legitimately follow a share link; the public
    // surface must not start carrying a credential because one is in hand.
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: {}, meta: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new AtribuClient({
      userToken: USER_TOKEN,
      profileId: PROFILE,
      baseUrl: "https://usertoken.atribu.test",
      fetch: fetchSpy as unknown as typeof fetch,
    });

    await client.public.reports.get("0123456789abcdef0123456789abcdef");

    expect(headersOf(fetchSpy.mock.calls[0]).get("authorization")).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";
import { AtribuClient } from "../src/client";
import { AtribuConfigError } from "../src/errors";
import { resolveConfig } from "../src/config";

/**
 * `apiKey` is optional ONLY because a couple of surfaces exist before a key
 * does: `whatsapp.otpCapture` runs while a dealer is still inside Meta's
 * Embedded Signup popup — before the OAuth exchange that mints the key — and
 * authenticates with the app's client credentials instead.
 *
 * The cost of that is a client that can be built in a state where most of it
 * cannot work, so the failure has to be moved rather than removed: it now
 * happens at the CALL, naming the call that needed a key.
 */
describe("a client built without an apiKey", () => {
  const CREDENTIALS = { clientId: "cid-1", clientSecret: "sec-1" };

  it("constructs, so the client-credential surfaces are reachable", () => {
    expect(() => new AtribuClient({ baseUrl: "https://atribu.test" })).not.toThrow();
  });

  it("authenticates otpCapture with client credentials, never a bearer", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { published: true, expires_in_seconds: 300 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new AtribuClient({
      baseUrl: "https://atribu.test",
      fetch: fetchImpl as unknown as typeof fetch,
    });

    await client.whatsapp.otpCapture.publish(
      { state: "state-1", confidence: 1 },
      { clientCredentials: CREDENTIALS },
    );

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const auth = (init.headers as Record<string, string>).Authorization;
    expect(auth).toBe(`Basic ${Buffer.from("cid-1:sec-1").toString("base64")}`);
    expect(auth).not.toContain("Bearer");
  });

  // The trap this replaces: sending `Bearer ` (empty) and collecting a 401 that
  // says nothing about what was actually missing.
  it("fails at the CALL for a resource that needs a key, naming it", async () => {
    // A fetch that would FAIL the test if it were reached: the whole point is
    // that no request leaves. (The old version relied on the throw happening,
    // without asserting it, so a regression would have gone out to the network.)
    const fetchImpl = vi.fn(async () => {
      throw new Error("no request should have been made without an API key");
    });
    const client = new AtribuClient({
      baseUrl: "https://atribu.test",
      fetch: fetchImpl as unknown as typeof fetch,
    });

    // …and NAMING IT is half the contract — the error has to say which call
    // needed the key, or it is the opaque 401 this replaced.
    await expect(client.connections.list()).rejects.toThrow(
      /GET \/api\/v1\/connections/,
    );
    await expect(client.connections.list()).rejects.toBeInstanceOf(
      AtribuConfigError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails at the CALL when the keyless surface is missing its client credentials", async () => {
    // The one resource a keyless client MAY call still needs credentials of its
    // own, and nothing upstream checks them — the client deliberately no longer
    // demands an apiKey, so an undefined pair used to encode to a `Basic` header
    // of `undefined:undefined` and come back as an opaque 401.
    const fetchImpl = vi.fn(async () => {
      throw new Error("no request should have been made without credentials");
    });
    const client = new AtribuClient({
      baseUrl: "https://atribu.test",
      fetch: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.whatsapp.otpCapture.publish(
        { state: "s-1", confidence: 1 },
        {} as never,
      ),
    ).rejects.toThrow(/clientCredentials/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("resolveConfig", () => {
  it("still rejects a non-string apiKey", () => {
    expect(() =>
      resolveConfig({ apiKey: 42 as unknown as string }),
    ).toThrow(AtribuConfigError);
  });

  it("keeps a provided apiKey", () => {
    expect(resolveConfig({ apiKey: "atb_live_x" }).apiKey).toBe("atb_live_x");
  });
});

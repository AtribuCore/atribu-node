import { describe, expect, it } from "vitest";
import { buildAuthorizeUrl } from "../../src/oauth/authorize-url";
import { generateCodeVerifier, computeCodeChallenge } from "../../src/oauth/pkce";

describe("buildAuthorizeUrl", () => {
  const base = {
    clientId: "vitrina",
    redirectUri: "https://vitrina.app/cb",
    provider: "whatsapp" as const,
    scope: "whatsapp" as const,
    state: "csrf_abc",
    idTokenHint: "eyJ.abc.def",
  };

  it("builds a minimal URL", () => {
    const url = buildAuthorizeUrl(base);
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://www.atribu.app");
    expect(parsed.pathname).toBe("/oauth/authorize");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("vitrina");
    expect(parsed.searchParams.get("provider")).toBe("whatsapp");
    expect(parsed.searchParams.get("state")).toBe("csrf_abc");
    expect(parsed.searchParams.get("id_token_hint")).toBe("eyJ.abc.def");
  });

  it("supports baseUrl override", () => {
    const url = buildAuthorizeUrl({ ...base, baseUrl: "http://localhost:3000" });
    expect(new URL(url).origin).toBe("http://localhost:3000");
  });

  it("strips trailing slashes from baseUrl", () => {
    const url = buildAuthorizeUrl({ ...base, baseUrl: "https://atribu.app//" });
    expect(new URL(url).origin).toBe("https://atribu.app");
  });

  it("space-joins scope arrays", () => {
    const url = buildAuthorizeUrl({ ...base, scope: ["whatsapp", "instagram"] });
    expect(new URL(url).searchParams.get("scope")).toBe("whatsapp instagram");
  });

  it("includes PKCE params when challenge present", () => {
    const url = buildAuthorizeUrl({
      ...base,
      codeChallenge: "Y29kZS1jaGFsbGVuZ2U",
      codeChallengeMethod: "S256",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("code_challenge")).toBe("Y29kZS1jaGFsbGVuZ2U");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("forwards extras", () => {
    const url = buildAuthorizeUrl({
      ...base,
      extras: { custom_param: "x", debug: "true" },
    });
    expect(new URL(url).searchParams.get("custom_param")).toBe("x");
    expect(new URL(url).searchParams.get("debug")).toBe("true");
  });

  it("rejects missing required fields", () => {
    expect(() => buildAuthorizeUrl({ ...base, clientId: "" })).toThrow(/clientId/);
    expect(() => buildAuthorizeUrl({ ...base, state: "" })).toThrow(/state/);
  });

  it("requires codeChallengeMethod when codeChallenge is set", () => {
    expect(() =>
      buildAuthorizeUrl({ ...base, codeChallenge: "x" }),
    ).toThrow(/codeChallengeMethod/);
  });
});

describe("PKCE helpers", () => {
  it("generateCodeVerifier returns 43–128 char string", () => {
    const v = generateCodeVerifier();
    expect(v.length).toBe(64);
    const v2 = generateCodeVerifier(43);
    expect(v2.length).toBe(43);
  });

  it("rejects verifier length out of bounds", () => {
    expect(() => generateCodeVerifier(20)).toThrow();
    expect(() => generateCodeVerifier(200)).toThrow();
  });

  it("computeCodeChallenge returns base64url SHA-256 (RFC 7636 vector)", async () => {
    // RFC 7636 Appendix B
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const expected = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    expect(await computeCodeChallenge(verifier)).toBe(expected);
  });

  it("generated verifier produces a valid challenge", async () => {
    const v = generateCodeVerifier();
    const c = await computeCodeChallenge(v);
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(c.length).toBeGreaterThan(20);
  });
});

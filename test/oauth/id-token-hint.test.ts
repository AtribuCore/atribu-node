/**
 * `signIdTokenHint` — and in particular the `externalRef` option (#1416 /
 * ADR 0020).
 *
 * The claim is the whole of Atribu's `external_ref` contract on the consumer's
 * side: an app on `profile_resolution: "external_ref"` has its consent resolved
 * by `(client_id, external_ref)`, and a token that carries the wrong key, a
 * blank value or the right value under the wrong option is indistinguishable
 * from a server fault at the far end. So the tests below assert the PAYLOAD, not
 * just that signing succeeded.
 */
import { describe, expect, it } from "vitest";
import { jwtVerify, decodeJwt } from "jose";
import { signIdTokenHint } from "../../src/oauth/id-token-hint";
import { AtribuConfigError } from "../../src/errors";

const SECRET = "a-signing-secret-long-enough-for-hs256";

const BASE = {
  jwtSigningSecret: SECRET,
  subject: "consumer-user-1",
  email: "operator@dealer.test",
  issuer: "vitrina",
} as const;

describe("signIdTokenHint", () => {
  it("signs a verifiable HS256 token with the documented defaults", async () => {
    const token = await signIdTokenHint({ ...BASE });
    const { payload, protectedHeader } = await jwtVerify(
      token,
      new TextEncoder().encode(SECRET),
      { issuer: "vitrina", audience: "atribu" },
    );

    expect(protectedHeader.alg).toBe("HS256");
    expect(payload.email).toBe("operator@dealer.test");
    expect(payload.sub).toBe("consumer-user-1");
    // 5 minutes, the documented default.
    expect((payload.exp as number) - (payload.iat as number)).toBe(300);
  });

  it("emits no external_ref claim when the option is absent", async () => {
    const claims = decodeJwt(await signIdTokenHint({ ...BASE }));
    expect(claims).not.toHaveProperty("external_ref");
  });
});

describe("signIdTokenHint — externalRef (#1416)", () => {
  it("emits the claim under Atribu's exact key", async () => {
    const claims = decodeJwt(await signIdTokenHint({ ...BASE, externalRef: "dealer-42" }));
    expect(claims.external_ref).toBe("dealer-42");
  });

  it("trims the value", async () => {
    const claims = decodeJwt(await signIdTokenHint({ ...BASE, externalRef: "  dealer-42\n" }));
    expect(claims.external_ref).toBe("dealer-42");
  });

  it.each(["", "   "])("refuses a blank value (%j) rather than signing it", async (blank) => {
    // Atribu treats a blank claim as absent, so signing it would produce
    // `external_ref_required` from a token that visibly carried the key — the
    // hardest shape to debug from the consumer's side.
    await expect(signIdTokenHint({ ...BASE, externalRef: blank })).rejects.toThrow(
      AtribuConfigError,
    );
  });

  it("WINS over an extraClaims entry of the same name", async () => {
    const claims = decodeJwt(
      await signIdTokenHint({
        ...BASE,
        externalRef: "dealer-42",
        extraClaims: { external_ref: "typo-and-stale" },
      }),
    );
    expect(claims.external_ref).toBe("dealer-42");
  });

  it("leaves a pre-existing extraClaims.external_ref alone when the option is absent", async () => {
    // Back-compat: consumers who adopted the claim before the option existed
    // must keep working unchanged.
    const claims = decodeJwt(
      await signIdTokenHint({ ...BASE, extraClaims: { external_ref: "dealer-legacy" } }),
    );
    expect(claims.external_ref).toBe("dealer-legacy");
  });

  it("does not disturb the other claims", async () => {
    const claims = decodeJwt(
      await signIdTokenHint({
        ...BASE,
        externalRef: "dealer-42",
        extraClaims: { consumer_user_id: "u_1" },
      }),
    );
    expect(claims.email).toBe("operator@dealer.test");
    expect(claims.consumer_user_id).toBe("u_1");
    expect(claims.aud).toBe("atribu");
    expect(claims.iss).toBe("vitrina");
  });
});

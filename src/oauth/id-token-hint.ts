/**
 * Sign an `id_token_hint` JWT (HS256) for an Atribu OAuth flow.
 *
 * Uses `jose` (optional peer dep). If `jose` isn't installed, throws a
 * clear runtime error. Vitrina-style consumers almost always already have
 * `jose` for their own auth.
 *
 * Why HS256 not RS256: the shared secret is the OAuth app's
 * `jwt_signing_secret` (rotatable, paired). RS256 would mean Atribu
 * publishes a JWKS endpoint and we manage keypairs — out of scope today.
 */

import { AtribuConfigError } from "../errors";

export interface IdTokenHintPayload {
  /** End-user's stable identifier in your system. */
  subject: string;
  /** End-user's email. Used by Atribu to silent-provision / find existing profile. */
  email: string;
  /** Token audience. Use "atribu" unless directed otherwise. */
  audience?: string;
  /** Issuer (your app's client_id, by convention). */
  issuer?: string;
  /** Expiration relative to now. Default "5m". Examples: "5m", "10m", numeric seconds. */
  expiresIn?: string | number;
  /**
   * YOUR id for the tenant this consent is for — emitted as the `external_ref`
   * claim (ADR 0020).
   *
   * Required for an app Atribu has set to `profile_resolution: "external_ref"`:
   * the consent then lands on the profile you provisioned under this exact ref
   * through `POST /api/v1/profiles`, and NOT on one derived from `email`. Get
   * it wrong or leave it out and `/oauth/authorize` bounces to your
   * `redirect_uri` with `error=invalid_request` and `error_description` of
   * `unknown_external_ref` / `external_ref_required` respectively — provision
   * the tenant, then retry.
   *
   * Ignored by Atribu for an app on the default `"email"` mode, so adding it
   * ahead of the switch is safe.
   *
   * A first-class option rather than an `extraClaims` entry because the claim
   * name is part of Atribu's contract, not yours: a typo in `extraClaims`
   * produces a token that verifies and then fails at consent with
   * `external_ref_required`, which reads like a server bug. Set here it also
   * WINS over an `extraClaims.external_ref` of the same name.
   */
  externalRef?: string;
  /** Atribu's recognized claims plus any custom ones. */
  extraClaims?: Record<string, unknown>;
}

export interface SignIdTokenHintInput extends IdTokenHintPayload {
  /** The OAuth app's `jwt_signing_secret`. */
  jwtSigningSecret: string;
}

interface JoseModule {
  SignJWT: new (payload: Record<string, unknown>) => {
    setProtectedHeader(header: { alg: string; typ?: string }): JoseSignJwt;
    setIssuedAt(time?: number): JoseSignJwt;
    setExpirationTime(time: string | number): JoseSignJwt;
    setIssuer(issuer: string): JoseSignJwt;
    setSubject(subject: string): JoseSignJwt;
    setAudience(audience: string | string[]): JoseSignJwt;
    sign(secret: Uint8Array | CryptoKey): Promise<string>;
  };
}
type JoseSignJwt = InstanceType<JoseModule["SignJWT"]>;

let cachedJose: JoseModule | null = null;
let joseLoadAttempted = false;

async function loadJose(): Promise<JoseModule> {
  if (cachedJose) return cachedJose;
  if (joseLoadAttempted && !cachedJose) {
    throw new AtribuConfigError(
      "signIdTokenHint requires the `jose` peer dependency. Run `npm install jose`.",
    );
  }
  joseLoadAttempted = true;
  try {
    const mod = (await import("jose")) as unknown as JoseModule;
    cachedJose = mod;
    return mod;
  } catch (err) {
    const message = err instanceof Error ? err.message : "import failed";
    throw new AtribuConfigError(
      `signIdTokenHint requires the \`jose\` peer dependency. Install with \`npm install jose\`. (${message})`,
    );
  }
}

export async function signIdTokenHint(input: SignIdTokenHintInput): Promise<string> {
  if (!input.jwtSigningSecret) {
    throw new AtribuConfigError("signIdTokenHint: jwtSigningSecret is required");
  }
  if (!input.subject) throw new AtribuConfigError("signIdTokenHint: subject is required");
  if (!input.email) throw new AtribuConfigError("signIdTokenHint: email is required");

  // Trimmed and rejected empty rather than emitted blank: Atribu treats a blank
  // claim as absent, so a `" "` would come back as `external_ref_required` from
  // a token that visibly carried the key — the hardest shape to debug from the
  // consumer's side. Fail here, where the value is.
  let externalRef: string | undefined;
  if (input.externalRef !== undefined) {
    externalRef = input.externalRef.trim();
    if (!externalRef) {
      throw new AtribuConfigError(
        "signIdTokenHint: externalRef must be a non-empty string when provided",
      );
    }
  }

  const jose = await loadJose();
  const claims: Record<string, unknown> = {
    email: input.email,
    ...(input.extraClaims ?? {}),
    // LAST, so the first-class option wins over a hand-rolled `extraClaims`
    // entry of the same name. Spread conditionally so an absent option leaves
    // any pre-existing `extraClaims.external_ref` alone — consumers who adopted
    // the claim before this option existed keep working unchanged.
    ...(externalRef ? { external_ref: externalRef } : {}),
  };

  const jwt = new jose.SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setSubject(input.subject)
    .setAudience(input.audience ?? "atribu")
    .setExpirationTime(input.expiresIn ?? "5m");
  if (input.issuer) jwt.setIssuer(input.issuer);

  return jwt.sign(new TextEncoder().encode(input.jwtSigningSecret));
}

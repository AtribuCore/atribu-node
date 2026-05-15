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

  const jose = await loadJose();
  const claims: Record<string, unknown> = { email: input.email, ...(input.extraClaims ?? {}) };

  const jwt = new jose.SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setSubject(input.subject)
    .setAudience(input.audience ?? "atribu")
    .setExpirationTime(input.expiresIn ?? "5m");
  if (input.issuer) jwt.setIssuer(input.issuer);

  return jwt.sign(new TextEncoder().encode(input.jwtSigningSecret));
}

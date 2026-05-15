/**
 * Next.js OAuth flow example (server-side).
 *
 * Wire-up:
 *   app/integrations/atribu/start/route.ts   → "Connect WhatsApp" button hits this
 *   app/integrations/atribu/callback/route.ts → Atribu redirects here after consent
 *
 * Required env vars:
 *   ATRIBU_APP_CLIENT_ID=vitrina
 *   ATRIBU_APP_CLIENT_SECRET=<from /admin/oauth-apps response>
 *   ATRIBU_APP_JWT_SECRET=<from /admin/oauth-apps response>
 *   ATRIBU_APP_REDIRECT_URI=https://your.app/integrations/atribu/callback
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  buildAuthorizeUrl,
  computeCodeChallenge,
  exchangeCode,
  generateCodeVerifier,
  signIdTokenHint,
} from "@atribu/node/oauth";

// --- Start route ---
export async function GET_start(req: Request): Promise<void> {
  // pretend we have a real session
  const user = { id: "user-uuid", email: "alice@example.com" };
  const provider = new URL(req.url).searchParams.get("provider") === "instagram"
    ? "instagram"
    : "whatsapp";

  const idTokenHint = await signIdTokenHint({
    jwtSigningSecret: process.env.ATRIBU_APP_JWT_SECRET!,
    subject: user.id,
    email: user.email,
    expiresIn: "5m",
  });
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await computeCodeChallenge(codeVerifier);

  // Stash state + verifier in an httponly cookie keyed by state.
  cookies().set(`atribu_${state}`, codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
  });

  const url = buildAuthorizeUrl({
    clientId: process.env.ATRIBU_APP_CLIENT_ID!,
    redirectUri: process.env.ATRIBU_APP_REDIRECT_URI!,
    provider,
    scope: provider,
    state,
    idTokenHint,
    codeChallenge,
    codeChallengeMethod: "S256",
  });
  redirect(url);
}

// --- Callback route ---
export async function GET_callback(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  if (!code || !state) return new Response("missing code or state", { status: 400 });

  const verifier = cookies().get(`atribu_${state}`)?.value;
  if (!verifier) return new Response("invalid state", { status: 400 });

  const { accessToken, connectionId, scope, profileId } = await exchangeCode({
    clientId: process.env.ATRIBU_APP_CLIENT_ID!,
    clientSecret: process.env.ATRIBU_APP_CLIENT_SECRET!,
    code,
    redirectUri: process.env.ATRIBU_APP_REDIRECT_URI!,
    codeVerifier: verifier,
  });

  // Persist (accessToken, connectionId, scope) for this Atribu profile (profileId).
  // accessToken IS the Atribu API key — store it server-side, never expose to the browser.
  console.log("connected:", { profileId, connectionId, scope });

  return Response.redirect(new URL("/integrations/atribu/success", req.url));
}

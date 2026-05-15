/**
 * Verify Atribu webhook signatures using Web Crypto.
 *
 * Why Web Crypto: works in Node 18+, Bun, Deno, Vercel Edge, Cloudflare
 * Workers. No `node:crypto` import keeps this subpath edge-safe.
 *
 * Header format (Stripe-style): `t=<unix_seconds>,v1=<hex_hmac_sha256>`
 * Signed string: `<t>.<rawBody>`
 *
 * Rotation: pass `previousSecret` during the grace window after rotating.
 * Atribu always signs with the current secret; the previous slot exists
 * only so subscribers can dual-verify during their own deploy.
 */

import { AtribuWebhookError } from "../errors";
import type { AtribuWebhookEvent } from "./types";

export interface VerifyWebhookOptions {
  /** Raw, unparsed request body (string or Uint8Array). */
  rawBody: string | Uint8Array;
  /** Value of the `X-Atribu-Signature` header. */
  signature: string | null | undefined;
  /** Current HMAC secret. */
  secret: string;
  /** Previous secret during rotation grace. */
  previousSecret?: string | null;
  /** Max age of the signed timestamp in seconds. Default 300 (5 minutes). */
  tolerance?: number;
  /** Inject for tests; defaults to Date.now(). */
  now?: () => number;
}

interface ParsedHeader {
  t: number;
  v1: string;
}

export async function verifyWebhook(opts: VerifyWebhookOptions): Promise<AtribuWebhookEvent> {
  if (!opts.signature) {
    throw new AtribuWebhookError("missing_signature", "Missing X-Atribu-Signature header");
  }

  const parsed = parseHeader(opts.signature);
  const bodyString = typeof opts.rawBody === "string" ? opts.rawBody : decodeUtf8(opts.rawBody);

  const nowMs = (opts.now ?? Date.now)();
  const tolerance = opts.tolerance ?? 300;
  const ageSeconds = Math.abs(nowMs / 1000 - parsed.t);
  if (ageSeconds > tolerance) {
    throw new AtribuWebhookError(
      "expired_timestamp",
      `Signed timestamp is ${Math.round(ageSeconds)}s old (tolerance ${tolerance}s)`,
    );
  }

  const signingInput = `${parsed.t}.${bodyString}`;
  const matchesCurrent = await safeCompareHmac(opts.secret, signingInput, parsed.v1);
  if (!matchesCurrent) {
    const previous = opts.previousSecret;
    if (!previous || !(await safeCompareHmac(previous, signingInput, parsed.v1))) {
      throw new AtribuWebhookError("invalid_signature", "Signature does not match");
    }
  }

  return JSON.parse(bodyString) as AtribuWebhookEvent;
}

function parseHeader(header: string): ParsedHeader {
  let t: number | null = null;
  let v1: string | null = null;
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") t = Number(value);
    else if (key === "v1") v1 = value;
  }
  if (t === null || !Number.isFinite(t) || !v1) {
    throw new AtribuWebhookError("malformed_header", `Malformed signature header: ${header}`);
  }
  return { t, v1 };
}

async function safeCompareHmac(secret: string, input: string, expectedHex: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  const computed = bufferToHex(sig);
  return constantTimeEqualHex(computed, expectedHex);
}

function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    hex += (b < 16 ? "0" : "") + b.toString(16);
  }
  return hex;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function decodeUtf8(buf: Uint8Array): string {
  return new TextDecoder("utf-8").decode(buf);
}

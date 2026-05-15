import { AtribuConfigError } from "./errors";

export const DEFAULT_BASE_URL = "https://www.atribu.app";
export const DEFAULT_TIMEOUT_MS = 30_000;

export interface AtribuClientConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  userAgent?: string;
  defaultIdempotencyKeyGenerator?: () => string;
}

export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
  timeoutMs: number;
  userAgentSuffix: string | null;
  generateIdempotencyKey: () => string;
}

export function resolveConfig(config: AtribuClientConfig): ResolvedConfig {
  if (!config.apiKey || typeof config.apiKey !== "string") {
    throw new AtribuConfigError("apiKey is required");
  }
  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new AtribuConfigError(
      "globalThis.fetch is not available; pass a `fetch` implementation in config",
    );
  }
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  return {
    apiKey: config.apiKey,
    baseUrl,
    fetch: fetchImpl,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    userAgentSuffix: config.userAgent ?? null,
    generateIdempotencyKey: config.defaultIdempotencyKeyGenerator ?? defaultUuid,
  };
}

function defaultUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes — a v4-ish UUID via Math.random. Not
  // cryptographically strong; idempotency keys don't need to be.
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) {
    const c = Math.floor(Math.random() * 16);
    out += hex[i === 12 ? 4 : i === 16 ? (c & 0x3) | 0x8 : c];
    if (i === 7 || i === 11 || i === 15 || i === 19) out += "-";
  }
  return out;
}

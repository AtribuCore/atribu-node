import { AtribuConfigError } from "../errors";
import { HttpClient } from "../http";
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS } from "../config";
import { OauthAppsResource } from "./oauth-apps";

export interface AtribuAdminClientConfig {
  adminSecret: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  userAgent?: string;
}

export class AtribuAdminClient {
  readonly oauthApps: OauthAppsResource;

  constructor(config: AtribuAdminClientConfig) {
    if (!config.adminSecret) throw new AtribuConfigError("adminSecret is required");
    const fetchImpl = config.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new AtribuConfigError(
        "globalThis.fetch is not available; pass a `fetch` implementation in config",
      );
    }
    const http = new HttpClient({
      apiKey: config.adminSecret,
      baseUrl: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
      fetch: fetchImpl,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      userAgentSuffix: config.userAgent ?? "admin",
      generateIdempotencyKey:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? () => crypto.randomUUID()
          : () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    this.oauthApps = new OauthAppsResource(http);
  }
}

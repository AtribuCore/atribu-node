/**
 * Drop-in MSW v2 handlers for testing against `@atribu/node`.
 *
 * Consumers add these to their MSW server setup:
 *
 *   import { setupServer } from "msw/node";
 *   import { atribuMockHandlers } from "@atribu/node/test";
 *
 *   const server = setupServer(...atribuMockHandlers());
 *
 * Per-endpoint defaults reflect the wire shape the real Atribu API returns.
 * Override any response by passing `MockOverrides` — the handler returns
 * the override directly if `body` is provided; otherwise the default
 * envelope from `responseFixtures`.
 *
 * MSW v2 is a peer dependency. Consumers must install it.
 */

import { http, HttpResponse, type HttpHandler } from "msw";
import { responseFixtures } from "./fixtures";

interface EndpointOverride {
  status?: number;
  body?: unknown;
}

export interface MockOverrides {
  baseUrl?: string;
  messages?: { send?: EndpointOverride };
  comments?: {
    reply?: EndpointOverride;
    privateReply?: EndpointOverride;
  };
  webhooks?: {
    subscriptions?: {
      list?: EndpointOverride;
      create?: EndpointOverride;
      update?: EndpointOverride;
      delete?: EndpointOverride;
      rotateSecret?: EndpointOverride;
      test?: EndpointOverride;
    };
    deliveries?: {
      replay?: EndpointOverride;
    };
  };
  oauth?: {
    token?: EndpointOverride;
    revoke?: EndpointOverride;
  };
  admin?: {
    create?: EndpointOverride;
    update?: EndpointOverride;
    suspend?: EndpointOverride;
    rotateClientSecret?: EndpointOverride;
    rotateJwtSecret?: EndpointOverride;
  };
}

const DEFAULT_BASE_URL = "https://www.atribu.app";

function resolve(
  override: EndpointOverride | undefined,
  fallbackStatus: number,
  fallbackBody: unknown,
): Response {
  const status = override?.status ?? fallbackStatus;
  const body = override?.body ?? fallbackBody;
  if (status === 204) return new HttpResponse(null, { status: 204 });
  return HttpResponse.json(body as Record<string, unknown> | unknown[] | null, {
    status,
    headers: { "x-request-id": "req_mock" },
  });
}

export function atribuMockHandlers(overrides: MockOverrides = {}): HttpHandler[] {
  const baseUrl = (overrides.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const u = (p: string): string => `${baseUrl}${p}`;

  return [
    // ----- Messaging -----
    http.post(u("/api/v1/messages"), () =>
      resolve(overrides.messages?.send, 200, responseFixtures.messageSent()),
    ),

    // ----- IG Comments -----
    http.post(u("/api/v1/comments/:commentId/reply"), () =>
      resolve(overrides.comments?.reply, 200, responseFixtures.commentReply()),
    ),
    http.post(u("/api/v1/comments/:commentId/private-reply"), () =>
      resolve(
        overrides.comments?.privateReply,
        200,
        responseFixtures.commentReply(),
      ),
    ),

    // ----- Webhook subscriptions -----
    http.get(u("/api/v1/webhooks/subscriptions"), () =>
      resolve(
        overrides.webhooks?.subscriptions?.list,
        200,
        responseFixtures.subscriptionList(),
      ),
    ),
    http.post(u("/api/v1/webhooks/subscriptions"), () =>
      resolve(
        overrides.webhooks?.subscriptions?.create,
        201,
        responseFixtures.subscriptionCreated(),
      ),
    ),
    http.patch(u("/api/v1/webhooks/subscriptions/:id"), () =>
      resolve(
        overrides.webhooks?.subscriptions?.update,
        200,
        responseFixtures.subscriptionList({ items: 1 }),
      ),
    ),
    http.delete(u("/api/v1/webhooks/subscriptions/:id"), () =>
      resolve(overrides.webhooks?.subscriptions?.delete, 204, null),
    ),
    http.post(u("/api/v1/webhooks/subscriptions/:id/rotate-secret"), () =>
      resolve(
        overrides.webhooks?.subscriptions?.rotateSecret,
        200,
        responseFixtures.rotatedSecret(),
      ),
    ),
    http.post(u("/api/v1/webhooks/test/:id"), () =>
      resolve(overrides.webhooks?.subscriptions?.test, 200, {
        data: {
          enqueued: true,
          event_id: "00000000-0000-0000-0000-000000000fff",
          subscription_id: "00000000-0000-0000-0000-000000000eee",
        },
        meta: { profile_id: "00000000-0000-0000-0000-000000000ccc" },
      }),
    ),

    // ----- Webhook deliveries -----
    http.post(u("/api/v1/webhooks/deliveries/:id/replay"), () =>
      resolve(overrides.webhooks?.deliveries?.replay, 200, {
        data: {
          enqueued: true,
          delivery_id: "00000000-0000-0000-0000-000000000fff",
          event_id: "00000000-0000-0000-0000-000000000fff",
          subscription_id: "00000000-0000-0000-0000-000000000eee",
        },
        meta: { profile_id: "00000000-0000-0000-0000-000000000ccc" },
      }),
    ),

    // ----- OAuth -----
    http.post(u("/oauth/token"), () =>
      resolve(overrides.oauth?.token, 200, responseFixtures.oauthTokenResponse()),
    ),
    http.post(u("/oauth/revoke"), () =>
      overrides.oauth?.revoke
        ? resolve(overrides.oauth.revoke, 200, null)
        : new HttpResponse(null, { status: 200 }),
    ),

    // ----- Admin -----
    http.post(u("/api/v1/admin/oauth-apps"), () =>
      resolve(overrides.admin?.create, 201, {
        data: {
          id: "00000000-0000-0000-0000-000000000aaa",
          client_id: "test-app",
          name: "Test App",
          description: null,
          logo_url: null,
          redirect_uris: ["https://example.com/cb"],
          allowed_scopes: ["whatsapp"],
          status: "active",
          created_at: new Date().toISOString(),
          client_secret: "test_client_secret_shown_once",
          jwt_signing_secret: "test_jwt_signing_secret_shown_once",
        },
      }),
    ),
    http.patch(u("/api/v1/admin/oauth-apps/:id"), () =>
      resolve(overrides.admin?.update, 200, {
        data: {
          id: "00000000-0000-0000-0000-000000000aaa",
          client_id: "test-app",
          name: "Updated Name",
          description: null,
          logo_url: null,
          redirect_uris: ["https://example.com/cb"],
          allowed_scopes: ["whatsapp", "instagram"],
          status: "active",
          created_at: new Date().toISOString(),
        },
      }),
    ),
    http.delete(u("/api/v1/admin/oauth-apps/:id"), () =>
      resolve(overrides.admin?.suspend, 200, {
        data: {
          id: "00000000-0000-0000-0000-000000000aaa",
          status: "suspended",
          keys_revoked: 0,
        },
      }),
    ),
    http.post(u("/api/v1/admin/oauth-apps/:id/rotate-client-secret"), () =>
      resolve(overrides.admin?.rotateClientSecret, 200, {
        data: {
          oauth_app_id: "00000000-0000-0000-0000-000000000aaa",
          client_secret: "rotated_client_secret",
          grace_days: 7,
          previous_client_secret_expires_at: new Date(
            Date.now() + 7 * 86400_000,
          ).toISOString(),
        },
      }),
    ),
    http.post(u("/api/v1/admin/oauth-apps/:id/rotate-jwt-secret"), () =>
      resolve(overrides.admin?.rotateJwtSecret, 200, {
        data: {
          oauth_app_id: "00000000-0000-0000-0000-000000000aaa",
          jwt_signing_secret: "rotated_jwt_secret",
          grace_days: 7,
          previous_jwt_signing_secret_expires_at: new Date(
            Date.now() + 7 * 86400_000,
          ).toISOString(),
        },
      }),
    ),
  ];
}

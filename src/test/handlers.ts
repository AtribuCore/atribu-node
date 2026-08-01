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
  messages?: { send?: EndpointOverride; typing?: EndpointOverride };
  comments?: {
    reply?: EndpointOverride;
    privateReply?: EndpointOverride;
  };
  connections?: {
    list?: EndpointOverride;
    get?: EndpointOverride;
    revoke?: EndpointOverride;
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
  whatsapp?: {
    templates?: {
      list?: EndpointOverride;
      create?: EndpointOverride;
      delete?: EndpointOverride;
      sync?: EndpointOverride;
    };
    broadcasts?: {
      list?: EndpointOverride;
      create?: EndpointOverride;
      get?: EndpointOverride;
      cancel?: EndpointOverride;
      send?: EndpointOverride;
    };
    registration?: {
      addPhoneNumber?: EndpointOverride;
      requestCode?: EndpointOverride;
      verifyCode?: EndpointOverride;
      register?: EndpointOverride;
      subscribe?: EndpointOverride;
      subscribedApps?: EndpointOverride;
      funding?: EndpointOverride;
      phoneNumbers?: EndpointOverride;
    };
    health?: {
      get?: EndpointOverride;
    };
  };
  instagram?: {
    triggers?: {
      list?: EndpointOverride;
      create?: EndpointOverride;
      update?: EndpointOverride;
      delete?: EndpointOverride;
      testDm?: EndpointOverride;
      resume?: EndpointOverride;
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
    http.post(u("/api/v1/messages/typing"), () =>
      resolve(overrides.messages?.typing, 200, responseFixtures.typingIndicator()),
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

    // ----- Connections -----
    http.get(u("/api/v1/connections"), () =>
      resolve(overrides.connections?.list, 200, responseFixtures.connectionList()),
    ),
    http.get(u("/api/v1/connections/:id"), () =>
      resolve(overrides.connections?.get, 200, responseFixtures.connectionDetail()),
    ),
    http.delete(u("/api/v1/connections/:id"), () =>
      resolve(overrides.connections?.revoke, 204, null),
    ),

    // ----- WhatsApp health -----
    http.get(u("/api/v1/whatsapp/account-health"), () =>
      resolve(overrides.whatsapp?.health?.get, 200, responseFixtures.whatsappAccountHealth()),
    ),

    // ----- WhatsApp templates -----
    http.get(u("/api/v1/whatsapp/templates"), () =>
      resolve(overrides.whatsapp?.templates?.list, 200, responseFixtures.whatsappTemplateList()),
    ),
    http.post(u("/api/v1/whatsapp/templates"), () =>
      resolve(overrides.whatsapp?.templates?.create, 201, responseFixtures.whatsappTemplateCreated()),
    ),
    http.post(u("/api/v1/whatsapp/templates/sync"), () =>
      resolve(overrides.whatsapp?.templates?.sync, 200, responseFixtures.whatsappTemplateSync()),
    ),
    http.delete(u("/api/v1/whatsapp/templates/:name"), () =>
      resolve(overrides.whatsapp?.templates?.delete, 204, null),
    ),

    // ----- WhatsApp broadcasts -----
    http.get(u("/api/v1/whatsapp/broadcasts"), () =>
      resolve(overrides.whatsapp?.broadcasts?.list, 200, responseFixtures.whatsappBroadcastList()),
    ),
    http.post(u("/api/v1/whatsapp/broadcasts"), () =>
      resolve(overrides.whatsapp?.broadcasts?.create, 201, responseFixtures.whatsappBroadcastCreated()),
    ),
    http.get(u("/api/v1/whatsapp/broadcasts/:id"), () =>
      resolve(overrides.whatsapp?.broadcasts?.get, 200, responseFixtures.whatsappBroadcastDetail()),
    ),
    http.patch(u("/api/v1/whatsapp/broadcasts/:id"), () =>
      resolve(overrides.whatsapp?.broadcasts?.cancel, 200, responseFixtures.whatsappBroadcastUpdated()),
    ),
    http.post(u("/api/v1/whatsapp/broadcasts/:id/send"), () =>
      resolve(
        overrides.whatsapp?.broadcasts?.send,
        200,
        responseFixtures.whatsappBroadcastUpdated({ status: "completed" }),
      ),
    ),

    // ----- WhatsApp registration (Meta proxy) -----
    http.post(u("/api/v1/whatsapp/registration/phone-numbers"), () =>
      resolve(overrides.whatsapp?.registration?.addPhoneNumber, 201, responseFixtures.whatsappNumberAdded()),
    ),
    http.post(u("/api/v1/whatsapp/registration/request-code"), () =>
      resolve(overrides.whatsapp?.registration?.requestCode, 200, responseFixtures.whatsappCodeRequested()),
    ),
    http.post(u("/api/v1/whatsapp/registration/verify-code"), () =>
      resolve(overrides.whatsapp?.registration?.verifyCode, 200, responseFixtures.whatsappCodeVerified()),
    ),
    http.post(u("/api/v1/whatsapp/registration/register"), () =>
      resolve(overrides.whatsapp?.registration?.register, 200, responseFixtures.whatsappRegistered()),
    ),
    http.post(u("/api/v1/whatsapp/registration/subscribe"), () =>
      resolve(overrides.whatsapp?.registration?.subscribe, 200, responseFixtures.whatsappSubscribed()),
    ),
    http.get(u("/api/v1/whatsapp/registration/subscribed-apps"), () =>
      resolve(overrides.whatsapp?.registration?.subscribedApps, 200, responseFixtures.whatsappSubscribedApps()),
    ),
    http.get(u("/api/v1/whatsapp/registration/funding"), () =>
      resolve(overrides.whatsapp?.registration?.funding, 200, responseFixtures.whatsappFunding()),
    ),
    http.get(u("/api/v1/whatsapp/registration/phone-numbers"), () =>
      resolve(overrides.whatsapp?.registration?.phoneNumbers, 200, responseFixtures.whatsappPhoneNumbers()),
    ),

    // ----- Instagram triggers -----
    http.get(u("/api/v1/instagram/triggers"), () =>
      resolve(overrides.instagram?.triggers?.list, 200, responseFixtures.instagramTriggerList()),
    ),
    http.post(u("/api/v1/instagram/triggers"), () =>
      resolve(overrides.instagram?.triggers?.create, 201, responseFixtures.instagramTriggerCreated()),
    ),
    http.patch(u("/api/v1/instagram/triggers/:id"), () =>
      resolve(overrides.instagram?.triggers?.update, 200, responseFixtures.instagramTriggerCreated()),
    ),
    http.delete(u("/api/v1/instagram/triggers/:id"), () =>
      resolve(overrides.instagram?.triggers?.delete, 204, null),
    ),
    http.post(u("/api/v1/instagram/triggers/:id/test-dm"), () =>
      resolve(overrides.instagram?.triggers?.testDm, 200, responseFixtures.instagramTriggerTestDm()),
    ),
    http.post(u("/api/v1/instagram/triggers/resume"), () =>
      resolve(overrides.instagram?.triggers?.resume, 200, responseFixtures.instagramTriggerResumed()),
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

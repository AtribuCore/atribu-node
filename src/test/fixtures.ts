/**
 * Canned fixtures for testing against the Atribu SDK.
 *
 * Use these to drive your test cases with realistic event shapes, or pass
 * `body` overrides into `atribuMockHandlers({...})` to customize responses.
 */

import type {
  AtribuWebhookEvent,
  WhatsAppMessageReceivedEvent,
  WhatsAppMessageDeliveryEvent,
  InstagramMessageReceivedEvent,
  InstagramMessageDeliveryEvent,
} from "../webhooks/types";

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
function deepMerge<T>(base: T, override?: DeepPartial<T>): T {
  if (!override || typeof override !== "object") return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    const baseVal = (base as Record<string, unknown>)[k];
    if (v && typeof v === "object" && !Array.isArray(v) && baseVal && typeof baseVal === "object" && !Array.isArray(baseVal)) {
      out[k] = deepMerge(baseVal, v as DeepPartial<typeof baseVal>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

const SAMPLE_APP_ID = "00000000-0000-0000-0000-000000000aaa";
const SAMPLE_CONNECTION_ID = "00000000-0000-0000-0000-000000000bbb";
const SAMPLE_PROFILE_ID = "00000000-0000-0000-0000-000000000ccc";
const SAMPLE_WORKSPACE_ID = "00000000-0000-0000-0000-000000000ddd";
const SAMPLE_SUBSCRIPTION_ID = "00000000-0000-0000-0000-000000000eee";

export const sampleIds = {
  appId: SAMPLE_APP_ID,
  connectionId: SAMPLE_CONNECTION_ID,
  profileId: SAMPLE_PROFILE_ID,
  workspaceId: SAMPLE_WORKSPACE_ID,
  subscriptionId: SAMPLE_SUBSCRIPTION_ID,
} as const;

/** Canned webhook event fixtures — deep-merge any field you care about. */
export const eventFixtures = {
  whatsappMessageReceived(
    overrides?: DeepPartial<WhatsAppMessageReceivedEvent>,
  ): WhatsAppMessageReceivedEvent {
    return deepMerge<WhatsAppMessageReceivedEvent>(
      {
        id: "evt_wa_received_01",
        type: "message.received",
        occurred_at: "2026-05-15T10:00:00Z",
        app_id: SAMPLE_APP_ID,
        provider: "whatsapp",
        connection_id: SAMPLE_CONNECTION_ID,
        data: {
          wa_message_id: "wamid.HBgM",
          from: "+15551234567",
          to: "+15559876543",
          contact_name: "Alice",
          type: "text",
          text: "Hi! Is this still available?",
          raw: {},
        },
      },
      overrides,
    );
  },

  whatsappMessageDelivery(
    overrides?: DeepPartial<WhatsAppMessageDeliveryEvent>,
  ): WhatsAppMessageDeliveryEvent {
    return deepMerge<WhatsAppMessageDeliveryEvent>(
      {
        id: "evt_wa_delivery_01",
        type: "message.delivery",
        occurred_at: "2026-05-15T10:00:01Z",
        app_id: SAMPLE_APP_ID,
        provider: "whatsapp",
        connection_id: SAMPLE_CONNECTION_ID,
        data: {
          wa_message_id: "wamid.HBgM",
          recipient_id: "15551234567",
          status: "delivered",
          raw: {},
        },
      },
      overrides,
    );
  },

  instagramFbLoginMessage(
    overrides?: DeepPartial<InstagramMessageReceivedEvent>,
  ): InstagramMessageReceivedEvent {
    return deepMerge<InstagramMessageReceivedEvent>(
      {
        id: "evt_ig_msg_01",
        type: "message.received",
        occurred_at: "2026-05-15T10:00:00Z",
        app_id: SAMPLE_APP_ID,
        provider: "instagram",
        connection_id: SAMPLE_CONNECTION_ID,
        data: {
          sender_id: "17841400000000001",
          recipient_id: "17841400000000002",
          mid: "m_BNvxxxx",
          text: "👋",
          is_echo: false,
          attachments: null,
          referral: null,
          raw: {},
        },
      },
      overrides,
    );
  },

  instagramPostback(
    overrides?: DeepPartial<InstagramMessageReceivedEvent>,
  ): InstagramMessageReceivedEvent {
    return deepMerge<InstagramMessageReceivedEvent>(
      {
        id: "evt_ig_pb_01",
        type: "message.received",
        occurred_at: "2026-05-15T10:00:00Z",
        app_id: SAMPLE_APP_ID,
        provider: "instagram",
        connection_id: SAMPLE_CONNECTION_ID,
        data: {
          sender_id: "17841400000000001",
          recipient_id: "17841400000000002",
          kind: "postback",
          title: "Get Started",
          payload: "GET_STARTED",
          raw: {},
        },
      },
      overrides,
    );
  },

  instagramIgLoginChange(
    overrides?: DeepPartial<InstagramMessageReceivedEvent>,
  ): InstagramMessageReceivedEvent {
    return deepMerge<InstagramMessageReceivedEvent>(
      {
        id: "evt_ig_change_01",
        type: "message.received",
        occurred_at: "2026-05-15T10:00:00Z",
        app_id: SAMPLE_APP_ID,
        provider: "instagram",
        connection_id: SAMPLE_CONNECTION_ID,
        data: {
          sender_id: "17841400000000001",
          recipient_id: "17841400000000002",
          from_username: "alice.example",
          mid: "m_BNvxxxx",
          text: "Hello!",
          raw: {},
        },
      },
      overrides,
    );
  },

  instagramMessageDelivery(
    overrides?: DeepPartial<InstagramMessageDeliveryEvent>,
  ): InstagramMessageDeliveryEvent {
    return deepMerge<InstagramMessageDeliveryEvent>(
      {
        id: "evt_ig_delivery_01",
        type: "message.delivery",
        occurred_at: "2026-05-15T10:00:01Z",
        app_id: SAMPLE_APP_ID,
        provider: "instagram",
        connection_id: SAMPLE_CONNECTION_ID,
        data: {
          sender_id: "17841400000000001",
          recipient_id: "17841400000000002",
          mids: ["m_BNvxxxx"],
          watermark: 1715769600000,
        },
      },
      overrides,
    );
  },
};

/** Canned API response envelopes (matches what the server returns on 200). */
export const responseFixtures = {
  messageSent(overrides?: { provider_message_id?: string; sent_at?: string }) {
    return {
      data: {
        connection_id: SAMPLE_CONNECTION_ID,
        channel: "whatsapp" as const,
        to: "+15551234567",
        provider_message_id: overrides?.provider_message_id ?? "wamid.HBgM",
        sent_at: overrides?.sent_at ?? new Date().toISOString(),
      },
    };
  },

  commentReply(overrides?: { provider_message_id?: string }) {
    return {
      data: {
        comment_id: "ig_comment_01",
        kind: "private_reply" as const,
        connection_id: SAMPLE_CONNECTION_ID,
        provider_message_id: overrides?.provider_message_id ?? "wamid.reply.x",
        sent_at: new Date().toISOString(),
      },
      meta: { profile_id: SAMPLE_PROFILE_ID },
    };
  },

  subscriptionCreated(overrides?: { secret?: string; url?: string }) {
    return {
      data: {
        id: SAMPLE_SUBSCRIPTION_ID,
        app_id: SAMPLE_APP_ID,
        profile_id: SAMPLE_PROFILE_ID,
        url: overrides?.url ?? "https://example.com/webhook",
        events: ["message.received", "message.delivery"],
        providers: ["whatsapp", "instagram"],
        status: "active" as const,
        last_delivery_at: null,
        consecutive_failures: 0,
        previous_secret_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        secret: overrides?.secret ?? "whsec_fixture_test_secret_value",
      },
    };
  },

  subscriptionList(overrides?: { items?: number }) {
    const items = overrides?.items ?? 1;
    return {
      data: Array.from({ length: items }, (_, i) => ({
        id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
        app_id: SAMPLE_APP_ID,
        profile_id: SAMPLE_PROFILE_ID,
        url: `https://example.com/webhook/${i}`,
        events: ["message.received", "message.delivery"],
        providers: ["whatsapp", "instagram"],
        status: "active" as const,
        last_delivery_at: null,
        consecutive_failures: 0,
        previous_secret_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      meta: { profile_id: SAMPLE_PROFILE_ID },
    };
  },

  rotatedSecret(overrides?: { secret?: string; graceDays?: number }) {
    const graceDays = overrides?.graceDays ?? 7;
    return {
      data: {
        subscription_id: SAMPLE_SUBSCRIPTION_ID,
        secret: overrides?.secret ?? "whsec_rotated_test_secret",
        grace_days: graceDays,
        previous_secret_expires_at: new Date(
          Date.now() + graceDays * 86400_000,
        ).toISOString(),
      },
      meta: { profile_id: SAMPLE_PROFILE_ID },
    };
  },

  oauthTokenResponse(overrides?: { accessToken?: string; scope?: string }) {
    return {
      access_token: overrides?.accessToken ?? "atb_live_test_fixture_key",
      token_type: "bearer" as const,
      scope: overrides?.scope ?? "whatsapp",
      connection_id: SAMPLE_CONNECTION_ID,
      profile_id: SAMPLE_PROFILE_ID,
      workspace_id: SAMPLE_WORKSPACE_ID,
    };
  },

  oauthError(error = "invalid_grant", description = "code expired") {
    return { error, error_description: description };
  },

  apiError(code: string, message: string, status: number) {
    return { error: { code, message, status, request_id: "req_fixture" } };
  },

  // ----- Connections (Phase 1) -----
  connectionList(overrides?: { items?: number }) {
    const items = overrides?.items ?? 1;
    return {
      data: Array.from({ length: items }, (_, i) => ({
        id: i === 0 ? SAMPLE_CONNECTION_ID : `00000000-0000-0000-0000-${String(items + i).padStart(12, "0")}`,
        channel: "whatsapp" as const,
        status: "connected",
        display_name: "Atribu Test",
        external_id: "12345678901234",
        provider_subtype: null,
        authorized_at: "2026-05-15T12:00:00Z",
        created_at: "2026-05-15T11:00:00Z",
      })),
      meta: { profile_id: SAMPLE_PROFILE_ID },
    };
  },

  connectionDetail(overrides?: { id?: string; channel?: "whatsapp" | "instagram" }) {
    return {
      data: {
        id: overrides?.id ?? SAMPLE_CONNECTION_ID,
        channel: overrides?.channel ?? "whatsapp",
        status: "connected",
        display_name: "Atribu Test",
        external_id: "12345678901234",
        provider_subtype: null,
        authorized_at: "2026-05-15T12:00:00Z",
        created_at: "2026-05-15T11:00:00Z",
      },
      meta: { profile_id: SAMPLE_PROFILE_ID },
    };
  },

  // ----- WhatsApp templates (Phase 1) -----
  whatsappTemplateList(overrides?: { items?: number }) {
    const items = overrides?.items ?? 1;
    return {
      data: Array.from({ length: items }, (_, i) => ({
        id: `template_${i}`,
        name: `welcome_message_${i}`,
        language: "en_US",
        category: "MARKETING",
        status: i === 0 ? "APPROVED" : "PENDING",
        components: [{ type: "BODY", text: "Hello {{1}}!" }],
      })),
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappTemplateCreated(overrides?: { id?: string; status?: string }) {
    return {
      data: {
        id: overrides?.id ?? "00000000-0000-0000-0000-000000000aaa",
        status: overrides?.status ?? "PENDING",
      },
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  // ----- WhatsApp broadcasts (Phase 1) -----
  whatsappBroadcast(overrides?: { id?: string; status?: string }) {
    return {
      id: overrides?.id ?? "00000000-0000-0000-0000-000000000fff",
      name: "Test Broadcast",
      template_name: "welcome_message_0",
      template_language: "en_US",
      status: (overrides?.status ?? "draft") as "draft" | "sending" | "completed" | "cancelled" | "failed",
      total_recipients: 3,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      failed_count: 0,
      started_at: null,
      completed_at: null,
      created_at: "2026-05-16T10:00:00Z",
    };
  },

  whatsappBroadcastList(overrides?: { items?: number }) {
    const items = overrides?.items ?? 1;
    return {
      data: Array.from({ length: items }, (_, i) =>
        this.whatsappBroadcast({ id: `00000000-0000-0000-0000-${String(i).padStart(12, "f")}` }),
      ),
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappBroadcastCreated() {
    return {
      data: this.whatsappBroadcast(),
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappBroadcastDetail() {
    return {
      data: {
        ...this.whatsappBroadcast(),
        recipients: [
          {
            id: "00000000-0000-0000-0000-000000000001",
            phone_number: "+15551234567",
            template_params: null,
            status: "pending" as const,
            wamid: null,
            error_message: null,
            error_reason_code: null,
            sent_at: null,
          },
        ],
      },
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappBroadcastUpdated(overrides?: { status?: string }) {
    return {
      data: this.whatsappBroadcast({ status: overrides?.status ?? "cancelled" }),
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  // ----- WhatsApp registration (Meta proxy) -----
  whatsappNumberAdded(overrides?: { phone_number_id?: string; migrated?: boolean }) {
    return {
      data: {
        phone_number_id: overrides?.phone_number_id ?? "109876543210987",
        migrated: overrides?.migrated ?? false,
      },
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappCodeRequested() {
    return {
      data: { requested: true, code_method: "VOICE" as const },
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappCodeVerified() {
    return {
      data: { verified: true },
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappRegistered() {
    return {
      data: { registered: true, subscribed: true },
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappSubscribed() {
    return {
      data: { subscribed: true },
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappSubscribedApps(overrides?: { items?: number }) {
    const items = overrides?.items ?? 1;
    return {
      data: Array.from({ length: items }, (_, i) => ({
        id: `100000000000${i}`,
        name: i === 0 ? "Atribu" : "Chatwoot",
        link: null,
      })),
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  whatsappFunding(overrides?: { primary_funding_id?: string | null; currency?: string; status?: string }) {
    const data: Record<string, unknown> = {};
    if (overrides?.primary_funding_id !== null) {
      data.primary_funding_id = overrides?.primary_funding_id ?? "1234567890";
    }
    if (overrides?.currency !== undefined) data.currency = overrides.currency;
    else data.currency = "CLP";
    data.status = overrides?.status ?? "APPROVED";
    return {
      data,
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  // ----- Instagram triggers (Phase 1) -----
  instagramTrigger(overrides?: { id?: string; keyword?: string; enabled?: boolean }) {
    return {
      id: overrides?.id ?? "00000000-0000-0000-0000-000000000aaa",
      connection_id: SAMPLE_CONNECTION_ID,
      keyword: overrides?.keyword ?? "PRICE",
      keyword_match_mode: "contains" as const,
      case_sensitive: false,
      post_id_allowlist: null,
      opening_message: "Here's our pricing — happy to chat!",
      public_comment_reply: "Sent you a DM!",
      agent_context_hint: null,
      enabled: overrides?.enabled ?? true,
      trigger_count: 0,
      last_triggered_at: null,
      created_at: "2026-05-16T10:00:00Z",
      updated_at: "2026-05-16T10:00:00Z",
    };
  },

  instagramTriggerList(overrides?: { items?: number }) {
    const items = overrides?.items ?? 1;
    return {
      data: Array.from({ length: items }, (_, i) =>
        this.instagramTrigger({ id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}` }),
      ),
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  instagramTriggerCreated() {
    return {
      data: this.instagramTrigger(),
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  instagramTriggerTestDm() {
    return {
      data: { provider_message_id: "mid.fixture" },
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },

  instagramTriggerResumed() {
    return {
      data: { resumed: true },
      meta: { profile_id: SAMPLE_PROFILE_ID, connection_id: SAMPLE_CONNECTION_ID },
    };
  },
};

/** Combined export so consumers can `import { fixtures } from "@atribu/node/test"`. */
export const fixtures = {
  ids: sampleIds,
  events: eventFixtures,
  responses: responseFixtures,
};

export type FixtureWebhookEvent = AtribuWebhookEvent;

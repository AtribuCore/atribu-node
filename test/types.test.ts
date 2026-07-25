/**
 * Compile-time type tests via vitest's `expectTypeOf`. These don't make
 * runtime assertions — they fail the build if discriminated unions stop
 * narrowing correctly, if response types drift from the OpenAPI codegen,
 * or if the error hierarchy reshapes.
 *
 * Vitest collects them as no-op tests at runtime, so the `it()` wrappers
 * keep them visible in the suite output.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { AtribuClient } from "../src/client";
import type {
  AtribuWebhookEvent,
  WhatsAppMessageReceivedEvent,
  WhatsAppMessageDeliveryEvent,
  InstagramMessageReceivedEvent,
  InstagramFbLoginMessageData,
  InstagramFbLoginPostbackData,
  InstagramIgLoginChangeData,
  CalendarEventChangedEvent,
} from "../src/webhooks/types";
import type {
  AtribuApiError,
  AtribuTransportError,
  AtribuWebhookError,
  AtribuOauthError,
} from "../src/errors";
import type { RetryHint } from "../src/retry";
import type { MessageSendInput, MessageContent } from "../src/resources/messages";

// Type-level narrowing helpers — operate on the type only, never run at
// runtime. Lets us avoid `in` checks on `{}`-shaped fixtures.
type WaReceived = Extract<AtribuWebhookEvent, { type: "message.received"; provider: "whatsapp" }>;
type WaDelivery = Extract<AtribuWebhookEvent, { type: "message.delivery"; provider: "whatsapp" }>;
type IgReceived = Extract<AtribuWebhookEvent, { type: "message.received"; provider: "instagram" }>;
type CalChanged = Extract<AtribuWebhookEvent, { type: "calendar.event.changed" }>;

describe("type narrowing — webhook event union", () => {
  it("type+provider discriminator picks the WA received variant", () => {
    expectTypeOf<WaReceived>().toEqualTypeOf<WhatsAppMessageReceivedEvent>();
    expectTypeOf<WaReceived["data"]["wa_message_id"]>().toEqualTypeOf<string>();
    expectTypeOf<WaReceived["data"]["from"]>().toEqualTypeOf<string>();
    expectTypeOf<WaReceived["data"]["to"]>().toEqualTypeOf<string | null>();
  });

  it("type+provider picks the WA delivery variant", () => {
    expectTypeOf<WaDelivery>().toEqualTypeOf<WhatsAppMessageDeliveryEvent>();
    expectTypeOf<WaDelivery["data"]["recipient_id"]>().toEqualTypeOf<string>();
  });

  it("Instagram message.received has three nested data shapes", () => {
    expectTypeOf<IgReceived["data"]>().toEqualTypeOf<
      | InstagramFbLoginMessageData
      | InstagramFbLoginPostbackData
      | InstagramIgLoginChangeData
    >();

    // Each shape can be picked out via a `kind`/`is_echo`/`from_username`
    // discriminator at compile time:
    type Postback = Extract<IgReceived["data"], { kind: "postback" }>;
    expectTypeOf<Postback>().toEqualTypeOf<InstagramFbLoginPostbackData>();
    expectTypeOf<Postback["payload"]>().toEqualTypeOf<string | null>();

    type FbMessage = Extract<IgReceived["data"], { is_echo: boolean }>;
    expectTypeOf<FbMessage>().toEqualTypeOf<InstagramFbLoginMessageData>();
    expectTypeOf<FbMessage["is_echo"]>().toEqualTypeOf<boolean>();

    type IgChange = Extract<IgReceived["data"], { from_username: string | null }>;
    expectTypeOf<IgChange>().toEqualTypeOf<InstagramIgLoginChangeData>();
  });

  it("type+provider picks the Google Calendar changed variant", () => {
    expectTypeOf<CalChanged>().toEqualTypeOf<CalendarEventChangedEvent>();
    expectTypeOf<CalChanged["provider"]>().toEqualTypeOf<"google_calendar">();
    expectTypeOf<CalChanged["data"]["event_id"]>().toEqualTypeOf<string>();
    expectTypeOf<CalChanged["data"]["change_type"]>().toEqualTypeOf<"upserted" | "deleted">();
    expectTypeOf<CalChanged["data"]["extended_private"]>().toEqualTypeOf<Record<string, string>>();
  });

  it("provider field is constrained to WhatsApp | Instagram | Email | Google Calendar", () => {
    expectTypeOf<AtribuWebhookEvent["provider"]>().toEqualTypeOf<
      "whatsapp" | "instagram" | "email" | "google_calendar"
    >();
  });

  it("type field is constrained to known event types", () => {
    expectTypeOf<AtribuWebhookEvent["type"]>().toEqualTypeOf<
      | "message.received"
      | "message.delivery"
      | "conversation.started"
      | "calendar.event.changed"
      | "message.echo"
      | "message.history"
      | "contacts.sync"
      | "template.updated"
      | "channel.health.updated"
      | "call.status.updated"
      | "call.permission.updated"
    >();
  });
});

describe("type narrowing — message content union", () => {
  it("MessageSendInput.content is a discriminated union on type", () => {
    type ContentType = MessageContent["type"];
    expectTypeOf<ContentType>().toMatchTypeOf<string>();

    type TextContent = Extract<MessageContent, { type: "text" }>;
    expectTypeOf<TextContent["text"]>().toEqualTypeOf<string>();
  });

  it("MessageSendInput.channel constrains the whole input shape", () => {
    expectTypeOf<MessageSendInput["channel"]>().toEqualTypeOf<
      "whatsapp" | "instagram" | "email"
    >();
    expectTypeOf<MessageSendInput["connection_id"]>().toEqualTypeOf<string>();
  });
});

describe("type identity — error hierarchy", () => {
  it("AtribuApiError carries typed code + retry + requestId", () => {
    expectTypeOf<AtribuApiError["code"]>().toMatchTypeOf<string>();
    expectTypeOf<AtribuApiError["status"]>().toEqualTypeOf<number>();
    expectTypeOf<AtribuApiError["requestId"]>().toEqualTypeOf<string | null>();
    expectTypeOf<AtribuApiError["retry"]>().toMatchTypeOf<RetryHint>();
  });

  it("Each error class has distinct shape", () => {
    expectTypeOf<AtribuTransportError["cause"]>().toEqualTypeOf<unknown>();
    expectTypeOf<AtribuWebhookError["code"]>().toEqualTypeOf<
      "missing_signature" | "malformed_header" | "expired_timestamp" | "invalid_signature"
    >();
    expectTypeOf<AtribuOauthError["status"]>().toEqualTypeOf<number>();
    expectTypeOf<AtribuOauthError["description"]>().toEqualTypeOf<string | null>();
  });

  it("RetryHint is a discriminated union with retryAfterMs only on retry_after", () => {
    type RetryAfter = Extract<RetryHint, { action: "retry_after" }>;
    expectTypeOf<RetryAfter["retryAfterMs"]>().toEqualTypeOf<number>();

    expectTypeOf<RetryHint["action"]>().toEqualTypeOf<
      "retry" | "retry_after" | "refresh_token" | "fix_and_retry" | "do_not_retry"
    >();
  });
});

describe("type identity — AtribuClient surface", () => {
  it("exposes the expected resources at the right paths", () => {
    expectTypeOf<AtribuClient["messages"]["send"]>().toBeFunction();
    expectTypeOf<AtribuClient["comments"]["reply"]>().toBeFunction();
    expectTypeOf<AtribuClient["comments"]["privateReply"]>().toBeFunction();
    expectTypeOf<AtribuClient["webhooks"]["subscriptions"]["list"]>().toBeFunction();
    expectTypeOf<AtribuClient["webhooks"]["subscriptions"]["create"]>().toBeFunction();
    expectTypeOf<AtribuClient["webhooks"]["subscriptions"]["rotateSecret"]>().toBeFunction();
    expectTypeOf<AtribuClient["webhooks"]["deliveries"]["replay"]>().toBeFunction();
    expectTypeOf<AtribuClient["withRetry"]>().toBeFunction();
  });

  it("withRetry returns the same AtribuClient type", () => {
    expectTypeOf<ReturnType<AtribuClient["withRetry"]>>().toEqualTypeOf<AtribuClient>();
  });
});

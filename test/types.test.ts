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
  WebhookProvider,
  WebhookEventType,
  WhatsAppMessageReceivedEvent,
  WhatsAppMessageDeliveryEvent,
  WhatsAppMessageEchoEvent,
  WhatsAppEventAttachment,
  InstagramMessageReceivedEvent,
  InstagramFbLoginMessageData,
  InstagramFbLoginPostbackData,
  InstagramIgLoginChangeData,
  InstagramCommentReceivedEvent,
  CalendarEventChangedEvent,
  EmailMessageReceivedEvent,
  EmailEventDeliveryFailure,
} from "../src/webhooks/types";
import type {
  AtribuApiError,
  AtribuTransportError,
  AtribuWebhookError,
  AtribuOauthError,
} from "../src/errors";
import type { RetryHint } from "../src/retry";
import type {
  MessageSendInput,
  MessageSendResponse,
  MessageContent,
  MessageTypingInput,
  MessageMarkReadInput,
} from "../src/resources/messages";

// Type-level narrowing helpers — operate on the type only, never run at
// runtime. Lets us avoid `in` checks on `{}`-shaped fixtures.
type WaReceived = Extract<AtribuWebhookEvent, { type: "message.received"; provider: "whatsapp" }>;
type WaDelivery = Extract<AtribuWebhookEvent, { type: "message.delivery"; provider: "whatsapp" }>;
type WaEcho = Extract<AtribuWebhookEvent, { type: "message.echo" }>;
type IgReceived = Extract<AtribuWebhookEvent, { type: "message.received"; provider: "instagram" }>;
type IgCommentReceived = Extract<AtribuWebhookEvent, { type: "comment.received"; provider: "instagram" }>;
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

  it("WA received + echo both carry OPTIONAL resolved attachments", () => {
    // Optional on purpose: present only on media messages whose media_id
    // Atribu resolved in time. A required field here would teach consumers
    // to assume every media message has a hosted URL — the timeout path
    // deliberately ships without one.
    expectTypeOf<WaReceived["data"]["attachments"]>().toEqualTypeOf<
      WhatsAppEventAttachment[] | undefined
    >();

    expectTypeOf<WaEcho>().toEqualTypeOf<WhatsAppMessageEchoEvent>();
    expectTypeOf<WaEcho["data"]["attachments"]>().toEqualTypeOf<
      WhatsAppEventAttachment[] | undefined
    >();
    expectTypeOf<WhatsAppEventAttachment["payload"]>().toEqualTypeOf<{ url: string }>();
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

  it("type+provider picks the Instagram comment.received variant", () => {
    expectTypeOf<IgCommentReceived>().toEqualTypeOf<InstagramCommentReceivedEvent>();
    expectTypeOf<IgCommentReceived["data"]["comment_id"]>().toEqualTypeOf<string>();
    expectTypeOf<IgCommentReceived["data"]["from_id"]>().toEqualTypeOf<string | null>();
    expectTypeOf<IgCommentReceived["data"]["ad_id"]>().toEqualTypeOf<string | null>();
    expectTypeOf<IgCommentReceived["data"]["parent_id"]>().toEqualTypeOf<string | null>();
  });

  it("type+provider picks the Google Calendar changed variant", () => {
    expectTypeOf<CalChanged>().toEqualTypeOf<CalendarEventChangedEvent>();
    expectTypeOf<CalChanged["provider"]>().toEqualTypeOf<"google_calendar">();
    expectTypeOf<CalChanged["data"]["event_id"]>().toEqualTypeOf<string>();
    expectTypeOf<CalChanged["data"]["change_type"]>().toEqualTypeOf<"upserted" | "deleted">();
    expectTypeOf<CalChanged["data"]["extended_private"]>().toEqualTypeOf<Record<string, string>>();
  });

  it("provider field is constrained to the WEBHOOK_PROVIDERS vocabulary", () => {
    // Asserted against `WebhookProvider` — derived from the `WEBHOOK_PROVIDERS`
    // const array in `src/webhooks/types.ts`, which is itself the mirror of
    // the server repo's `src/lib/webhooks/event-types.ts` — rather than a
    // hardcoded literal union here. A hardcoded list silently drifts the
    // moment a provider (e.g. `shopify`, #497) is added to that array but not
    // to every `*Event` interface's `provider` literal; deriving it means
    // this test can only fail for a *real* narrowing mismatch, never for
    // being stale.
    expectTypeOf<AtribuWebhookEvent["provider"]>().toEqualTypeOf<WebhookProvider>();
  });

  it("type field is constrained to the WEBHOOK_EVENT_TYPES vocabulary", () => {
    // Same rationale as the provider assertion above: derived from
    // `WebhookEventType` (`WEBHOOK_EVENT_TYPES` in `src/webhooks/types.ts`)
    // instead of re-typing the event list by hand.
    expectTypeOf<AtribuWebhookEvent["type"]>().toEqualTypeOf<WebhookEventType>();
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
      "whatsapp" | "instagram" | "email" | "messenger"
    >();
    expectTypeOf<MessageSendInput["connection_id"]>().toEqualTypeOf<string>();
  });

  // #1653. Derived from the OpenAPI codegen, so these assertions fail if the
  // spec is regenerated without the fields — which is the drift that would
  // leave a consumer unable to see the thread it just started.
  it("the email content variant takes the threading anchors and list_unsubscribe", () => {
    type EmailContent = Extract<MessageContent, { type: "email" }>;
    // Every threading anchor is optional: a send that carries none of them
    // starts a new thread, which is the whole point of the ticket.
    expectTypeOf<EmailContent["thread_id"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<EmailContent["subject"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<EmailContent["list_unsubscribe"]>().toEqualTypeOf<
      { url: string; one_click?: boolean } | undefined
    >();
  });

  it("the send response carries the email thread and Message-ID", () => {
    expectTypeOf<MessageSendResponse["thread_id"]>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<MessageSendResponse["rfc822_message_id"]>().toEqualTypeOf<
      string | null | undefined
    >();
    expectTypeOf<MessageSendResponse["provider_message_id"]>().toEqualTypeOf<string>();
  });
});

describe("type narrowing — inbound email event (#1653)", () => {
  it("narrows on provider and exposes the classification fields", () => {
    type EmailReceived = Extract<
      AtribuWebhookEvent,
      { type: "message.received"; provider: "email" }
    >;
    expectTypeOf<EmailReceived>().toEqualTypeOf<EmailMessageReceivedEvent>();
    expectTypeOf<EmailReceived["data"]["thread_id"]>().toEqualTypeOf<string>();
    expectTypeOf<EmailReceived["data"]["auto_submitted"]>().toEqualTypeOf<string | null>();
    expectTypeOf<EmailReceived["data"]["precedence"]>().toEqualTypeOf<string | null>();
    expectTypeOf<EmailReceived["data"]["delivery_failure"]>().toEqualTypeOf<
      EmailEventDeliveryFailure | null
    >();
  });

  it("a delivery failure names the recipient, the status and the message that bounced", () => {
    expectTypeOf<EmailEventDeliveryFailure["failed_recipient"]>().toEqualTypeOf<string | null>();
    expectTypeOf<EmailEventDeliveryFailure["status"]>().toEqualTypeOf<string | null>();
    expectTypeOf<EmailEventDeliveryFailure["action"]>().toEqualTypeOf<
      "failed" | "delayed" | "delivered" | "relayed" | "expanded" | null
    >();
    expectTypeOf<EmailEventDeliveryFailure["diagnostic_code"]>().toEqualTypeOf<string | null>();
    expectTypeOf<
      EmailEventDeliveryFailure["original_rfc822_message_id"]
    >().toEqualTypeOf<string | null>();
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
    expectTypeOf<AtribuClient["messages"]["typing"]>().toBeFunction();
    expectTypeOf<AtribuClient["messages"]["markRead"]>().toBeFunction();
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

  it("markRead's input is typing's minus the mode it hard-codes", () => {
    // `indicator` is optional on typing() — omitted on the wire when unset, so
    // a v1.13.0 client keeps working against a bridge that predates the field.
    expectTypeOf<MessageTypingInput["indicator"]>().toEqualTypeOf<
      "typing" | "read" | undefined
    >();

    // …and absent from markRead(), which IS the mode. Passing `indicator` there
    // would be a contradiction, so it is a compile error rather than a
    // preference the runtime silently overrides.
    expectTypeOf<keyof MessageMarkReadInput>().toEqualTypeOf<
      "connection_id" | "channel" | "to" | "message_id"
    >();
  });
});

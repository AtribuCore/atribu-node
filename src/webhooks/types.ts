/**
 * Typed webhook event union. Mirrors `src/lib/webhooks/fan-out.ts` and the
 * fan-out call sites in the WA + IG webhook processors.
 *
 * Wire format is snake_case to match the server. Consumers that prefer
 * camelCase can convert in their handler.
 */

export type WebhookProvider = "whatsapp" | "instagram" | "email" | "google_calendar";

export type WebhookEventType =
  | "message.received"
  | "message.delivery"
  | "conversation.started"
  | "calendar.event.changed"
  | "message.echo"
  | "message.history"
  | "contacts.sync";

interface BaseEvent {
  /** Stable event id for de-dup (also surfaced in `X-Atribu-Delivery-Id`). */
  id: string;
  /** ISO 8601 timestamp of the underlying provider event. */
  occurred_at: string;
  /** The consumer OAuth app id (`oauth_apps.id`). */
  app_id: string;
  /** The `data_connections.id` the event came from. */
  connection_id: string;
}

export interface WhatsAppMessageReceivedEvent extends BaseEvent {
  type: "message.received";
  provider: "whatsapp";
  data: {
    wa_message_id: string;
    from: string;
    to: string | null;
    contact_name: string | null;
    /** Meta's message type (text, image, video, audio, document, button, interactive, …). */
    type: string;
    text: string | null;
    /** Full Meta message envelope. */
    raw: Record<string, unknown>;
  };
}

export interface WhatsAppMessageDeliveryEvent extends BaseEvent {
  type: "message.delivery";
  provider: "whatsapp";
  data: {
    wa_message_id: string;
    recipient_id: string;
    status: "sent" | "delivered" | "read" | "failed" | (string & {});
    raw: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// WhatsApp coexistence (the business keeps the WhatsApp Business App on their
// phone AND Atribu is on Cloud API for the same number).
//
// Unlike `message.received`, these three carry the RAW Meta `change.value` as
// `data` — `metadata` plus `message_echoes[]` / `history[]` / `state_sync[]` at
// the top level. Media arrives as a bare Meta `media_id` with no hosted URL;
// resolve it with `whatsapp.media.get(mediaId, { connectionId })`.
// ---------------------------------------------------------------------------

export interface WhatsAppCoexistenceMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

/** A message the business sent from the WhatsApp Business App on the phone. */
export interface WhatsAppMessageEcho {
  /** The business phone number. */
  from: string;
  /** The WhatsApp user's phone number (the customer). */
  to: string;
  /** wamid. */
  id: string;
  /** Unix epoch seconds, as a string. */
  timestamp: string;
  /** Meta's message type (text, image, video, audio, document, sticker, location, …). */
  type: string;
  text?: { body: string };
  [key: string]: unknown;
}

/**
 * A staff reply typed in the WhatsApp Business App (coexistence). Emitted ONE
 * EVENT PER ECHO — `id` is the echo's wamid, so de-dup works exactly as it does
 * for `message.received`.
 */
export interface WhatsAppMessageEchoEvent extends BaseEvent {
  type: "message.echo";
  provider: "whatsapp";
  data: {
    messaging_product: string;
    metadata: WhatsAppCoexistenceMetadata;
    /** Exactly one echo per delivery. */
    message_echoes: WhatsAppMessageEcho[];
  };
}

export interface WhatsAppHistoryMessage {
  from: string;
  to?: string;
  /** wamid. */
  id: string;
  /** Unix epoch seconds, as a string. */
  timestamp: string;
  type: string;
  text?: { body: string };
  history_context?: { status: string };
  [key: string]: unknown;
}

export interface WhatsAppHistoryThread {
  /** The WhatsApp user's phone number — the thread key. */
  id: string;
  messages: WhatsAppHistoryMessage[];
}

export interface WhatsAppHistoryChunk {
  /** `progress` is 0–100 across the whole share; `phase` + `chunk_order` identify the chunk. */
  metadata?: { phase: number; chunk_order: number; progress: number };
  threads?: WhatsAppHistoryThread[];
}

/**
 * A chunk of the WhatsApp Business App's chat history, shared once at
 * coexistence onboarding (up to 6 months). Emitted ONE EVENT PER CHUNK — not
 * per message — and each chunk carries many threads. Chunks that Meta returns
 * with an `errors[]` (a declined/failed history share) are never delivered.
 * Both directions are present: compare `message.from` against
 * `metadata.display_phone_number` to tell a staff message from a customer one.
 */
export interface WhatsAppMessageHistoryEvent extends BaseEvent {
  type: "message.history";
  provider: "whatsapp";
  data: {
    messaging_product: string;
    metadata: WhatsAppCoexistenceMetadata;
    /** Exactly one chunk per delivery. */
    history: WhatsAppHistoryChunk[];
  };
}

export interface WhatsAppStateSyncItem {
  /** e.g. "contact". */
  type: string;
  contact?: {
    full_name?: string;
    first_name?: string;
    phone_number: string;
  };
  /** e.g. "add" / "remove". */
  action?: string;
  metadata?: { timestamp: string };
  [key: string]: unknown;
}

/**
 * The phone's address book, synced from the WhatsApp Business App
 * (coexistence). One event per Meta `smb_app_state_sync` change.
 */
export interface WhatsAppContactsSyncEvent extends BaseEvent {
  type: "contacts.sync";
  provider: "whatsapp";
  data: {
    messaging_product: string;
    metadata: WhatsAppCoexistenceMetadata;
    state_sync: WhatsAppStateSyncItem[];
  };
}

export interface InstagramFbLoginMessageData {
  sender_id: string;
  recipient_id: string;
  mid: string;
  text: string | null;
  is_echo: boolean;
  attachments: unknown[] | null;
  referral: unknown | null;
  raw: Record<string, unknown>;
}

export interface InstagramFbLoginPostbackData {
  sender_id: string;
  recipient_id: string;
  kind: "postback";
  title: string | null;
  payload: string | null;
  raw: Record<string, unknown>;
}

export interface InstagramIgLoginChangeData {
  sender_id: string | null;
  recipient_id: string | null;
  from_username: string | null;
  mid: string | null;
  text: string | null;
  raw: Record<string, unknown>;
}

/**
 * IG `message.received` has three shapes (fb_login message, fb_login
 * postback, ig_login change). Narrow on `"kind" in data` for postback,
 * `"is_echo" in data` for fb_login message, otherwise it's an ig_login
 * change.
 */
export type InstagramMessageReceivedData =
  | InstagramFbLoginMessageData
  | InstagramFbLoginPostbackData
  | InstagramIgLoginChangeData;

export interface InstagramMessageReceivedEvent extends BaseEvent {
  type: "message.received";
  provider: "instagram";
  data: InstagramMessageReceivedData;
}

export interface InstagramMessageDeliveryEvent extends BaseEvent {
  type: "message.delivery";
  provider: "instagram";
  data: {
    sender_id: string;
    recipient_id: string;
    mids: string[];
    watermark: number;
  };
}

export interface EmailEventAddress {
  email: string;
  name: string | null;
}

export interface EmailEventAttachment {
  id: string | null;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
}

/**
 * An inbound email landed in a connected Gmail/Outlook mailbox. `thread_id` is
 * the provider thread (Gmail threadId / Outlook conversationId) — the
 * conversation key. To reply in-thread, round-trip `message_id` (Outlook
 * `reply_to_message_id`) or the RFC822 anchors (`rfc822_message_id` /
 * `references`) on `messages.send`.
 */
export interface EmailMessageReceivedEvent extends BaseEvent {
  type: "message.received";
  provider: "email";
  data: {
    email_provider: "gmail" | "outlook";
    message_id: string;
    thread_id: string;
    rfc822_message_id: string | null;
    in_reply_to: string | null;
    references: string[];
    from: EmailEventAddress | null;
    to: EmailEventAddress[];
    cc: EmailEventAddress[];
    subject: string | null;
    text_body: string | null;
    html_body: string | null;
    attachments: EmailEventAttachment[];
    /** Full provider message envelope. */
    raw: Record<string, unknown>;
  };
}

export interface CalendarChangeDateTime {
  date_time: string | null;
  date: string | null;
  time_zone: string | null;
}

export interface CalendarChangeAttendee {
  email: string;
  display_name: string | null;
  /** needsAction | declined | tentative | accepted */
  response_status: string | null;
  organizer: boolean;
  self: boolean;
  optional: boolean;
}

/**
 * The `calendar.event.changed` payload. Mirrors
 * `packages/analytics-enrichment/src/integrations/calendar/types.ts`
 * `CalendarEventChangedData` field-for-field (re-declared because the SDK is
 * standalone). `change_type` is `'deleted'` when the event was cancelled, else
 * `'upserted'`. Reconcile your own ledger on `event_id` (or `ical_uid` across
 * calendars); read your link tag out of `extended_private`; use `updated` for
 * loop-prevention (skip echoes of your own writes).
 */
export interface CalendarEventChangedData {
  calendar_id: string;
  event_id: string;
  change_type: "upserted" | "deleted";
  ical_uid: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  summary: string | null;
  description: string | null;
  location: string | null;
  start: CalendarChangeDateTime | null;
  end: CalendarChangeDateTime | null;
  attendees: CalendarChangeAttendee[];
  organizer_email: string | null;
  creator_email: string | null;
  html_link: string | null;
  hangout_link: string | null;
  /** extendedProperties.private — the consumer's link / loop-prevention tag. */
  extended_private: Record<string, string>;
  created: string | null;
  /** RFC3339 last-modification time — the consumer's loop-prevention anchor. */
  updated: string | null;
  recurring_event_id: string | null;
}

/**
 * An event on a connected Google Calendar was created, updated, or cancelled —
 * whether through the Atribu API, the Atribu UI, or directly on Google. Carries
 * the full normalized event so a consumer can reconcile its own ledger.
 */
export interface CalendarEventChangedEvent extends BaseEvent {
  type: "calendar.event.changed";
  provider: "google_calendar";
  data: CalendarEventChangedData;
}

/** Reserved — the server doesn't emit this today but the type is in the union. */
export interface ConversationStartedEvent extends BaseEvent {
  type: "conversation.started";
  provider: WebhookProvider;
  data: Record<string, unknown>;
}

export type AtribuWebhookEvent =
  | WhatsAppMessageReceivedEvent
  | WhatsAppMessageDeliveryEvent
  | WhatsAppMessageEchoEvent
  | WhatsAppMessageHistoryEvent
  | WhatsAppContactsSyncEvent
  | InstagramMessageReceivedEvent
  | InstagramMessageDeliveryEvent
  | EmailMessageReceivedEvent
  | CalendarEventChangedEvent
  | ConversationStartedEvent;

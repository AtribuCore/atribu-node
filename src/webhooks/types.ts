/**
 * Typed webhook event union. Mirrors `src/lib/webhooks/fan-out.ts` and the
 * fan-out call sites in the WA + IG webhook processors.
 *
 * Wire format is snake_case to match the server. Consumers that prefer
 * camelCase can convert in their handler.
 */

/**
 * The event vocabulary, as ARRAYS with the types derived from them.
 *
 * Arrays rather than bare unions on purpose: a union erases at build time, so
 * a consumer cannot validate against it at runtime and — the reason this
 * changed — a consumer in another repo cannot assert that the events it
 * subscribes to are events this server will actually accept. Subscribing to
 * an unknown event is not a soft failure: the create call 400s, the dealer
 * ends up with no subscription, and their inbound delivery is silently dark.
 *
 * Mirrors `packages/atribu-api-contract/src/webhook-event-types.ts` in the
 * server repo. The two are a published-package boundary apart, so they cannot
 * import each other; a drift test in the server repo holds them equal.
 */
export const WEBHOOK_PROVIDERS = [
  "whatsapp",
  "instagram",
  "messenger",
  "email",
  "google_calendar",
  "shopify",
  // Atribu itself — the provider carried by every PLATFORM LIFECYCLE event
  // (connection.*, handoff.completed, recompute.completed,
  // conversion.attributed, export.*, profile.freshness.changed,
  // outcome.recorded).
  //
  // Subscriptions match on providers AND events, so these are opt-in: put
  // atribu in your subscription's `providers` or you will receive none of
  // them, however you set `events`. For a connection.* event the connector's
  // real provider (meta_ads, gohighlevel, whatsapp, …) is in `data.provider`.
  //
  // NB: no quoted strings in comments inside this array — the drift guard in
  // the server repo reads it out of the SOURCE with a regex over quoted
  // tokens, so a quoted example here becomes a phantom vocabulary entry.
  "atribu",
] as const;

export type WebhookProvider = (typeof WEBHOOK_PROVIDERS)[number];

export const WEBHOOK_EVENT_TYPES = [
  "message.received",
  "message.delivery",
  "conversation.started",
  "calendar.event.changed",
  "message.echo",
  "message.history",
  "contacts.sync",
  "template.updated",
  "channel.health.updated",
  "call.status.updated",
  "call.permission.updated",
  "whatsapp.flow.status",
  "whatsapp.flow.alert",
  "comment.received",
  "catalog.updated",
  "product.stock.changed",
  "product.price.changed",
  "checkout.abandoned",
  "order.status.changed",
  // Platform lifecycle (#1049) — all carry provider `atribu`.
  "connection.connected",
  "connection.reconnect_required",
  "connection.revoked",
  "handoff.completed",
  "recompute.completed",
  "conversion.attributed",
  "export.completed",
  "export.failed",
  "profile.freshness.changed",
  "outcome.recorded",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

interface BaseEvent {
  /** Stable event id for de-dup (also surfaced in `X-Atribu-Delivery-Id`). */
  id: string;
  /** ISO 8601 timestamp of the underlying provider event. */
  occurred_at: string;
  /** The consumer OAuth app id (`oauth_apps.id`). */
  app_id: string;
  /**
   * The `data_connections.id` the event came from.
   *
   * `null` on the platform lifecycle events that have no connection behind
   * them — `recompute.completed`, `conversion.attributed`,
   * `profile.freshness.changed`, and `handoff.completed` / `export.*` when
   * the work was not scoped to one connector. Every channel event
   * (`message.*`, `comment.received`, `catalog.updated`, …) still always
   * carries a string, as does every `connection.*` event.
   */
  connection_id: string | null;
}

/**
 * A media attachment resolved by Atribu to a hosted, browser-fetchable URL
 * (signed, ~7-day TTL) — so consumers can render inbound media without a Meta
 * token. Same shape as the Instagram fan-out's attachments.
 */
export interface WhatsAppEventAttachment {
  type: "image" | "video" | "audio" | "file" | (string & {});
  payload: { url: string };
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
    /**
     * Present on media messages when Atribu resolved the Meta `media_id` to a
     * hosted URL in time (the server has always emitted this; the SDK type
     * previously omitted it). Absent on text messages and when resolution
     * failed/timed out — fall back to
     * `whatsapp.media.get(mediaId, { connectionId })` with the `media_id`
     * from `raw`.
     */
    attachments?: WhatsAppEventAttachment[];
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
// the top level. Media inside the Meta payload arrives as a bare `media_id`
// with no hosted URL; resolve it with
// `whatsapp.media.get(mediaId, { connectionId })`. `message.echo` additionally
// carries top-level `data.attachments` with a hosted URL when Atribu could
// resolve the echo's media in time — `media.get` remains the fallback.
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
    /**
     * Present when the echo carries media (a voice note or photo the staff
     * sent from the phone) and Atribu resolved its `media_id` to a hosted URL
     * in time. The echo object itself is untouched — its media stays a bare
     * `media_id`; when `attachments` is absent, resolve it with
     * `whatsapp.media.get(mediaId, { connectionId })`.
     */
    attachments?: WhatsAppEventAttachment[];
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

/**
 * A Messenger (Facebook Page) `message.received`. `kind` says which Meta event
 * it came from:
 *   - `message`  — a message (or, with `is_echo`, the Page's own send);
 *   - `postback` — a button / Get Started tap (`text` = the button title);
 *   - `referral` — an existing thread re-entered from an ad or m.me link, with
 *                  no message (`text` and `mid` are null).
 * `referral` carries the Click-to-Messenger ad referral verbatim when present:
 * `{ ref?, ad_id, source: "ADS", type: "OPEN_THREAD", ads_context_data }`.
 * `sender_id` is the person's page-scoped id (PSID) — the `to` of a reply.
 */
export interface MessengerMessageReceivedData {
  kind: "message" | "postback" | "referral";
  page_id: string;
  sender_id: string;
  recipient_id: string;
  mid: string | null;
  text: string | null;
  is_echo: boolean;
  attachments?: unknown[] | null;
  title?: string | null;
  payload?: string | null;
  referral: unknown | null;
}

export interface MessengerMessageReceivedEvent extends BaseEvent {
  type: "message.received";
  provider: "messenger";
  data: MessengerMessageReceivedData;
}

export interface MessengerMessageDeliveryEvent extends BaseEvent {
  type: "message.delivery";
  provider: "messenger";
  data: {
    page_id: string;
    sender_id: string;
    recipient_id: string;
    mids: string[];
    watermark: number;
  };
}

/**
 * A comment landed on a connected IG post — ig_login `field=comments` or
 * fb_login `field=feed` (comments nested in the Page feed). Emitted for
 * EVERY inbound comment, unconditional on whether it matched an internal
 * comment-to-DM trigger — including the business's own replies (Meta does
 * not flag comment self-authorship the way it flags message echoes, so this
 * is not filtered). `ad_id` is present only when the comment landed on a
 * boosted post / ad post. `parent_id` is set when the comment is a reply to
 * another comment.
 */
export interface InstagramCommentReceivedEvent extends BaseEvent {
  type: "comment.received";
  provider: "instagram";
  data: {
    comment_id: string;
    from_id: string | null;
    from_username: string | null;
    text: string | null;
    media_id: string | null;
    /** Present only on comments placed on boosted posts / ad posts. */
    ad_id: string | null;
    /** Set when this comment is a reply to another comment. */
    parent_id: string | null;
    /** Full Meta `change` envelope (field + value). */
    raw: Record<string, unknown>;
  };
}

/**
 * The stock band Atribu derives for a variant. `low_stock` is Atribu's own
 * threshold (5 or fewer available), not something Shopify reports;
 * `discontinued` means the product left ACTIVE status or was deleted.
 */
export type ShopifyStockState = "in_stock" | "low_stock" | "out_of_stock" | "discontinued";

/**
 * The catalog changed — a TICKLE, never the data. Pull the changed rows with
 * `client.commerce.products({ updated_since })`; the event carries only enough
 * to decide whether a pull is worth making. Emitted once per synced page, so a
 * large catalog produces several.
 */
export interface ShopifyCatalogUpdatedEvent extends BaseEvent {
  type: "catalog.updated";
  provider: "shopify";
  data: {
    /** The newest `updated_at` in the synced page — the cursor to pull from. */
    updated_since: string | null;
    product_count: number;
  };
}

/**
 * A variant CROSSED a stock threshold. Emitted only on a transition, never on
 * every inventory write — `previous_state` and `state` always differ, and both
 * are always present (a variant whose previous state was unknown emits
 * nothing rather than a first-sight event a consumer would read as a change).
 */
export interface ShopifyProductStockChangedEvent extends BaseEvent {
  type: "product.stock.changed";
  provider: "shopify";
  data: {
    /** The Shopify variant gid. */
    variant_id: string;
    /** The Shopify product gid the variant belongs to. */
    product_id: string;
    previous_state: ShopifyStockState;
    state: ShopifyStockState;
    /** Available units across all locations; null when the item is untracked. */
    quantity: number | null;
  };
}

/**
 * A variant's price DROPPED. Increases are deliberately not emitted: the
 * consumer-facing use is a price-drop follow-up, and an event for every
 * increase would be noise a consumer has to filter. `price < previous_price`
 * always holds.
 */
export interface ShopifyProductPriceChangedEvent extends BaseEvent {
  type: "product.price.changed";
  provider: "shopify";
  data: {
    variant_id: string;
    product_id: string;
    /** Decimal amounts in the shop's own currency. */
    previous_price: number;
    price: number;
  };
}

/**
 * A checkout was abandoned — no `completed_at`, and Shopify marked it closed or
 * handed over a recovery URL.
 *
 * ONE EVENT PER CHECKOUT, not per delivery: Shopify sends `checkouts/update`
 * many times for one cart, and the event id is keyed on the checkout so the
 * repeats collapse. `email` / `phone` are whatever the shopper had entered when
 * they left, so both are frequently null — a recovery flow has to tolerate that
 * rather than assume a contact.
 */
export interface ShopifyCheckoutAbandonedEvent extends BaseEvent {
  type: "checkout.abandoned";
  provider: "shopify";
  data: {
    checkout_id: string | null;
    email: string | null;
    phone: string | null;
    /** Shopify's own recovery link, when the shop has recovery enabled. */
    abandoned_checkout_url: string | null;
    /** The full Shopify checkout body, for anything not lifted above. */
    raw: Record<string, unknown>;
  };
}

/**
 * An order reached a fulfilment milestone — the WISMO ("where is my order")
 * signal.
 *
 * ONE EVENT PER (ORDER, STATUS): `orders/updated` fires for every order
 * mutation, so the event id is keyed on the pair and repeats collapse. The two
 * milestones are separate events, and `delivered` outranks `fulfilled` on an
 * order whose fulfilments report delivery.
 */
export interface ShopifyOrderStatusChangedEvent extends BaseEvent {
  type: "order.status.changed";
  provider: "shopify";
  data: {
    order_id: string | null;
    status: "fulfilled" | "delivered";
    email: string | null;
    phone: string | null;
    /** The full Shopify order body. */
    raw: Record<string, unknown>;
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
 * A delivery-status notification parsed out of an inbound bounce — the
 * machine-readable half of a `multipart/report; report-type=delivery-status`
 * message (RFC 3464), not a guess from the sender's address.
 *
 * Present on `EmailMessageReceivedEvent.data.delivery_failure`; that field is
 * `null` for every ordinary message, which is the check for "is this a bounce".
 */
export interface EmailEventDeliveryFailure {
  /**
   * The address that failed, from the report's `Final-Recipient` (falling back
   * to `Original-Recipient`), with the `rfc822;` address-type prefix stripped.
   * `null` when the report named none.
   */
  failed_recipient: string | null;
  /**
   * The report's `Status` field verbatim — an RFC 3463 enhanced status code,
   * `class.subject.detail`. `5.x.x` is permanent (a hard bounce: stop sending
   * to this address), `4.x.x` is transient (the MTA is still retrying).
   * `null` when the report carried no status.
   */
  status: string | null;
  /**
   * The report's `Action` field for the same recipient, lowercased (RFC 3464
   * §2.3.3): `"failed"` — the MTA gave up, `"delayed"` — it is still retrying
   * (a warning, not a bounce), or `"delivered"` / `"relayed"` / `"expanded"`
   * for a positive report. Read it together with `status`: a `failed` with a
   * `5.x.x` status is a hard bounce. `null` when the report carried none (or a
   * value outside those five), and always `null` for an Outlook bounce whose
   * raw report could not be fetched.
   */
  action: "failed" | "delayed" | "delivered" | "relayed" | "expanded" | null;
  /**
   * The report's `Diagnostic-Code` for the same recipient, verbatim with its
   * diagnostic-type prefix (e.g. `"smtp; 550 5.1.1 The email account … does
   * not exist."`) — the remote server's own words. For display and logs; branch
   * on `status` and `action`, not on this text. `null` when absent.
   */
  diagnostic_code: string | null;
  /**
   * The `Message-ID` of YOUR message that bounced — read from the report's
   * returned headers, its `Original-Message-ID` field, or the bounce's own
   * `In-Reply-To`, in that order. This equals the `rfc822_message_id` the send
   * response gave you, which is how a bounce ties to a send without guessing
   * from the subject or the sender. `null` when none of the three was present.
   */
  original_rfc822_message_id: string | null;
}

/**
 * An inbound email landed in a connected Gmail/Outlook mailbox. `thread_id` is
 * the provider thread (Gmail threadId / Outlook conversationId) — the
 * conversation key, and the same value `messages.send` answers with. To reply
 * in-thread, round-trip `message_id` (Outlook `reply_to_message_id`) or the
 * RFC822 anchors (`rfc822_message_id` / `references`) on `messages.send`.
 *
 * Not every inbound message is a person writing back. `auto_submitted` /
 * `precedence` mark an automatic one (a vacation responder, a list blast) and
 * `delivery_failure` marks a bounce — check those three before treating a
 * message as a reply worth answering.
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
    /**
     * Gmail labelIds (e.g. `INBOX`, `CATEGORY_PROMOTIONS`). Always `[]` for
     * Outlook (no labelId concept).
     */
    label_ids: string[];
    /** `true` when the message carried a `List-Unsubscribe` header. */
    list_unsubscribe: boolean;
    /**
     * Raw `Auto-Submitted` header value, lowercased (e.g.
     * `"auto-generated"`, `"auto-replied"`). `null` when the header is absent.
     * Anything other than `"no"` means a machine sent this, so it is not a
     * reply to answer and it must not restart a follow-up sequence.
     */
    auto_submitted: string | null;
    /** Raw `Precedence` header value, lowercased (e.g. `"bulk"`, `"list"`, `"junk"`). `null` when the header is absent. */
    precedence: string | null;
    /**
     * The parsed delivery-status report when this message IS a bounce, `null`
     * for every ordinary message. `original_rfc822_message_id` matches the
     * `rfc822_message_id` your send returned, so a hard bounce
     * (`status` `5.x.x`) can be charged against the exact message that
     * bounced rather than inferred from the postmaster's address.
     */
    delivery_failure: EmailEventDeliveryFailure | null;
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
  /** Opaque partner intention, retained even when Google emits a skeletal cancellation. */
  intention_id?: string | null;
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

// ---------------------------------------------------------------------------
// WhatsApp channel-health push (#205). Meta emits these WABA-level webhook
// fields when a template or the phone number / account changes. `data` carries
// the WABA id, which Meta `field` fired, and the raw Meta `change.value`; the
// health event additionally carries the refreshed health snapshot.
// ---------------------------------------------------------------------------

/** A WhatsApp template's status / quality / category changed at Meta. */
export interface WhatsAppTemplateUpdatedEvent extends BaseEvent {
  type: "template.updated";
  provider: "whatsapp";
  data: {
    waba_id: string;
    /** message_template_status_update | message_template_quality_update | template_category_update */
    field: string;
    /** Raw Meta `change.value` (template name, language, and the changed attribute). */
    value: Record<string, unknown>;
  };
}

/** Minimal shape of the health snapshot carried on a channel.health.updated event. */
export interface WhatsAppChannelHealthSnapshot {
  canSend: "AVAILABLE" | "LIMITED" | "BLOCKED" | null;
  tokenValid: boolean;
  webhookSubscribed: boolean;
  reconnectRequired: boolean;
  reconnectUrl: string | null;
  [key: string]: unknown;
}

/** A WhatsApp phone number's quality/name, or the account's status, changed. */
export interface WhatsAppChannelHealthUpdatedEvent extends BaseEvent {
  type: "channel.health.updated";
  provider: "whatsapp";
  data: {
    waba_id: string;
    /** phone_number_quality_update | phone_number_name_update | account_update | account_alerts | account_review_update | business_capability_update */
    field: string;
    /** Raw Meta `change.value`. */
    value: Record<string, unknown>;
    /** The refreshed health snapshot, or null when it could not be re-read. */
    health: WhatsAppChannelHealthSnapshot | null;
  };
}

/**
 * The health snapshot on an EMAIL `channel.health.updated` event (#1653).
 *
 * `needs_action` — the mailbox's provider refused a send for a reason only its
 * owner can fix (`code`: `account_suspended` | `mailbox_disabled` |
 * `quota_exceeded`). The connection still accepts sends; the first one the
 * provider accepts clears it and pushes `healthy`.
 * `reconnect_required` — the grant is dead (`code: "auth_revoked"`); reconnect.
 * `healthy` — a previously recorded block cleared (a send succeeded, or the
 * mailbox was reconnected).
 */
export interface EmailChannelHealthSnapshot {
  status: "needs_action" | "reconnect_required" | "healthy";
  code: "account_suspended" | "auth_revoked" | "mailbox_disabled" | "quota_exceeded" | null;
  provider: "gmail" | "outlook" | null;
  /** The provider's own error code (`ErrorAccountSuspend`, `failedPrecondition`, …). */
  provider_code: string | null;
  /** The provider's own message, verbatim — show it to the mailbox owner. */
  provider_message: string | null;
  /** When this episode started (ISO); null on `healthy`. */
  since: string | null;
}

/** An email mailbox's ability to send changed (#1653). */
export interface EmailChannelHealthUpdatedEvent extends BaseEvent {
  type: "channel.health.updated";
  provider: "email";
  data: {
    /** Always `"send"` today: the verdict came from a send attempt. */
    field: "send";
    health: EmailChannelHealthSnapshot;
  };
}

// ---------------------------------------------------------------------------
// WhatsApp calling (ADR 0053). Under SIP interconnect Meta emits exactly two
// call events (`call_created`, `terminate`) and exactly two statuses
// (`FAILED`, `COMPLETED`). There is no RINGING / ACCEPTED / REJECTED and no
// signal separating "the customer rejected" from "it never rang", so this
// vocabulary deliberately invents none.
// ---------------------------------------------------------------------------

/**
 * A call on a SIP-mode WhatsApp number was created or terminated.
 *
 * `answered` is derived, because Meta reports no accepted/rejected status:
 * `start_time` / `duration` are documented as present only when the call was
 * picked up, so their PRESENCE is the signal (`duration: 0` is a real
 * sub-second pickup, not a falsy one). It is `null` while the call is still in
 * flight — `call_created` has no outcome yet, and `false` would be a verdict.
 */
export interface WhatsAppCallStatusUpdatedEvent extends BaseEvent {
  type: "call.status.updated";
  provider: "whatsapp";
  data: {
    wa_call_id: string;
    /** call_created | connect | terminate */
    event: string | null;
    /** FAILED | COMPLETED — only sent on `terminate`. */
    status: string | null;
    /** BUSINESS_INITIATED | USER_INITIATED */
    direction: string | null;
    /** true picked up, false ended without pickup, null still in flight. */
    answered: boolean | null;
    from: string | null;
    to: string | null;
    start_time: string | number | null;
    end_time: string | number | null;
    /** Integer seconds. Present only when the call was picked up. */
    duration: number | null;
    /** The raw Meta `calls[]` entry. */
    raw: Record<string, unknown>;
  };
}

/**
 * A customer answered a call-permission request.
 *
 * Read `response_source` before treating this as consent: `automatic` is the
 * grant Meta infers because the customer called the business first. It carries
 * the same 168h / 100-connected-calls validity as an explicit `user_action`
 * grant but is NOT informed consent, and the two are otherwise identical on
 * the wire.
 */
export interface WhatsAppCallPermissionUpdatedEvent extends BaseEvent {
  type: "call.permission.updated";
  provider: "whatsapp";
  data: {
    /** The interactive reply message's own id. */
    wa_message_id: string;
    from: string;
    to: string | null;
    /** accept | reject */
    response: string | null;
    /** user_action | automatic — see the note above. */
    response_source: string | null;
    expiration_timestamp: string | number | null;
    /** The raw Meta `call_permission_reply` object. */
    raw: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// WhatsApp Flows health — Meta's `flows` webhook field. Meta keys these on the
// WABA and sends no phone number and no flow name: `phone_number_id` is the
// number behind `connection_id` (one event per connection of the WABA), and
// `flow_name` is read from Meta's status sentence when it states one.
// ---------------------------------------------------------------------------

/**
 * A flow's status changed at Meta — including its creation (no `old_status`),
 * and Meta's own health monitoring moving a published flow to `THROTTLED`
 * (opens, but 10 sends/hour) or `BLOCKED` (cannot be sent or opened) and back.
 */
export interface WhatsAppFlowStatusEvent extends BaseEvent {
  type: "whatsapp.flow.status";
  provider: "whatsapp";
  data: {
    waba_id: string;
    phone_number_id: string | null;
    /** Meta flow id. */
    flow_id: string;
    flow_name: string | null;
    /** null on a create notification. */
    old_status: string | null;
    /** DRAFT | PUBLISHED | DEPRECATED | BLOCKED | THROTTLED (Meta casing; typed open). */
    new_status: string;
    /** Meta's human sentence (`value.message`). */
    message: string | null;
    occurred_at: string;
  };
}

/** The alert inside a `whatsapp.flow.alert` event. */
export interface WhatsAppFlowAlert {
  type: "error_rate" | "latency" | "availability" | "version_expiry";
  /** error_rate only — Meta's ENDPOINT_ERROR_RATE vs CLIENT_ERROR_RATE. */
  source: "endpoint" | "client" | null;
  /** Meta's alert_state, lowercased; null for version_expiry. */
  state: "activated" | "deactivated" | null;
  /** error rate %, p90 latency ms, or availability %; null for version_expiry. */
  value: number | null;
  /** The threshold crossed (or recovered from): 5/10/50 %, 1000/5000/7000 ms, 90 %. */
  threshold: number | null;
  /** Meta's documented detection window (60m client errors, 30m endpoint errors and latency, 10m availability). */
  window: string | null;
  /** The raw Meta event name (ENDPOINT_ERROR_RATE, FLOW_VERSION_EXPIRY_WARNING, …). */
  meta_event: string;
  /** Meta's human sentence; for version_expiry, its `warning` text. */
  message: string | null;
  /** The rest of Meta's payload — `errors[]`, `p50_latency`, `requests_count`, … */
  details: Record<string, unknown> | null;
}

/**
 * Meta's monitoring of a flow raised or cleared an alert: endpoint or client
 * error rate, endpoint p90 latency, endpoint availability, or the flow's JSON
 * version about to freeze (also raised when a create notification carries
 * Meta's `warning`).
 */
export interface WhatsAppFlowAlertEvent extends BaseEvent {
  type: "whatsapp.flow.alert";
  provider: "whatsapp";
  data: {
    waba_id: string;
    phone_number_id: string | null;
    /** Meta flow id. */
    flow_id: string;
    flow_name: string | null;
    alert: WhatsAppFlowAlert;
    occurred_at: string;
  };
}

// ---------------------------------------------------------------------------
// Platform lifecycle (#1049).
//
// Everything above this line describes something that happened at a CHANNEL —
// a message, a comment, a product. Everything below describes something that
// happened to your integration with Atribu itself: a connector went live or
// died, a recompute finished, a goal produced its first attributed conversion.
//
// All nine carry `provider: "atribu"`, and a subscription only receives them
// if `"atribu"` is in its `providers`. They exist so an agent never has to
// poll: before them, `GET /api/v1/profile/freshness` was documented as the one
// route a consumer was expected to poll, and connect/export completion had no
// signal at all.
// ---------------------------------------------------------------------------

/** The reconnect hand-off an agent can call to repair a dead connector. */
export interface AtribuReconnectAction {
  method: "POST";
  /** `{provider}` is a placeholder — substitute `data.provider`. */
  path: string;
}

/**
 * A connector finished connecting — an OAuth consent completed and Atribu can
 * now read from it. Fires on a re-connect of an existing account too (a
 * repaired token is news to a consumer that saw it break), which is why
 * `reconnected` is on the payload rather than being left to inference.
 */
export interface ConnectionConnectedEvent extends BaseEvent {
  type: "connection.connected";
  provider: "atribu";
  data: {
    /** `data_connections.provider` — `meta_ads`, `google_ads`, `gohighlevel`, `whatsapp`, … */
    provider: string;
    external_account_id: string | null;
    external_account_name: string | null;
    /** `true` when a live connection for this account already existed. */
    reconnected: boolean;
  };
}

/**
 * A connector's grant died and only a human re-consent can fix it. This is the
 * event that replaces polling `GET /api/v1/connections` for a broken token.
 *
 * `reconnect` names the call that starts the repair — deliberately a route,
 * not a URL: minting a signed reconnect link on an error path would hand out a
 * capability from a failure response. Substitute `data.provider` into `path`
 * and call it with your own credential.
 */
export interface ConnectionReconnectRequiredEvent extends BaseEvent {
  type: "connection.reconnect_required";
  provider: "atribu";
  data: {
    provider: string;
    /** The `data_connections.status` that was written (`reconnect_required` or `error`). */
    status: string;
    /** The provider's own words (`invalid_grant`, `401`, …), truncated. Never a friendly sentence. */
    reason: string | null;
    reconnect: AtribuReconnectAction;
  };
}

/**
 * A connector was removed — the merchant disconnected it, or the store
 * uninstalled the app. Distinct from `connection.reconnect_required`: nothing
 * is recoverable here, the row is gone or dead, and a consumer should stop
 * expecting data from it rather than offering a repair.
 */
export interface ConnectionRevokedEvent extends BaseEvent {
  type: "connection.revoked";
  provider: "atribu";
  data: {
    provider: string;
    external_account_id: string | null;
    /** Why it ended, e.g. `disconnected_by_user`. */
    reason: string;
  };
}

/**
 * A pending hand-off — an action only a human could take — was completed.
 *
 * Emitted exactly once per hand-off: the transition is guarded on
 * `status = 'pending'`, so a double-tapped button, a redelivered callback and a
 * lost race all settle without re-announcing.
 *
 * `connection_id` is set when the hand-off named one connector (a `connect`
 * hand-off records it in `result.connection_id`) and null otherwise.
 *
 * A WORKSPACE-level hand-off — `checkout`, and any other minted without a
 * profile — emits nothing at all: subscriptions are per profile, and there is
 * no honest profile to attribute it to.
 */
export interface HandoffCompletedEvent extends BaseEvent {
  type: "handoff.completed";
  provider: "atribu";
  data: {
    handoff_id: string;
    /** `connect` | `pick` | `sign_dpa` | `checkout` | `approve` */
    kind: string;
    /**
     * What the completion produced. Always an object — `{}` when the hand-off
     * produced nothing — never null, so a consumer reads it without a guard.
     */
    result: Record<string, unknown>;
  };
}

/**
 * An attribution recompute finished for the profile. `connection_id` is always
 * null — a recompute is a property of the profile, not of a connector.
 *
 * `skipped_early_exit: true` means the chain found no unattributed conversions
 * and skipped its middle stages. That is a completed recompute, not a failure,
 * and the numbers a consumer reads afterwards are current either way.
 */
export interface RecomputeCompletedEvent extends BaseEvent {
  type: "recompute.completed";
  provider: "atribu";
  data: {
    profile_id: string;
    skipped_early_exit: boolean;
    /** Narrowed to one conversion, when the job was. */
    conversion_id: string | null;
    /** One attribution model, when the job named one. */
    attribution_model: string | null;
  };
}

/**
 * A conversion definition produced its FIRST attributed conversion. Exactly
 * one of these per definition, ever — the "first" is recorded durably on the
 * definition row, so it survives restarts, replays and redeliveries.
 *
 * This is the onboarding signal: it is the moment a goal stops being
 * configuration and starts being data.
 */
export interface ConversionAttributedEvent extends BaseEvent {
  type: "conversion.attributed";
  provider: "atribu";
  data: {
    conversion_definition_id: string;
    conversion_key: string;
    display_name: string;
    /** `cash` | `pipeline` | `none` — only `cash` counts toward ROAS. */
    revenue_type: string;
    /** The conversion that did it. */
    conversion_id: string;
    conversion_time: string | null;
  };
}

/** Per-destination export tallies. */
export interface ExportDestinationCounts {
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * A conversion-export run finished with nothing failed. `sent` can be 0 with
 * `skipped > 0` — a run that correctly suppressed every candidate is a
 * completed run, not a failed one.
 */
export interface ExportCompletedEvent extends BaseEvent {
  type: "export.completed";
  provider: "atribu";
  data: {
    profile_id: string;
    meta: ExportDestinationCounts;
    google: ExportDestinationCounts;
    /** TikTok Events API lane (#1700). Absent on events emitted before it. */
    tiktok?: ExportDestinationCounts;
    duration_ms: number;
    /** `true` when the run was an explicit replay of named export rows. */
    replay: boolean;
  };
}

/**
 * A conversion-export run finished with at least one FAILED candidate. The
 * counts are the whole run's, not just the failures — a run that sent 400 and
 * failed 2 reports both, because a consumer that reacts to this event needs to
 * know it was partial.
 */
export interface ExportFailedEvent extends BaseEvent {
  type: "export.failed";
  provider: "atribu";
  data: {
    profile_id: string;
    meta: ExportDestinationCounts;
    google: ExportDestinationCounts;
    /** TikTok Events API lane (#1700). Absent on events emitted before it. */
    tiktok?: ExportDestinationCounts;
    duration_ms: number;
    replay: boolean;
  };
}

/**
 * The profile's attribution freshness advanced — the same `recomputed_at` /
 * `status` pair `GET /api/v1/profile/freshness` returns, pushed instead of
 * polled. Emitted only when the value actually moved.
 */
export interface ProfileFreshnessChangedEvent extends BaseEvent {
  type: "profile.freshness.changed";
  provider: "atribu";
  data: {
    profile_id: string;
    recomputed_at: string | null;
    /** `ready` once the profile has ever been projected; `pending` before that. */
    status: string;
    previous_recomputed_at: string | null;
  };
}

/**
 * A provider outcome — a GoHighLevel lead / booking / won / lost…, a
 * MercadoPago payment — recorded on a profile your app provisioned. For a
 * healthcare-family profile only the app that provisioned it receives it
 * (contact by that app's grant, as below).
 * `connection_id` is always null; the source is `data.provider`.
 *
 * `id` is stable per outcome: the same outcome carries the same id on every
 * retry, on `GET /api/v1/outcomes/recorded` (the replay of these events, in
 * the same order), and after any recompute or re-sync — de-dupe on it.
 *
 * Delivery needs your app's live grant on the profile. Contact fields ride
 * only when that grant carries `customers:read`; otherwise `contact` is null
 * and `contact_withheld` is true. The person is read at each delivery attempt.
 */
export interface OutcomeRecordedEvent extends BaseEvent {
  type: "outcome.recorded";
  provider: "atribu";
  data: {
    profile_id: string;
    /** `gohighlevel` | `mercadopago` */
    provider: string;
    /** `lead_created`, `appointment_booked`, `closed_won`, `payment_received`, … */
    outcome_type: string;
    occurred_at: string;
    /** When Atribu recorded it — a backfill records old outcomes late. */
    recorded_at: string;
    /** The provider's own id for the outcome. */
    external_id: string | null;
    /** Atribu's id for the outcome — `outcome_event_id` on `GET /api/v1/campaigns/{id}/conversions`. */
    outcome_event_id: string | null;
    /**
     * The conversion it produced — `conversion_id` on `GET /api/v1/campaigns/{id}/conversions`.
     * Null when the outcome produced no conversion, or none yet at delivery time; join on `outcome_event_id` then.
     */
    conversion_id: string | null;
    /** The provider's customer id; null when it is not the provider's opaque id shape (an email, a phone) and contact is withheld. */
    customer_key: string | null;
    /** `amount` is an exact decimal string (ADR 0018) — parse before arithmetic. */
    value: { amount: string; currency: string | null } | null;
    contact: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
    contact_withheld: boolean;
  };
}

export type AtribuWebhookEvent =
  | WhatsAppMessageReceivedEvent
  | WhatsAppMessageDeliveryEvent
  | WhatsAppMessageEchoEvent
  | WhatsAppMessageHistoryEvent
  | WhatsAppContactsSyncEvent
  | WhatsAppTemplateUpdatedEvent
  | WhatsAppChannelHealthUpdatedEvent
  | EmailChannelHealthUpdatedEvent
  | WhatsAppCallStatusUpdatedEvent
  | WhatsAppCallPermissionUpdatedEvent
  | WhatsAppFlowStatusEvent
  | WhatsAppFlowAlertEvent
  | InstagramMessageReceivedEvent
  | InstagramMessageDeliveryEvent
  | MessengerMessageReceivedEvent
  | MessengerMessageDeliveryEvent
  | InstagramCommentReceivedEvent
  | EmailMessageReceivedEvent
  | CalendarEventChangedEvent
  | ConversationStartedEvent
  | ShopifyCatalogUpdatedEvent
  | ShopifyProductStockChangedEvent
  | ShopifyProductPriceChangedEvent
  | ShopifyCheckoutAbandonedEvent
  | ShopifyOrderStatusChangedEvent
  | ConnectionConnectedEvent
  | ConnectionReconnectRequiredEvent
  | ConnectionRevokedEvent
  | HandoffCompletedEvent
  | RecomputeCompletedEvent
  | ConversionAttributedEvent
  | ExportCompletedEvent
  | ExportFailedEvent
  | ProfileFreshnessChangedEvent
  | OutcomeRecordedEvent;

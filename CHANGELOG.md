# Changelog

All notable changes to `@atribu/node` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.12.0]

### Added

- `messages.typing({ connection_id, channel, to, message_id })` — shows a
  WhatsApp "typing…" bubble and marks the customer's message read, so an agent
  that takes tens of seconds to compose a reply produces the signals a human
  would.

  `message_id` is the **inbound** wamid (the customer's message, not one of
  yours) — Meta derives the recipient from it. The read receipt is not optional:
  Meta exposes the indicator as a field on the read receipt, so showing one
  always marks the message read. There is no "typing off" call — the indicator
  expires after ~25s on its own and is dismissed the moment you send.

  **A 200 is not a promise the bubble appeared.** `forwarded: false` with
  `reason: "stale_message_id"` means Meta refused the wamid (older than ~24h,
  already read, number re-registered); `reason:
  "message_id_conversation_mismatch"` means the wamid belongs to a different
  conversation than `to`, so nothing was sent — forwarding it would have
  blue-ticked and animated a thread you did not mean to touch. Neither is a
  fault with a remedy, which is why neither is an error.

  **This route never answers 404.** An unknown or unauthorized `connection_id`
  answers 403 precisely so 404 keeps one meaning: a 404 (or 405/501) means the
  endpoint predates the Atribu deployment you are talking to. Treat it as
  "typing is not deployed on this bridge", latch the feature off, and carry on.

  **Never retries, and that is not configurable.** The server's contract is one
  upstream call; an SDK retry would be a *new* Graph call that fires another
  read receipt and re-arms the ~25s bubble after your reply already went out.
  `TypingOptions` therefore has no `maxRetries`.

  Its deadline is capped at 5000ms — a ceiling, not a default, so a client
  configured with a tighter `timeoutMs` keeps it. Pass `opts.timeoutMs` to
  choose a deadline outright.

- Per-request transport policy on `RequestOptions` — `maxRetries`, `timeoutMs`
  and `maxTimeoutMs`. Every existing call site sets none of them and behaves
  exactly as before.

  - `maxRetries` counts replays after the initial attempt and overrides the
    client-level `maxAttempts` in both directions
    (`maxAttempts === maxRetries + 1`). Non-finite values fall back to the
    client budget rather than throwing — `NaN` would otherwise send zero
    requests and `Infinity` would retry forever. Negatives clamp to one attempt;
    fractions truncate.
  - `timeoutMs` is an absolute per-call deadline, up or down.
  - `maxTimeoutMs` is a ceiling that can only *lower* the client's budget. This
    is what resource methods use, so an SDK default can never silently widen a
    limit the consumer deliberately set.

  Both millisecond fields must be positive and finite; `0` is not "no timeout"
  and is treated as absent.

  `maxRetries` is distinct from the existing `retryable: false`, which stays
  absolute: that flag is a property of the upstream action (never safe to
  replay, as with the WhatsApp OTP calls), whereas `maxRetries` is a budget.

### Changed

- A request aborted via a caller-supplied `AbortSignal` now reports
  `"Request aborted by caller"` instead of `"Request aborted (timeout Nms)"`.
  Both cases arrive as the same `AbortError`; labelling a deliberate
  cancellation as a timeout sent readers hunting latency that never happened.

- `reason` on the typing response is now a union
  (`"stale_message_id" | "message_id_conversation_mismatch"`) rather than
  `string`, generated from a tightened OpenAPI enum — consumers get an
  exhaustive `switch` instead of a prose footnote.

- `responseFixtures.typingIndicator()` and a `messages.typing` mock handler in
  `@atribu/node/test`, so consumers running MSW with
  `onUnhandledRequest: "error"` get a realistic default for the new route.

### Fixed

- `SDK_VERSION` reported `1.4.0` on every request's User-Agent. The constant sat
  unchanged across nine releases (1.4.0 through 1.11.0) because nothing checked
  it — so the eight after 1.4.0 all identified themselves as 1.4.0 on the wire.
  Corrected to the package version; `test/version.test.ts` now fails the build
  if the two ever separate, and the mirror script asserts it during the release
  dry-run. Server-side SDK-version telemetry before 1.12.0 attributes every
  release from 1.6.0 through 1.11.0 to 1.4.0.

## [1.11.0]

### Added

- `whatsapp.calling.sipCredentials(connectionId, phoneNumberId)` — reads a
  number's Meta-generated SIP digest credentials.

  **The only call in this SDK that returns a secret.** It exists because Meta
  publishes no static SIP egress IPs and does not support mTLS, so digest auth
  is the practical control on who may INVITE your trunk: your server answers
  `407` and Meta re-sends carrying the challenge response. Measured against a
  live call — a trunk with no credentials answers `200 OK` to anyone inside
  Meta's address space, which is all of its infrastructure.

  `username` is the business number as **digits, with no leading `+`**. Meta's
  own guide calls it "the (normalized) business phone number", which reads as
  E.164 — but in a single exchange Meta sends `INVITE sip:+16065177691@…` and
  `Proxy-Authorization: Digest username="16065177691"`. Configure the `+` form
  and every call is rejected with a `401` that presents as ringing which never
  answers.

  Treat the result as a secret in transit: hand it to the SIP provider, do not
  persist or log it. Atribu stores none of it, and `whatsapp.calling.get()`
  never requests it.

## [1.10.1]

### Changed

- Documentation only — no code change, no API change.

  The README now states what the SDK actually covers (two of the five
  namespaces were missing from the summary) and is navigable: a jump bar at the
  top and an index over the twenty-odd examples, which had no way in other than
  scrolling. The WhatsApp reference table also gained `registration`,
  `otpCapture` and `calling`, which had shipped without ever being documented,
  each registration method annotated with the Meta budget it spends.

## [1.10.0]

### Added

- `whatsapp.calling` reaches npm for the first time.

  It is documented under 1.8.0 below, and that entry is accurate about the
  API — but no published package ever contained it. The `1.8.0` and `1.9.0`
  tarballs on npm were both cut from the OTP-capture line, so the version
  number in that heading refers to a build that only ever existed in git.
  Anyone who installed `1.8.0` expecting `whatsapp.calling` got a package
  without it; installing `1.10.0` is the fix.

  Nothing about the resource changed here. This release is the merge of the
  two lines: `whatsapp.otpCapture` + `is_self` (published) and
  `whatsapp.calling` (not), now in one package.

## [1.9.0]

### Added

- `is_self` on every entry of `whatsapp.registration.listSubscribedApps()`.
  `true` marks Atribu's own Meta app; anything else is an incumbent (Chatwoot,
  another BSP).

  This exists because consumers were answering that question with a COPY of
  Atribu's Meta app id in their own config, and a copy fails in ways it cannot
  detect. Unset, it takes the whole connect down. Stale — or pointed at the Meta
  app of a different Atribu environment — it is confidently wrong, and wrong here
  is not cosmetic: our app misread as an incumbent leaves the customer's AI
  suppressed forever, while an incumbent misread as us lifts the cutover gate
  with both systems replying to the same person. Atribu is the only party that
  knows the app id it actually subscribed with, so it answers.

  **The field is tri-state, and the third state matters.** It is OMITTED — never
  `false` — when Atribu cannot determine its own id. An all-`false` list is
  indistinguishable from "Atribu is not subscribed", which latches the exact
  suppression the flag exists to prevent. Read `undefined` as "no answer from
  here" and fall back to your own configuration; read `false` as "this one is
  definitely not Atribu".

  Additive and optional, so existing id-matching keeps working unchanged.

## [1.8.0]

### Added

- `whatsapp.otpCapture` — the OTP-capture relay. Embedded Signup v4 removed the
  phone-screen bypass, so Meta may verify a number in-popup by placing a VOICE
  call that reads six digits aloud. A consumer that has taken over that number's
  voice webhook can hear them; the dealer's connect page, sitting behind Meta's
  centered popup, cannot. `publish()` holds a capture keyed by the connect's
  OAuth `state` (the correlation id both sides already share) and `get()` reads
  it back.

  `code` is populated ONLY when the capture cleared the publisher's confidence
  gate; otherwise `candidate_code` carries the best guess, `uncertain_positions`
  says which digits the two reads disagreed on, and `audio_url` is a short-TTL
  signed link to the recording so the dealer can listen and type what she hears.
  Never submit `candidate_code`: Meta's verify is attempt-limited and `/register`
  is capped 10/number/72h, so a wrong auto-submit can lock a real business out of
  WhatsApp.

  Entries are held for minutes, bound to the publishing profile, and never
  logged. Publishing when the relay store is down is a `503`, never a silent
  success — a false success would promise the dealer a code nothing will show.

- **`client.whatsapp.registration.listPhoneNumbers({ connectionId })`.** Reads the phone numbers on a connection's WABA (`id` / `display_phone_number` / `verified_name` / `quality_rating`, plus `status` and `code_verification_status`). It's the read that lets a partner detect a number that is ALREADY registered on the WABA before starting registration — `status: "CONNECTED"` means the number is live (skip the OTP + register), which `only_waba_sharing` Embedded Signup can't answer from the connection alone (Meta never returns the phone there).

### Changed

- **`registration.addPhoneNumber` is now idempotent when the number is already on the WABA.** A retried add, a partial earlier success, or a share that already carried the phone no longer dead-ends: the server resolves the existing `phone_number_id` and returns it with a new **`already_present: true`** on the result (`WhatsAppAddNumberResult`). A genuine failure — payment (402), a 2SV-blocked migrate, a real 5xx — still surfaces as the same typed error, because a number that failed to land is not on the WABA to resolve.
- `whatsapp.calling` resource — `get(connectionId, phoneNumberId)` and
  `update(connectionId, phoneNumberId, settings)` over the per-number Meta
  calling settings.

  Two things the types deliberately do not do. The settings object is passed
  through **verbatim** in both directions and left open: Atribu holds no
  opinion about Meta's payload, and a type enumerating Meta's fields would
  reject a field Meta shipped this morning. And `update()` returns what Meta
  **holds** after the write, not an echo of the request — Meta normalizes
  input and fills defaults, so echoing would report settings that were never
  applied.

  `connection_id` is required alongside `phone_number_id` and is not
  redundant: it is the token resolver's key, and a phone-number id alone
  resolves nothing.


## [1.7.0]

### Added

- Two WhatsApp calling webhook events: `call.status.updated` and
  `call.permission.updated`, with `WhatsAppCallStatusUpdatedEvent` /
  `WhatsAppCallPermissionUpdatedEvent` added to the `AtribuWebhookEvent` union
  so `onEvent` narrows on them.

  Two things worth reading before you consume these. On `call.status.updated`,
  `answered` is **derived** — Meta reports no accepted/rejected status under
  SIP interconnect, only `FAILED` / `COMPLETED` — and it is `null` while the
  call is still in flight, so treat it as a tri-state and not a boolean. On
  `call.permission.updated`, check `response_source` before recording consent:
  `automatic` is the permission Meta infers because the customer called the
  business first. It carries the same validity as an explicit `user_action`
  grant and is otherwise identical on the wire, but nobody agreed to anything.
- `WEBHOOK_EVENT_TYPES` and `WEBHOOK_PROVIDERS` are now exported from
  `@atribu/node/webhooks` as runtime arrays, with `WebhookEventType` /
  `WebhookProvider` derived from them. Previously these existed only as type
  unions, which erase at build time — so a consumer could not check at runtime
  that the events it subscribes to are events the server will accept.
  Subscribing to an unknown event is not a soft failure: the create call 400s,
  the business ends up with no subscription, and their inbound delivery goes
  silently dark. The type names and their members are unchanged, so this is
  additive.

## [1.6.1]

### Documentation

- README now documents the 1.6.0 WhatsApp surface: a **Check WhatsApp channel health** recipe (`whatsapp.health.get()` / `refresh()`), the `whatsapp.templates.sync()` / `syncWithSummary()` reconcile calls, an in-band **reconnect-required** error recipe (`AtribuApiError.isReconnectRequired()` / `reconnectUrl`), and the `template.updated` / `channel.health.updated` webhook events. Reference tables updated. No code changes.

## [1.6.0]

### Added

- **`client.whatsapp.health` — WhatsApp channel health (#201, #202).** `client.whatsapp.health.get(connectionId)` returns a connected WhatsApp channel's health in one typed object: `canSend` (`AVAILABLE | LIMITED | BLOCKED | null`, from Meta's `health_status`), `tokenValid`, `webhookSubscribed`, the phone number's status fields (`phone.qualityRating`, `messagingLimitTier`, `nameStatus`, `accountMode`, `codeVerificationStatus`, `throughputLevel`, …), a severity-ranked `issues[]` list where each issue carries Meta's own `possible_solution` as `remediation`, and cache metadata `refreshedAt` + `stale`. An expired or invalid token comes back as `tokenValid:false` with a critical issue — a broken channel is *data*, not a thrown error — so branch on `canSend`/`tokenValid`/`issues`, not on a catch.
  - `get()` serves the persisted snapshot instantly (stale-while-revalidate against a 6h TTL); a never-refreshed channel reads live. `client.whatsapp.health.refresh(connectionId)` forces a live Meta re-check, updates the snapshot + append-only trend history, and returns the fresh object. A refresh that hits a transient Meta failure never throws — it records an error status and preserves the last-good values.

- **Real-time channel-health + template webhooks (#205).** Two new subscribable webhook events push WhatsApp health/template changes to your endpoint as Meta reports them: **`template.updated`** (a template's status / quality / category changed) and **`channel.health.updated`** (a phone number's quality/name or the account's status changed — carries the refreshed health snapshot). Subscribe with `webhooks.subscriptions.create({ events: ["template.updated", "channel.health.updated"], providers: ["whatsapp"] })`. Both carry `data.waba_id` + the Meta `field` + the raw `change.value`; `AtribuWebhookEvent` gains the `WhatsAppTemplateUpdatedEvent` / `WhatsAppChannelHealthUpdatedEvent` variants. Atribu updates its own mirrored template rows + health snapshot from these before fanning out, so a `get()`/`list()` right after a webhook is already fresh.

- **In-band reconnect signal (#204).** When a WhatsApp connection's token is revoked, the error is no longer an opaque 401/500: `AtribuApiError` now exposes `reconnectRequired` (boolean) + `reconnectUrl` (string | null) and an `isReconnectRequired()` helper, parsed from the API's `reconnect_required` / `reconnect_url` error fields. The channel-health object likewise carries `reconnectRequired` + `reconnectUrl`, so Vitrina can render a one-click reconnect affordance from either a failed call or a health read. The reconnect URL points at Atribu's WhatsApp Embedded-Signup entry, whose completion re-subscribes the WABA's webhooks.

- **WhatsApp template auto-sync (#203).** `client.whatsapp.templates.list()` now serves the connection's templates from Atribu's mirrored cache (no live Meta call); each row carries `quality_score`, `status_changed_at` and `last_synced_at`. `client.whatsapp.templates.sync()` reconciles the cache from Meta — following cursor pagination (no 100-row cap), so newly-created templates appear, templates deleted at Meta disappear, and every status transition updates the row and appends a status-history record. `syncWithSummary()` additionally returns `meta.summary` `{ upserted, deleted, statusChanges }`.
  - **Behaviour change:** `templates.list()` was previously a live Meta read of up to 100 templates; it is now cache-backed. Call `templates.sync()` (or rely on the reconciliation cron / webhook push) to populate + keep it fresh. `WhatsAppTemplate` gained `quality_score`, `status_changed_at`, `last_synced_at`, and `id` / `category` are now nullable.

### Added

- **`client.events` — server-side event ingestion (#115).** `client.events.track({ event_name, anonymous_id, properties, ... })` submits a custom tracking event from your server, and `client.events.purchase({ anonymousId, value, currency, orderId })` is a convenience that records a confirmation purchase — idempotent on `orderId` (a retried call collapses to one event), linked to the ad-click session via `anonymousId`, with the authoritative amount and no ITP/ad-blocker exposure. See the Next.js + Node recipes in the docs.

## [1.4.0]

### Added

- **Three new subscribable webhook events — WhatsApp coexistence.** When the
  business keeps the WhatsApp Business App on their phone *and* Atribu is
  connected to the same number via Cloud API, Meta emits three extra webhook
  fields. Atribu now fans them out to subscribers; add them to
  `webhooks.subscriptions.create({ events: [...] })` to receive them. Unlike
  `message.received`, all three carry the **raw Meta `change.value`** as `data`
  (`metadata` plus the Meta-native array at the top level) — the thread tree is
  yours to walk. Media arrives as a bare Meta `media_id` with no hosted URL;
  resolve it with `whatsapp.media.get(mediaId, { connectionId })`.
  - **`message.echo`** — a reply the staff typed in the WhatsApp Business App on
    the phone. One event per echo; the event `id` is the echo's wamid, so
    de-dup works exactly as it does for `message.received`. Payload:
    `{ messaging_product, metadata, message_echoes: [echo] }` with
    `echo.to` = the customer, `echo.from` = the business.
  - **`message.history`** — a chunk of the phone's chat history, shared once at
    coexistence onboarding (up to 6 months). One event per **chunk**, not per
    message — a chunk carries many threads (`history[0].threads[].messages[]`),
    and per-message delivery would be a storm. The event `id` is deterministic
    and **content-addressed** (`phone_number_id` + the chunk's
    `phase`/`chunk_order` + a digest of the chunk), so a Meta redelivery of the
    same bytes de-dupes while a *second* history share — which restarts at
    phase 0 / chunk_order 0 with different content — does not collide with the
    first. A chunk too large for one delivery is split into several
    `message.history` events (thread-grained), each with its own id, so no
    single POST can exceed a subscriber's body limit. Chunks Meta marks with an
    `errors[]` (a declined history share) are never delivered. Both directions
    are present: compare `message.from` against `metadata.display_phone_number`
    to tell a staff message from a customer one.
  - **`contacts.sync`** — the phone's address book (`state_sync[]`, contact
    add/remove). One event per Meta change; the event `id` is deterministic
    (`phone_number_id` + a digest of the payload). An address book too large for
    one delivery is split across several events.
- **`buildAuthorizeUrl({ waConnectMode })`** — selects the WhatsApp Embedded
  Signup mode up-front, as `wa_connect_mode` on `/oauth/authorize`. Atribu binds
  it to the authorization code, so the end user cannot change it on the connect
  screen.
  - `"coexistence"` — the business keeps the WhatsApp Business App on their
    phone AND Atribu connects Cloud API to the same number. **Required to
    receive the three events above**: Meta only emits them for a coexistence
    connection. It also stops Atribu re-registering the number, which would
    de-register the WhatsApp Business App on the business's phone.
  - `"only_waba_sharing"` — WABA-only share; you provision and register the
    number yourself, so Meta skips the phone-number screen.
  - Omit it to let the end user choose coexistence with a toggle.
  - New exported types on the `@atribu/node/webhooks` surface:
    `WhatsAppMessageEchoEvent`, `WhatsAppMessageHistoryEvent`,
    `WhatsAppContactsSyncEvent`, plus `WhatsAppMessageEcho`,
    `WhatsAppHistoryChunk`, `WhatsAppHistoryThread`, `WhatsAppHistoryMessage`,
    `WhatsAppStateSyncItem` and `WhatsAppCoexistenceMetadata`. All three join the
    `AtribuWebhookEvent` union, so `switch (event.type)` narrows them.

### Fixed

- `SDK_VERSION` (the `User-Agent` string) was stale at `1.2.0` through the 1.3.0
  release. It now tracks the package version.

## [1.3.0]

### Added

- **`whatsapp.registration`** — Meta-facing WhatsApp phone-number registration,
  proxied server-side so the customer-scoped Meta business token never leaves
  Atribu. Methods: `addPhoneNumber` (with `migrate` to move an already-registered
  number onto the WABA), `requestCode` (voice OTP), `verifyCode`, `register`
  (registers + subscribes the app's webhooks), `subscribe` (already-registered
  WABA, no OTP), `listSubscribedApps` (incumbent detection), and `getFunding`
  (payment-method gate). `requestCode`/`verifyCode`/`register` are attempt-limited
  and never auto-retried. Meta errors `133016` (register capped 10/number/72h) and
  `131042` (payment) surface as typed `whatsapp_register_limit` /
  `whatsapp_payment_required`. New exported types on the `whatsapp.registration`
  surface.

## [1.2.0]

### Added

- **`whatsapp.media.get(mediaId, { connectionId })`** — resolve an inbound
  WhatsApp `media_id` (from a webhook) to a hosted, browser-fetchable URL
  (`{ url, mime_type, expires_at }`). Meta's own media URL is auth-gated and
  expires ~5 minutes, so Atribu downloads the bytes and re-hosts them, returning
  a signed URL (~7-day TTL). Backed by `GET /api/v1/whatsapp/media/{mediaId}`;
  requires the `whatsapp` scope. New exported types `WhatsAppMediaResolved` /
  `GetMediaOptions`.
- Inbound WhatsApp webhook deliveries now include an `attachments:[{ type,
  payload: { url } }]` array for media messages (image/video/audio/document/
  sticker), mirroring the Instagram shape — so consumers can render media
  without calling `media.get()` at all. (Server-side; no SDK change required to
  receive it.)

## [1.1.0]

### Added

- **OAuth `calendar` provider/scope** — `buildAuthorizeUrl` (`@atribu/node/oauth`) now accepts `provider: "calendar"` / `scope: "calendar"` in its types, so partners can build the Google-Calendar connect URL that mints a `calendar` + `calendar.manage` key without a cast. (`OauthProvider`/`OauthScope` widened to include `"calendar"`; the server already supported it.)

## [1.0.0]

Atribu-managed booking calendars. Atribu now creates dedicated **booking
calendars** in the connected Google account and CRUDs events only on those —
the user's primary calendar is never written (GoHighLevel owns primary).

### Breaking

- **Calendar events now require `calendar_id`.** `calendar.createEvent` and
  `calendar.updateEvent` inputs and `calendar.deleteEvent` options
  (`{ calendarId }`) now require the Atribu booking calendar id. The API rejects
  `primary`/unknown calendars with `calendar_unsupported` (422). The
  `CalendarEvent` response gains a `calendar_id` field.
- **Primary-calendar writes are removed.** There is no longer an implicit
  `primary` target; you must create a booking calendar (`createCalendar`) and
  pass its id.

### Added

- **`client.calendar` booking-calendar management** (requires the new
  `calendar.manage` scope):
  - `calendar.createCalendar({ connection_id, summary, description?, time_zone? }, { idempotencyKey? })` — create a dedicated Atribu booking calendar. Idempotent via `Idempotency-Key`.
  - `calendar.listCalendars(connectionId)` — list the booking calendars for a connection.
  - `calendar.shareCalendar(calendarId, { connection_id, email, role })` — share with a team member (`reader`|`writer`); idempotent.
  - `calendar.listCalendarShares(calendarId, connectionId)` — list ACL rules.
  - `calendar.revokeCalendarShare(calendarId, ruleId, { connectionId })` — revoke access; idempotent.

  New exported types: `CalendarSummary`, `CalendarCreateInput`, `AclRule`,
  `ShareCalendarInput`, `CalendarListOptions`, `CalendarRevokeShareOptions`.

### Notes

- New OAuth `calendar` connections mint both the `calendar` and `calendar.manage`
  API-key scopes. Existing keys re-mint on Google re-consent.

## [0.9.0] — 2026-05-25

### Added

- **`client.calendar`** — a Google Calendar management resource for the Google Calendar channel, backing an agent's create / reschedule / cancel tools on a connected calendar:
  - `calendar.createEvent({ connection_id, start, end, summary?, description?, location?, attendees?, extended_private?, send_updates? })` — create an event (`start`/`end` are timed via `date_time` or all-day via `date`). `extended_private` round-trips back on the inbound `calendar.event.changed` event — tag your own link id (e.g. `vitrina_appointment_id`) there.
  - `calendar.updateEvent(eventId, { connection_id, … })` — partial update (Google events.patch); only the supplied fields change (`start`/`end` optional).
  - `calendar.deleteEvent(eventId, { connectionId, sendUpdates? })` — cancel the event; `connectionId`/`sendUpdates` go on the query string.

  All require the `calendar` scope on the API key. New exported types: `CalendarCreateEventInput`, `CalendarUpdateEventInput`, `CalendarEventDateTimeInput`, `CalendarAttendeeInput`, `CalendarSendUpdates`, `CalendarEvent`, `CalendarEventDateTime`, `CalendarEventDeleted`, `CalendarMutationOptions`, `CalendarDeleteOptions`.
- **`calendar.event.changed` webhook event** — fans out when an event on a connected Google Calendar is created, updated, or cancelled (via the API, the Atribu UI, or directly on Google). New `CalendarEventChangedEvent` member on the `AtribuWebhookEvent` union (provider `"google_calendar"`), carrying the full normalized event as snake_case `CalendarEventChangedData` (reconcile on `event_id`/`ical_uid`, read your tag from `extended_private`, use `updated` for loop-prevention). New exported webhook types: `CalendarEventChangedEvent`, `CalendarEventChangedData`, `CalendarChangeDateTime`, `CalendarChangeAttendee`. The webhook-subscription provider/event enums gain `"google_calendar"` / `"calendar.event.changed"`.

### Fixed

- **`connections` channel enum** now includes `"email"` and `"google_calendar"` (the `Connection.channel` response field and the `connections.list({ channel })` filter). The generated types previously lagged the live API at `"whatsapp" | "instagram"`, so email and calendar connections — returned at runtime since 0.8.0 — weren't typed.

## [0.8.0] — 2026-05-25

### Added

- **`client.email`** — a dedicated email-management resource backing an agent's inbox tools (Gmail + Outlook). Conversational send stays on `client.messages.send({ channel: "email", … })`; this surface adds the read/manage ops:
  - `email.search({ connection_id, query, max?, cursor? })` — search threads (Gmail search syntax / Outlook KQL).
  - `email.getThread(id, { connectionId })` — fetch a normalized thread (provider-agnostic messages, oldest-first).
  - `email.createDraft({ connection_id, thread_id?, reply_to_message_id?, in_reply_to?, references?, subject?, text?, html?, to?, cc? })` — create a draft reply (Gmail raw RFC822 / Outlook `createReply`) or a new draft.
  - `email.modifyLabels(id, { connection_id, add?, remove? })` — add/remove labels on a thread by **name** (resolved → Gmail labelIds server-side). Gmail today; Outlook category mapping is a fast-follow (501).
  - `email.listLabels({ connectionId })` — list labels (Gmail) / master categories (Outlook).

  All require the `email` scope on the API key. New exported types: `EmailSearchInput`, `EmailSearchResult`, `EmailThread`, `EmailThreadMessage`, `EmailDraftInput`, `EmailDraftResult`, `EmailModifyLabelsInput`, `EmailModifyLabelsResult`, `EmailLabelsResult`, `EmailLabel`.

## [0.7.0] — 2026-05-23

### Added

- **`client.whatsapp.media.upload({ connectionId, file, contentType?, filename? })`** — pre-upload a WhatsApp media binary to Meta and get back a `media_id` to reference on `messages.send` as `content.media.media_id`. Accepts a `Blob`/`File` or raw bytes (`ArrayBuffer`/`Uint8Array`/`Buffer`). Prefer this over `media.link` for **video**: with a `media_id` Meta never fetches your URL, so origin-hosted / private / short-lived / dev-tunnelled media works (a `link` requires Meta to fetch a public HTTPS URL at send time, which fails for non-public origins — Meta error `131053`). The id is Meta-cached ~30 days, also ideal for high-fanout sends. Wraps the new `POST /api/v1/whatsapp/media` endpoint.

### Internal

- The transport now supports `multipart/form-data` request bodies (`RequestOptions.multipart`); the runtime sets the `Content-Type` boundary, so the SDK leaves it unset.

## [0.6.0] — 2026-05-22

### Added

- **`client.instagram.contacts.get(igsid, { connectionId })`** — resolve an Instagram contact's profile (`name`, `@username`, avatar, follower count, and the mutual-follow flags) from an IGSID, the sender id Meta puts on inbound DM/comment webhooks. Backs an inbox so it can show "@jane" + an avatar instead of a bare numeric id. Throws `AtribuApiError` with status `404` when the profile can't be resolved (user blocked DMs, invalid IGSID, or the connection lacks the messaging permission) — fall back to the raw IGSID.
- **Instagram video on `messages.send()`** — the `video` content type now accepts `video_url` (a public HTTPS URL Meta fetches as a `video` attachment) for Instagram, alongside the existing WhatsApp `media` (media_id / link) path. Backwards-compatible: WhatsApp video sends are unchanged; `caption` stays WhatsApp-only.

## [0.5.0] — 2026-05-21

### Added

- **`instagramLogin` on `buildAuthorizeUrl()`** (Instagram only). Choose the Instagram connection method: `"facebook"` (Facebook Login — the default; requires the IG account be linked to a Facebook Page you admin) or `"instagram"` (native Instagram Login — log in directly at instagram.com, no Facebook Page needed). Emits the `instagram_login` query param. Backwards-compatible: optional, defaults to `"facebook"` (prior behavior). Only meaningful when `provider`/`scope` is `instagram`.

## [0.4.0] — 2026-05-20

### Added

- **`human_agent` on `messages.send()`** (Instagram only). Pass `human_agent: true` to send with Meta's `HUMAN_AGENT` tag, letting an authorized human agent reply outside the 24-hour window (up to 7 days). Set this **only** for messages genuinely sent by a human agent — never for automated/bot replies, which violates Meta's messaging policy. Ignored on WhatsApp (which uses approved templates outside its 24h window). Backwards-compatible: the field is optional and defaults off.

## [0.3.0] — 2026-05-16

Server-side Meta error classification reaches the SDK. WhatsApp + Instagram failures from the underlying Meta APIs now arrive with the right HTTP status code + `code` field instead of being flattened to `502 provider_error`. **Observable API surface change** — consumers that switched on status `502` for Meta failures should add `401`/`403`/`429` handling. The error shape (`{ code, status, message, request_id }`) is unchanged.

### Changed

- **`401 unauthorized`** for token revoked / app uninstalled. The server flips `data_connections.status='error'` when this fires from within `whatsapp/broadcasts/{id}/send` so the next call 409s cleanly until reconnect.
- **`429 rate_limit_exceeded`** for Meta-side throttle. Response carries a `Retry-After` header (seconds) derived from Meta's `X-Business-Use-Case-Usage` block. The SDK surfaces it as `err.retry.retryAfterMs`.
- **`403 forbidden`** for permissions pending Meta App Review (code 270 + variants).
- **`400 invalid_request`** for "request too complex" (caller must split).
- **`422 invalid_request`** for fatal Meta errors that won't recover on retry (e.g. malformed payload).
- **`502 provider_error`** stays for transient Meta failures — retry with backoff.
- **`whatsapp_broadcast_recipients`** gains an `error_reason_code` column (e.g. `"meta_131050"` = recipient stopped marketing on WA). Permanently-failed recipients carry the stable classifier code so consumers can dedupe them on the next broadcast create instead of re-parsing `error_message` strings.

### Broadcast send loop hardening

- **Rate-limit mid-send**: aborts the loop, resets the broadcast to `draft`, returns `429 + Retry-After`. The next `POST /send` claims where the prior run left off (already-sent recipients stay sent; pending recipients stay pending).
- **Auth revoked mid-send**: aborts the loop, resets to `draft`, flips the underlying `data_connections.status='error'`, returns `401 unauthorized`. Subsequent `/send` calls 409 cleanly until reconnect.
- **Per-recipient failure** (opt-out, invalid number, transient): unchanged behavior. Now also stamps `error_reason_code` on the recipient row from `MetaApiError.classification.reasonCode`.

### Internal

- New shared helper `mapMetaErrorToApiError(err, op)` at `src/lib/api/meta-error.ts` (Atribu server-side; not exported from the SDK package). Every v1 route's Meta-catch block collapses to one line.
- `ApiError` gains optional `retryAfter` (number, seconds) + `metaRequiresReconnect` (boolean). `apiErrorResponse()` emits `Retry-After` header when `retryAfter` is set. Backwards-compatible.
- `withApiAuth` forwards `retryAfter` from caught `ApiError`s to the response.

### PR A internal (no consumer-facing change)

- WhatsApp + Instagram messaging helpers in `src/lib/integrations/{whatsapp,instagram}/client.ts` now route through `metaApiFetch` from `@atribu/analytics-enrichment`. Failures throw `MetaApiError` / `MetaAuthError` / `MetaRateLimitError` / `MetaComplexityError` instead of plain `Error("WhatsApp API error: ...")`.
- WhatsApp BUC pool + Instagram Page pool observations now land in `meta_rate_limit_state` automatically — same proactive throttle behavior as Marketing API.
- New shared singleton at `src/lib/integrations/shared/meta-state-store.ts` for the rate-limit state store.
- WhatsApp `uploadMedia` + `downloadMedia` stay on raw fetch (FormData / binary), but now classify errors via `classifyMetaError` and throw `MetaApiError` for parity.

## [0.2.0] — 2026-05-16

Phase 1 of the WhatsApp + Instagram surface expansion. Adds 11 new endpoints and 2 new channel-prefixed namespaces. Backwards-compatible — no existing call signatures change.

### Concurrency hardening (pre-publish review fixes)

- **Broadcast send race**: `POST /api/v1/whatsapp/broadcasts/{id}/send` now uses an atomic claim (`UPDATE … WHERE status='draft' RETURNING id`). Two concurrent send calls for the same broadcast no longer double-charge; the loser gets `409 invalid_state`.
- **Cancel-mid-send**: cancel is now sticky. The send loop checks the broadcast status every 10 recipients and breaks out if it flipped to `cancelled`; the final UPDATE filters `WHERE status='sending'` so a late cancel never gets overwritten by `completed`. Pending recipients are swept to `cancelled` whichever path detects the transition first.
- **OAuth-app authorization check order**: `connection-resolver.ts` runs the `oauth_app_authorizations` grant check *before* the `status='connected'` check. Eliminates a side-channel that let revoked-grant consumers distinguish "exists-but-disconnected" from "not-authorized".
- **Recipient pagination**: `GET /api/v1/whatsapp/broadcasts/{id}` returns up to 1,000 recipients (matches the broadcast send cap; was 200).
- **Trigger duplicate-keyword**: returns `409 invalid_state` instead of `409 forbidden` (more accurate error code for switch statements).
- **Recipient status enum** includes `cancelled` (new state introduced by the cancel sweep).

### Added

- **`client.whatsapp.templates`** — list / create / delete message templates. Send approved templates via `messages.send({ content: { type: "template", ... } })` as before; templates created via `create()` start `PENDING` and need Meta review before they're sendable.
- **`client.whatsapp.broadcasts`** — full CRUD for template broadcasts: `list`, `get`, `create`, `cancel`, `send`. Max 1,000 recipients per broadcast; `send()` is long-running (100ms pacing) and the server caps the route at 5 minutes.
- **`client.instagram.triggers`** — comment-to-DM trigger CRUD: `list`, `create`, `update`, `delete`, `testDm`, `resumeCircuit`. Keywords match in `contains` / `exact` / `regex` modes; `testDm` uses Meta's HUMAN_AGENT tag and respects the 7-day window.
- **`client.connections`** — `list`, `get`, `revoke`. OAuth-flow keys see only their authorized connections; direct admin keys see every connection on the profile and cannot self-revoke (400).
- **`messages.send({ content: { type: "interactive_buttons", ... } })`** — WhatsApp reply buttons (max 3). Taps return as `messaging_postbacks` webhook events with the button id.

### Changed

- Extracted `src/lib/api/connection-resolver.ts` on the server side. The `/api/v1/messages` route now uses `resolveConnection()`, `resolveWhatsAppConnection()`, `resolveInstagramConnection()` from this helper instead of inlining the cross-profile + OAuth-app gate. Behavior is identical; the helper deduplicates ~80 LOC per new route.
- The OpenAPI spec gains 11 new paths + the `interactive_buttons` variant on the `messages` content union.
- `AtribuClient.withRetry()` chaining now also wraps `connections`, `whatsapp`, and `instagram` resources.

### Internal

- 26 new vitest cases covering all new resources (happy path + 403 + 404 + 422 + 502 / 409 where relevant). Total: 108 tests, all passing.
- Added `whatsapp` + `instagram` + `connections` keys to `MockOverrides` for fixture-driven test mocks.

## [0.1.4] — 2026-05-15

First release published via OIDC trusted publishing (provenance attestation now signs every release). 0.1.3's workflow couldn't resolve `jose` during typecheck because it's an optional peer dep — added it as a devDependency so CI typecheck passes. No runtime / API change.

## [0.1.3] — 2026-05-15

> Note: tag pushed but workflow couldn't resolve `jose` types during the CI typecheck step. Fixed in 0.1.4.

First release to land via OIDC trusted publishing. Provenance attestation now signs every release.

### Internal

- Workflow upgrades npm to latest before publishing (Node 20's default npm is too old for OIDC trusted publishing of scoped packages).

## [0.1.2] — 2026-05-15

Metadata-only patch:
- Corrected all `atribu.app` URLs to `www.atribu.app` (consistent with the canonical domain).
- `homepage` now points at the docs (`www.atribu.app/docs`).

## [0.1.1] — 2026-05-15

Metadata-only patch: corrected the `repository` and `bugs` URLs to point at [AtribuCore/atribu-node](https://github.com/AtribuCore/atribu-node) (the lowercase `atribu` org doesn't exist on GitHub). No code changes.

## [0.1.0] — 2026-05-15

Initial public release of `@atribu/node`. Previously developed and briefly published as `@atribu/sdk` (versions 0.1.0 and 0.2.0, both unpublished); the package was renamed to better signal scope as the Atribu ecosystem grows. Paired with `@atribu/tracker` for browser-side analytics.

### Features

- **`AtribuClient`** — typed access to messaging, IG comment replies, webhook subscription CRUD + rotation + test fire, and webhook delivery replay.
- **`@atribu/node/webhooks`** — `verifyWebhook` via Web Crypto with rotation grace, configurable timestamp tolerance, constant-time HMAC compare. Discriminated union of every event shape (WhatsApp message-received, WhatsApp delivery, Instagram fb_login message + postback, Instagram ig_login change, Instagram delivery).
- **`@atribu/node/oauth`** — consumer-side OAuth 2.0 + RFC 7636 PKCE helpers: `buildAuthorizeUrl`, `exchangeCode`, `revokeToken`, `signIdTokenHint` (jose, optional peer), `generateCodeVerifier`, `computeCodeChallenge`.
- **`@atribu/node/next`** — `withAtribuWebhook` HOF for Next.js App Router route handlers (~50 LOC of boilerplate replaced).
- **`@atribu/node/test`** — drop-in MSW v2 handlers covering every OAuth-consumer endpoint, plus `eventFixtures` and `responseFixtures` with deep-merge override support.
- **Typed error hierarchy** — `AtribuApiError`, `AtribuOauthError`, `AtribuWebhookError`, `AtribuTransportError`, `AtribuConfigError`.
- **Opt-in retry layer** — `client.withRetry({ maxAttempts, backoff, baseDelayMs, maxDelayMs, jitter })`. Honors the typed `retry` hint exactly: retries `retry`/`retry_after` actions, never retries `do_not_retry`/`fix_and_retry`/`refresh_token`. Honors `Retry-After` with no jitter.
- **`Idempotency-Key` auto-sent** on every mutating POST.
- **`request_id` surfaced** on every error for log correlation.
- **OpenAPI-driven types** — request/response shapes generated from the live spec; zero drift from the server.
- **Edge-compatible** — Node 18+, Bun, Deno, Vercel Edge, Cloudflare Workers. Uses Web Crypto throughout, no `node:crypto` imports.
- **82 unit tests** including a server↔SDK signature-parity check that catches any HMAC contract drift.

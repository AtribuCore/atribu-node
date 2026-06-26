# Changelog

All notable changes to `@atribu/node` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

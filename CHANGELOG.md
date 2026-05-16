# Changelog

All notable changes to `@atribu/node` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

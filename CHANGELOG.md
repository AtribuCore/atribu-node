# Changelog

All notable changes to `@atribu/node` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.23.0] - 2026-09-22

### Added

- **The email surface can now START a thread, and says which one it started**
  (#1653). Three additive, optional items. Nothing was removed, no field
  changed type, and a consumer that ignores all three keeps working byte for
  byte.
  - `messages.send` with `channel: "email"` answers with **`thread_id`** (Gmail
    `threadId` / Outlook `conversationId`) and **`rfc822_message_id`** (the
    `Message-ID` header of the message that went out). Send `to` + a `subject`
    with no `thread_id` and the mailbox opens a NEW thread; the response names
    it. A reply returns the thread it replied into. `thread_id` is the same
    identifier the inbound `message.received` event carries, so the thread you
    started is the thread the customer's reply arrives on.
  - `messages.send`'s email content takes **`list_unsubscribe: { url, one_click }`**,
    which writes `List-Unsubscribe: <url>` onto the outgoing message and, with
    `one_click: true`, `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
    (RFC 8058). One-click requires an `https://` url — a `mailto:` with
    `one_click: true` answers `422`, because every mailbox provider would
    otherwise ignore the pair silently and you would never learn the header did
    nothing. Put it on mail you originated in bulk; omit it on a 1:1 reply.
  - `EmailMessageReceivedEvent.data` gains **`delivery_failure`** — `null` for
    an ordinary message, or
    `{ failed_recipient, status, original_rfc822_message_id }` parsed out of an
    RFC 3464 delivery-status report. `original_rfc822_message_id` equals the
    `rfc822_message_id` your send returned, so a hard bounce (`status` `5.x.x`)
    can be charged against the exact message that bounced instead of guessed at
    from the postmaster's address. `auto_submitted` and `precedence`, which
    have shipped since 1.16.0, are documented alongside it: check all three
    before treating an inbound message as a human reply.
- `EmailMessageReceivedEvent`, `EmailEventAddress`, `EmailEventAttachment` and
  the new `EmailEventDeliveryFailure` are now **exported by name** from
  `@atribu/node/webhooks`. They were only ever reachable structurally, through
  the `AtribuWebhookEvent` union, so code branching on a bounce had no name to
  import for the shape it was reading.
- `@atribu/node/test` gains `eventFixtures.emailMessageReceived()`,
  `eventFixtures.emailDeliveryFailure()` and `responseFixtures.emailSent()`.

## [1.22.0] - 2026-09-16

### Added

- **Four additive fields that say when a decorative answer is UNKNOWN rather
  than absent** (#1550). Atribu's analytics store is moving into its own
  database; when it is briefly unreachable, the endpoints below now answer 2xx
  with the affected field marked, instead of failing. Nothing was removed and no
  field changed type — a consumer that ignores them keeps working.
  - `connections.list` / `connections.get` → **`spend_unavailable`**. When
    `true`, `delivers_spend` is `null` because the answer is *unknown*, not
    because it does not apply. Everything else on the connection — its channel,
    its status, its identity, its sync counters — is unaffected and as
    trustworthy as ever. **If you sweep channel health, do not degrade a channel
    on this flag**; re-read `delivers_spend` later and keep what you last knew.
  - `conversations.list` → **`enrichment_unavailable`**. When `true`, `ad_name`
    and `campaign_name` are `null` and `linked_customer_is_payer` was decided on
    the contact's own email/phone alone. The conversation, its counts, its last
    message and every `referral_*` field are untouched.
  - `profile.get` (and the read-back from a profile update) → **`analytics`**
    (`"available"` | `"unavailable"`). When `"unavailable"`, only
    `has_subscription_revenue` is a default rather than a measurement.
  - `profile.readiness` → **`analytics`** at the top level and **`evidence`**
    (`"measured"` | `"unavailable"`) on every step. A step whose evidence is
    unavailable reports `status: "degraded"` — never `missing`, which would tell
    you to configure something you may already have configured — and its `next`
    is to retry the same call. `summary.done` is then a floor, not a verdict.
    Steps measured from Atribu's messaging core stay `"measured"` throughout.
  - `POST /api/v1/partner/wa-joins` (no SDK method — HTTP only) →
    **`attribution_deferred`**. When `true`, the join was accepted and recorded;
    only the outcome event it feeds is owed, and it is replayed automatically on
    the same key. `conversation_started` is `false` and `outcome_event_id` is
    `null` whatever the replay produces. **Do not retry on it.**

### Changed

- **`delivers_spend` reports `null` instead of `true` when its probe fails.**
  Previously a failed probe resolved to `true` because a boolean was the only
  vocabulary available and `false` would have suppressed a true disclosure.
  `null` preserves that direction — Atribu's own timezone disclosure treats a
  null as unweighted and therefore names every ad account — while finally being
  honest that nothing was measured. Pair it with `spend_unavailable` to tell
  *unknown* from *not applicable*.

## [1.21.0] - 2026-09-15

### Changed

- **`Idempotency-Key` is now HONOURED on the message-send routes** (#1517).
  Nothing in this SDK's surface changed — `messages.send(input, { idempotencyKey })`
  and `conversations.sendMessage(id, body, { idempotencyKey })` already
  accepted the option — but the server now acts on it, so passing one finally
  buys you something:
  - `POST /api/v1/messages` (WhatsApp, Instagram and email),
    `POST /api/v1/conversations/{id}/messages` and
    `POST /api/v1/whatsapp/conversations/{id}/messages`.
  - A repeat within **24 hours** replays the first response verbatim and sends
    nothing. Scope is your API key + the route + the key value.
  - A repeat that arrives while the first send is **still in flight** answers
    `409 idempotency_key_in_flight` rather than risking a second delivery —
    retry the same key with backoff.
  - A repeat carrying a **different body** answers `409 idempotency_key_conflict`.
  - Only a 2xx is stored, so a send that genuinely failed can be retried under
    the same key.
  - **Pass your own key to get any of this.** The auto-generated
    `Idempotency-Key` this SDK puts on every mutating POST is regenerated per
    attempt, so `RetryingHttpClient`'s own replays do NOT deduplicate. Use a
    value you can reproduce on a retry — your message id.
- `api.d.ts` regenerated: the three send operations now declare the
  `Idempotency-Key` header parameter and a `409` response.


### Added

- `client.whatsapp.ads.list({ limit, after })` — every click-to-WhatsApp ad on
  the profile, with the destination it opens (type, the business's WhatsApp
  number, the Page), the creative's call-to-action type, the greeting, and
  `greeting_status`. The question `welcomeMessage()` cannot answer: it needs an
  ad id, and you only learn one from a conversation that already happened.
  - `greeting_status` is `"present" | "none" | "unreadable"`. `greeting` is
    `null` for the last two, and they are different facts — `none` is a normal
    ad whose advertiser configured no greeting (final), `unreadable` is a
    creative Meta would not show Atribu (worth asking again once the Meta
    connection is fixed).
  - An ad is listed when WhatsApp is named either by its ad set's
    `destination_type` or by its creative's call-to-action; an ad commonly
    carries only one of the two.
  - Served from Atribu's nightly Meta sync, never a live Graph call, so polling
    it costs the advertiser's `ads_management` quota nothing. `last_synced_at`
    says how stale each row is, and an ad launched since the last sync is not
    listed yet — its greeting is still readable by id through
    `welcomeMessage()`.
  - Keyset pagination on `ad_id`: pass `page.nextCursor` back as `after`.
  - No spend, no metrics, no customer data on this surface.

- `client.whatsapp.ads.welcomeMessage(adId, { connectionId })` — the welcome
  message ("Saludo automático") a click-to-WhatsApp ad shows a customer BEFORE
  their first message. Meta never delivers it over the webhook: the `referral`
  object on the first inbound message carries the ad's headline, body and
  thumbnail, and the greeting is ad configuration readable only from the
  Marketing API. Without it an assistant composing the first reply greets
  someone who has already been greeted, and asks what it can help with after
  they have already said.
  - Returns `welcome: null` when the ad has no greeting configured — a complete
    answer, not a failure. Check the field; do not rely on a throw.
  - `welcome.autofill_message` and `welcome.ice_breakers[]` are what the
    customer most likely TAPPED instead of typing, so a first message equal to
    one of them is a button press, not a sentence they composed.
  - Cached per (profile, ad) server-side: `cached` says whether the answer came
    from that cache, and `fetched_at` is when it was read from Meta — not when
    you called.
  - `404` when Meta does not show Atribu the ad (deleted, or invisible to the
    workspace's token — Graph does not distinguish the two), `409` when the
    profile has no usable Meta Ads connection, `502` on a transient Meta
    failure.
  - Since #1420 it answers from the nightly sync's own row when that row is
    fresh, so for an ad the tenant actually runs the call costs no Graph quota
    at all. The behaviour is unchanged: same response, `cached: true`.

- **Nine platform-lifecycle webhook events on a new `atribu` provider (#1049)** —
  `connection.connected`, `connection.reconnect_required`, `connection.revoked`,
  `handoff.completed`, `recompute.completed`, `conversion.attributed`,
  `export.completed`, `export.failed`, `profile.freshness.changed`, each with a
  typed interface in the `AtribuWebhookEvent` union. They exist so an integration
  never has to poll for completion.
  - Opt in through `providers`, not `events`: delivery matches on both, so a
    subscription whose `providers` is `["whatsapp"]` receives none of them.
  - `conversion.attributed` fires exactly once per conversion definition, ever.
  - `handoff.completed` fires exactly once per hand-off, and only on completion
    (`failed` / `cancelled` emit nothing); a workspace-level hand-off, minted
    without a profile, emits nothing at all.
  - `connection.reconnect_required` carries `data.reconnect = {method, path}` —
    a route to call with your own credential, never a signed URL.
- `client.legal` (#1051) — DPA / BAA signing, and the two acts an agreement
  needs. `signDpa()` / `signBaa()` mint a **hand-off**: a session-less URL for
  a person and an id to poll, because your agent cannot agree to a contract on
  a customer's behalf. A document that is already accepted comes back
  `status: "completed"` with `result.already_accepted` and no URL — re-running
  a checklist never asks for a second signature. `acceptDpa()` / `acceptBaa()`
  record an acceptance for the SIGNED-IN caller and answer `403` for an API
  key, which is the point rather than an omission; they take an optional
  `{ document_version }` naming which of the shipped texts you displayed
  (allowlisted, never recorded as given).
- `client.workspaces.startCheckout(workspaceId, { plan, interval? })` (#1052) —
  mint a Stripe Checkout hand-off for a plan upgrade. `plan` is `growth` or
  `agency`; `interval` defaults to `monthly`. Session bearers only (the route
  is workspace-scoped, so an API key has no workspace to be scoped to) and the
  caller must be a workspace `owner` or `admin`. A workspace already on that
  plan — a trial on it included — comes back `completed` with
  `result.no_change` and no URL, never a second subscription.
- `WorkspaceSubscription` grows `upgrade_available[]` (#1052): the plans ABOVE
  the current tier, cheapest first, each with `currency`, `price` (the monthly
  list price) and `annual_monthly_price` (the per-MONTH rate when billed
  annually, not the yearly total) as ADR 0018 exact decimal strings, plus the
  route that mints a checkout for it. An empty array means "nothing to sell" —
  the top plan, an unranked tier like `enterprise`, or nothing above — and
  should not render an upgrade prompt.
- New exported types: `LegalHandoff`, `LegalAcceptance`, `LegalAcceptInput`,
  `LegalDocument`, `CheckoutHandoff`, `CheckoutSessionInput`.

### Changed

- **`connection_id` on every webhook event is now `string | null`.** It is `null`
  on the lifecycle events with no connector behind them (`recompute.completed`,
  `conversion.attributed`, `profile.freshness.changed`, `export.*`). Every
  channel event and every `connection.*` event still always carries a string, so
  the wire is unchanged — but a handler that used it as a `string` must narrow.


### Fixed

- `WhatsAppConversationMessage`, `WhatsAppConversationMessagesPage`,
  `WhatsAppSendMessageOptions`, `WhatsAppSendInteractiveInput` and
  `WhatsAppSendTemplateOptions` were exported from `./resources/whatsapp` but
  never re-exported from the package's top-level `index.ts`, so `import type
  { WhatsAppConversationMessage } from "@atribu/node"` failed with "has no
  exported member" — the console's #649 rewiring caught it. Same pattern as
  every other `WhatsApp*` type in this file; these five were added in the
  conversations resource's own PR and missed the top-level re-export.

- `client.withRetry().payments` was `undefined` — `payments` was wired into the
  constructor but not into `_fromHttp`, so `webpay()` threw a TypeError on any
  retrying client. The fourth resource to hit this trap after `dmAds`,
  `channelRules` and `commerce`; `retry-wrapper.test.ts` enumerates the base
  client's keys to catch it and was red.

### Added

- `content.type: "location"` on `messages.send()` — a WhatsApp location pin:
  `latitude` / `longitude` (range-checked) plus optional `name` / `address`.
  WhatsApp only; Instagram and email answer the usual 422.
- `client.conversations` (#649) — the unified inbox: `conversations` /
  `conversation_messages`, channel-agnostic across WhatsApp, Instagram and
  email. Distinct from `client.whatsapp.conversations` /
  `client.instagram.conversations` (Vitrina's own messaging surfaces, keyed
  by connection/IGSID) — this reads and replies to Atribu's OWN inbox record
  of those conversations. Requires `conversations:read` for the seven reads
  (`list`, `messages`, `organicMatches`, `labels`, `reviewProposals`,
  `pendingReviewsCount`, `unlinkedInstagramPayments`,
  `searchInstagramConversations`) and `conversations:write` for the seven
  writes (`sendMessage`, `saveDraft`, `applyLabels`, `linkCustomer`,
  `unlinkCustomer`, `decideReviewProposal`, `resolveUser` — the last one a
  GET with real side effects, a live Instagram Graph API call plus a
  channel_data cache write-through).
- `client.profile.create({ workspace_id, name, timezone?, currency?,
  site_domain? })` (#488, PR-2) — a session-authenticated owner/admin adds a
  profile to a workspace they already run. `POST /api/v1/profiles` now
  admits a Supabase session bearer as well as the original app-credential
  (Basic auth) flow; the two are unrelated operations sharing one URL — the
  session branch creates neither a new workspace nor a shadow user, and
  carries no idempotency key (it always creates). An analyst, a guest, or a
  workspace you do not belong to all resolve the same 404 a nonexistent
  workspace would.
- `client.workspaces.subscription(workspaceId)` (#488, PR-2) — the
  workspace's current subscription: plan tier, status, billing period,
  trial dates and cancellation state. `null` when the workspace has no
  `subscriptions` row. Deliberately narrower than the full row: no
  Stripe/Shopify ids, no entitlement amounts, and no `cancel_at` (a live
  Stripe field, never persisted — only the stored `cancel_at_period_end`
  is served).
- `client.workspaces.list()` rows also carry `acquisition_source` (#488,
  PR-2) — `workspaces.acquisition_source`, additive.
- `client.whatsapp.conversations.listMessages(conversationId, { before, limit })`
  (#649) — a newest-first page of one WhatsApp conversation's messages.
  Paginates with `before` (the oldest returned `message_timestamp`), not an
  opaque cursor — `pagination.cursor` is never populated on this route.
  Returns the whole envelope (like the analytics-area resources), because
  `pagination.has_next` is how a caller decides whether to page again.

- `client.profile.update()`, `client.profile.updateOutcomeDefinition()`,
  `client.profile.replaceOutcomeDefinitions()`,
  `client.profile.recordAuditEvent()` and `client.profile.darkMessagingSpend()`
  — the settings/onboarding batch (#488), the last profile-scoped
  writes/reads the console made straight off a browser Supabase client.
  `update()` is a partial patch over `mode` / `default_attribution_model` /
  `currency` / `onboarding_completed` and returns the same envelope
  `client.profile.get()` does; setting `onboarding_completed: true` stamps a
  `PROFILE_ONBOARDING_COMPLETED` audit row server-side in the same call.
  `replaceOutcomeDefinitions()` deletes-then-inserts one WHOLE
  `outcome_definitions` family (`pipeline_stage` | `order_event`) — there is
  no per-row create. `recordAuditEvent()` is narrowly allowlisted, not a
  general audit-log proxy.
- `client.workspaces.mcpSettings()` / `updateMcpSettings()` /
  `mcpWritebackAudits()` — the workspace MCP privacy panel (#488): the PII
  default and write-back toggle for agent tools, and the write-back audit
  log. `updateMcpSettings()` is owner/admin only.
- `client.whatsapp.conversations.sendMessage(id, { text?, file? })` /
  `.sendInteractive(id, { body, buttons, header? })` /
  `.sendTemplate(id, { templateName, languageCode, components })` (#649) —
  send into a WhatsApp conversation by its `conversations.id`, which
  `AtribuClient.messages.send()` cannot express (it targets a raw phone
  number via `connection_id`, with no `conversations` row concept).
  `sendMessage` refuses with `whatsapp_service_window_expired` (422) once
  the conversation's 24h customer-service window has closed; use
  `sendTemplate` to re-engage instead — Meta exempts template sends from
  the window, not interactive ones.

- `client.workspaces.list()` rows carry three more facts, additively (#488):
  `default_timezone` (the WORKSPACE's IANA zone, not the caller's browser
  zone), `member_count` (active members — a count, never the roster), and
  `brief`, the same six `28d` attention counters
  `/workspaces/{id}/top-performers/brief` returns. `brief` is NULLABLE and its
  two falsy-looking answers differ: the zero row means nothing needs
  attention, `null` means the counters could not be computed. Nothing was
  removed or renamed, so an existing consumer is unaffected.

- `client.commerce` — a connected store's catalogue and orders (#391).
  `commerce.products.list({ updated_since, cursor, limit })` walks the
  catalogue as an ASCENDING change feed with variants nested; a product the
  store deactivated or deleted comes back with `active: false`, because a
  mirror has to learn about a removal. `commerce.orders.list({ order_ref |
  email | phone })` is the "where is my order" lookup — at least one selector
  is required (a call with none is a 400, not a dump of the merchant's order
  history) and the row carries NO customer identity. Prices and order totals
  are exact decimal strings.

- Real `data` types for the five `shopify` webhook events, which shipped as
  `Record<string, unknown>` placeholders. `ShopifyProductStockChangedEvent`
  now narrows to `previous_state` / `state` / `quantity` with a
  `ShopifyStockState` union, `ShopifyOrderStatusChangedEvent` to
  `"fulfilled" | "delivered"`, and so on. Type-level only — `verifyWebhook`
  does no runtime narrowing, so nothing on the wire changed.

- `accessToken` on `AtribuClientConfig` — a Supabase **session** access token,
  for a client acting as the signed-in user rather than as a machine. It rides
  the same `Authorization: Bearer` header an `apiKey` does (the API tells the
  two apart by shape), but it identifies a *person* rather than a tenant, so a
  client built with it also requires `profileId` and threads `?profile_id=` onto
  every request. Passing both credentials is an `AtribuConfigError` at
  construction.

- `profileId` on `AtribuClientConfig` — applied AFTER any per-call query, so a
  resource method can never steer a request at a different tenant than the one
  the client was built for. Optional with an `apiKey`, where the key already
  carries the scope.

- Nine resources covering every profile-scoped v1 route: `analytics`
  (overview, campaigns, campaign conversions, breakdown, drill + drill CSV,
  funnels, new-vs-returning, LTV, customers, visitors), `attribution` (models,
  explore, messaging), `organic` (posts, post, story), `ads` (creative
  analysis), `quality` (UTM health + the on-demand `refreshUtm` scan),
  `recommendations` (list, diagnose, apply,
  dismiss), `exports` (destinations, ledger, create, get), `tracking` (keys,
  issueKey, snippet, GTM + Shopify installers) and `reports` (templates,
  schedules CRUD, deliveries, generate, get, send). Plus
  `connections.pending()` / `connections.finalizePending()` for the post-OAuth
  account picker. Every request and response type is indexed out of the
  generated OpenAPI `paths` — none is hand-written.

  These resolve with the **whole response envelope** rather than unwrapping
  `data`: the analytics reads carry `pagination.cursor`, `status_counts` and
  `meta` beside it, and unwrapping would drop the cursor.

- `accessToken` on `AtribuClientConfig` now also accepts a CALLBACK —
  `() => string | Promise<string>` — resolved fresh by the HTTP layer on every
  request rather than once at construction. For a long-lived client acting as
  a signed-in user whose session token rotates while the client stays open
  (a browser tab), this replaces the old workaround of constructing with a
  placeholder string and overwriting the `Authorization` header from a custom
  `fetch`. A plain string still works exactly as before — pass one when the
  token is genuinely static for the client's lifetime.

### Changed

- The "no credential" error now reads `apiKey or accessToken is required for
  <METHOD> <path>`, since either satisfies it.

## [1.20.0] - 2026-09-15

### Added

- `OauthScope` gains `"connections"` and `"attribution"` (#1478, ADR 0021) —
  the two CONNECTIONLESS connect scopes `POST /api/v1/profiles` accepts.
  `connections` is now `DEFAULT_PROVISION_SCOPES` and mints
  `connections:read` / `connections:write`: the Meta Ads connect rail
  (handoff, pending, finalize, sync, sync-status, disconnect) runs on it,
  dual-accepting the old `attribution:write` / `analytics:read` during the
  swap window. `attribution` mints the whole Add-on bundle — every
  analytics/analytics_pii/attribution_write scope plus `exports:*`,
  `events:write`, `campaigns:apply`, `creatives:write`, `connections:*` — and
  is set by Atribu itself when a profile's `atribu_attribution` entitlement
  turns on. Requesting it directly at provisioning time is refused (400
  `validation_error`, #1491 fix 2) precisely because that would let a
  consumer app grant itself the Add-on.
- `ProfileEntitlementResult.grant` — `{ scopes, revoked_keys, revoked }`
  (#1478) — what `PUT /api/v1/profiles/{profileId}/entitlements/{feature}`
  did to your OAuth grant on this profile. `enabled: true` widens
  `grant.scopes` to `["connections", "attribution"]`; `enabled: false`
  narrows it back to `["connections"]` and `revoked_keys` reports how many
  API keys that cut — non-zero only when the grant actually carried
  `attribution`. A legacy grant that never held it, or a repeated
  `enabled: false` replay, revokes nothing (#1491 fix 3: "an entitlement
  operation may only undo what an entitlement operation did"). `revoked:
  true` means the workspace owner has disconnected your app entirely — the
  entitlement still flips as a billing fact, but the grant is left alone and
  `scopes` comes back empty; re-consent through `POST /api/v1/profiles` (or
  `/adopt`) before calling again. Never carries a secret — mint a fresh key
  yourself with `grant_type=client_credentials`.
- The entitlement PUT body takes an optional `occurred_at` (ISO-8601 with
  offset) (#1491, item 11), and the response grows `ignored_stale` —
  ordering for an at-least-once outbox. A delivery whose `occurred_at` is
  strictly older than the decision Atribu already recorded answers `200`
  with `changed: false, ignored_stale: true` and writes nothing at all: no
  entitlement change, no grant convergence, no cascade, no audit row.
  `enabled` then reports the value Atribu currently holds, not the one you
  sent — treat it as success and stop retrying that delivery. A call that
  omits `occurred_at` behaves exactly as before.
- `client.connections.pixels(id)` / `GET /api/v1/connections/{id}/pixels`
  (#1489) — the Meta pixels on a `meta_ads` connection's ad account, so a
  delegated key can discover the `metaPixelId` that
  `POST /api/v1/exports/destinations` requires without asking the dealer to
  copy an id out of Events Manager (the two adjacent reads refuse this
  question by design: the dataset endpoint only reconciles a pixel that is
  already configured, and the setup-link mint refuses API keys outright).
  One live, uncached Meta Graph call per request — you're about to write a
  destination against the answer, so a pixel deleted since must not still be
  on offer. `null` fields mean Meta gave no verdict, not `false`; an empty
  array means the ad account genuinely has no pixels, never "we could not
  ask" — a failure throws instead. `invalid_state` (409) for a connection
  that is not `meta_ads`, `not_found` (404) for another profile's id,
  `unauthorized` (401, `reconnectRequired`) for a dead Meta token. Requires
  `exports:read`.

### Changed

- `GET /handoffs/{id}` scope prose corrected (#1487): it accepts
  `connections:read` OR `analytics:read`, not `analytics:read` alone. A
  `{connections}`-only key — ADR 0021's new core grant, which carries no
  analytics scope at all — could mint a Meta Ads connect hand-off and then
  403 reading it back, the one read in the connect rail that had not picked
  up the rail's own dual-accept pattern. Doc/scope-only;
  `client.handoffs.get()`'s signature is unchanged.
- Regenerated types now carry several response shapes precisely instead of
  falling back to a loose or `unknown` shape, after a fix to the API
  contract guard that could not see through a `$ref` slot (#1477, closing
  #1451/#1452/#1453):
  - `ConversionSyncAudienceProposal.stats` — six typed fields; the three
    cash figures (`totalCashIn`, `totalSeedValue`, `refundsSubtracted`) are
    exact-decimal `string`s (ADR 0018), not `number`.
  - `ConversionSyncAudienceSeedPreview`'s `totalSeedValue` /
    `refundsSubtracted` / `medianValue` are likewise decimal strings now,
    not `number`.
  - The ads scaling guidance's `is_directional` is a required `boolean`,
    always `true` — a structural reminder that a
    `room_to_scale` / `fatiguing` / etc. verdict is a directional read, never
    a causal claim — and is now actually present on the wire (the old
    `isDirectional` spelling never shipped on any consumer and is gone).
  - Both Conversion Sync setup-link write responses' `link` gains nine
    previously-undeclared fields (including `url`, `lastError`, and the PII
    fields `inviterName` / `metaUserName` / `clientName` / `agencyName`) and
    loses its `{ [key: string]: unknown }` index-signature escape hatch.
  - `PUT /conversion-sync/legal`'s `documents[]` gains ten previously-
    `unknown` fields (`created_at`, `external_url`, …) and likewise loses
    its index signature.

  None of these operations is `exports`-scoped on any live key today, so
  this ships as a types-only correction with no runtime behavior change for
  current consumers — but a caller reading these fields through an `as` cast
  or an index-signature fallback should re-check after regenerating.

## [1.19.0] - 2026-09-14

> 1.18.0 was bumped in this monorepo but never mirrored/published to npm
> (`npm view @atribu/node version` still answered `1.17.0`). Its changes ship
> for the first time as part of 1.19.0.

### Added

- `externalRef` on `signIdTokenHint()` (ADR 0020) — names the tenant a consent
  lands on for an app Atribu has switched to `profile_resolution:
  "external_ref"`: the claim is emitted as `external_ref` and consent then
  resolves `(client_id, external_ref)` against the profile you provisioned
  under that exact ref, instead of deriving one from `email`. Ignored by
  Atribu for an app still on the default `"email"` mode, so adding it ahead of
  the switch is safe; a blank value is rejected client-side rather than signed,
  and an explicit `externalRef` wins over an `extraClaims.external_ref` of the
  same name so a pre-#1416 consumer's `extraClaims` usage keeps working
  unchanged.
- `client.whatsapp.ads.list({ limit, after })` — every click-to-WhatsApp ad on
  the profile, with its destination, call-to-action type, and greeting
  (`greeting`, `greeting_status`). Served from Atribu's nightly Meta sync
  (never a live Graph call), keyset-paginated on `ad_id`. Answers the
  account-wide question `welcomeMessage()` cannot: that call needs an ad id,
  and you only learn one from a conversation that already happened.
- Regenerated `api.d.ts` types for four app-credential routes — the `adopt`
  operation stamping `external_ref` onto a provisioned profile (#1415), the
  app-declared `atribu_attribution` entitlement toggle (#1418, ADR 0021), and
  profile `archive` (#1433). None of the three gets a wrapped resource method:
  per the SDK's existing pattern, a new field or route on an already-typed
  path flows through the generated types with no runtime change required.

### Changed

- `connections.disconnect()` doc comment: a delegated `attribution:write` key
  may now call it on a profile its own app provisioned (still a 403 on a
  human-owned profile or one another app provisioned). No signature or
  runtime change — `disconnect()` already existed; only the server-side grant
  and the regenerated types moved.

## [1.18.0]

### Added

- `attachments` on the `message.echo` event's `data` — when a staff member
  sends media (a voice note, a photo) from the WhatsApp Business App under
  coexistence, Atribu now resolves the echo's Meta `media_id` to a hosted,
  browser-fetchable URL and attaches it as top-level
  `data.attachments: [{ type, payload: { url } }]`, the same shape
  `message.received` carries. The raw `message_echoes[0]` object is untouched
  (its media stays a bare `media_id`). Resolution is best-effort and
  time-boxed server-side: when it fails or times out the event is delivered
  without `attachments` — `whatsapp.media.get(mediaId, { connectionId })`
  remains the fallback. Previously an echoed voice note reached consumers as
  a bare `media_id` only, which rendered as an empty message in apps without
  a Meta token.

- `WhatsAppEventAttachment` type, exported from `@atribu/node/webhooks`.

### Fixed

- `WhatsAppMessageReceivedEvent.data` now declares the `attachments` field the
  server has always emitted on inbound media messages. Types-only — nothing
  changed on the wire; SDK consumers simply could not see the field existed.

## [1.17.0]

### Added

- `instagram.conversations` — the Instagram inbox read, proxied live to Meta:

  - `list({ connectionId, userId?, limit?, after? })` →
    `{ conversations, nextCursor, hasNext }`. One page of the account's
    conversations with participants and `updated_time`; Meta's own cursor is
    forwarded verbatim. `userId` (an IGSID) narrows the response to the single
    thread with that person instead of paging the whole inbox.
  - `messages(conversationId, { connectionId, limit?, after? })` →
    `{ messages, nextCursor, hasNext }`. A thread's messages, newest first,
    with `message` / `from` / `to` / `attachments` / `shares` / `reactions`
    already expanded — so reading a whole inbox costs roughly one call per
    conversation, not one per message.

  Two Meta-side limits shape any history import and neither can be worked
  around: **only the 20 most recent messages of a thread carry content** (older
  ones arrive with a `null` body and just `id` + `created_time`), and
  **Requests-folder threads inactive for 30+ days are not returned at all**.
  Withheld bodies are passed through as Meta returned them — the SDK never
  substitutes a placeholder record, so `message === null` reliably means "Meta
  would not give it to us" rather than "the message was empty".

  The mock kit at `@atribu/node/test` covers both endpoints, and its message
  fixture spans the 20-message boundary so truncation handling can be tested
  without a live account.

### Fixed

- A Meta "object does not exist" refusal (code 100 / subcode 33) is now
  classified as permanently fatal, so it surfaces as a `422 invalid_request`
  carrying the Meta code instead of a `502`. Previously it fell through to the
  transient path, and the 502's JSON body was replaced by the edge's own error
  page — the SDK saw an `http_502` with nothing actionable in it. This is the
  error Meta returns for a message past the 20-message window and for a
  conversation id that is not on the calling account.

## [1.16.1]

### Fixed

- Docs only, no behaviour change. 1.16.0 documented `media_url` as always
  `null` on a `CAROUSEL_ALBUM` parent. Live accounts return a cover URL on some
  album parents and `null` on others, so the field is now described as
  Meta-dependent. `children` remains the way to read an album's items — that
  part was, and stays, correct.

## [1.16.0]

### Added

- `instagram.media` — Instagram media reads, proxied live to Meta:

  - `list({ connectionId, limit?, after? })` → `{ media, nextCursor, hasNext }`.
    Newest first, Meta's own cursor forwarded verbatim — pass `nextCursor` back
    as `after` to page. `hasNext` keys off Meta's `paging.next`, so the cursor
    you get is never a dead one.
  - `get(mediaId, { connectionId })` → one media object.

  Each item is `id`, `caption`, `media_url`, `permalink`, `timestamp`,
  `media_type`, `thumbnail_url` and `children` — carousel items expanded, `null`
  for non-carousel media. On a `CAROUSEL_ALBUM`, read `children` for the
  per-item URLs; the parent's own `media_url` is Meta-dependent (a cover image
  on some albums, `null` on others). Meta's media/thumbnail URLs are
  short-lived CDN links: fetch them on demand rather than storing them.

  There is no Atribu-side mirror behind this. Every call hits Meta, so `list()`
  reflects the account as it is right now — a post published seconds ago is
  present, an edited caption is current, a deleted post is gone.

- `instagram.media` — Content Publishing, keeping Meta's two-step model:

  - `createContainer(input, opts?)` → `{ container_id, media_type }`. Nothing is
    visible on the account yet. `input` is either
    `{ connection_id, media_type: "IMAGE", image_url, caption?, is_carousel_item? }`
    or `{ connection_id, media_type: "CAROUSEL", children, caption? }` (2–10
    container ids created with `is_carousel_item: true`).
  - `publish({ connection_id, creation_id }, opts?)` → `{ media_id, creation_id }`.

  The two steps are deliberately not collapsed into a one-shot helper: a
  carousel is built from the intermediate container ids, and readiness/retry
  belong to your app, not to Atribu. Nothing here polls, retries or schedules —
  a container Meta has not finished processing surfaces as a classified error,
  and Meta's 25-posts-per-24h cap surfaces as `AtribuApiError` status 429.

  Video / Reels / Stories containers are not covered yet (they are Meta's async
  upload surface); `media_type` accepts `IMAGE` and `CAROUSEL`.

  Requires the connection to have been authorized with Instagram's
  content-publishing permission (`instagram_business_content_publish` on
  ig_login, `instagram_content_publish` on fb_login) — connections authorized
  before this release need to reconnect.

- Test-kit parity: `atribuMockHandlers` gains `instagram.media` overrides
  (`list`, `get`, `createContainer`, `publish`) plus fixtures, so consumer test
  setups running with `onUnhandledRequest: "error"` keep working.

- `comment.received` webhook event — an Instagram comment landed on a
  connected post (ig_login `field=comments` or fb_login `field=feed`).
  Fanned out for EVERY inbound comment, unconditional on whether it matched
  an internal comment-to-DM trigger. New `InstagramCommentReceivedEvent`
  type in the `AtribuWebhookEvent` union: `comment_id`, `from_id`,
  `from_username`, `text`, `media_id`, `ad_id` (boosted/ad posts only),
  `parent_id` (set on comment replies), `raw`.

- `InstagramContact` / `GetContactOptions` are now re-exported from the package
  root; they were previously reachable only through the namespace module.

## [1.15.0]

### Added

- `whatsapp.flows` — full WhatsApp Flows lifecycle: `list()`, `create()`,
  `get()` (incl. `validation_errors` + web preview URL), `update()` (metadata),
  `delete()` (drafts only), `listAssets()`, `uploadFlowJson()` (object or
  pre-serialized string; the server builds Meta's multipart upload),
  `publish()` and `deprecate()`. Flows are proxied 1:1 to Meta — there is no
  local mirror, so `list()` always reflects live status.

- `content.type: "flow"` on `messages.send()` — sends a Meta-hosted
  multi-screen form behind a CTA button: `flow_id`, `body`, `cta` (≤30 chars),
  optional `header` / `footer` / `flow_token` / `flow_action`
  (`navigate` | `data_exchange`) / `action_payload` (`navigate` only) /
  `mode` (`draft` for testing unpublished flows). The customer's answers come
  back on the `message.received` webhook as
  `raw.interactive.nfm_reply.response_json` — no new webhook event type, so
  existing webhook consumers need no changes to start receiving flow replies.

  `header` takes a string (text header) **or** a media object
  `{ type: "image" | "video" | "document", media_id | link }` (exactly one of
  `media_id`/`link`). Note: Meta's Flows send guide documents only text
  headers on interactive flow messages — the media form is a permissive
  passthrough, and a Graph refusal surfaces as a classified provider error.

- `FLOW` button on `whatsapp.templates.create()` —
  `{ type: "FLOW", text, flow_id, navigate_screen?, flow_action? }` (at most
  one per template). The out-of-window flow path: a template whose button
  opens a WhatsApp Flow. Per-send flow params ride the existing template
  `components` passthrough on `messages.send()` as a `sub_type: "flow"`
  button component — no new send surface.

## [1.14.0]

### Added

- **Email attachments on `messages.send`** (channel `email`). Email content
  accepts `attachments` — up to 10 files, **3MB total per message**. Each entry
  is `{ filename, mime_type }` plus exactly one of:

  - `url` — a public HTTPS URL Atribu fetches server-side at send time, or
  - `data_base64` — the file bytes inline.

  Works on Gmail and Outlook, on a new send and on an in-thread reply alike.
  Gmail receives a `multipart/mixed` RFC822 message; Outlook receives Graph
  inline `fileAttachment`s.

  Attachments are materialized **before** anything reaches the mail provider, so
  an unreachable URL, a non-public host, or a set of files over the size cap
  fails the whole call with a 422 — never a half-sent email. URL fetches are
  validated against a public-host allowlist on every redirect hop.

## [1.13.0]

### Added

- `messages.markRead({ connection_id, channel, to, message_id })` — blue-ticks
  the customer's message **without** showing a typing bubble. The "a human saw
  this" affordance, and the inbox counterpart to `messages.typing()`.

  Use `typing()` when an AI agent is composing a reply: the bubble truthfully
  says one is coming. Use `markRead()` when a human operator merely *opens* the
  conversation — nobody promised a reply inside the ~25 seconds a bubble lives,
  and one that expires unanswered reads worse than plain blue ticks. Without it,
  human-handled threads are the only ones that never get read receipts, so they
  look ignored next to the AI-answered ones.

  **Read receipts are cumulative.** WhatsApp marks the given message *and every
  earlier message in that conversation* read, so one call with the most recent
  inbound wamid is enough — there is no need to walk the backlog. A repeat for
  an already-read message comes back as `forwarded: false, reason:
  "stale_message_id"`, which is a no-op at Meta rather than an error.

  Same response shape and the same transport policy as `typing()` — never
  retries, deadline capped at 5000ms — because those are properties of the
  endpoint, not of the bubble. It delegates to `typing()` internally, so the two
  cannot drift apart.

- `indicator?: "typing" | "read"` on `messages.typing()`'s input, and echoed
  back on the response. `markRead()` is sugar for `indicator: "read"`; the
  matching `MessageMarkReadInput` type is `MessageTypingInput` without it.

  **The field is sent only when you set it.** A `typing()` call that leaves it
  unset puts nothing new on the wire, so v1.13.0 talks to an Atribu deployment
  that predates the field byte-for-byte as v1.12.0 did. Against such a
  deployment `markRead()` still marks the message read — the unknown field is
  ignored and a bubble is shown. `res.indicator` is how you tell: `"read"` was
  honoured, `undefined` means the bridge is older than the feature. (A 404 means
  older still: the typing endpoint itself is missing.)

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

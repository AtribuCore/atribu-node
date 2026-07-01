<p align="center">
  <a href="https://www.atribu.app">
    <img src="https://www.atribu.app/brand/atribu-wordmark-square-800.png" alt="Atribu" width="120">
  </a>
</p>

<h1 align="center">Atribu Node.js SDK</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@atribu/node"><img src="https://img.shields.io/npm/v/@atribu/node.svg" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
  <strong>Authorize users, send WhatsApp & Instagram messages, and verify signed webhook deliveries — through one API.</strong>
</p>

The official Node.js SDK for the [Atribu API](https://www.atribu.app) — typed access to messaging, IG comment replies, booking-calendar management, webhook subscriptions, OAuth 2.0 consumer helpers, and signed-webhook verification.

## Installation

```bash
npm install @atribu/node

# Optional peer deps:
npm install jose      # only if you use the @atribu/node/oauth helpers
npm install msw       # only if you use @atribu/node/test
```

## Quick Start

```typescript
import { AtribuClient } from "@atribu/node";

const atribu = new AtribuClient({ apiKey: process.env.ATRIBU_API_KEY });

const result = await atribu.messages.send({
  connection_id: "11111111-1111-1111-1111-111111111111",
  channel: "whatsapp",
  to: "+15551234567",
  content: { type: "text", text: "Hello from @atribu/node!" },
});

console.log("Sent:", result.provider_message_id);
```

## Configuration

```typescript
const atribu = new AtribuClient({
  apiKey: "atb_live_...",            // required
  baseUrl: "https://www.atribu.app", // default
  fetch: customFetch,                // optional — bring your own (tracing, edge)
  timeoutMs: 30_000,                 // default 30s
  userAgent: "MyApp/1.0",            // appended after the SDK User-Agent
});
```

`Idempotency-Key` is auto-sent on every mutating POST. `request_id` is surfaced on every error.

## Examples

### Send a WhatsApp template

```typescript
await atribu.messages.send({
  connection_id: connectionId,
  channel: "whatsapp",
  to: "+15551234567",
  content: {
    type: "template",
    template_name: "appointment_reminder",
    language_code: "en_US",
    components: [
      { type: "body", parameters: [{ type: "text", text: "Tuesday at 3pm" }] },
    ],
  },
});
```

### Send a WhatsApp image

```typescript
// Either pre-uploaded media (recommended for high fanout):
await atribu.messages.send({
  connection_id: connectionId,
  channel: "whatsapp",
  to: "+15551234567",
  content: {
    type: "image",
    media: { media_id: "1234567890" },
    caption: "Your invoice",
  },
});

// Or by public HTTPS link (Meta fetches once per send, no caching):
await atribu.messages.send({
  connection_id: connectionId,
  channel: "whatsapp",
  to: "+15551234567",
  content: {
    type: "image",
    media: { link: "https://cdn.example.com/invoice.png" },
  },
});
```

### Receive WhatsApp media (inbound)

Meta's inbound webhook carries only an opaque `media_id`, and the underlying
Meta CDN URL needs your access token to download. Atribu resolves this for you:
**inbound WhatsApp webhook deliveries already include an `attachments` array**
with a hosted, browser-fetchable URL (signed, ~7-day TTL) — the same shape as
Instagram, so you usually don't need to fetch anything:

```jsonc
// data of an inbound "message.received" delivery for a media message
{
  "wa_message_id": "wamid.…",
  "from": "15551234567",
  "type": "image",
  "attachments": [{ "type": "image", "payload": { "url": "https://…signed…" } }]
}
```

If you'd rather resolve on demand (e.g. you only stored the `media_id`), call:

```typescript
const media = await atribu.whatsapp.media.get(mediaId, { connectionId });
// { url: "https://…signed…", mime_type: "image/jpeg", expires_at: "2026-…Z" }
```

`url` is a signed URL that expires (`expires_at`); WhatsApp media IDs from
webhooks expire after 7 days, after which `get()` returns a `410`.

### Reply to an Instagram comment

```typescript
// Public reply on the comment thread:
await atribu.comments.reply({
  comment_id: "ig_comment_id",
  connection_id: connectionId,
  text: "Thanks! DMing you now.",
});

// Private DM to the commenter:
await atribu.comments.privateReply({
  comment_id: "ig_comment_id",
  connection_id: connectionId,
  text: "Here are the details you asked about ...",
});
```

### Send WhatsApp reply buttons (interactive)

```typescript
await atribu.messages.send({
  connection_id: connectionId,
  channel: "whatsapp",
  to: "+15551234567",
  content: {
    type: "interactive_buttons",
    body: "Pick a plan:",
    header: "Pricing",
    buttons: [
      { id: "plan_basic", title: "Basic" },
      { id: "plan_pro", title: "Pro" },
      { id: "plan_enterprise", title: "Enterprise" },
    ],
  },
});
// Tap returns the chosen `id` on the `messaging_postbacks` webhook field.
```

### Manage WhatsApp templates

```typescript
// List every template on the WABA (all statuses).
const templates = await atribu.whatsapp.templates.list({ connectionId });

// Create one — submits to Meta for review.
// Body text uses `{{param_name}}` placeholders; named example block is auto-generated.
const { id, status } = await atribu.whatsapp.templates.create({
  connection_id: connectionId,
  name: "appointment_reminder",
  category: "UTILITY",
  language: "en_US",
  body_text: "Hi {{customer_name}}, your appointment is at {{appointment_time}}.",
});

// Once status === "APPROVED" you can send it via messages.send({ type: "template", ... }).

// Delete by name when you're done with it:
await atribu.whatsapp.templates.delete("appointment_reminder", { connectionId });
```

### Send a WhatsApp broadcast

```typescript
// 1. Create a draft (capped at 1,000 recipients per broadcast).
const broadcast = await atribu.whatsapp.broadcasts.create({
  connection_id: connectionId,
  template_name: "appointment_reminder",
  template_language: "en_US",
  recipients: customers.map((c) => ({
    phone_number: c.phone,
    template_params: { customer_name: c.name, appointment_time: c.timeIso },
  })),
  name: "Q2 appointment reminders",
});

// 2. Send it. This is a long-running call (100ms pacing between recipients).
//    The Atribu server caps the route at 5 minutes — wrap your fetch with a
//    matching timeout, or extend `timeoutMs` on AtribuClient.
const completed = await atribu.whatsapp.broadcasts.send(broadcast.id);
console.log(`sent: ${completed.sent_count}, failed: ${completed.failed_count}`);

// Cancel an in-flight broadcast (already-sent messages are NOT recalled):
await atribu.whatsapp.broadcasts.cancel(broadcast.id);
```

### Manage Instagram comment-to-DM triggers

```typescript
// Create a trigger — when an inbound comment matches the keyword,
// the commenter gets `opening_message` as a DM (HUMAN_AGENT tag).
const trigger = await atribu.instagram.triggers.create({
  connection_id: connectionId,
  keyword: "PRICE",
  keyword_match_mode: "contains",          // or "exact" | "regex"
  case_sensitive: false,
  opening_message: "Here's our pricing — happy to chat!",
  public_comment_reply: "Sent you a DM!",  // optional public reply on the comment
  enabled: true,
});

// QA the opening_message against a real IGSID (must have DMed your account in last 7d):
await atribu.instagram.triggers.testDm(trigger.id, {
  recipient_igsid: "1234567890",
});

// Update / pause / delete:
await atribu.instagram.triggers.update(trigger.id, { enabled: false });
await atribu.instagram.triggers.delete(trigger.id);

// Clear the circuit-breaker if it tripped after a comment-spam wave:
await atribu.instagram.triggers.resumeCircuit({ connectionId });
```

### List authorized connections

```typescript
// What can this key act on?
const connections = await atribu.connections.list();
for (const conn of connections) {
  console.log(`${conn.channel} — ${conn.display_name} (${conn.id})`);
}

// Filter by channel:
const igOnly = await atribu.connections.list({ channel: "instagram" });

// Revoke this OAuth app's authorization for one connection (other consumers
// + the Atribu app UI continue to use it; only this app loses access):
await atribu.connections.revoke(connectionId);
```

### Manage booking calendars

Atribu creates dedicated **booking calendars** in the connected Google account and CRUDs events only on those — it never touches the user's primary calendar. Calendar creation + sharing need the `calendar.manage` scope; event CRUD needs `calendar`. Both are minted together when a user connects Google Calendar through the OAuth flow (`provider: "calendar"`).

```typescript
// 1. Create a dedicated booking calendar (idempotent — pass an Idempotency-Key)
const cal = await atribu.calendar.createCalendar(
  { connection_id, summary: "Dealership Bookings", time_zone: "America/Santiago" },
  { idempotencyKey: "dealership-bookings" },
);
// cal.id is the calendar_id you pass to every event + ACL op.

// 2. List the booking calendars for a connection
const calendars = await atribu.calendar.listCalendars(connection_id);

// 3. Create / reschedule / cancel events ON that calendar — calendar_id is REQUIRED
const event = await atribu.calendar.createEvent({
  connection_id,
  calendar_id: cal.id,
  summary: "Test drive — Jane Doe",
  start: { date_time: "2026-07-01T15:00:00Z" },
  end:   { date_time: "2026-07-01T15:30:00Z" },
  attendees: [{ email: "jane@example.com" }],
  // extended_private round-trips back on the `calendar.event.changed` webhook —
  // tag your own record id so you can reconcile without storing Google's id:
  extended_private: { vitrina_appointment_id: "appt_42" },
});
await atribu.calendar.updateEvent(event.id, { connection_id, calendar_id: cal.id, location: "Showroom" });
await atribu.calendar.deleteEvent(event.id, { connectionId: connection_id, calendarId: cal.id });

// 4. Share the calendar with a team member (reader|writer), list shares, revoke
const share = await atribu.calendar.shareCalendar(cal.id, {
  connection_id, email: "agent@dealer.com", role: "writer",
});
const shares = await atribu.calendar.listCalendarShares(cal.id, connection_id);
await atribu.calendar.revokeCalendarShare(cal.id, share.id, { connectionId: connection_id });
```

> **Breaking (v1.0.0):** event ops now **require `calendar_id`** (an Atribu booking calendar — `primary`/unknown is rejected with `calendar_unsupported`, 422), and primary-calendar writes were removed. A connection whose Google grant is missing `calendar.app.created`/`calendar.acls` returns `calendar_scope_required` (403) — prompt the user to reconnect. See the [CHANGELOG](./CHANGELOG.md).

### Manage webhook subscriptions

```typescript
// One subscription per (app, profile, URL):
const sub = await atribu.webhooks.subscriptions.create({
  url: "https://your.app/api/atribu-webhook",
  events: ["message.received", "message.delivery"],
  providers: ["whatsapp", "instagram"],
});
console.log("Webhook secret (shown once):", sub.secret);

// Rotate the HMAC secret with a grace window — deploy dual-verify BEFORE calling this:
const rotated = await atribu.webhooks.subscriptions.rotateSecret(sub.id, {
  grace_days: 14,
});

// Fire a synthetic event to verify your handler:
await atribu.webhooks.subscriptions.test(sub.id);

// Re-deliver a dead webhook:
await atribu.webhooks.deliveries.replay(deadDeliveryId);
```

## Verifying Webhooks

Atribu signs every outbound delivery as `X-Atribu-Signature: t=<unix>,v1=<hex_hmac_sha256>` over `<t>.<rawBody>` (Stripe-style). The verifier handles parsing, timestamp tolerance, constant-time HMAC comparison, and rotation grace.

### Next.js App Router

```typescript
// app/api/atribu-webhook/route.ts
import { withAtribuWebhook } from "@atribu/node/next";

export const POST = withAtribuWebhook({
  secret: process.env.ATRIBU_WEBHOOK_SECRET!,
  previousSecret: process.env.ATRIBU_WEBHOOK_PREVIOUS_SECRET,
  onEvent: async (event) => {
    if (event.type === "message.received" && event.provider === "whatsapp") {
      // event.data.wa_message_id is typed string
      console.log(`WA message from ${event.data.from}: ${event.data.text}`);
    }
  },
});
```

### Manual verification

```typescript
import { verifyWebhook } from "@atribu/node/webhooks";

export async function POST(req: Request) {
  try {
    const event = await verifyWebhook({
      rawBody: await req.text(),
      signature: req.headers.get("x-atribu-signature"),
      secret: process.env.ATRIBU_WEBHOOK_SECRET!,
      previousSecret: process.env.ATRIBU_WEBHOOK_PREVIOUS_SECRET, // during rotation
      tolerance: 300, // seconds; default 5 min
    });
    // ... handle the typed event
    return new Response(null, { status: 200 });
  } catch {
    return new Response("invalid signature", { status: 401 });
  }
}
```

The unique `event.id` and the `X-Atribu-Delivery-Id` header give you idempotency keys for safe redelivery.

## OAuth Flow

If you're building an app that connects your end-users' WhatsApp/Instagram accounts via Atribu, `@atribu/node/oauth` has every helper for the consumer-side flow.

```typescript
import {
  buildAuthorizeUrl,
  signIdTokenHint,
  exchangeCode,
  revokeToken,
  generateCodeVerifier,
  computeCodeChallenge,
} from "@atribu/node/oauth";

// 1. Redirect to consent
const codeVerifier = generateCodeVerifier();
const idTokenHint = await signIdTokenHint({
  jwtSigningSecret: process.env.ATRIBU_APP_JWT_SECRET!,
  subject: user.id,
  email: user.email,
  expiresIn: "5m",
});

const url = buildAuthorizeUrl({
  clientId: "your-app-id",
  redirectUri: "https://your.app/integrations/atribu/callback",
  provider: "whatsapp",
  scope: "whatsapp",
  state: csrfToken,
  idTokenHint,
  codeChallenge: await computeCodeChallenge(codeVerifier),
  codeChallengeMethod: "S256",
});
// Redirect the user to `url`.

// 2. Handle the callback
const { accessToken, connectionId, scope } = await exchangeCode({
  clientId: "your-app-id",
  clientSecret: process.env.ATRIBU_APP_CLIENT_SECRET!,
  code: callbackQuery.code,
  redirectUri: "https://your.app/integrations/atribu/callback",
  codeVerifier,
});

// Persist accessToken + connectionId per user. accessToken IS the API key.

// 3. Revoke later (e.g. user disconnects)
await revokeToken({
  clientId: "your-app-id",
  clientSecret: process.env.ATRIBU_APP_CLIENT_SECRET!,
  token: accessToken,
});
```

## Error Handling

```typescript
import { AtribuClient, AtribuApiError } from "@atribu/node";

try {
  await atribu.messages.send({ /* ... */ });
} catch (err) {
  if (err instanceof AtribuApiError) {
    switch (err.retry.action) {
      case "retry":           return queue.retry(job, { delay: 5_000 });
      case "retry_after":     return queue.retry(job, { delay: err.retry.retryAfterMs });
      case "refresh_token":   return refreshOAuthAndRetry();
      case "fix_and_retry":   logger.error("bad payload", { requestId: err.requestId }); break;
      case "do_not_retry":    logger.error("permanent failure", { requestId: err.requestId }); break;
    }
  }
}
```

| Error | Thrown when |
| --- | --- |
| `AtribuApiError` | `/api/v1/*` returned non-2xx. Has `code`, `status`, `requestId`, `retry`, `responseBody`. |
| `AtribuOauthError` | RFC 6749/7009 error from `/oauth/*`. Has `code`, `description`, `status`. |
| `AtribuWebhookError` | Signature verification failed. Has `code: "missing_signature" \| "malformed_header" \| "expired_timestamp" \| "invalid_signature"`. |
| `AtribuTransportError` | Network glitch / timeout / abort. Has `cause`. |
| `AtribuConfigError` | Bad client configuration. |

The server's `X-Request-Id` is surfaced as `err.requestId` so you can grep server logs.

### Meta-classified errors (v0.3.0+)

WhatsApp + Instagram failures from the underlying Meta APIs now arrive with the right HTTP status + code instead of a flat `502 provider_error`:

| Cause | Status + code | Notes |
| --- | --- | --- |
| Token revoked / app uninstalled | `401 unauthorized` | The server flips `data_connections.status='error'` automatically when this fires mid-broadcast. User must re-OAuth. |
| Rate-limited by Meta | `429 rate_limit_exceeded` | `Retry-After` header surfaces as `err.retry.retryAfterMs`. For broadcasts, the broadcast resets to `draft` so retrying `send` after Retry-After picks up where it left off. |
| Meta App Review pending | `403 forbidden` | The capability needs Meta App Review for non-tester users. No retry. |
| Permanently rejected (e.g. recipient stopped marketing on WA — code 131050) | Recipient row only — broadcast keeps going. `whatsapp_broadcast_recipients.error_reason_code` carries the stable Meta classifier code (e.g. `"meta_131050"`) so you can dedupe permanently-failed recipients on the next broadcast create. |
| Request too complex | `400 invalid_request` | Caller must split into smaller batches. |
| Transient Meta failure | `502 provider_error` | Retry with backoff (`err.retry.action === "retry"`). |

## Retries

The SDK doesn't retry automatically — hiding retries amplifies load on a failing server and obscures backpressure. Opt in per-client:

```typescript
const atribu = new AtribuClient({ apiKey: "..." }).withRetry({
  maxAttempts: 3,             // initial + 2 retries
  backoff: "exponential",     // or "fixed" or "none"
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  jitter: 0.3,
});
```

The wrapper respects the typed `retry` hint exactly:

| Condition | Behavior |
|---|---|
| 5xx, 408, network glitch | Exponential / fixed backoff with jitter |
| 429 / 503 with `Retry-After` | Honored exactly, no jitter |
| 401 (`refresh_token`) | Not retried — refresh credentials, don't retry |
| 422 (`fix_and_retry`) | Not retried — your input is bad |
| 403 (`do_not_retry`) | Not retried — permission denied |

## Testing

```typescript
import { setupServer } from "msw/node";
import { atribuMockHandlers, eventFixtures } from "@atribu/node/test";

const server = setupServer(...atribuMockHandlers({
  // Override specific endpoints; everything else gets a realistic default.
  messages: {
    send: { status: 422, body: { error: { code: "validation_error", message: "...", status: 422 } } },
  },
}));

// Drive your webhook handler tests with realistic event shapes:
const event = eventFixtures.whatsappMessageReceived({
  data: { text: "Custom test message" },
});
```

`msw@^2.0.0` must be installed.

## OpenTelemetry / Datadog APM / Sentry

Inject your own `fetch` to trace every SDK call. No SDK change needed:

```typescript
import { trace, context, propagation } from "@opentelemetry/api";
import { AtribuClient } from "@atribu/node";

const tracer = trace.getTracer("my-app");

const tracedFetch: typeof fetch = (input, init) =>
  tracer.startActiveSpan(`atribu.${(init?.method ?? "GET").toLowerCase()}`, async (span) => {
    const headers = new Headers(init?.headers);
    propagation.inject(context.active(), headers, { set: (h, k, v) => h.set(k, v) });
    try {
      const res = await fetch(input, { ...init, headers });
      span.setAttribute("http.status_code", res.status);
      const requestId = res.headers.get("x-request-id");
      if (requestId) span.setAttribute("atribu.request_id", requestId);
      return res;
    } finally { span.end(); }
  });

const atribu = new AtribuClient({ apiKey: "...", fetch: tracedFetch });
```

The SDK's `User-Agent` and Atribu's `X-Request-Id` give you log-grep correlation out of the box.

## SDK Reference

### Messaging + cross-channel — `@atribu/node`
| Method | Description |
|---|---|
| `messages.send()` | Send a WhatsApp or Instagram message (text / template / image / video / audio / document / interactive_buttons / quick_replies) |
| `comments.reply()` | Public reply on an IG comment thread |
| `comments.privateReply()` | Send a DM to the user who left an IG comment |
| `connections.list()` | List the connections this OAuth app is authorized for |
| `connections.get()` | Fetch one connection by id |
| `connections.revoke()` | Revoke this OAuth app's authorization for a connection |
| `webhooks.subscriptions.list()` | List your webhook subscriptions |
| `webhooks.subscriptions.create()` | Create a webhook subscription (secret shown once) |
| `webhooks.subscriptions.update()` | Update URL / events / providers / status |
| `webhooks.subscriptions.delete()` | Delete a webhook subscription |
| `webhooks.subscriptions.rotateSecret()` | Rotate the HMAC secret with a grace window |
| `webhooks.subscriptions.test()` | Fire a synthetic event to test your handler |
| `webhooks.deliveries.replay()` | Re-deliver a dead webhook |
| `withRetry()` | Return a new client that retries transient errors |

### Calendar namespace — `client.calendar`
| Method | Description |
|---|---|
| `calendar.createCalendar()` | Create a dedicated Atribu booking calendar (idempotent) — needs `calendar.manage` |
| `calendar.listCalendars()` | List the booking calendars for a connection |
| `calendar.createEvent()` | Create an event on a booking calendar (`calendar_id` required) |
| `calendar.updateEvent()` | Partial-update an event (Google `events.patch`) |
| `calendar.deleteEvent()` | Cancel an event |
| `calendar.shareCalendar()` | Grant a team member `reader`/`writer` access (ACL) — needs `calendar.manage` |
| `calendar.listCalendarShares()` | List the ACL rules on a booking calendar |
| `calendar.revokeCalendarShare()` | Revoke a team member's access by rule id |

### WhatsApp namespace — `client.whatsapp`
| Method | Description |
|---|---|
| `whatsapp.templates.list()` | List every message template on the WABA (all statuses) |
| `whatsapp.templates.create()` | Submit a new template for Meta review |
| `whatsapp.templates.delete()` | Delete a template by name |
| `whatsapp.broadcasts.list()` | List up to 50 most-recent broadcasts |
| `whatsapp.broadcasts.create()` | Create a draft broadcast with recipients |
| `whatsapp.broadcasts.get()` | Get a broadcast + its recipients (max 200 returned) |
| `whatsapp.broadcasts.cancel()` | Cancel an in-flight broadcast |
| `whatsapp.broadcasts.send()` | Start sending a draft broadcast (long-running) |
| `whatsapp.media.upload()` | Pre-upload a media binary to Meta → `media_id` |
| `whatsapp.media.get()` | Resolve an inbound `media_id` → a hosted URL |

### Instagram namespace — `client.instagram`
| Method | Description |
|---|---|
| `instagram.triggers.list()` | List comment-to-DM triggers for a connection |
| `instagram.triggers.create()` | Create a new comment-to-DM trigger |
| `instagram.triggers.update()` | Partial-update a trigger |
| `instagram.triggers.delete()` | Delete a trigger |
| `instagram.triggers.testDm()` | Send the opening_message as a one-off DM to a test IGSID |
| `instagram.triggers.resumeCircuit()` | Manually clear a tripped comment-to-DM circuit |

### Webhook verification — `@atribu/node/webhooks`
| Symbol | Description |
|---|---|
| `verifyWebhook()` | Verify a signed payload — Web Crypto, rotation grace, constant-time |
| `AtribuWebhookEvent` | Discriminated union — every event shape, fully typed |

### OAuth helpers — `@atribu/node/oauth`
| Symbol | Description |
|---|---|
| `buildAuthorizeUrl()` | Construct the `/oauth/authorize` redirect URL |
| `exchangeCode()` | Trade an authorization code for an access token |
| `revokeToken()` | RFC 7009 revocation |
| `signIdTokenHint()` | Sign an `id_token_hint` JWT (HS256, requires `jose`) |
| `generateCodeVerifier()` | PKCE verifier (RFC 7636) |
| `computeCodeChallenge()` | PKCE challenge (SHA-256, base64url) |

### Next.js — `@atribu/node/next`
| Symbol | Description |
|---|---|
| `withAtribuWebhook()` | Wrap a Next.js App Router route handler in signature verification |

### Test helpers — `@atribu/node/test`
| Symbol | Description |
|---|---|
| `atribuMockHandlers()` | MSW v2 handlers for every endpoint (with overrides) |
| `eventFixtures` | Pre-canned event shapes — deep-merge any field |
| `responseFixtures` | Pre-canned API response envelopes |

## Runtime Support

| Runtime | Supported |
|---|---|
| Node 18+ | ✅ |
| Bun | ✅ |
| Deno | ✅ — `npm:@atribu/node` |
| Vercel Edge | ✅ |
| Cloudflare Workers | ✅ |
| Browser | ❌ by design — API keys don't belong in client JS |

Uses Web Crypto throughout — no `node:crypto` imports.

## Requirements

- Node.js 18+ (or any WinterCG-compatible runtime)
- An [Atribu API key](https://www.atribu.app)

## Links

- [Documentation](https://www.atribu.app/docs)
- [Dashboard](https://www.atribu.app/login)
- [Changelog](./CHANGELOG.md)

## License

MIT

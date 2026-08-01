import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type SendBody = NonNullable<
  paths["/api/v1/messages"]["post"]["requestBody"]
>["content"]["application/json"];

type SendResponse =
  paths["/api/v1/messages"]["post"]["responses"][200]["content"]["application/json"];

type TypingBody = NonNullable<
  paths["/api/v1/messages/typing"]["post"]["requestBody"]
>["content"]["application/json"];

type TypingResponse =
  paths["/api/v1/messages/typing"]["post"]["responses"][200]["content"]["application/json"];

export type MessageSendInput = SendBody;
export type MessageContent = SendBody["content"];
export type MessageSendResponse = SendResponse["data"];

export type MessageTypingInput = TypingBody;
export type MessageTypingResponse = TypingResponse["data"];

export interface SendOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface TypingOptions {
  /**
   * Deadline in ms. By default this call waits *at most* 5000ms — and less if
   * the client's own `timeoutMs` is tighter. Setting this is an explicit
   * override that wins outright, so `{ timeoutMs: 8000 }` really does wait 8s.
   *
   * There is deliberately no `maxRetries` here — see `typing()`.
   */
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Not caller-overridable, unlike every other transport default in this SDK.
 *
 * The server's contract is one upstream call, full stop — and an SDK retry is
 * not a repeat of the same call, it is a NEW Graph call that fires another read
 * receipt and re-arms the ~25s bubble. Let one fire after the agent's reply has
 * gone out and the customer watches a thread animate for a message that landed
 * a minute ago. The server's own tests pin "a late bubble is worse than none",
 * so this SDK does not ship a knob whose only effect is to violate that.
 *
 * The generic `RequestOptions.maxRetries` stays public for resources where
 * retrying means what it usually means.
 */
const TYPING_MAX_RETRIES = 0;

/**
 * A CEILING, not a default — passed as `maxTimeoutMs`, so it can only lower the
 * client's budget, never raise it. A consumer running a 300ms client-wide
 * timeout gets 300ms here, not 5000ms: the SDK must never widen a limit its
 * user deliberately set.
 *
 * 5s is one second outside the server's own 4s upstream budget: long enough
 * that a healthy call always completes inside it, short enough that a wedged
 * one never outlives the indicator it was trying to show.
 */
const TYPING_TIMEOUT_MS = 5_000;

export class MessagesResource {
  constructor(private readonly http: HttpClientLike) {}

  async send(input: MessageSendInput, opts: SendOptions = {}): Promise<MessageSendResponse> {
    const res = await this.http.request<SendResponse>({
      method: "POST",
      path: "/api/v1/messages",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Show a WhatsApp "typing…" bubble and mark the customer's message read, so
   * an agent that takes tens of seconds to compose a reply produces the signals
   * a human would.
   *
   * `message_id` is the **inbound** wamid — the customer's message, not one of
   * yours. Meta derives the recipient from it. There is no "typing off" call:
   * the indicator expires on its own after ~25 seconds and is dismissed the
   * moment you send on that thread.
   *
   * The read receipt is not optional. Meta exposes the indicator as a field on
   * the read receipt, so showing one always marks the message read.
   *
   * **Best-effort by contract.** This call never retries — not configurably,
   * because a "retry" here is a second Graph call that re-arms the bubble after
   * your reply already went out. Its deadline is capped at 5000ms, or your
   * client's `timeoutMs` if that is tighter; pass `opts.timeoutMs` to choose a
   * different one outright. See the constants above.
   *
   * An auto-generated `Idempotency-Key` rides along, as on every mutating POST
   * in this SDK. The route ignores it — a repeated read receipt is already a
   * no-op at Meta — and it is deliberately not caller-controllable here, since
   * there is no replay for it to deduplicate.
   *
   * **Reading the response.** A `200` is not a promise the bubble appeared:
   *   - `forwarded: true` — the read receipt + indicator reached Meta.
   *   - `forwarded: false` with `reason: "stale_message_id"` — Meta refused the
   *     wamid (older than ~24h, already read, or the number was re-registered).
   *   - `forwarded: false` with `reason: "message_id_conversation_mismatch"` —
   *     the wamid belongs to a different conversation than `to`, so nothing was
   *     sent. Forwarding it would have blue-ticked and animated a thread you did
   *     not mean to touch.
   *
   * None of those is a fault with a remedy, which is why they are 200s. Non-2xx
   * stays reserved for things somebody can act on: 400 malformed body or a
   * channel other than `whatsapp`, 401 dead token, 402 no Meta payment method,
   * 403 missing scope or an unknown/unauthorized `connection_id`, 409 connection
   * not ready, 422 permanent Meta rejection, 429 rate limit (its own bucket —
   * it cannot consume the send route's allowance), 502 upstream failure.
   *
   * **This route never answers 404.** That is a deliberate guarantee: an unknown
   * or wrong-profile `connection_id` answers 403 precisely so that a 404 keeps
   * one meaning. So a `404` (or `405`/`501`) here means the endpoint predates
   * the Atribu deployment you are talking to — treat it as "typing is not
   * deployed on this bridge", latch the feature off, and carry on. It is never
   * a bad `connection_id`.
   *
   * WhatsApp only today. `to` is required even though WhatsApp does not need it,
   * because it is what catches a mismatched `message_id` and what the intended
   * Instagram/Messenger extension of this endpoint will key on.
   *
   * @example
   *   const res = await atribu.messages.typing({
   *     connection_id: conn.id,
   *     channel: "whatsapp",
   *     to: "56912345678",
   *     message_id: inbound.provider_message_id,
   *   });
   *   if (!res.forwarded) log.debug({ reason: res.reason }, "typing no-op");
   */
  async typing(
    input: MessageTypingInput,
    opts: TypingOptions = {},
  ): Promise<MessageTypingResponse> {
    const res = await this.http.request<TypingResponse>({
      method: "POST",
      path: "/api/v1/messages/typing",
      body: input,
      maxRetries: TYPING_MAX_RETRIES,
      // The ceiling is passed ALWAYS, not only when the caller stayed quiet.
      // `resolveTimeout` prefers a usable `timeoutMs` over it, so an explicit
      // caller deadline still wins — but an unusable one (0, NaN) falls back to
      // the ceiling rather than skipping past it to the client's much looser
      // budget, which is the failure mode this ordering exists to prevent.
      maxTimeoutMs: TYPING_TIMEOUT_MS,
      timeoutMs: opts.timeoutMs,
      signal: opts.signal,
    });
    return res.data;
  }
}

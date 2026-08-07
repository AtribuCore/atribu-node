import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type ListResponse =
  paths["/api/v1/instagram/conversations"]["get"]["responses"][200]["content"]["application/json"];
type MessagesResponse =
  paths["/api/v1/instagram/conversations/{conversation_id}/messages"]["get"]["responses"][200]["content"]["application/json"];

export type InstagramConversation = ListResponse["data"][number];
export type InstagramConversationParticipant = InstagramConversation["participants"][number];
export type InstagramConversationMessage = MessagesResponse["data"][number];
export type InstagramMessageParty = NonNullable<InstagramConversationMessage["from"]>;
export type InstagramMessageAttachment = NonNullable<
  InstagramConversationMessage["attachments"]
>[number];

export interface InstagramConversationPage {
  conversations: InstagramConversation[];
  /** Pass back as `after` to fetch the next page; null when there is none. */
  nextCursor: string | null;
  hasNext: boolean;
}

export interface InstagramConversationMessagePage {
  messages: InstagramConversationMessage[];
  nextCursor: string | null;
  hasNext: boolean;
}

export interface InstagramConversationListOptions {
  /** The Instagram `data_connection` to read. */
  connectionId: string;
  /**
   * IGSID — narrows the response to the single conversation with that person,
   * instead of paging the whole inbox.
   */
  userId?: string;
  /** Meta page size (1–100). Defaults to 25 server-side. */
  limit?: number;
  /** Cursor from a previous page's `nextCursor`. */
  after?: string;
  signal?: AbortSignal;
}

export interface InstagramConversationMessagesOptions {
  connectionId: string;
  limit?: number;
  after?: string;
  signal?: AbortSignal;
}

/**
 * Instagram conversations — the inbox read, mounted on
 * `AtribuClient.instagram.conversations`.
 *
 * Every method proxies Meta live; Atribu holds no mirror of a customer's DMs,
 * so what comes back is the inbox as it is right now.
 *
 * ## What Meta will and will not give you
 *
 * Two server-side limits shape any history backfill, and neither can be worked
 * around from this side:
 *
 *  - **Only the 20 most recent messages of a thread carry content.** Older
 *    messages still enumerate, but Meta withholds the body — they arrive with
 *    `message: null` and null `from` / `to` / `attachments`, carrying just `id`
 *    and `created_time`. They are passed through exactly as Meta returned them;
 *    the SDK does not substitute a placeholder, so `message === null` is a
 *    reliable signal that the body is unavailable rather than empty.
 *  - **Requests-folder threads with no activity for 30+ days are not returned
 *    at all.** They are absent from `list()`, not truncated. There is no folder
 *    parameter and no way to recover them once they have aged out — run a
 *    backfill sooner rather than later.
 *
 * `updated_time` is a last-activity stamp; Meta exposes no conversation-creation
 * time, so it cannot tell you how far back a thread goes.
 *
 * @example Back-fill the inbox
 *   let after: string | undefined;
 *   do {
 *     const page = await client.instagram.conversations.list({
 *       connectionId: connId,
 *       after,
 *     });
 *     for (const convo of page.conversations) {
 *       const thread = await client.instagram.conversations.messages(convo.id, {
 *         connectionId: connId,
 *       });
 *       const readable = thread.messages.filter((m) => m.message !== null);
 *       const truncated = thread.messages.length - readable.length;
 *       // ...persist; `truncated` is how many bodies Meta withheld.
 *     }
 *     after = page.nextCursor ?? undefined;
 *   } while (after);
 *
 * @example One known contact
 *   const { conversations } = await client.instagram.conversations.list({
 *     connectionId: connId,
 *     userId: igsid,
 *   });
 */
export class InstagramConversationsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * One page of the account's conversations. Pass `userId` to get just the
   * thread with that IGSID.
   */
  async list(
    opts: InstagramConversationListOptions,
  ): Promise<InstagramConversationPage> {
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: "/api/v1/instagram/conversations",
      query: {
        connection_id: opts.connectionId,
        ...(opts.userId !== undefined ? { user_id: opts.userId } : {}),
        ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
        ...(opts.after !== undefined ? { after: opts.after } : {}),
      },
      signal: opts.signal,
    });
    return {
      conversations: res.data,
      nextCursor: res.pagination?.cursor ?? null,
      hasNext: res.pagination?.has_next ?? false,
    };
  }

  /**
   * One page of a thread's messages, newest first, with the content fields
   * already expanded — a whole-inbox backfill is roughly one call per
   * conversation, not one per message.
   *
   * Messages beyond the newest 20 come back with `message: null`; see the class
   * docs. A conversation id Meta cannot resolve throws `AtribuApiError` with
   * status 422 and the Meta code in the message.
   */
  async messages(
    conversationId: string,
    opts: InstagramConversationMessagesOptions,
  ): Promise<InstagramConversationMessagePage> {
    const res = await this.http.request<MessagesResponse>({
      method: "GET",
      path: `/api/v1/instagram/conversations/${encodeURIComponent(conversationId)}/messages`,
      query: {
        connection_id: opts.connectionId,
        ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
        ...(opts.after !== undefined ? { after: opts.after } : {}),
      },
      signal: opts.signal,
    });
    return {
      messages: res.data,
      nextCursor: res.pagination?.cursor ?? null,
      hasNext: res.pagination?.has_next ?? false,
    };
  }
}

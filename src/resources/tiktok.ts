import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type ListResponse =
  paths["/api/v1/tiktok/conversations"]["get"]["responses"][200]["content"]["application/json"];
type MessagesResponse =
  paths["/api/v1/tiktok/conversations/{conversation_id}/messages"]["get"]["responses"][200]["content"]["application/json"];

export type TikTokConversation = ListResponse["data"][number];
export type TikTokConversationMessage = MessagesResponse["data"][number];
export type TikTokParticipant = MessagesResponse["participants"][number];
export type TikTokReplyWindow = MessagesResponse["reply_window"];

export interface TikTokConversationPage {
  conversations: TikTokConversation[];
  /** Pass back as `cursor` to fetch the next page; null when there is none. */
  nextCursor: number | null;
  hasNext: boolean;
}

export interface TikTokConversationListOptions {
  /** The `tiktok_messaging` `data_connection` to read. */
  connectionId: string;
  /**
   * TikTok's conversation type: `single` (default) — conversations the
   * business has answered; `stranger` — message requests it has not.
   */
  type?: "single" | "stranger";
  /** 1–100. TikTok's default is 100. */
  limit?: number;
  /** From a previous page's `nextCursor`. */
  cursor?: number;
  signal?: AbortSignal;
}

export interface TikTokConversationMessagesResult {
  /** The 20 most recent messages — TikTok returns no more, and no cursor. */
  messages: TikTokConversationMessage[];
  participants: TikTokParticipant[];
  /** Whether `messages.send({ channel: "tiktok_messaging" })` would be accepted now. */
  replyWindow: TikTokReplyWindow;
}

/**
 * TikTok Business Messaging conversation reads — mounted on
 * `AtribuClient.tiktok.conversations`. Sending stays on
 * `AtribuClient.messages.send({ channel: "tiktok_messaging", to: conversationId, … })`,
 * and inbound messages arrive on the `message.received` webhook with provider
 * `tiktok_messaging`.
 *
 * Every call proxies TikTok live; Atribu keeps no TikTok transcript. TikTok's
 * own limits apply: conversations from the past 90 days only, the 20 most
 * recent messages per conversation.
 */
export class TikTokConversationsResource {
  constructor(private readonly http: HttpClientLike) {}

  async list(opts: TikTokConversationListOptions): Promise<TikTokConversationPage> {
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: "/api/v1/tiktok/conversations",
      query: {
        connection_id: opts.connectionId,
        ...(opts.type !== undefined ? { type: opts.type } : {}),
        ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
        ...(opts.cursor !== undefined ? { cursor: opts.cursor } : {}),
      },
      signal: opts.signal,
    });
    const cursor = res.pagination?.cursor;
    return {
      conversations: res.data,
      nextCursor: cursor !== undefined && cursor !== null && cursor !== "" ? Number(cursor) : null,
      hasNext: res.pagination?.has_next ?? false,
    };
  }

  async messages(
    conversationId: string,
    opts: { connectionId: string; signal?: AbortSignal },
  ): Promise<TikTokConversationMessagesResult> {
    const res = await this.http.request<MessagesResponse>({
      method: "GET",
      path: `/api/v1/tiktok/conversations/${encodeURIComponent(conversationId)}/messages`,
      query: { connection_id: opts.connectionId },
      signal: opts.signal,
    });
    return { messages: res.data, participants: res.participants, replyWindow: res.reply_window };
  }
}

/** TikTok-specific namespace. Mounted on `AtribuClient.tiktok`. */
export class TikTokNamespace {
  readonly conversations: TikTokConversationsResource;

  constructor(http: HttpClientLike) {
    this.conversations = new TikTokConversationsResource(http);
  }
}

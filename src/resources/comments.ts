import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type ReplyBody = NonNullable<
  paths["/api/v1/comments/{comment_id}/reply"]["post"]["requestBody"]
>["content"]["application/json"];

type PrivateReplyBody = NonNullable<
  paths["/api/v1/comments/{comment_id}/private-reply"]["post"]["requestBody"]
>["content"]["application/json"];

type ReplyResponse =
  paths["/api/v1/comments/{comment_id}/reply"]["post"]["responses"][200]["content"]["application/json"];

export type CommentReplyInput = ReplyBody & { comment_id: string };
export type CommentPrivateReplyInput = PrivateReplyBody & { comment_id: string };
export type CommentReplyResponse = ReplyResponse["data"];

export interface CommentReplyOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class CommentsResource {
  constructor(private readonly http: HttpClientLike) {}

  async reply(
    input: CommentReplyInput,
    opts: CommentReplyOptions = {},
  ): Promise<CommentReplyResponse> {
    const { comment_id, ...body } = input;
    const res = await this.http.request<ReplyResponse>({
      method: "POST",
      path: `/api/v1/comments/${encodeURIComponent(comment_id)}/reply`,
      body,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  async privateReply(
    input: CommentPrivateReplyInput,
    opts: CommentReplyOptions = {},
  ): Promise<CommentReplyResponse> {
    const { comment_id, ...body } = input;
    const res = await this.http.request<ReplyResponse>({
      method: "POST",
      path: `/api/v1/comments/${encodeURIComponent(comment_id)}/private-reply`,
      body,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

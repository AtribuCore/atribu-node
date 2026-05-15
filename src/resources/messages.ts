import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type SendBody = NonNullable<
  paths["/api/v1/messages"]["post"]["requestBody"]
>["content"]["application/json"];

type SendResponse =
  paths["/api/v1/messages"]["post"]["responses"][200]["content"]["application/json"];

export type MessageSendInput = SendBody;
export type MessageContent = SendBody["content"];
export type MessageSendResponse = SendResponse["data"];

export interface SendOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

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
}

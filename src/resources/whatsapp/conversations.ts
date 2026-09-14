import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type MessagesResponse =
  paths["/api/v1/whatsapp/conversations/{id}/messages"]["get"]["responses"][200]["content"]["application/json"];

export type WhatsAppConversationMessage = MessagesResponse["data"][number];
/**
 * The whole envelope, unwrapped — like the analytics-area resources
 * (`./common.ts`'s header), because `pagination.has_next` is how a caller
 * decides whether to page again. This route paginates with `before` rather
 * than an opaque cursor: `pagination.cursor` is never populated here, so page
 * again with `before` set to the oldest returned `message_timestamp`.
 */
export type WhatsAppConversationMessagesPage = MessagesResponse;

export interface ListMessagesOptions {
  /** An ISO timestamp; returns messages strictly older than it. */
  before?: string;
  /** 1-100. Defaults to 50. */
  limit?: number;
  signal?: AbortSignal;
}

type SendResponse =
  paths["/api/v1/whatsapp/conversations/{id}/messages"]["post"]["responses"][201]["content"]["application/json"];
type SendInteractiveBody = NonNullable<
  paths["/api/v1/whatsapp/conversations/{id}/messages/interactive"]["post"]["requestBody"]
>["content"]["application/json"];
type SendInteractiveResponse =
  paths["/api/v1/whatsapp/conversations/{id}/messages/interactive"]["post"]["responses"][201]["content"]["application/json"];
type SendTemplateBody = NonNullable<
  paths["/api/v1/whatsapp/conversations/{id}/messages/template"]["post"]["requestBody"]
>["content"]["application/json"];
type SendTemplateResponse =
  paths["/api/v1/whatsapp/conversations/{id}/messages/template"]["post"]["responses"][201]["content"]["application/json"];

export interface SendMessageOptions {
  /** Sent as the message text, or the media caption when `file` is present. */
  text?: string;
  /**
   * A `Blob`/`File` (browser, Bun, Deno, Node 18+) or raw bytes
   * (`ArrayBuffer`/`Uint8Array`/`Buffer`). Message type (image/video/audio/
   * document) is inferred from its content type — set `contentType` when
   * passing raw bytes or a typeless Blob.
   */
  file?: Blob | ArrayBuffer | ArrayBufferView;
  contentType?: string;
  filename?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export type SendInteractiveInput = SendInteractiveBody;

export interface SendTemplateOptions {
  templateName: string;
  languageCode: string;
  components: unknown[];
  idempotencyKey?: string;
  signal?: AbortSignal;
}

function toBlob(file: Blob | ArrayBuffer | ArrayBufferView, contentType?: string): Blob {
  if (typeof Blob !== "undefined" && file instanceof Blob) {
    return contentType && !file.type ? file.slice(0, file.size, contentType) : file;
  }
  return new Blob([file as BlobPart], { type: contentType ?? "application/octet-stream" });
}

export class WhatsAppConversationsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Newest-first page of messages in one WhatsApp conversation. */
  async listMessages(
    conversationId: string,
    opts: ListMessagesOptions = {},
  ): Promise<WhatsAppConversationMessagesPage> {
    const params = new URLSearchParams();
    if (opts.before) params.set("before", opts.before);
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    const query = params.toString();
    return this.http.request<MessagesResponse>({
      method: "GET",
      path: `/api/v1/whatsapp/conversations/${encodeURIComponent(conversationId)}/messages${query ? `?${query}` : ""}`,
      signal: opts.signal,
    });
  }

  /**
   * Send a text and/or media message. Refuses (`whatsapp_service_window_expired`,
   * 422) once the conversation's 24h customer-service window has closed — use
   * `sendTemplate` to re-engage instead. At least one of `text`/`file` is
   * required.
   */
  async sendMessage(
    conversationId: string,
    opts: SendMessageOptions = {},
  ): Promise<WhatsAppConversationMessage> {
    const form = new FormData();
    if (opts.text) form.append("text", opts.text);
    if (opts.file) {
      form.append("file", toBlob(opts.file, opts.contentType), opts.filename ?? "upload.bin");
    }
    const res = await this.http.request<SendResponse>({
      method: "POST",
      path: `/api/v1/whatsapp/conversations/${encodeURIComponent(conversationId)}/messages`,
      multipart: form,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Send an interactive reply-button message (max 3 buttons). Inside the 24h window, same as `sendMessage`. */
  async sendInteractive(
    conversationId: string,
    input: SendInteractiveInput,
    opts: { idempotencyKey?: string; signal?: AbortSignal } = {},
  ): Promise<WhatsAppConversationMessage> {
    const res = await this.http.request<SendInteractiveResponse>({
      method: "POST",
      path: `/api/v1/whatsapp/conversations/${encodeURIComponent(conversationId)}/messages/interactive`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Send a template message — the out-of-window re-engagement path. `templateName` must already be `APPROVED`. */
  async sendTemplate(
    conversationId: string,
    opts: SendTemplateOptions,
  ): Promise<WhatsAppConversationMessage> {
    const body: SendTemplateBody = {
      template_name: opts.templateName,
      language_code: opts.languageCode,
      components: opts.components as SendTemplateBody["components"],
    };
    const res = await this.http.request<SendTemplateResponse>({
      method: "POST",
      path: `/api/v1/whatsapp/conversations/${encodeURIComponent(conversationId)}/messages/template`,
      body,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

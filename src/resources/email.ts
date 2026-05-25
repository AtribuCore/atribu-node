import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type SearchBody = NonNullable<
  paths["/api/v1/email/search"]["post"]["requestBody"]
>["content"]["application/json"];
type SearchResponse =
  paths["/api/v1/email/search"]["post"]["responses"][200]["content"]["application/json"];

type GetThreadResponse =
  paths["/api/v1/email/threads/{id}"]["get"]["responses"][200]["content"]["application/json"];

type DraftBody = NonNullable<
  paths["/api/v1/email/drafts"]["post"]["requestBody"]
>["content"]["application/json"];
type DraftResponse =
  paths["/api/v1/email/drafts"]["post"]["responses"][200]["content"]["application/json"];

type LabelsBody = NonNullable<
  paths["/api/v1/email/threads/{id}/labels"]["post"]["requestBody"]
>["content"]["application/json"];
type LabelsResponse =
  paths["/api/v1/email/threads/{id}/labels"]["post"]["responses"][200]["content"]["application/json"];

type ListLabelsResponse =
  paths["/api/v1/email/labels"]["get"]["responses"][200]["content"]["application/json"];

export type EmailSearchInput = SearchBody;
export type EmailSearchResult = SearchResponse["data"];
export type EmailThread = GetThreadResponse["data"];
export type EmailThreadMessage = EmailThread["messages"][number];
export type EmailDraftInput = DraftBody;
export type EmailDraftResult = DraftResponse["data"];
export type EmailModifyLabelsInput = LabelsBody;
export type EmailModifyLabelsResult = LabelsResponse["data"];
export type EmailLabelsResult = ListLabelsResponse["data"];
export type EmailLabel = EmailLabelsResult["labels"][number];

export interface EmailMutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface EmailReadOptions {
  connectionId: string;
  signal?: AbortSignal;
}

/**
 * Email management surface (Gmail / Outlook) — backs an agent's search /
 * draft-reply / label tools. Conversational send stays on `client.messages.send`
 * with `channel: 'email'`. Requires the `email` scope on the API key.
 */
export class EmailResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Search threads in a connected mailbox (Gmail search syntax / Outlook KQL). */
  async search(input: EmailSearchInput, opts: EmailMutationOptions = {}): Promise<EmailSearchResult> {
    const res = await this.http.request<SearchResponse>({
      method: "POST",
      path: "/api/v1/email/search",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Fetch a normalized thread (oldest-first). `id` = Gmail threadId / Outlook conversationId. */
  async getThread(id: string, opts: EmailReadOptions): Promise<EmailThread> {
    const res = await this.http.request<GetThreadResponse>({
      method: "GET",
      path: `/api/v1/email/threads/${encodeURIComponent(id)}?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Create a draft (reply when threaded, else a new draft). Provide text and/or html. */
  async createDraft(input: EmailDraftInput, opts: EmailMutationOptions = {}): Promise<EmailDraftResult> {
    const res = await this.http.request<DraftResponse>({
      method: "POST",
      path: "/api/v1/email/drafts",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Add/remove labels on a thread (names; resolved → ids server-side). Gmail only today. */
  async modifyLabels(
    id: string,
    input: EmailModifyLabelsInput,
    opts: EmailMutationOptions = {},
  ): Promise<EmailModifyLabelsResult> {
    const res = await this.http.request<LabelsResponse>({
      method: "POST",
      path: `/api/v1/email/threads/${encodeURIComponent(id)}/labels`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** List the mailbox's labels (Gmail) / master categories (Outlook). */
  async listLabels(opts: EmailReadOptions): Promise<EmailLabelsResult> {
    const res = await this.http.request<ListLabelsResponse>({
      method: "GET",
      path: `/api/v1/email/labels?connection_id=${encodeURIComponent(opts.connectionId)}`,
      signal: opts.signal,
    });
    return res.data;
  }
}

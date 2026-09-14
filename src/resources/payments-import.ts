import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type ParseResponse =
  paths["/api/v1/profile/payments/import/parse"]["post"]["responses"][200]["content"]["application/json"];
export type PaymentsImportParseResult = ParseResponse["data"];
export type PaymentsImportProvider = PaymentsImportParseResult["provider"];

type CommitResponse =
  paths["/api/v1/profile/payments/import/commit"]["post"]["responses"][200]["content"]["application/json"];
export type PaymentsImportCommitResult = CommitResponse["data"];
type CommitBody = NonNullable<
  paths["/api/v1/profile/payments/import/commit"]["post"]["requestBody"]
>["content"]["application/json"];

type TemplateResponse =
  paths["/api/v1/profile/payments/import/template"]["get"]["responses"][200]["content"]["application/json"];
export type PaymentsImportTemplate = TemplateResponse["data"];

type ListResponse =
  paths["/api/v1/profile/payments/imports"]["get"]["responses"][200]["content"]["application/json"];
export type PaymentsImportListItem = ListResponse["data"]["items"][number];

type UndoResponse =
  paths["/api/v1/profile/payments/imports/{importId}/undo"]["post"]["responses"][200]["content"]["application/json"];
export type PaymentsImportUndoResult = UndoResponse["data"];

export interface PaymentsImportCommitInput {
  import_id: string;
  mapping?: CommitBody["mapping"];
  save_mapping?: boolean;
}

/**
 * The payments importers — Transbank Webpay bank statements (#489) and,
 * since #1330, a generic offline-sales sheet (`provider: "offline_sales"`) —
 * one route family, `provider` selects between them (defaults to
 * `transbank_webpay`). Mounted on `AtribuClient.payments.import`
 * (parse/commit/template) and `AtribuClient.payments.imports` (list/undo) —
 * nesting matches the API's own `/payments/import/*` vs `/payments/imports`
 * split.
 */
export class PaymentsImportResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Upload a statement or sales sheet and get back a parsed preview.
   * `provider` defaults to `transbank_webpay`; offline sales accepts CSV/XLSX
   * only (no PDF). */
  async parse(
    file: Blob,
    opts: { provider?: PaymentsImportProvider; signal?: AbortSignal } = {},
  ): Promise<PaymentsImportParseResult> {
    const form = new FormData();
    form.append("file", file);
    if (opts.provider) form.append("provider", opts.provider);
    const res = await this.http.request<ParseResponse>({
      method: "POST",
      path: "/api/v1/profile/payments/import/parse",
      multipart: form,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Commit a previously-parsed import (`import_id` from `.parse()`). */
  async commit(
    input: PaymentsImportCommitInput,
    opts: { signal?: AbortSignal } = {},
  ): Promise<PaymentsImportCommitResult> {
    const res = await this.http.request<CommitResponse>({
      method: "POST",
      path: "/api/v1/profile/payments/import/commit",
      body: input,
      signal: opts.signal,
    });
    return res.data;
  }

  /** An importer's CSV template — `csv` is the whole file as text.
   * `provider` defaults to `transbank_webpay`. */
  async template(
    opts: { provider?: PaymentsImportProvider; signal?: AbortSignal } = {},
  ): Promise<PaymentsImportTemplate> {
    const res = await this.http.request<TemplateResponse>({
      method: "GET",
      path: "/api/v1/profile/payments/import/template",
      query: opts.provider ? { provider: opts.provider } : undefined,
      signal: opts.signal,
    });
    return res.data;
  }
}

export class PaymentsImportsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Past imports for this profile, most recent first. Pass `provider` to
   * see only one importer's history — always pass it when rendering a
   * per-provider card, since an unfiltered list mixes both providers. */
  async list(
    opts: {
      limit?: number;
      provider?: PaymentsImportProvider;
      signal?: AbortSignal;
    } = {},
  ): Promise<PaymentsImportListItem[]> {
    const query: Record<string, string | number> = {};
    if (opts.limit !== undefined) query.limit = opts.limit;
    if (opts.provider) query.provider = opts.provider;
    const res = await this.http.request<ListResponse>({
      method: "GET",
      path: "/api/v1/profile/payments/imports",
      query: Object.keys(query).length > 0 ? query : undefined,
      signal: opts.signal,
    });
    return res.data.items;
  }

  /** Undo a `completed` import — deletes the outcome_events it wrote. */
  async undo(
    importId: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<PaymentsImportUndoResult> {
    const res = await this.http.request<UndoResponse>({
      method: "POST",
      path: `/api/v1/profile/payments/imports/${encodeURIComponent(importId)}/undo`,
      signal: opts.signal,
    });
    return res.data;
  }
}

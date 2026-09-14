/**
 * Channel classification rules (#647).
 *
 * How a profile's traffic becomes a CHANNEL — the ladder of rules, the
 * vocabulary they resolve into, and the two dry-runs that let a rule be
 * evaluated before it is saved.
 *
 * **The four READS are `analytics:read`.** Two of them are POSTs because they
 * take a CANDIDATE — an unsaved condition tree or an unsaved ladder — which is
 * a document, not a filter, and does not fit a query string.
 *
 * **The five WRITES are `goals:write`** (#675). Each one saves, records who
 * saved it, and queues a full-profile REPLAY that re-labels the profile's
 * existing sessions — so `replay_queued: false` on a response means the change
 * is saved but the numbers you are looking at still reflect the old ladder.
 * Read that field; do not assume it.
 *
 * Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras, WriteExtras } from "./common";

export type ChannelRulesResponse =
  paths["/api/v1/channel-rules"]["get"]["responses"][200]["content"]["application/json"];

type ChannelRuleSuggestionsQuery = NonNullable<
  paths["/api/v1/channel-rules/suggestions"]["get"]["parameters"]["query"]
>;
export type ChannelRuleSuggestionsResponse =
  paths["/api/v1/channel-rules/suggestions"]["get"]["responses"][200]["content"]["application/json"];
export type ChannelRuleSuggestionsOptions = ChannelRuleSuggestionsQuery & ReadExtras;

export type ChannelRuleMatchCountBody = NonNullable<
  paths["/api/v1/channel-rules/match-count"]["post"]["requestBody"]
>["content"]["application/json"];
export type ChannelRuleMatchCountResponse =
  paths["/api/v1/channel-rules/match-count"]["post"]["responses"][200]["content"]["application/json"];

export type ChannelRuleDiffBody = NonNullable<
  paths["/api/v1/channel-rules/diff"]["post"]["requestBody"]
>["content"]["application/json"];
export type ChannelRuleDiffResponse =
  paths["/api/v1/channel-rules/diff"]["post"]["responses"][200]["content"]["application/json"];

export type ChannelRuleCreateInput = NonNullable<
  paths["/api/v1/channel-rules"]["post"]["requestBody"]
>["content"]["application/json"];
export type ChannelRuleUpdateInput = NonNullable<
  paths["/api/v1/channel-rules/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];
export type ChannelRuleWriteResponse =
  paths["/api/v1/channel-rules"]["post"]["responses"][200]["content"]["application/json"];
export type ChannelRuleDeleteResponse =
  paths["/api/v1/channel-rules/{id}"]["delete"]["responses"][200]["content"]["application/json"];

export type ChannelRuleReorderInput = NonNullable<
  paths["/api/v1/channel-rules/reorder"]["post"]["requestBody"]
>["content"]["application/json"];
export type ChannelRuleReorderResponse =
  paths["/api/v1/channel-rules/reorder"]["post"]["responses"][200]["content"]["application/json"];

export type ChannelTaxonomyCreateInput = NonNullable<
  paths["/api/v1/channel-taxonomy"]["post"]["requestBody"]
>["content"]["application/json"];
export type ChannelTaxonomyCreateResponse =
  paths["/api/v1/channel-taxonomy"]["post"]["responses"][200]["content"]["application/json"];

/** `?days=` on the two candidate dry-runs. */
export interface ChannelRuleWindowOptions extends ReadExtras {
  days?: string;
}

export class ChannelRulesResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * The rules in EVALUATION order (priority ascending, first match wins) and
   * the channel taxonomy they resolve into.
   *
   * Both in one response because a rule cannot be read without the taxonomy:
   * `output_channel` is always one of its `channel_name` values.
   *
   * **Two matchers coexist on a rule.** `conditions` is the structured form;
   * the flat `source_pattern` / `medium_pattern` / … columns are the older one
   * that live rows still carry. Render whichever the row has — treating a null
   * `conditions` as "empty rule" hides every legacy rule on the profile.
   */
  async list(options: ReadExtras = {}): Promise<ChannelRulesResponse> {
    return this.http.request<ChannelRulesResponse>({
      method: "GET",
      path: "/api/v1/channel-rules",
      signal: options.signal,
    });
  }

  /**
   * Clusters of currently-unclassified traffic, each with a condition set that
   * would classify it.
   *
   * `sessions` is the size of the cluster and the reason to act.
   * `suggested_channel` is a name heuristic — a pre-filled form field, not a
   * classification.
   *
   * Backed by the 30-day Ephemeral Buffer: `days` is clamped in the database,
   * so read `window_days` on the response rather than assuming what you sent.
   */
  async suggestions(
    options: ChannelRuleSuggestionsOptions = {},
  ): Promise<ChannelRuleSuggestionsResponse> {
    const { signal, ...query } = options;
    return this.http.request<ChannelRuleSuggestionsResponse>({
      method: "GET",
      path: "/api/v1/channel-rules/suggestions",
      query,
      signal,
    });
  }

  /**
   * How many sessions ONE candidate condition set would catch.
   *
   * `total` is every session in the window, not only unclassified ones, so
   * `matches / total` is the share of ALL traffic the rule touches — which is
   * what makes an over-broad rule visible before it is saved.
   */
  async matchCount(
    body: ChannelRuleMatchCountBody,
    options: ChannelRuleWindowOptions = {},
  ): Promise<ChannelRuleMatchCountResponse> {
    const { signal, ...query } = options;
    return this.http.request<ChannelRuleMatchCountResponse>({
      method: "POST",
      path: "/api/v1/channel-rules/match-count",
      query,
      body,
      signal,
    });
  }

  /**
   * What a whole candidate LADDER would re-label.
   *
   * Send the full ladder, not just the rule being edited — this projects a rule
   * SET, so omitting the untouched rules projects a profile that has none.
   *
   * **`changed` + `unmatched` do not sum to `total`.** A session matching a rule
   * that resolves to the channel it already has is neither; "already correct"
   * is the third outcome and usually the largest. Do not present the remainder
   * as an error.
   */
  async diff(
    body: ChannelRuleDiffBody,
    options: ChannelRuleWindowOptions = {},
  ): Promise<ChannelRuleDiffResponse> {
    const { signal, ...query } = options;
    return this.http.request<ChannelRuleDiffResponse>({
      method: "POST",
      path: "/api/v1/channel-rules/diff",
      query,
      body,
      signal,
    });
  }

  /**
   * Add a rule to the ladder (#675).
   *
   * `output_channel` must already exist in the taxonomy — {@link list} returns
   * it, {@link createChannel} adds to it. A rule pointing at a channel nothing
   * knows about would label traffic with a name no report can render.
   *
   * **This re-labels the PAST.** One full-profile replay is queued, which
   * re-enriches every raw event the profile has; existing periods change. Run
   * {@link diff} first and pass its counts back as `diff_summary` so the change
   * log records what you believed you were doing.
   */
  async create(
    input: ChannelRuleCreateInput,
    options: WriteExtras = {},
  ): Promise<ChannelRuleWriteResponse> {
    return this.http.request<ChannelRuleWriteResponse>({
      method: "POST",
      path: "/api/v1/channel-rules",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Edit one rule (#675). PARTIAL: send only what changed.
   *
   * An omitted key is left alone; an explicit `null` blanks the column. Sending
   * `conditions: null` clears the structured matcher and falls back to the flat
   * `*_pattern` columns — which is not the same as sending an empty `all_of`,
   * and that is rejected precisely because it would match every session.
   */
  async update(
    id: string,
    input: ChannelRuleUpdateInput,
    options: WriteExtras = {},
  ): Promise<ChannelRuleWriteResponse> {
    return this.http.request<ChannelRuleWriteResponse>({
      method: "PATCH",
      path: `/api/v1/channel-rules/${encodeURIComponent(id)}`,
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Remove one rule (#675).
   *
   * Traffic it used to claim falls through to whatever matches next, which is
   * usually `Direct`. One replay is queued; the change is retroactive.
   */
  async delete(id: string, options: WriteExtras = {}): Promise<ChannelRuleDeleteResponse> {
    return this.http.request<ChannelRuleDeleteResponse>({
      method: "DELETE",
      path: `/api/v1/channel-rules/${encodeURIComponent(id)}`,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Swap two rules' priorities, atomically (#675).
   *
   * The ladder is first-match-wins, so a half-applied move — two sequential
   * updates where the second fails — silently re-labels traffic. This is one
   * transaction, and one replay for the pair.
   */
  async reorder(
    input: ChannelRuleReorderInput,
    options: WriteExtras = {},
  ): Promise<ChannelRuleReorderResponse> {
    return this.http.request<ChannelRuleReorderResponse>({
      method: "POST",
      path: "/api/v1/channel-rules/reorder",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  /**
   * Add a channel to the WORKSPACE's taxonomy (#675) — the vocabulary
   * `output_channel` may point at.
   *
   * No replay: a channel no rule references classifies nothing. A duplicate
   * name is 409, not the existing row, so a typo cannot silently adopt an
   * unrelated channel's group.
   */
  async createChannel(
    input: ChannelTaxonomyCreateInput,
    options: WriteExtras = {},
  ): Promise<ChannelTaxonomyCreateResponse> {
    return this.http.request<ChannelTaxonomyCreateResponse>({
      method: "POST",
      path: "/api/v1/channel-taxonomy",
      body: input,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }
}

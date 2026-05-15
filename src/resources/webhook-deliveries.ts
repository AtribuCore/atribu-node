import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";

type ReplayResponse =
  paths["/api/v1/webhooks/deliveries/{id}/replay"]["post"]["responses"][200]["content"]["application/json"];

export type WebhookDeliveryReplayResult = ReplayResponse["data"];

export interface ReplayOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class WebhookDeliveriesResource {
  constructor(private readonly http: HttpClientLike) {}

  async replay(id: string, opts: ReplayOptions = {}): Promise<WebhookDeliveryReplayResult> {
    const res = await this.http.request<ReplayResponse>({
      method: "POST",
      path: `/api/v1/webhooks/deliveries/${encodeURIComponent(id)}/replay`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

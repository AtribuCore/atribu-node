import type { HttpClientLike } from "../http";

/**
 * Server-side event ingestion (#115). Send a tracking event — most usefully a
 * `purchase` — from your server of record with the `anonymousId` you captured
 * client-side, so the sale ties to the exact ad-click session with no ITP /
 * ad-blocker exposure and an authoritative amount.
 */
export interface TrackEventInput {
  /** Event name, alphanumeric + underscores (e.g. "purchase"). */
  event_name: string;
  /** The visitor's anonymous_id from the browser tracker's getAttribution(). */
  anonymous_id?: string;
  session_id?: string;
  /** ISO timestamp; defaults to now server-side. */
  timestamp?: string;
  /** Arbitrary event properties (for purchase: value, currency, order_id). */
  properties?: Record<string, unknown>;
  /** PII for identity resolution — links this event to the customer profile. */
  user_traits?: { email?: string; phone?: string; first_name?: string; last_name?: string };
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
  /** fbclid / gclid / msclkid / ttclid — enables cookieless click-id stitching. */
  click_ids?: Record<string, string>;
  /** Dedup key. For purchases pass your orderId so retries never double-count. */
  idempotency_key?: string;
}

export interface PurchaseInput {
  /** The visitor's anonymous_id captured client-side via getAttribution(). */
  anonymousId?: string;
  sessionId?: string;
  value: number;
  currency: string;
  /** Your order/transaction id — becomes the idempotency key. */
  orderId: string;
  userTraits?: { email?: string; phone?: string; first_name?: string; last_name?: string };
  utm?: TrackEventInput["utm"];
  clickIds?: Record<string, string>;
  properties?: Record<string, unknown>;
}

export interface TrackEventResponse {
  event_id: string;
  status: string;
}

export interface EventTrackOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class EventsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Submit a custom event. Returns 202 Accepted with the event id. */
  async track(input: TrackEventInput, opts: EventTrackOptions = {}): Promise<TrackEventResponse> {
    const res = await this.http.request<{ data: TrackEventResponse }>({
      method: "POST",
      path: "/api/v1/events",
      body: input,
      idempotencyKey: opts.idempotencyKey ?? input.idempotency_key,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Server-side confirmation purchase. Idempotent on `orderId` (a retried call
   * collapses to one event), links to the ad-click session via `anonymousId`.
   */
  async purchase(input: PurchaseInput, opts: EventTrackOptions = {}): Promise<TrackEventResponse> {
    return this.track(
      {
        event_name: "purchase",
        anonymous_id: input.anonymousId,
        session_id: input.sessionId,
        properties: {
          ...input.properties,
          value: input.value,
          currency: input.currency,
          order_id: input.orderId,
        },
        user_traits: input.userTraits,
        utm: input.utm,
        click_ids: input.clickIds,
        idempotency_key: input.orderId,
      },
      opts,
    );
  }
}

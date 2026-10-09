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
  /**
   * Arbitrary event properties (for purchase: value, currency, order_id).
   *
   * `subject_ref` (optional): the OPAQUE id of who a payment is for when one
   * customer pays for several — e.g. a clinic patient paid for by a parent.
   * A canonical UUID (8-4-4-4-12) or a short token `[A-Za-z0-9_-]{1,32}`;
   * anything carrying an email, a 7+ digit run (RUT/phone), a date, a name or
   * a hex digest is a 400. A subject is new only if every earlier payment of
   * the customer carries a different subject_ref. Never forwarded to ad
   * platforms.
   */
  properties?: Record<string, unknown>;
  /** PII for identity resolution — links this event to the customer profile. */
  user_traits?: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    /** YOUR customer id. Read-only match key — never enough on its own to create a profile. */
    external_id?: string;
    /** A government id (e.g. a Chilean RUT). Unlike external_id, creates a profile on its own. */
    national_id?: string;
    /** ISO 3166-1 alpha-2 hint for national_id parsing. Defaults to "CL". */
    country?: string;
  };
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
  userTraits?: TrackEventInput["user_traits"];
  utm?: TrackEventInput["utm"];
  clickIds?: Record<string, string>;
  /**
   * Opaque id of WHO this purchase is for, when one customer pays for several
   * (a parent paying for each child's treatment). Sent as
   * `properties.subject_ref`: a canonical UUID or a short token
   * `[A-Za-z0-9_-]{1,32}`, never personal data (see `TrackEventInput`).
   */
  subjectRef?: string;
  properties?: Record<string, unknown>;
}

export interface TrackEventResponse {
  event_id: string;
  status: string;
}

/** `POST /api/v1/events/retractions` — undo an event you ingested, by its key. */
export interface RetractEventInput {
  /** The key the event was ingested with (`Idempotency-Key` / `idempotency_key`). Matched byte for byte. */
  idempotency_key: string;
  /** Why, for the audit record (at most 500 characters). Never put personal data in it. */
  reason?: string;
}

/** Rows deleted, by store. Every key is always present; zeros on `already_retracted`. */
export interface EventRetractionRemoved {
  outcome_events: number;
  conversions: number;
  attribution_touchpoints: number;
  paths_to_conversion: number;
  attribution_modeled_credits: number;
  booking_cluster_members: number;
  booking_clusters: number;
  synthetic_touches: number;
  order_client_signals: number;
  instagram_automatic_events: number;
}

/** Rows changed but kept. Every key is always present. */
export interface EventRetractionUpdated {
  first_payment_flags: number;
  synthetic_touches_kept: number;
  declared_source_answers_detached: number;
  orders_unlinked: number;
}

export interface RetractEventResponse {
  idempotency_key: string;
  /** `retracted` now, or `already_retracted` by an earlier call (zero counts). */
  status: "retracted" | "already_retracted";
  retraction_id: string | null;
  removed: EventRetractionRemoved;
  updated: EventRetractionUpdated;
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
   * Retract an event you ingested through `track`/`purchase`, by the key it was
   * sent with: the event, its conversions and their attribution are deleted,
   * first-payment flags and attribution are recomputed, and the retraction is
   * audited. Idempotent: a key already retracted answers `already_retracted`
   * with zero counts. Refused with `409 event_already_exported` once a
   * conversion export exists for the event, and with
   * `409 event_linked_to_conversation` when a conversation recorded it as its
   * lead; `404 event_not_found` for a key this profile never ingested.
   *
   * Requires the `events:write` scope.
   */
  async retract(input: RetractEventInput, opts: { signal?: AbortSignal } = {}): Promise<RetractEventResponse> {
    const res = await this.http.request<{ data: RetractEventResponse }>({
      method: "POST",
      path: "/api/v1/events/retractions",
      body: input,
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
          ...(input.subjectRef !== undefined ? { subject_ref: input.subjectRef } : {}),
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

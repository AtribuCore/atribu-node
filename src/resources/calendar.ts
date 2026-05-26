import type { HttpClientLike } from "../http";

// ---------------------------------------------------------------------------
// Wire types — all snake_case to match the /api/v1/calendar/* route bodies.
// Hand-declared (rather than derived from the generated `paths`) so the public
// input/output surface is stable and self-documenting; it mirrors the route
// contract in `src/app/api/v1/calendar/shared.ts` exactly.
// ---------------------------------------------------------------------------

/** A timed (`date_time`) OR all-day (`date`) point. `time_zone` is an IANA id. */
export interface CalendarEventDateTimeInput {
  date_time?: string;
  date?: string;
  time_zone?: string;
}

export interface CalendarAttendeeInput {
  email: string;
  display_name?: string;
}

/** Whether Google emails attendees about the change. */
export type CalendarSendUpdates = "all" | "externalOnly" | "none";

/**
 * Body for `POST /api/v1/calendar/events`. `start`/`end` are required.
 * `extended_private` round-trips back on the inbound `calendar.event.changed`
 * fan-out — tag your own link id (e.g. `vitrina_appointment_id`) here.
 */
export interface CalendarCreateEventInput {
  connection_id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: CalendarEventDateTimeInput;
  end: CalendarEventDateTimeInput;
  attendees?: CalendarAttendeeInput[];
  extended_private?: Record<string, string>;
  send_updates?: CalendarSendUpdates;
}

/**
 * Body for `PATCH /api/v1/calendar/events/{id}` — partial update (Google
 * events.patch). Identical to create, but `start`/`end` are optional; only the
 * supplied fields change.
 */
export interface CalendarUpdateEventInput {
  connection_id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: CalendarEventDateTimeInput;
  end?: CalendarEventDateTimeInput;
  attendees?: CalendarAttendeeInput[];
  extended_private?: Record<string, string>;
  send_updates?: CalendarSendUpdates;
}

/** The `start`/`end` shape on a returned event (always all-keys-present, nullable). */
export interface CalendarEventDateTime {
  date_time: string | null;
  date: string | null;
  time_zone: string | null;
}

/** The create/update response shape (the unwrapped `data`). */
export interface CalendarEvent {
  id: string;
  status: string;
  html_link: string | null;
  ical_uid: string | null;
  updated: string | null;
  start: CalendarEventDateTime | null;
  end: CalendarEventDateTime | null;
}

/** The unwrapped `data` from a successful DELETE. */
export interface CalendarEventDeleted {
  deleted: true;
  event_id: string;
}

export interface CalendarMutationOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface CalendarDeleteOptions {
  connectionId: string;
  sendUpdates?: CalendarSendUpdates;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

interface DataEnvelope<T> {
  data: T;
}

/**
 * Google Calendar management surface — backs an agent's create / reschedule /
 * cancel tools on a connected Google Calendar. Changes made through the Atribu
 * UI or directly on Google fan out as `calendar.event.changed` webhook events.
 * Requires the `calendar` scope on the API key.
 */
export class CalendarResource {
  constructor(private readonly http: HttpClientLike) {}

  /** Create an event. `start`/`end` required (timed via `date_time` or all-day via `date`). */
  async createEvent(
    input: CalendarCreateEventInput,
    opts: CalendarMutationOptions = {},
  ): Promise<CalendarEvent> {
    const res = await this.http.request<DataEnvelope<CalendarEvent>>({
      method: "POST",
      path: "/api/v1/calendar/events",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** Partial update — only the supplied fields change (Google events.patch). */
  async updateEvent(
    eventId: string,
    input: CalendarUpdateEventInput,
    opts: CalendarMutationOptions = {},
  ): Promise<CalendarEvent> {
    const res = await this.http.request<DataEnvelope<CalendarEvent>>({
      method: "PATCH",
      path: `/api/v1/calendar/events/${encodeURIComponent(eventId)}`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Cancel an event. `connectionId` (+ optional `sendUpdates`) are query params,
   * not a body — Google emails attendees per `sendUpdates`.
   */
  async deleteEvent(
    eventId: string,
    opts: CalendarDeleteOptions,
  ): Promise<CalendarEventDeleted> {
    const params = new URLSearchParams({ connection_id: opts.connectionId });
    if (opts.sendUpdates) params.set("send_updates", opts.sendUpdates);
    const res = await this.http.request<DataEnvelope<CalendarEventDeleted>>({
      method: "DELETE",
      path: `/api/v1/calendar/events/${encodeURIComponent(eventId)}?${params.toString()}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

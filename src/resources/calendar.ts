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
  /** The Atribu booking calendar to create the event on (required). */
  calendar_id: string;
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
  /** The Atribu booking calendar the event lives on (required). */
  calendar_id: string;
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
  /** The Atribu booking calendar the event lives on. */
  calendar_id: string;
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
  /** The Atribu booking calendar the event lives on (required). */
  calendarId: string;
  sendUpdates?: CalendarSendUpdates;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Booking-calendar management + ACL sharing (scope: calendar.manage)
// ---------------------------------------------------------------------------

/** An Atribu-created booking calendar. */
export interface CalendarSummary {
  id: string;
  summary: string;
  description: string | null;
  time_zone: string | null;
}

/** Body for `createCalendar`. */
export interface CalendarCreateInput {
  connection_id: string;
  summary: string;
  description?: string;
  time_zone?: string;
}

/** An ACL rule on a booking calendar. */
export interface AclRule {
  id: string;
  role: string;
  email: string | null;
}

/** Body for `shareCalendar`. */
export interface ShareCalendarInput {
  connection_id: string;
  email: string;
  role: "reader" | "writer";
}

export interface CalendarListOptions {
  signal?: AbortSignal;
}

export interface CalendarRevokeShareOptions {
  connectionId: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

interface DataEnvelope<T> {
  data: T;
}

/**
 * Google Calendar management surface — backs an agent's create / reschedule /
 * cancel tools on Atribu booking calendars, plus calendar creation + ACL
 * sharing. Atribu creates dedicated booking calendars in the connected Google
 * account (never the user's primary) and CRUDs events only on those. Changes
 * made through the Atribu UI or directly on Google fan out as
 * `calendar.event.changed` webhook events.
 *
 * Event CRUD requires the `calendar` scope; create/list/share (the
 * `createCalendar`/`listCalendars`/`shareCalendar`/`listCalendarShares`/
 * `revokeCalendarShare` methods) require the `calendar.manage` scope.
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
    const params = new URLSearchParams({
      connection_id: opts.connectionId,
      calendar_id: opts.calendarId,
    });
    if (opts.sendUpdates) params.set("send_updates", opts.sendUpdates);
    const res = await this.http.request<DataEnvelope<CalendarEventDeleted>>({
      method: "DELETE",
      path: `/api/v1/calendar/events/${encodeURIComponent(eventId)}?${params.toString()}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Create a dedicated Atribu booking calendar (the user's primary is never
   * touched). Pass `idempotencyKey` to make creation idempotent — a duplicate
   * key for the connection returns the existing calendar. Needs `calendar.manage`.
   */
  async createCalendar(
    input: CalendarCreateInput,
    opts: CalendarMutationOptions = {},
  ): Promise<CalendarSummary> {
    const res = await this.http.request<DataEnvelope<CalendarSummary>>({
      method: "POST",
      path: "/api/v1/calendar/calendars",
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** List the Atribu booking calendars for a connection. Needs `calendar.manage`. */
  async listCalendars(
    connectionId: string,
    opts: CalendarListOptions = {},
  ): Promise<CalendarSummary[]> {
    const params = new URLSearchParams({ connection_id: connectionId });
    const res = await this.http.request<DataEnvelope<CalendarSummary[]>>({
      method: "GET",
      path: `/api/v1/calendar/calendars?${params.toString()}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Share a booking calendar with a team member (`reader` or `writer`).
   * Idempotent — re-sharing the same email updates the role. Needs `calendar.manage`.
   */
  async shareCalendar(
    calendarId: string,
    input: ShareCalendarInput,
    opts: CalendarMutationOptions = {},
  ): Promise<AclRule> {
    const res = await this.http.request<DataEnvelope<AclRule>>({
      method: "POST",
      path: `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/acl`,
      body: input,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }

  /** List the ACL shares on a booking calendar. Needs `calendar.manage`. */
  async listCalendarShares(
    calendarId: string,
    connectionId: string,
    opts: CalendarListOptions = {},
  ): Promise<AclRule[]> {
    const params = new URLSearchParams({ connection_id: connectionId });
    const res = await this.http.request<DataEnvelope<AclRule[]>>({
      method: "GET",
      path: `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/acl?${params.toString()}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /**
   * Revoke a team member's access by the ACL `ruleId` (from share/list).
   * Idempotent — an already-removed rule still resolves. Needs `calendar.manage`.
   */
  async revokeCalendarShare(
    calendarId: string,
    ruleId: string,
    opts: CalendarRevokeShareOptions,
  ): Promise<void> {
    const params = new URLSearchParams({ connection_id: opts.connectionId });
    await this.http.request<DataEnvelope<{ deleted: true; rule_id: string }>>({
      method: "DELETE",
      path: `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/acl/${encodeURIComponent(ruleId)}?${params.toString()}`,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
  }
}

import type { HttpClientLike } from "../http";

// ---------------------------------------------------------------------------
// Wire types — snake_case, mirroring the /api/v1/calendar/read/* route contract
// (src/lib/integrations/external-calendar/types.ts) exactly. Hand-declared so
// the read-only overlay's public surface is stable and self-documenting.
// ---------------------------------------------------------------------------

/** The caller's access to a calendar. */
export type ExternalCalendarAccessRole = "owner" | "writer" | "reader" | "freeBusyReader";

/** A calendar the connected account can see (read-only overlay). */
export interface ExternalCalendar {
  id: string;
  summary: string;
  description: string | null;
  /** Display color (hex) the user assigned, when the provider surfaces it. */
  color: string | null;
  primary: boolean;
  access_role: ExternalCalendarAccessRole;
}

/** A timed (`date_time`) OR all-day (`date`) point; `time_zone` is an IANA id. */
export interface ExternalEventDateTime {
  date_time: string | null;
  date: string | null;
  time_zone: string | null;
}

export type ExternalEventStatus = "confirmed" | "tentative" | "cancelled";
/** `opaque` = busy (blocks the slot); `transparent` = free. */
export type ExternalEventTransparency = "opaque" | "transparent";

export interface ExternalCalendarEvent {
  id: string;
  summary: string | null;
  start: ExternalEventDateTime;
  end: ExternalEventDateTime;
  all_day: boolean;
  status: ExternalEventStatus;
  updated: string | null;
  transparency: ExternalEventTransparency;
}

/**
 * Input for `listEvents`. Either bound a window (`timeMin`/`timeMax`, ≤90 days)
 * or pass a `syncToken` for incremental changes (mutually exclusive). `pageToken`
 * continues either. `limit` ∈ [1, 2500], default 250.
 */
export interface ExternalEventsListInput {
  connectionId: string;
  calendarId: string;
  timeMin?: string;
  timeMax?: string;
  syncToken?: string;
  pageToken?: string;
  limit?: number;
}

/** A page of read events plus the two continuation cursors. */
export interface ExternalEventsPage {
  events: ExternalCalendarEvent[];
  /** Present only on the final page — persist as the incremental cursor. */
  nextSyncToken: string | null;
  nextPageToken: string | null;
}

export interface ExternalCalendarReadOptions {
  signal?: AbortSignal;
}

interface DataEnvelope<T> {
  data: T;
}

interface EventsEnvelope {
  data: ExternalCalendarEvent[];
  next_sync_token: string | null;
  next_page_token: string | null;
}

/**
 * READ-ONLY external-calendar overlay — list the calendars a connected Google or
 * Microsoft account can see and read their events, without ever writing. Backs a
 * consumer (Vitrina) overlaying a user's calendars on its own. Requires the
 * `calendar.read` scope. Google is live; Microsoft answers 501
 * `provider_not_configured` until an Entra app registration exists.
 */
export class ExternalCalendarsResource {
  constructor(private readonly http: HttpClientLike) {}

  /** List the calendars the connection's account can see. */
  async list(
    connectionId: string,
    opts: ExternalCalendarReadOptions = {},
  ): Promise<ExternalCalendar[]> {
    const params = new URLSearchParams({ connection_id: connectionId });
    const res = await this.http.request<DataEnvelope<ExternalCalendar[]>>({
      method: "GET",
      path: `/api/v1/calendar/read/calendars?${params.toString()}`,
      signal: opts.signal,
    });
    return res.data;
  }

  /** List events on one calendar within a window, or incrementally via `syncToken`. */
  async listEvents(
    input: ExternalEventsListInput,
    opts: ExternalCalendarReadOptions = {},
  ): Promise<ExternalEventsPage> {
    const params = new URLSearchParams({
      connection_id: input.connectionId,
      calendar_id: input.calendarId,
    });
    if (input.timeMin) params.set("time_min", input.timeMin);
    if (input.timeMax) params.set("time_max", input.timeMax);
    if (input.syncToken) params.set("sync_token", input.syncToken);
    if (input.pageToken) params.set("page_token", input.pageToken);
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    const res = await this.http.request<EventsEnvelope>({
      method: "GET",
      path: `/api/v1/calendar/read/events?${params.toString()}`,
      signal: opts.signal,
    });
    return {
      events: res.data,
      nextSyncToken: res.next_sync_token,
      nextPageToken: res.next_page_token,
    };
  }
}

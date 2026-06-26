import { describe, it, expect } from "vitest";
import { CalendarResource } from "../../src/resources/calendar";
import type { HttpClientLike, RequestOptions } from "../../src/http";

/**
 * The calendar resource is a thin typed wrapper over the transport. These tests
 * pin the wire contract each method emits (method + path + body/query) and that
 * it unwraps the `data` envelope. A fake transport keeps it free of MSW/network.
 */
function fakeHttp(data: unknown = { ok: true }): {
  http: HttpClientLike;
  calls: RequestOptions[];
} {
  const calls: RequestOptions[] = [];
  const http: HttpClientLike = {
    async request<T>(opts: RequestOptions): Promise<T> {
      calls.push(opts);
      return { data, meta: {} } as unknown as T;
    },
  };
  return { http, calls };
}

/** The single recorded request, guarded so TS narrows away `undefined`. */
function only(calls: RequestOptions[]): RequestOptions {
  expect(calls).toHaveLength(1);
  const call = calls[0];
  if (!call) throw new Error("no request recorded");
  return call;
}

describe("calendar resource", () => {
  it("createEvent → POST /api/v1/calendar/events with the body, unwraps data", async () => {
    const { http, calls } = fakeHttp({
      id: "evt1",
      status: "confirmed",
      html_link: "https://cal/evt1",
      ical_uid: "u@google",
      updated: "2026-05-25T00:00:00Z",
      start: { date_time: "2026-06-01T10:00:00Z", date: null, time_zone: "UTC" },
      end: { date_time: "2026-06-01T11:00:00Z", date: null, time_zone: "UTC" },
    });
    const out = await new CalendarResource(http).createEvent({
      connection_id: "c1",
      calendar_id: "cal_1",
      summary: "Intro call",
      start: { date_time: "2026-06-01T10:00:00Z", time_zone: "UTC" },
      end: { date_time: "2026-06-01T11:00:00Z", time_zone: "UTC" },
      attendees: [{ email: "a@b.com", display_name: "A" }],
      extended_private: { vitrina_appointment_id: "appt_9" },
      send_updates: "all",
    });
    const call = only(calls);
    expect(call.method).toBe("POST");
    expect(call.path).toBe("/api/v1/calendar/events");
    expect(call.body).toEqual({
      connection_id: "c1",
      calendar_id: "cal_1",
      summary: "Intro call",
      start: { date_time: "2026-06-01T10:00:00Z", time_zone: "UTC" },
      end: { date_time: "2026-06-01T11:00:00Z", time_zone: "UTC" },
      attendees: [{ email: "a@b.com", display_name: "A" }],
      extended_private: { vitrina_appointment_id: "appt_9" },
      send_updates: "all",
    });
    expect(out.id).toBe("evt1");
    expect(out.start?.date_time).toBe("2026-06-01T10:00:00Z");
  });

  it("updateEvent → PATCH /api/v1/calendar/events/{id} with the partial body", async () => {
    const { http, calls } = fakeHttp({
      id: "evt1",
      status: "confirmed",
      html_link: null,
      ical_uid: null,
      updated: null,
      start: null,
      end: null,
    });
    const out = await new CalendarResource(http).updateEvent("evt1", {
      connection_id: "c1",
      calendar_id: "cal_1",
      location: "Zoom",
    });
    const call = only(calls);
    expect(call.method).toBe("PATCH");
    expect(call.path).toBe("/api/v1/calendar/events/evt1");
    expect(call.body).toEqual({ connection_id: "c1", calendar_id: "cal_1", location: "Zoom" });
    expect(out.id).toBe("evt1");
  });

  it("updateEvent encodes the event id in the path", async () => {
    const { http, calls } = fakeHttp({
      id: "a/b",
      status: "confirmed",
      html_link: null,
      ical_uid: null,
      updated: null,
      start: null,
      end: null,
    });
    await new CalendarResource(http).updateEvent("a/b", { connection_id: "c1", calendar_id: "cal_1" });
    const call = only(calls);
    expect(call.path).toBe("/api/v1/calendar/events/a%2Fb");
  });

  it("deleteEvent → DELETE /api/v1/calendar/events/{id}?connection_id=…&calendar_id=…&send_updates=…", async () => {
    const { http, calls } = fakeHttp({ deleted: true, event_id: "evt1" });
    const out = await new CalendarResource(http).deleteEvent("evt1", {
      connectionId: "c1",
      calendarId: "cal_1",
      sendUpdates: "none",
    });
    const call = only(calls);
    expect(call.method).toBe("DELETE");
    expect(call.path).toBe(
      "/api/v1/calendar/events/evt1?connection_id=c1&calendar_id=cal_1&send_updates=none",
    );
    expect(call.body).toBeUndefined();
    expect(out).toEqual({ deleted: true, event_id: "evt1" });
  });

  it("deleteEvent omits send_updates from the query when not given", async () => {
    const { http, calls } = fakeHttp({ deleted: true, event_id: "evt1" });
    await new CalendarResource(http).deleteEvent("evt1", { connectionId: "c1", calendarId: "cal_1" });
    const call = only(calls);
    expect(call.path).toBe("/api/v1/calendar/events/evt1?connection_id=c1&calendar_id=cal_1");
  });
});

describe("calendar booking-calendar management", () => {
  it("createCalendar → POST /api/v1/calendar/calendars, passes idempotencyKey, unwraps data", async () => {
    const { http, calls } = fakeHttp({
      id: "cal_new",
      summary: "Atribu Bookings",
      description: null,
      time_zone: "America/Santiago",
    });
    const out = await new CalendarResource(http).createCalendar(
      { connection_id: "c1", summary: "Atribu Bookings", time_zone: "America/Santiago" },
      { idempotencyKey: "idem-1" },
    );
    const call = only(calls);
    expect(call.method).toBe("POST");
    expect(call.path).toBe("/api/v1/calendar/calendars");
    expect(call.body).toEqual({
      connection_id: "c1",
      summary: "Atribu Bookings",
      time_zone: "America/Santiago",
    });
    expect(call.idempotencyKey).toBe("idem-1");
    expect(out.id).toBe("cal_new");
  });

  it("listCalendars → GET /api/v1/calendar/calendars?connection_id=…", async () => {
    const { http, calls } = fakeHttp([
      { id: "cal_1", summary: "Bookings", description: null, time_zone: null },
    ]);
    const out = await new CalendarResource(http).listCalendars("c1");
    const call = only(calls);
    expect(call.method).toBe("GET");
    expect(call.path).toBe("/api/v1/calendar/calendars?connection_id=c1");
    expect(out[0]?.id).toBe("cal_1");
  });

  it("shareCalendar → POST /api/v1/calendar/calendars/{id}/acl with body", async () => {
    const { http, calls } = fakeHttp({ id: "user:a@b.com", role: "writer", email: "a@b.com" });
    const out = await new CalendarResource(http).shareCalendar("cal_1", {
      connection_id: "c1",
      email: "a@b.com",
      role: "writer",
    });
    const call = only(calls);
    expect(call.method).toBe("POST");
    expect(call.path).toBe("/api/v1/calendar/calendars/cal_1/acl");
    expect(call.body).toEqual({ connection_id: "c1", email: "a@b.com", role: "writer" });
    expect(out.id).toBe("user:a@b.com");
  });

  it("listCalendarShares → GET /api/v1/calendar/calendars/{id}/acl?connection_id=…", async () => {
    const { http, calls } = fakeHttp([{ id: "user:a@b.com", role: "reader", email: "a@b.com" }]);
    const out = await new CalendarResource(http).listCalendarShares("cal_1", "c1");
    const call = only(calls);
    expect(call.method).toBe("GET");
    expect(call.path).toBe("/api/v1/calendar/calendars/cal_1/acl?connection_id=c1");
    expect(out[0]?.role).toBe("reader");
  });

  it("revokeCalendarShare → DELETE /api/v1/calendar/calendars/{id}/acl/{ruleId}?connection_id=…", async () => {
    const { http, calls } = fakeHttp({ deleted: true, rule_id: "user:a@b.com" });
    await new CalendarResource(http).revokeCalendarShare("cal_1", "user:a@b.com", {
      connectionId: "c1",
    });
    const call = only(calls);
    expect(call.method).toBe("DELETE");
    expect(call.path).toBe(
      "/api/v1/calendar/calendars/cal_1/acl/user%3Aa%40b.com?connection_id=c1",
    );
  });
});

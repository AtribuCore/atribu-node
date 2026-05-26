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
      location: "Zoom",
    });
    const call = only(calls);
    expect(call.method).toBe("PATCH");
    expect(call.path).toBe("/api/v1/calendar/events/evt1");
    expect(call.body).toEqual({ connection_id: "c1", location: "Zoom" });
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
    await new CalendarResource(http).updateEvent("a/b", { connection_id: "c1" });
    const call = only(calls);
    expect(call.path).toBe("/api/v1/calendar/events/a%2Fb");
  });

  it("deleteEvent → DELETE /api/v1/calendar/events/{id}?connection_id=…&send_updates=…", async () => {
    const { http, calls } = fakeHttp({ deleted: true, event_id: "evt1" });
    const out = await new CalendarResource(http).deleteEvent("evt1", {
      connectionId: "c1",
      sendUpdates: "none",
    });
    const call = only(calls);
    expect(call.method).toBe("DELETE");
    expect(call.path).toBe("/api/v1/calendar/events/evt1?connection_id=c1&send_updates=none");
    expect(call.body).toBeUndefined();
    expect(out).toEqual({ deleted: true, event_id: "evt1" });
  });

  it("deleteEvent omits send_updates from the query when not given", async () => {
    const { http, calls } = fakeHttp({ deleted: true, event_id: "evt1" });
    await new CalendarResource(http).deleteEvent("evt1", { connectionId: "c1" });
    const call = only(calls);
    expect(call.path).toBe("/api/v1/calendar/events/evt1?connection_id=c1");
  });
});

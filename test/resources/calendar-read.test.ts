import { describe, it, expect } from "vitest";
import { ExternalCalendarsResource } from "../../src/resources/calendar-read";
import type { HttpClientLike, RequestOptions } from "../../src/http";

/**
 * The read-only external-calendar resource is a thin typed wrapper over the
 * transport. These tests pin the wire contract each method emits (method + path)
 * and that it unwraps the response envelope (incl. the two continuation cursors).
 */
function fakeHttp(response: unknown): {
  http: HttpClientLike;
  calls: RequestOptions[];
} {
  const calls: RequestOptions[] = [];
  const http: HttpClientLike = {
    async request<T>(opts: RequestOptions): Promise<T> {
      calls.push(opts);
      return response as T;
    },
  };
  return { http, calls };
}

function only(calls: RequestOptions[]): RequestOptions {
  expect(calls).toHaveLength(1);
  const call = calls[0];
  if (!call) throw new Error("no request recorded");
  return call;
}

describe("external calendars resource", () => {
  it("list → GET /api/v1/calendar/read/calendars?connection_id=…, unwraps data", async () => {
    const { http, calls } = fakeHttp({
      data: [
        {
          id: "primary",
          summary: "Work",
          description: null,
          color: "#9fe1e7",
          primary: true,
          access_role: "owner",
        },
      ],
      meta: {},
    });
    const out = await new ExternalCalendarsResource(http).list("c1");
    const call = only(calls);
    expect(call.method).toBe("GET");
    expect(call.path).toBe("/api/v1/calendar/read/calendars?connection_id=c1");
    expect(out[0]?.id).toBe("primary");
    expect(out[0]?.access_role).toBe("owner");
  });

  it("listEvents → GET /api/v1/calendar/read/events with window params, maps cursors", async () => {
    const { http, calls } = fakeHttp({
      data: [
        {
          id: "e1",
          summary: "Standup",
          start: { date_time: "2026-06-01T10:00:00Z", date: null, time_zone: "UTC" },
          end: { date_time: "2026-06-01T10:15:00Z", date: null, time_zone: "UTC" },
          all_day: false,
          status: "confirmed",
          updated: "2026-05-30T00:00:00Z",
          transparency: "opaque",
        },
      ],
      meta: {},
      next_sync_token: "SYNC1",
      next_page_token: null,
    });
    const out = await new ExternalCalendarsResource(http).listEvents({
      connectionId: "c1",
      calendarId: "primary",
      timeMin: "2026-06-01T00:00:00Z",
      timeMax: "2026-06-08T00:00:00Z",
      limit: 100,
    });
    const call = only(calls);
    expect(call.method).toBe("GET");
    expect(call.path).toBe(
      "/api/v1/calendar/read/events?connection_id=c1&calendar_id=primary&time_min=2026-06-01T00%3A00%3A00Z&time_max=2026-06-08T00%3A00%3A00Z&limit=100",
    );
    expect(out.events[0]?.id).toBe("e1");
    expect(out.nextSyncToken).toBe("SYNC1");
    expect(out.nextPageToken).toBeNull();
  });

  it("listEvents forwards sync_token + page_token", async () => {
    const { http, calls } = fakeHttp({
      data: [],
      meta: {},
      next_sync_token: "SYNC2",
      next_page_token: "PAGE2",
    });
    const out = await new ExternalCalendarsResource(http).listEvents({
      connectionId: "c1",
      calendarId: "primary",
      syncToken: "PRIOR",
      pageToken: "PT",
    });
    const call = only(calls);
    expect(call.path).toBe(
      "/api/v1/calendar/read/events?connection_id=c1&calendar_id=primary&sync_token=PRIOR&page_token=PT",
    );
    expect(out.nextPageToken).toBe("PAGE2");
  });
});

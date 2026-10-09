/**
 * Appointments (#1764) — the Calendario read: GoHighLevel's calendar, tracked
 * `appointment_booked` outcomes and the profile's Google booking calendars,
 * merged into one list. Responses are the full envelope (`./common.ts`).
 */
import type { paths } from "../__generated__/api";
import type { HttpClientLike } from "../http";
import type { ReadExtras } from "./common";

type AppointmentsQuery = paths["/api/v1/appointments"]["get"]["parameters"]["query"];
export type AppointmentsListResponse =
  paths["/api/v1/appointments"]["get"]["responses"][200]["content"]["application/json"];
export type AppointmentsListOptions = AppointmentsQuery & ReadExtras;
export type Appointment = AppointmentsListResponse["data"]["appointments"][number];

export class AppointmentsResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Appointments between `from` and `to` (ISO 8601, at most 62 days apart).
   * Needs `customers:read`: every row carries the contact's name, email and
   * phone. Each call reads GoHighLevel live, so poll no faster than a person
   * would look (the console refreshes every 60 s).
   */
  async list(options: AppointmentsListOptions): Promise<AppointmentsListResponse> {
    const { signal, ...query } = options;
    return this.http.request<AppointmentsListResponse>({
      method: "GET",
      path: "/api/v1/appointments",
      query,
      signal,
    });
  }
}

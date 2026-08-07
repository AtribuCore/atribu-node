import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";
import { atribuMockHandlers, fixtures, responseFixtures } from "../../src/test";
import { AtribuApiError } from "../../src/errors";

const BASE = "https://mock-wa-flows.atribu.test";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

const FLOW_ID = "1234567890";

describe("whatsapp.flows resource", () => {
  describe("happy path", () => {
    const server = setupServer(...atribuMockHandlers({ baseUrl: BASE }));
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers(...atribuMockHandlers({ baseUrl: BASE })));
    afterAll(() => server.close());

    it("lists flows including drafts", async () => {
      const list = await newClient().whatsapp.flows.list({
        connectionId: fixtures.ids.connectionId,
      });
      expect(list).toHaveLength(2);
      expect(list[0]?.status).toBe("PUBLISHED");
      expect(list[1]?.status).toBe("DRAFT");
    });

    it("creates a flow (DRAFT)", async () => {
      const result = await newClient().whatsapp.flows.create({
        connection_id: fixtures.ids.connectionId,
        name: "Reserva de hora",
        categories: ["APPOINTMENT_BOOKING"],
      });
      expect(result.id).toBe(FLOW_ID);
    });

    it("reads one flow with detail fields + preview", async () => {
      const flow = await newClient().whatsapp.flows.get(FLOW_ID, {
        connectionId: fixtures.ids.connectionId,
      });
      expect(flow.json_version).toBe("7.2");
      expect(flow.preview?.preview_url).toContain("preview");
    });

    it("updates metadata", async () => {
      await expect(
        newClient().whatsapp.flows.update(FLOW_ID, {
          connection_id: fixtures.ids.connectionId,
          name: "Nuevo nombre",
        }),
      ).resolves.toBeUndefined();
    });

    it("deletes a draft", async () => {
      await expect(
        newClient().whatsapp.flows.delete(FLOW_ID, {
          connectionId: fixtures.ids.connectionId,
        }),
      ).resolves.toBeUndefined();
    });

    it("lists assets (flow.json download_url)", async () => {
      const assets = await newClient().whatsapp.flows.listAssets(FLOW_ID, {
        connectionId: fixtures.ids.connectionId,
      });
      expect(assets[0]?.asset_type).toBe("FLOW_JSON");
      expect(assets[0]?.download_url).toBeTruthy();
    });

    it("uploads flow JSON (object form) and returns validation findings", async () => {
      const result = await newClient().whatsapp.flows.uploadFlowJson(
        FLOW_ID,
        { version: "7.2", screens: [] },
        { connectionId: fixtures.ids.connectionId },
      );
      expect(result.success).toBe(true);
      expect(result.validation_errors).toEqual([]);
    });

    it("publishes and deprecates", async () => {
      const flows = newClient().whatsapp.flows;
      await expect(
        flows.publish(FLOW_ID, { connectionId: fixtures.ids.connectionId }),
      ).resolves.toBeUndefined();
      await expect(
        flows.deprecate(FLOW_ID, { connectionId: fixtures.ids.connectionId }),
      ).resolves.toBeUndefined();
    });
  });

  describe("error paths", () => {
    const server = setupServer(
      ...atribuMockHandlers({
        baseUrl: BASE,
        whatsapp: {
          flows: {
            list: {
              status: 403,
              body: responseFixtures.apiError(
                "forbidden",
                "This OAuth app is not authorized for the requested connection",
                403,
              ),
            },
            publish: {
              status: 502,
              body: responseFixtures.apiError(
                "provider_error",
                "Upstream Meta publish failed: flow has validation errors",
                502,
              ),
            },
          },
        },
      }),
    );
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());

    it("list → 403 surfaces with do_not_retry", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().whatsapp.flows.list({ connectionId: fixtures.ids.connectionId });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.code).toBe("forbidden");
      expect(caught?.status).toBe(403);
      expect(caught?.retry.action).toBe("do_not_retry");
    });

    it("publish of an invalid flow → 502 surfaces the upstream refusal", async () => {
      let caught: AtribuApiError | null = null;
      try {
        await newClient().whatsapp.flows.publish(FLOW_ID, {
          connectionId: fixtures.ids.connectionId,
        });
      } catch (err) {
        caught = err as AtribuApiError;
      }
      expect(caught?.status).toBe(502);
      expect(caught?.message).toContain("validation errors");
    });
  });
});

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AtribuClient } from "../../src/client";

const BASE = "https://mock-wa-media.atribu.test";
const newClient = (): AtribuClient =>
  new AtribuClient({ apiKey: "atb_live_test", baseUrl: BASE });

interface Captured {
  contentType: string | null;
  connectionId: FormDataEntryValue | null;
  filename?: string;
  fileType?: string;
  fileSize?: number;
}

describe("whatsapp.media resource", () => {
  let captured: Captured;

  const server = setupServer(
    http.post(`${BASE}/api/v1/whatsapp/media`, async ({ request }) => {
      const contentType = request.headers.get("content-type");
      const form = await request.formData();
      const file = form.get("file");
      captured = {
        contentType,
        connectionId: form.get("connection_id"),
        filename: file instanceof File ? file.name : undefined,
        fileType: file instanceof Blob ? file.type : undefined,
        fileSize: file instanceof Blob ? file.size : undefined,
      };
      return HttpResponse.json(
        { data: { media_id: "mid-123", mime_type: "video/mp4", file_size: 3 }, meta: { profile_id: "p1" } },
        { status: 200 },
      );
    }),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("uploads raw bytes as multipart and returns the media_id", async () => {
    const res = await newClient().whatsapp.media.upload({
      connectionId: "conn-1",
      file: new Uint8Array([1, 2, 3]),
      contentType: "video/mp4",
      filename: "clip.mp4",
    });

    expect(res.media_id).toBe("mid-123");
    expect(res.mime_type).toBe("video/mp4");
    expect(captured.connectionId).toBe("conn-1");
    expect(captured.filename).toBe("clip.mp4");
    expect(captured.fileType).toBe("video/mp4");
    expect(captured.fileSize).toBe(3);
    // The runtime sets the multipart Content-Type with a boundary — the SDK
    // must NOT set application/json here.
    expect(captured.contentType).toMatch(/^multipart\/form-data; boundary=/);
  });

  it("accepts a Blob/File directly (uses its type)", async () => {
    const res = await newClient().whatsapp.media.upload({
      connectionId: "conn-2",
      file: new Blob([new Uint8Array([9, 9])], { type: "image/png" }),
      filename: "a.png",
    });

    expect(res.media_id).toBe("mid-123");
    expect(captured.connectionId).toBe("conn-2");
    expect(captured.fileType).toBe("image/png");
  });

  it("defaults the filename to upload.bin", async () => {
    await newClient().whatsapp.media.upload({
      connectionId: "conn-3",
      file: new Uint8Array([0]),
      contentType: "application/pdf",
    });
    expect(captured.filename).toBe("upload.bin");
  });

  it("get() resolves a media_id to a hosted URL with connection_id in the query", async () => {
    let capturedUrl: URL | null = null;
    let capturedMethod: string | null = null;
    server.use(
      http.get(`${BASE}/api/v1/whatsapp/media/:mediaId`, ({ request }) => {
        capturedUrl = new URL(request.url);
        capturedMethod = request.method;
        return HttpResponse.json(
          {
            data: {
              url: "https://media.atribu.test/hosted.jpg?sig=abc",
              mime_type: "image/jpeg",
              expires_at: "2026-07-08T04:45:18.000Z",
            },
            meta: { profile_id: "p1", connection_id: "conn-9" },
          },
          { status: 200 },
        );
      }),
    );

    // A slash in the id must be percent-encoded into the path segment.
    const res = await newClient().whatsapp.media.get("abc/123", {
      connectionId: "conn-9",
    });

    expect(res.url).toBe("https://media.atribu.test/hosted.jpg?sig=abc");
    expect(res.mime_type).toBe("image/jpeg");
    expect(res.expires_at).toBe("2026-07-08T04:45:18.000Z");
    expect(capturedMethod).toBe("GET");
    expect(capturedUrl!.pathname).toBe("/api/v1/whatsapp/media/abc%2F123");
    expect(capturedUrl!.searchParams.get("connection_id")).toBe("conn-9");
  });
});

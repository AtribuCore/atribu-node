import type { paths } from "../../__generated__/api";
import type { HttpClientLike } from "../../http";

type UploadResponse =
  paths["/api/v1/whatsapp/media"]["post"]["responses"][200]["content"]["application/json"];

export type WhatsAppMediaUpload = UploadResponse["data"];

export interface UploadMediaOptions {
  /** The WhatsApp `data_connection` to upload against. */
  connectionId: string;
  /**
   * The media bytes. A `Blob`/`File` (browser, Bun, Deno, Node 18+) or raw
   * bytes (`ArrayBuffer`/`Uint8Array`/`Buffer`). For raw bytes, set
   * `contentType` so Meta categorizes the media (image/video/audio/document)
   * and applies the right size cap.
   */
  file: Blob | ArrayBuffer | ArrayBufferView;
  /** MIME type, e.g. `"video/mp4"`. Used when `file` is raw bytes or a typeless Blob. */
  contentType?: string;
  /** Filename Meta records; defaults to `"upload.bin"`. */
  filename?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/**
 * WhatsApp media uploads. Mounted on `AtribuClient.whatsapp.media`.
 */
export class WhatsAppMediaResource {
  constructor(private readonly http: HttpClientLike) {}

  /**
   * Pre-upload a media binary to Meta and get back a `media_id`. Reference it
   * on `messages.send` as `content.media.media_id`.
   *
   * Prefer this over `media.link` for video: with a `media_id` Meta never
   * fetches your URL, so origin-hosted / private / short-lived / dev-tunnelled
   * media works (a `link` requires Meta to fetch a public HTTPS URL at send
   * time, which fails for non-public origins — Meta error 131053). The id is
   * Meta-cached ~30 days, so it's also the right path for high-fanout sends.
   *
   * WhatsApp only; requires the `whatsapp` scope.
   */
  async upload(opts: UploadMediaOptions): Promise<WhatsAppMediaUpload> {
    const form = new FormData();
    form.append("connection_id", opts.connectionId);
    form.append("file", toBlob(opts.file, opts.contentType), opts.filename ?? "upload.bin");

    const res = await this.http.request<UploadResponse>({
      method: "POST",
      path: "/api/v1/whatsapp/media",
      multipart: form,
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return res.data;
  }
}

function toBlob(
  file: Blob | ArrayBuffer | ArrayBufferView,
  contentType?: string,
): Blob {
  if (typeof Blob !== "undefined" && file instanceof Blob) {
    // Honor an explicit contentType override even for a typeless Blob.
    return contentType && !file.type ? file.slice(0, file.size, contentType) : file;
  }
  return new Blob([file as BlobPart], { type: contentType ?? "application/octet-stream" });
}

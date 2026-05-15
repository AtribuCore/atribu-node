/**
 * Next.js App Router webhook handler.
 *
 * Usage:
 *
 *   // app/api/atribu-webhook/route.ts
 *   import { withAtribuWebhook } from "@atribu/node/next";
 *
 *   export const POST = withAtribuWebhook({
 *     secret: process.env.ATRIBU_WEBHOOK_SECRET!,
 *     previousSecret: process.env.ATRIBU_WEBHOOK_PREVIOUS_SECRET,
 *     onEvent: async (event) => {
 *       if (event.type === "message.received" && event.provider === "whatsapp") {
 *         // event.data.wa_message_id typed
 *       }
 *     },
 *   });
 *
 * Reads the raw body via `req.text()`, calls `verifyWebhook`, dispatches
 * the typed event to `onEvent`, and returns a 200/401 response.
 */

import { AtribuWebhookError } from "../errors";
import { verifyWebhook } from "../webhooks/verify";
import type { AtribuWebhookEvent } from "../webhooks/types";

export interface WithAtribuWebhookOptions {
  secret: string;
  previousSecret?: string | null;
  tolerance?: number;
  onEvent: (event: AtribuWebhookEvent, ctx: WebhookContext) => Promise<void> | void;
  /** Called when a request arrives but signature validation fails. */
  onInvalidSignature?: (error: AtribuWebhookError, request: Request) => void;
  /** Called for any uncaught error inside `onEvent`. Default: log to console. */
  onError?: (error: unknown, event: AtribuWebhookEvent | null) => void;
}

export interface WebhookContext {
  request: Request;
  deliveryId: string | null;
  signatureTimestamp: number | null;
}

export function withAtribuWebhook(
  opts: WithAtribuWebhookOptions,
): (request: Request) => Promise<Response> {
  if (!opts.secret) throw new Error("withAtribuWebhook: secret is required");

  return async function handler(request: Request): Promise<Response> {
    const rawBody = await request.text();
    const signature = request.headers.get("x-atribu-signature");
    const deliveryId = request.headers.get("x-atribu-delivery-id");

    let event: AtribuWebhookEvent;
    try {
      event = await verifyWebhook({
        rawBody,
        signature,
        secret: opts.secret,
        previousSecret: opts.previousSecret ?? null,
        tolerance: opts.tolerance,
      });
    } catch (err) {
      if (err instanceof AtribuWebhookError) {
        opts.onInvalidSignature?.(err, request);
        return new Response(JSON.stringify({ error: err.code, message: err.message }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    const ctx: WebhookContext = {
      request,
      deliveryId,
      signatureTimestamp: parseTimestamp(signature),
    };

    try {
      await opts.onEvent(event, ctx);
    } catch (err) {
      if (opts.onError) opts.onError(err, event);
      else console.error("[atribu webhook] onEvent threw:", err);
      // Return 500 so Atribu retries — surface real failures via DLQ.
      return new Response(JSON.stringify({ error: "handler_error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(null, { status: 200 });
  };
}

function parseTimestamp(header: string | null): number | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (key !== "t") continue;
    const n = Number(part.slice(eq + 1).trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

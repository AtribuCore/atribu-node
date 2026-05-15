/**
 * Next.js App Router webhook route (copy into app/api/atribu-webhook/route.ts).
 *
 * Required env vars:
 *   ATRIBU_WEBHOOK_SECRET=<from subscription create or rotate>
 *   ATRIBU_WEBHOOK_PREVIOUS_SECRET=<only during rotation grace>
 */

import { withAtribuWebhook } from "@atribu/node/next";

export const POST = withAtribuWebhook({
  secret: process.env.ATRIBU_WEBHOOK_SECRET!,
  previousSecret: process.env.ATRIBU_WEBHOOK_PREVIOUS_SECRET,
  tolerance: 300,
  onEvent: async (event, ctx) => {
    console.log(`[atribu] ${event.type} from ${event.provider} (delivery=${ctx.deliveryId})`);

    if (event.type === "message.received" && event.provider === "whatsapp") {
      const { wa_message_id, from, text } = event.data;
      console.log(`  WA message ${wa_message_id} from ${from}: ${text}`);
      // → enqueue to your AI agent, store in your DB, etc.
    } else if (event.type === "message.received" && event.provider === "instagram") {
      if ("kind" in event.data && event.data.kind === "postback") {
        console.log(`  IG postback: ${event.data.payload}`);
      } else if ("is_echo" in event.data) {
        console.log(`  IG fb_login message: ${event.data.text} (echo=${event.data.is_echo})`);
      } else {
        console.log(`  IG ig_login change: ${event.data.text} (from ${event.data.from_username})`);
      }
    } else if (event.type === "message.delivery") {
      console.log(`  delivery update: ${JSON.stringify(event.data)}`);
    }
  },
  onInvalidSignature: (err, req) => {
    console.error(`bad signature on ${req.url}: ${err.code}`);
  },
});

/**
 * Minimal Node example — send a WhatsApp text message.
 *
 * Run with:
 *   npx tsx examples/node-send-message.ts
 *
 * Required env vars:
 *   ATRIBU_API_KEY=atb_live_...
 *   ATRIBU_CONNECTION_ID=<uuid from /oauth/token response>
 *   ATRIBU_TO=+15551234567
 */

import { AtribuClient, AtribuApiError } from "@atribu/node";

async function main(): Promise<void> {
  const apiKey = process.env.ATRIBU_API_KEY;
  const connectionId = process.env.ATRIBU_CONNECTION_ID;
  const to = process.env.ATRIBU_TO;
  if (!apiKey || !connectionId || !to) {
    console.error("Missing ATRIBU_API_KEY / ATRIBU_CONNECTION_ID / ATRIBU_TO");
    process.exit(1);
  }

  const atribu = new AtribuClient({ apiKey });

  try {
    const result = await atribu.messages.send({
      connection_id: connectionId,
      channel: "whatsapp",
      to,
      content: { type: "text", text: "Hello from @atribu/node!" },
    });
    console.log("sent:", result);
  } catch (err) {
    if (err instanceof AtribuApiError) {
      console.error(`[${err.code}] ${err.message} (request_id=${err.requestId})`);
      console.error("retry hint:", err.retry);
      process.exit(2);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

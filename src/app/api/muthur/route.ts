import { NextRequest } from "next/server";
import { MUTHUR_SYSTEM_PROMPT } from "@/lib/system-prompt";

let clientPromise: Promise<
  InstanceType<typeof import("@github/copilot-sdk").CopilotClient>
> | null = null;

async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { CopilotClient } = await import("@github/copilot-sdk");

      const opts: Record<string, unknown> = {};

      // Node 22+ path for Copilot CLI (needs node:sqlite)
      if (process.env.NODE_PATH) {
        opts.cliPath = process.env.NODE_PATH;
        opts.cliArgs = [process.env.CLI_PATH || "copilot"];
      }

      // Production: use GITHUB_TOKEN env var for headless auth
      if (process.env.GITHUB_TOKEN) {
        opts.githubToken = process.env.GITHUB_TOKEN;
      }

      const client = new CopilotClient(opts);
      await client.start();
      return client;
    })();
  }
  return clientPromise;
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const client = await getClient();

    const session = await client.createSession({
      model: "claude-sonnet-4-5",
      streaming: true,
      systemMessage: {
        content: MUTHUR_SYSTEM_PROMPT,
      },
    });

    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          session.on("assistant.message_delta", (event) => {
            const data = JSON.stringify({ content: event.data.deltaContent });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          });

          await session.sendAndWait({ prompt });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errMsg =
            error instanceof Error
              ? error.message
              : "UNKNOWN PROCESSING FAILURE";
          const data = JSON.stringify({ error: errMsg });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        } finally {
          await session.destroy().catch(() => {});
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "SYSTEM INITIALIZATION FAILURE";
    return new Response(
      JSON.stringify({
        error: `MU/TH/UR 6000 — SYSTEM FAULT: ${errMsg}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

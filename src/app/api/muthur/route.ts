import { NextRequest } from "next/server";
import { MUTHUR_SYSTEM_PROMPT } from "@/lib/system-prompt";

// CopilotClient and session management
let clientPromise: Promise<InstanceType<
  typeof import("@github/copilot-sdk").CopilotClient
>> | null = null;

async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { CopilotClient } = await import("@github/copilot-sdk");
      const client = new CopilotClient();
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

    // Build the conversation by sending all messages
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || "";

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Listen for streaming deltas
          session.on("assistant.message_delta", (event) => {
            const data = JSON.stringify({ content: event.data.deltaContent });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          });

          // Wait for the response
          await session.sendAndWait({ prompt });

          // Signal completion
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
          // Clean up session
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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

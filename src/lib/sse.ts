export async function readSSE(
  body: ReadableStream<Uint8Array>,
  onContent: (content: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let content = "";
  let completed = false;
  const consume = (event: string) => {
    const data = event.split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart()).join("\n");
    if (!data) return;
    if (data === "[DONE]") {
      completed = true;
      return;
    }
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== "object") throw new Error("INVALID STREAM EVENT");
    if ("error" in parsed) {
      throw new Error(typeof parsed.error === "string" ? parsed.error : "RESPONSE FAILED");
    }
    if ("content" in parsed && typeof parsed.content === "string") {
      content += parsed.content;
      if (content.length > 64_000) throw new Error("RESPONSE TOO LARGE");
      onContent(content);
    }
  };

  try {
    while (!completed) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      // Normalize CRLF only when complete, preserving a trailing CR across reads.
      pending = pending.replace(/\r\n/g, "\n");
      let boundary: number;
      while ((boundary = pending.indexOf("\n\n")) !== -1) {
        consume(pending.slice(0, boundary));
        pending = pending.slice(boundary + 2);
        if (completed) break;
      }
      if (pending.length > 64_000) throw new Error("STREAM EVENT TOO LARGE");
      if (done) break;
    }
    if (!completed) throw new Error("RESPONSE INTERRUPTED — RETRY QUERY");
    return content;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

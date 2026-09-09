import type { AgentEvent } from "./types";

/** The infer writer emits one JSON data line per SSE event. Buffer both UTF-8 and line boundaries. */
export async function* parseAgentStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<AgentEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  function parse(line: string): AgentEvent | null {
    if (!line.startsWith("data:")) return null;
    const data = line.slice(5).trim();
    if (!data) return null;
    const value: unknown = JSON.parse(data);
    return value && typeof value === "object" && "type" in value && typeof value.type === "string" ? value as AgentEvent : null;
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let end: number;
      while ((end = buffer.indexOf("\n")) !== -1) {
        const event = parse(buffer.slice(0, end).replace(/\r$/, ""));
        buffer = buffer.slice(end + 1);
        if (event) yield event;
      }
      if (done) { const event = parse(buffer); if (event) yield event; break; }
    }
  } finally { reader.releaseLock(); }
}

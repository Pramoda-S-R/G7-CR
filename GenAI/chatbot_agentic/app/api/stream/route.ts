// app/api/stream/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const apiUrl = process.env.API_URL || ""; // Replace with your real backend
const apiKey = process.env.AI_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { question, chat_history } = await req.json();

    const aiRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ question, chat_history }),
    });

    if (!aiRes.ok || !aiRes.body) {
      console.error("Failed to fetch backend", aiRes.status);
      return new Response("Failed to connect to AI backend", { status: 500 });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = aiRes.body.getReader();
    let currentEvent: string | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                currentEvent = line.slice(7).trim();
                continue;
              }

              if (currentEvent === "message") {
                if (line.startsWith("data: ")) {
                  const jsonLine = line.slice(6).trim();
                  try {
                    const parsed = JSON.parse(jsonLine);
                    if (parsed.token) {
                      controller.enqueue(encoder.encode(parsed.token));
                    }
                  } catch (err) {
                    console.warn("Invalid JSON line:", jsonLine);
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Stream processing error:", err);
        } finally {
          controller.close();
          reader.cancel().catch(() => {}); // Clean up the reader
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Fatal server error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}

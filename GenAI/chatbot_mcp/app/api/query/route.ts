import { MCPClient } from "@/lib/mcp-client";
import { NextRequest, NextResponse } from "next/server";

let client: MCPClient | null = null;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, chatHistory } = body;

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    if (!client) {
      client = new MCPClient();
      await client.connectToServer();
    }

    const result = await client.processQuery(query, chatHistory);
    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

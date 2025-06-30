import { AzureOpenAI } from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { ChatHistoryItem } from "@/types";

const AZURE_OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
if (!AZURE_OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

export class MCPClient {
  private mcp: Client;
  private azure: AzureOpenAI;
  private transport: StdioClientTransport | null = null;
  private tools: any[] = [];
  private connected = false;

  constructor() {
    this.azure = new AzureOpenAI({
      endpoint: "https://vishn-mbusn60p-swedencentral.openai.azure.com/",
      apiKey: AZURE_OPENAI_API_KEY,
      apiVersion: "2025-01-01-preview",
      deployment: "gpt-4.1",
    });

    this.mcp = new Client({ name: "mcp-next-client", version: "1.0.0" });
  }

  async connectToServer() {
    if (this.connected) return;

    const scriptPath = path.resolve("C:/Pyth/G7-CR/GenAI/mcp_server/main.py"); // adjust if needed
    const command = scriptPath.endsWith(".py")
      ? process.platform === "win32"
        ? "python"
        : "python3"
      : process.execPath;

    this.transport = new StdioClientTransport({ command, args: [scriptPath] });
    await this.mcp.connect(this.transport);

    const toolsResult = await this.mcp.listTools();
    const resource = await this.mcp.listResources();
    this.tools = toolsResult.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));

    this.connected = true;
  }

  async processQuery(
    query: string,
    chatHistory?: ChatHistoryItem[]
  ): Promise<string> {
    const systemPrompt = `When referencing specific sources in your response, use markdown footnotes to indicate which parts of the text come from which source. Use the following structure:
Add a footnote marker (e.g. [^1]) immediately after the relevant sentence or phrase.
At the end of the response, list each source in the following exact format, using matching footnote labels:
[^1]: [name_of_the_pdf](/benefitdocs/source_file#page=page_number)
If multiple sources are used, number them incrementally ([^2], [^3], etc.) and list each one on a new line.
⚠️ Important:
Do not modify the /benefitdocs/ path or the #page= fragment — they must remain exactly as shown.
Format links properly with square brackets [ ] around the document name and parentheses ( ) around the URL.
Only include footnotes for sources that directly support your answer.
If your answer does not reference any specific source, do not include the footnote section.`;

    let prompt = "";
    if (chatHistory && chatHistory.length > 0) {
      prompt = chatHistory
        .map(
          (item) =>
            `User: ${item.inputs.question}\nAi: ${item.outputs.answer}\n`
        )
        .join("");
    }
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt + query },
    ];
    const finalText: string[] = [];

    const chatResponse = await this.azure.chat.completions.create({
      model: "gpt-4.1",
      messages,
      tools: this.tools,
      tool_choice: "auto",
    });

    const responseMessage = chatResponse.choices[0].message;

    if (responseMessage.content) finalText.push(responseMessage.content);

    if (responseMessage.tool_calls?.length) {
      messages.push({
        role: "assistant",
        tool_calls: responseMessage.tool_calls,
      });

      for (const toolCall of responseMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch (e) {
          finalText.push(`Failed to parse arguments for tool ${toolName}`);
          continue;
        }

        const toolResult = await this.mcp.callTool({
          name: toolName,
          arguments: toolArgs,
        });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult.content as string,
        });
      }

      const followup = await this.azure.chat.completions.create({
        model: "gpt-4.1",
        messages,
      });

      const followupMessage = followup.choices[0].message;
      if (followupMessage?.content) finalText.push(followupMessage.content);
    }

    return finalText.join("\n");
  }
}

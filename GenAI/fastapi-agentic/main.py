from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain.callbacks.base import BaseCallbackHandler
from langchain.agents import initialize_agent, Tool, AgentType
from langchain_openai import AzureChatOpenAI
import weaviate
from weaviate.classes.init import Auth
import json
import asyncio

# -------------------- FastAPI App --------------------
app = FastAPI()

# -------------------- Request Models --------------------
class ChatTurn(BaseModel):
    inputs: dict
    outputs: dict

class ChatRequest(BaseModel):
    question: str
    chat_history: list[ChatTurn] = []

# -------------------- Streaming Callback --------------------
class MyCustomHandler(BaseCallbackHandler):
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue

    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        # Encode the token safely with json.dumps to preserve whitespace
        await self.queue.put(json.dumps({"token": token}))

# -------------------- Tool Function --------------------
def make_search_documents(queue: asyncio.Queue):
    def search_documents(query: str):
        asyncio.create_task(queue.put(json.dumps({
            "tool": "search_documents"
        })))
        weaviate_url = '3tovdeihtdsygyyan0z3aa.c0.asia-southeast1.gcp.weaviate.cloud'
        weaviate_api_key = "R0hodm5yeHlmeTdmMU1DU19Yc2ErR0dmNXA1djZLVWFpc2hMaEdqbDBNbjRWVUVhVng4ZVJ3QzZxbWtVPV92MjAw"

        context_data = []

        client = weaviate.connect_to_weaviate_cloud(
            cluster_url=weaviate_url,
            auth_credentials=Auth.api_key(weaviate_api_key)
        )
        if not client.is_ready():
            raise RuntimeError("Weaviate client not ready!")

        collection = client.collections.get("PdfChunks")
        response = collection.query.near_text(query=query, limit=10)
        client.close()

        for obj in response.objects:
            context_data.append(obj.properties)

        return json.dumps(context_data)
    
    return search_documents

# -------------------- System Prompt --------------------
SYSTEM_PROMPT = """When referencing specific sources in your response, use markdown footnotes to indicate which parts of the text come from which source. Use the following structure:
Add a footnote marker (e.g. [^1]) immediately after the relevant sentence or phrase.
At the end of the response, list each source in the following exact format, using matching footnote labels:
[^1]: [name_of_the_pdf](/benefitdocs/source_file#page=page_number)
If multiple sources are used, number them incrementally ([^2], [^3], etc.) and list each one on a new line.
⚠️ Important:
Do not modify the /benefitdocs/ path or the #page= fragment — they must remain exactly as shown.
Format links properly with square brackets [ ] around the document name and parentheses ( ) around the URL.
Only include footnotes for sources that directly support your answer.
If your answer does not reference any specific source, do not include the footnote section."""

# -------------------- Streaming Chat Endpoint --------------------
@app.post("/chat/stream")
async def stream_chat(request: Request, body: ChatRequest):
    async def event_generator():
        question = body.question
        chat_history = body.chat_history
        history = ""
        for turn in chat_history:
            history += f"\nUser: {turn.inputs['question']}\nAssistant: {turn.outputs['answer']}"
        full_prompt = f"{SYSTEM_PROMPT}\n{history}\nUser: {question}"

        # Setup queue and handler
        queue = asyncio.Queue()
        handler = MyCustomHandler(queue)

        # Streaming LLM with handler
        streaming_llm = AzureChatOpenAI(
            azure_deployment="gpt-4.1",
            api_version="2025-01-01-preview",
            temperature=0,
            streaming=True,
            callbacks=[handler],
            azure_endpoint="https://vishn-mbusn60p-swedencentral.openai.azure.com/",
            api_key="4NX3FZfJZqlhxBSkfzITV5vLqhdxvg4gz0uQJwjtxlrkU1WKkUcZJQQJ99BFACfhMk5XJ3w3AAAAACOGZLMY",
        )
        
        # Define tools
        tool_func = make_search_documents(queue)
        tools = [
            Tool(
                name="search_documents",
                func=tool_func,
                description="Searches Weaviate for similar text chunks based on a natural language query. Returns JSON string of context data with 'text' and 'metadata'."
            )
        ]

        # Create the agent
        agent = initialize_agent(
            tools=tools,
            llm=streaming_llm,
            agent=AgentType.OPENAI_FUNCTIONS,
            verbose=False,
        )

        # Run the agent in the background
        async def run_agent():
            try:
                agent.invoke(full_prompt)
            except Exception as e:
                await queue.put(json.dumps({"error": str(e)}))
            await queue.put("[DONE]")

        asyncio.create_task(run_agent())

        # Read and yield tokens from queue
        while True:
            item = await queue.get()

            if item == "[DONE]":
                yield "event: end\ndata: [DONE]\n\n"
                break
            else:
                try:
                    parsed = json.loads(item)
                    if "token" in parsed:
                        yield f"event: message\ndata: {item}\n\n"
                    elif "tool" in parsed:
                        yield f"event: tool\ndata: {item}\n\n"
                    elif "error" in parsed:
                        yield f"event: error\ndata: {parsed['error']}\n\n"
                        break
                except json.JSONDecodeError:
                    yield f"event: message\ndata: {item}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"}
    )

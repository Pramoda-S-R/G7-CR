import os
import json
from typing import List
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AzureOpenAI
import weaviate
from weaviate.classes.init import Auth
import asyncio

# Initialize FastAPI app
app = FastAPI()

# Azure OpenAI configuration
endpoint = os.getenv("ENDPOINT_URL", "https://vishn-mbusn60p-swedencentral.openai.azure.com/")
deployment = os.getenv("DEPLOYMENT_NAME", "gpt-4.1")
subscription_key = "4NX3FZfJZqlhxBSkfzITV5vLqhdxvg4gz0uQJwjtxlrkU1WKkUcZJQQJ99BFACfhMk5XJ3w3AAAAACOGZLMY"

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=subscription_key,
    api_version="2025-01-01-preview",
)

system_message = """
You are a helpful assistant that answers user questions based strictly on the provided context. Do not mention that you are an AI model or refer to retrieving data from a database.

Your responses should be clear, concise, and relevant to the user's question. If the context does not contain enough information to answer the question accurately, respond with: "I don't know" or "I don't have that information."

At the end of your response, always include the source(s) in clickable markdown link format, following this exact structure:
- Source: [name_of_the_pdf](/benefitdocs/source_file#page=page_number)

If multiple sources are used, list each markdown link on a new line.

If your answer does not reference any specific source, do not include the source section.

⚠️ Important:
- Do not modify the `/benefitdocs/` path or the `#page=` fragment — they must be preserved exactly.
- Make sure all links are properly formatted with square brackets around the name and parentheses around the URL.

Only include sources that directly support your response.
"""


def query_weaviate(
    query_text,
    collection_name="PdfChunks",
    weaviate_url = "3tovdeihtdsygyyan0z3aa.c0.asia-southeast1.gcp.weaviate.cloud",
    weaviate_api_key = "R0hodm5yeHlmeTdmMU1DU19Yc2ErR0dmNXA1djZLVWFpc2hMaEdqbDBNbjRWVUVhVng4ZVJ3QzZxbWtVPV92MjAw",
    limit=15
):
    """
    Queries Weaviate for similar text chunks based on a natural language query.

    Args:
        query_text (str): The query text to search for.
        collection_name (str): Weaviate collection name.
        weaviate_url (str): Weaviate Cloud URL (REST endpoint).
        weaviate_api_key (str): Weaviate Cloud API key.
        limit (int): Number of results to return.

    Returns:
        str: JSON string of context data with 'text' and 'metadata'.
    """
    # Use environment variables if not passed explicitly
    weaviate_url = weaviate_url or os.getenv("WEAVIATE_URL")
    weaviate_api_key = weaviate_api_key or os.getenv("WEAVIATE_API_KEY")

    context_data = []

    if not weaviate_url or not weaviate_api_key:
        raise ValueError("Weaviate URL and API key must be set either as arguments or environment variables.")
    
    # Connect to Weaviate Cloud
    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=weaviate_url,
        auth_credentials=Auth.api_key(weaviate_api_key)
    )
    if not client.is_ready():
        raise RuntimeError("Weaviate client not ready!")
    
    # Get collection
    collection = client.collections.get(collection_name)

    # Query for similar text chunks
    response = collection.query.near_text(
        query=query_text,  # The model provider integration will automatically vectorize the query
        limit=limit
    )
    client.close()
    
    for obj in response.objects:
        context_data.append(obj.properties)

    return json.dumps(context_data)

# Pydantic model for request
class QueryRequest(BaseModel):
    question: str
    chat_history: List[str] = []

# Streaming generator
async def stream_openai_response(question: str, chat_history: List[dict]):
    context = query_weaviate(question)

    # Build the chat history string
    formatted_history = ""
    for turn in chat_history:
        user_question = turn.get("inputs", {}).get("question", "")
        ai_answer = turn.get("outputs", {}).get("answer", "")
        if user_question and ai_answer:
            formatted_history += f"user: {user_question}\nai: {ai_answer}\n"

    def sync_openai_stream():
        chat_prompt = [
            {
                "role": "system",
                "content": [{"type": "text", "text": system_message}]
            },
            {
                "role": "user",
                "content": [{"type": "text", "text": formatted_history + f"user: {question}\ncontext: {context}"}]
            }
        ]

        response = client.chat.completions.create(
            model=deployment,
            messages=chat_prompt,
            temperature=1,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            max_tokens=32768,
            stream=True
        )

        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                json_line = json.dumps({"answer": content})
                yield f"data: {json_line}\n\n"

    loop = asyncio.get_event_loop()
    for chunk in sync_openai_stream():
        yield chunk
        await asyncio.sleep(0)

# Main endpoint
@app.post("/query")
async def handle_query(request: Request, authorization: str = Header(None)):
    # Optional auth check
    expected_key = os.getenv("AI_API_KEY", "secret-api-key")
    if authorization != f"Bearer {expected_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    question = body.get("question")
    chat_history = body.get("chat_history", [])

    if not question:
        raise HTTPException(status_code=400, detail="Missing 'question'")

    return StreamingResponse(
        stream_openai_response(question, chat_history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked"
        }
    )
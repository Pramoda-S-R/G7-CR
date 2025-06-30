# main.py
from mcp.server.fastmcp import FastMCP
import weaviate
from weaviate.classes.init import Auth
import json

# Create an MCP server
mcp = FastMCP("GenAIMCP")

# Add an addition tool
@mcp.tool(description="A tool to search for information in documents.")
def search_documents(query: str):
    """Search for information in documents related to Contoso, Nothwind, Microsoft, their helath benefit plans, job role details etc. The query should be a string."""
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


# Add a dynamic greeting resource
@mcp.resource("greeting://{name}")
def get_greeting(name: str) -> str:
    """Get a personalized greeting"""
    return f"Hello, {name}!"

if __name__ == "__main__":
    # Start the MCP server
    mcp.run()
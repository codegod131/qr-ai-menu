import os
import logging
from google import genai
from google.genai import types
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Initialize client wrapper. The google-genai Client automatically uses GEMINI_API_KEY from environment.
client = None
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
else:
    logger.warning("GEMINI_API_KEY env variable is not set. Embedding generation may fail.")

def formulate_item_text(name: str, description: str, tags: list[str]) -> str:
    """
    Formulates a clean context text from an item's details to optimize semantic understanding.
    """
    tags_str = ", ".join(tags) if tags else "none"
    return f"Name: {name}. Description: {description}. Tags: {tags_str}."

def get_gemini_embedding(text: str) -> list[float]:
    """
    Generates 768-dimension embeddings using the Gemini text-embedding-004 model.
    """
    global client
    if not client:
        current_key = os.getenv("GEMINI_API_KEY")
        if not current_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GEMINI_API_KEY is not configured on the server."
            )
        client = genai.Client(api_key=current_key)
    
    try:
        response = client.models.embed_content(
            model="text-embedding-004",
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT", # Optimized for catalog indexing/documents
            )
        )
        if response.embeddings and len(response.embeddings) > 0:
            return response.embeddings[0].values
        
        raise ValueError("Empty embeddings list returned from Gemini API")
    except Exception as e:
        logger.error(f"Error calling Gemini Embedding API: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate embedding from Gemini: {str(e)}"
        )

def get_item_embedding(name: str, description: str, tags: list[str]) -> list[float]:
    """
    Convenience wrapper that formats the item text and retrieves the embedding vector.
    """
    formatted_text = formulate_item_text(name, description, tags)
    return get_gemini_embedding(formatted_text)

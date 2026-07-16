import os
import logging
from google import genai
from google.genai import types
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Initialize client wrapper using Application Default Credentials (ADC) via Vertex AI / Enterprise Agent Platform.
client = None
try:
    client = genai.Client()
    logger.info("Gemini Client initialized successfully using Application Default Credentials.")
except Exception as e:
    logger.warning(
        f"Could not initialize Gemini Client: {e}. "
        "Embedding generation will fall back to dummy vectors."
    )
    client = None

def formulate_item_text(name: str, description: str, tags: list[str]) -> str:
    """
    Formulates a clean context text from an item's details to optimize semantic understanding.
    """
    tags_str = ", ".join(tags) if tags else "none"
    return f"Name: {name}. Description: {description}. Tags: {tags_str}."

def get_gemini_embedding(text: str) -> list[float]:
    """
    Generates 3072-dimension embeddings using the Gemini Embedding 2 model.
    """
    global client

    # Attempt to re-initialize client if not ready
    if not client:
        try:
            client = genai.Client()
        except Exception:
            pass

    if not client:
        logger.warning("Gemini Client not configured (no API key or Application Default Credentials). Returning dummy embedding.")
        return [0.0] * 3072

    try:
        response = client.models.embed_content(
            model="gemini-embedding-2",
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


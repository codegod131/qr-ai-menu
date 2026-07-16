# Embedding Generation Guide & Code snippets

This guide details how to generate and handle embeddings in the Python FastAPI backend.

---

## 1. Source Text Formulation
Always combine fields cleanly so that the vector represents both the name and the descriptive properties.

```python
def formulate_item_text(name: str, description: str, tags: list[str]) -> str:
    tags_str = ", ".join(tags) if tags else "none"
    return f"Name: {name}. Description: {description}. Tags: {tags_str}."
```

---

## 2. Gemini Embedding Implementation (Recommended)

Using Google's `google-generativeai` SDK:

```python
import google.generativeai as genai
import os

# Initialize key
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def get_gemini_embedding(text: str) -> list[float]:
    """
    Generates 3072-dimension embeddings using gemini-embedding-2.
    """
    response = genai.embed_content(
        model="models/gemini-embedding-2",
        content=text,
        task_type="retrieval_document", # or "retrieval_query" for queries
    )
    return response['embedding']
```

---

## 3. OpenAI Embedding Implementation (Alternative)

Using the official `openai` SDK:

```python
from openai import OpenAI
import os

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def get_openai_embedding(text: str) -> list[float]:
    """
    Generates 1536-dimension embeddings using text-embedding-3-small.
    """
    # Replace newlines as recommended by OpenAI documentation
    clean_text = text.replace("\n", " ")
    
    response = client.embeddings.create(
        input=[clean_text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding
```

---

## 4. Query Embedding Task Types
When performing a search, query texts should be embedded with `task_type="retrieval_query"` (for Gemini gemini-embedding-2) to optimize relevance.

```python
def get_gemini_query_embedding(query: str) -> list[float]:
    response = genai.embed_content(
        model="models/gemini-embedding-2",
        content=query,
        task_type="retrieval_query",
    )
    return response['embedding']
```

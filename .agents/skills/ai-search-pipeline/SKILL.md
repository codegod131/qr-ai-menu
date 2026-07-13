---
name: ai-search-pipeline
description: >-
  Use this skill to implement the AI backend for the QR AI Menu, including Supabase + pgvector schemas, embedding generation, vector similarity searches, LLM re-ranking, and Malayalam/local language translation pipelines.
---

# AI Search Pipeline Skill

This skill guides the implementation of the core search pipeline of the project. It covers database tables, embeddings, similarity searches, LLM explanations, and local language translation workarounds.

```mermaid
graph TD
    UserQuery[User Text Query] --> Trans[MAL -> ENG Translate (Optional)]
    Trans --> Embed[Generate Embeddings]
    Embed --> VecSearch[pgvector Cosine Search]
    VecSearch --> Rank[LLM Re-rank & Explain]
    Rank --> OutTrans[ENG -> MAL Explain (Optional)]
    OutTrans --> Final[Ranked Results + Explanations]
```

---

## 1. Database Schema (Supabase + pgvector)

Ensure `pgvector` extension is enabled. Define tables for `business` and `items`:

* **`business`**: Identifies the client vendor.
  * Fields: `id`, `name`, `slug` (unique string, e.g. `hotel-malabar`), `pin` (simple code), `created_at`.
* **`items`**: Menu/inventory items with embedding vectors.
  * Fields: `id`, `business_id`, `name`, `price`, `description`, `tags` (text array), `embedding` (vector type), `image_url` (optional), `created_at`.

For the SQL schema, refer to:
[schema.sql](./references/schema.sql)

---

## 2. Embeddings Pipeline

Whenever an item is created or updated, we must generate a vector embedding of its textual attributes.

### Key Guidelines:
1. **Source Text**: Combine attributes into a single string to preserve context:
   `text_to_embed = f"Name: {item.name}. Description: {item.description}. Tags: {', '.join(item.tags)}."`
2. **Model Choice**: Use standard embedding models:
   - **Gemini**: `text-embedding-004` (768 dimensions)
   - **OpenAI**: `text-embedding-3-small` (1536 dimensions)
3. **Storage**: Save the vector list directly into the `embedding` column of the `items` table.

For Python code examples to fetch embeddings, refer to:
[embeddings.md](./references/embeddings.md)

---

## 3. Vector Similarity Search (`/api/query`)

To perform the similarity query in Supabase, define a Postgres function (`match_items`) to calculate cosine similarity and filter by the `business_slug`:

```sql
CREATE OR REPLACE FUNCTION match_items (
  query_embedding vector,
  match_threshold float,
  match_count int,
  target_business_slug varchar
)
RETURNS TABLE (
  id uuid,
  name text,
  price numeric,
  description text,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    items.id,
    items.name,
    items.price,
    items.description,
    items.tags,
    1 - (items.embedding <=> query_embedding) AS similarity
  FROM items
  JOIN business ON items.business_id = business.id
  WHERE business.slug = target_business_slug
    AND 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 4. LLM Re-Ranking & Explanation Generator

After retrieving the top $K$ items (e.g. $K=5$) from vector search, use a fast LLM call (e.g., Gemini Flash or Claude 3.5 Haiku) to:
1. Re-rank the items according to how well they satisfy the intent of the query.
2. Generate a personalized, one-line explanation for each item: **"Why this matches"**.

### Sample Prompt:
```text
You are a helpful assistant. A user searched for: "{query}" in the catalog of a business.
Here are the top matches from our vector database:
{items_json}

Please re-rank these items based on their relevance to the search.
For each item, output:
- Item ID
- Relevance Rank (1 to 5)
- A brief, one-sentence explanation of why it fits the query (e.g., "This dish is highly rated for spice and easily feeds two people.").
```

---

## 5. Local Language & Translation Workaround

If the user queries or adds items in Malayalam (MAL) or another local language, follow this strategy to maintain high search quality while avoiding separate non-English embedding pipelines:

1. **Query Translation**:
   - Detect if query contains non-English characters.
   - Translate query to English using a lightweight LLM call: `Translate this search query to English: "{query}"`.
   - Run the vector search and LLM ranking using the English translation.
2. **Response Translation**:
   - Generate the "Why this matches" explanation in English first.
   - Translate the explanation back to the original query language: `Translate this explanation to Malayalam: "{explanation}"`.
   - Display the translated explanation to the customer.
3. **Fallback**: If speech-to-text is used, leverage Google Gemini/Cloud speech APIs supporting Malayalam.

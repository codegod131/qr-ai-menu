# AI / Search Actionable Tasks
**Owner:** Member 2 (Role B)
**Stack:** FastAPI, LLM Provider (OpenAI/Claude/Gemini), pgvector

## Day 1: Foundations
- [ ] Set up text embedding pipeline (integrate chosen LLM API or local model).
- [ ] Prototype semantic search on dummy hardcoded items to prove vector similarity works in isolation.

## Day 2: Core Loop + AI Integration
- [ ] Wire embeddings into the Item creation flow (auto-embed `name + description + tags` upon save).
- [ ] Build the `/query` endpoint:
  - Receive free-text query from frontend.
  - Embed the query text.
  - Perform vector similarity search (k-nearest neighbors) against the `Item` table in Supabase `pgvector`.
- [ ] Implement LLM re-ranking step (Optional but recommended):
  - Take top K vector search results (un-ranked result set).
  - Prompt LLM to re-rank based on the user's natural language query.
  - Generate a short "why this matches" text explanation for the top 3-5 items.

## Day 3: Measure + Learn + Polish
- [ ] Tune search relevance: handle bad matches, empty results, and ambiguous queries.
- [ ] Harden the `/query` endpoint for performance and error cases.
- [ ] Participate in relevance review (Did semantic search beat a plain list?).

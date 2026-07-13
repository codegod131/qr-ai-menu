-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Business Table (Clients/Vendors)
CREATE TABLE IF NOT EXISTS business (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    pin VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Items Table (Catalog Items)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES business(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    -- Vector dimension depends on embedding model:
    -- 768 for Gemini text-embedding-004
    -- 1536 for OpenAI text-embedding-3-small
    embedding vector(768), 
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create a vector index for fast similarity search (HNSW index)
-- Note: Replace '<=>' with '<#>' for inner product, or '<->' for L2 distance.
-- Cosine distance (<=>) is recommended for general semantic search.
CREATE INDEX IF NOT EXISTS items_embedding_hnsw_idx 
ON items 
USING hnsw (embedding vector_cosine_ops);

-- Search Logs Table (for Analytics/Innovation Accounting)
CREATE TABLE IF NOT EXISTS search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    business_slug VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    results_returned JSONB,
    selected_item_id UUID,
    response_time_ms INT,
    thumbs_rating BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Function for matching items based on vector distance and filtering by business slug
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

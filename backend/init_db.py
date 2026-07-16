import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

def get_normalized_db_url():
    raw_url = os.getenv("DATABASE_URL")
    db_url = raw_url
    if db_url and db_url.startswith("/postgres:"):
        db_url = "postgresql://postgres:" + db_url[len("/postgres:"):]
    elif db_url and db_url.startswith("postgres://"):
        db_url = "postgresql://" + db_url[len("postgres://"):]
    return db_url

SQL_SCHEMA = """
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
    -- Vector dimension: 3072 for Gemini Embedding 2
    embedding halfvec(3072), 
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create a vector index for fast similarity search (HNSW index)
CREATE INDEX IF NOT EXISTS items_embedding_hnsw_idx 
ON items 
USING hnsw (embedding halfvec_cosine_ops);

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
  query_embedding halfvec,
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
    items.name::text,
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
"""

def init_db():
    db_url = get_normalized_db_url()
    print("Connecting to database...")
    try:
        connection = psycopg2.connect(db_url)
        connection.autocommit = True
        cursor = connection.cursor()
        
        print("Executing schema...")
        cursor.execute(SQL_SCHEMA)
        print("Schema applied successfully!")
        
        cursor.close()
        connection.close()
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise

if __name__ == "__main__":
    init_db()

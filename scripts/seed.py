import os
import sys
import csv
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add backend directory to sys.path so we can import from database and embeddings
scripts_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(scripts_dir)
backend_dir = os.path.join(project_root, 'backend')
sys.path.append(backend_dir)

# Load environment variables from backend/.env
dotenv_path = os.path.join(backend_dir, '.env')
load_dotenv(dotenv_path)

from database import get_db_conn
from embeddings import get_item_embedding

# Constants
BUSINESS_ID = "728e8535-4cc3-4c70-b505-213b3095fb8f"
CSV_FILENAME = "items.csv"

def clean_price(price_str: str) -> float:
    if not price_str:
        return 0.0
    # Keep only digits and decimal point
    cleaned = ''.join(c for c in price_str if c.isdigit() or c == '.')
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def seed():
    csv_path = os.path.join(scripts_dir, CSV_FILENAME)
    if not os.path.exists(csv_path):
        logger.error(f"CSV file not found at: {csv_path}")
        sys.exit(1)

    logger.info(f"Reading items from CSV: {csv_path}")
    items_to_seed = []
    
    with open(csv_path, mode='r', encoding='utf-8') as f:
        # Some CSVs might have trailing commas or empty lines at the start.
        first_line = f.readline().strip()
        # If the first line doesn't look like a header (e.g. contains only commas),
        # we skip it and DictReader will read the next line as header
        if not first_line or all(c == ',' for c in first_line):
            logger.info("Skipped empty/corrupt first line of CSV.")
        else:
            # reset to start
            f.seek(0)
            
        reader = csv.DictReader(f)
        for line_num, row in enumerate(reader, start=2):
            name = row.get('name')
            if not name or not name.strip() or name.strip().lower() == 'name':
                # Skip empty lines or header duplicates
                continue
                
            price_raw = row.get('price', '0')
            price = clean_price(price_raw)
            description = row.get('description', '').strip()
            
            tags_raw = row.get('tags', '')
            tags = [t.strip() for t in tags_raw.split(',') if t.strip()] if tags_raw else []
            
            image_url = row.get('url', '').strip()
            
            items_to_seed.append({
                'name': name.strip(),
                'price': price,
                'description': description,
                'tags': tags,
                'image_url': image_url
            })

    total_items = len(items_to_seed)
    logger.info(f"Parsed {total_items} items to seed.")

    if total_items == 0:
        logger.warning("No items found to seed.")
        return

    # Database operation
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                # 1. Ensure business exists
                cur.execute("SELECT id, name, slug FROM business WHERE id = %s", (BUSINESS_ID,))
                biz = cur.fetchone()
                if not biz:
                    logger.info(f"Business with ID {BUSINESS_ID} does not exist. Checking slug 'cafe-mocha'...")
                    cur.execute("SELECT id FROM business WHERE slug = %s", ("cafe-mocha",))
                    existing_slug = cur.fetchone()
                    if existing_slug:
                        logger.info(f"Found business with slug 'cafe-mocha' (ID: {existing_slug[0]}). Deleting to recreate with ID {BUSINESS_ID}.")
                        cur.execute("DELETE FROM business WHERE id = %s", (existing_slug[0],))
                    
                    logger.info(f"Inserting business ID {BUSINESS_ID} into 'business' table...")
                    cur.execute(
                        "INSERT INTO business (id, name, slug, pin) VALUES (%s, %s, %s, %s)",
                        (BUSINESS_ID, "Café Mocha", "cafe-mocha", "mocha123")
                    )
                    logger.info("Default business inserted successfully.")
                else:
                    logger.info(f"Business exists: ID={biz[0]}, Name={biz[1]}, Slug={biz[2]}")

                # 2. Delete existing items for the business to start fresh
                logger.info(f"Deleting existing items for business {BUSINESS_ID} to prevent duplicates...")
                cur.execute("DELETE FROM items WHERE business_id = %s", (BUSINESS_ID,))
                
                # 3. Insert items
                logger.info("Inserting items into the database...")
                for idx, item in enumerate(items_to_seed, start=1):
                    name = item['name']
                    price = item['price']
                    description = item['description']
                    tags = item['tags']
                    image_url = item['image_url']
                    
                    logger.info(f"[{idx}/{total_items}] Generating embedding for: {name}")
                    try:
                        # Call backend function to generate item embedding vector
                        embedding_vector = get_item_embedding(name, description, tags)
                        # Format as pgvector compatible string if it's a list
                        if isinstance(embedding_vector, list):
                            vector_str = f"[{','.join(map(str, embedding_vector))}]"
                        else:
                            vector_str = embedding_vector
                    except Exception as e:
                        logger.warning(f"Failed to generate embedding for {name}: {e}. Falling back to 3072-dim zero vector.")
                        vector_str = f"[{','.join(['0.0']*3072)}]"

                    cur.execute(
                        """
                        INSERT INTO items (business_id, name, price, description, tags, image_url, embedding)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (BUSINESS_ID, name, price, description, tags, image_url if image_url else None, vector_str)
                    )
                    
        logger.info("Seeding completed successfully!")
    except Exception as e:
        logger.error(f"Database error during seeding: {e}")
        sys.exit(1)

if __name__ == "__main__":
    seed()

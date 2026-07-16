import io
import base64
import os
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Header, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import qrcode
import psycopg2
from psycopg2.extras import RealDictCursor

from database import get_db
from embeddings import get_item_embedding
from search_pipeline import search_vector_menu, transcribe_audio
from storage import upload_base64_image

app = FastAPI(title="QR AI Menu Backend")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---

class BusinessCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    pin: str = Field(..., min_length=1, max_length=20)

class BusinessUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    pin: str = Field(..., min_length=1, max_length=20)

class BusinessResponse(BaseModel):
    id: str
    name: str
    slug: str
    pin: str
    created_at: datetime

class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    price: float = Field(..., gt=0)
    description: str
    tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None

class ItemUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    price: float = Field(..., gt=0)
    description: str
    tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None

class ItemResponse(BaseModel):
    id: str
    business_id: str
    business_slug: Optional[str] = None
    name: str
    price: float
    description: str
    tags: List[str]
    image_url: Optional[str] = None
    created_at: datetime

class QRRequest(BaseModel):
    url: str

# --- Authentication Dependency ---

def verify_business(
    x_business_slug: str = Header(..., description="The unique slug of the business"),
    x_business_pin: str = Header(..., description="The PIN code of the business for authorization"),
    conn = Depends(get_db)
):
    """
    Dependency to authenticate a client using Business Code (slug and PIN).
    Returns the authenticated business details if correct, otherwise raises HTTP exception.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id, name, slug, pin FROM business WHERE slug = %s",
            (x_business_slug,)
        )
        business = cur.fetchone()
        if not business:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business with slug '{x_business_slug}' not found"
            )
        
        if business["pin"] != x_business_pin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid business PIN"
            )
        
        return business

# --- General Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to QR AI Menu Backend"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/generate-qr")
def generate_qr(req: QRRequest):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(req.url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return {"qr_code_base64": img_str}

@app.get("/api/qr/{business_slug}")
def get_business_qr(business_slug: str, conn = Depends(get_db)):
    """
    Generate and serve a QR code image for a business menu.
    Scanning the QR code redirects the customer to:
    http://frontend.url/menu/{business_slug}
    """
    # 1. Verify that the business exists
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id, name, slug FROM business WHERE slug = %s",
            (business_slug.strip().lower(),)
        )
        business = cur.fetchone()
        if not business:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business with slug '{business_slug}' not found"
            )
    
    # 2. Get frontend URL from env
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    menu_url = f"{frontend_url}/menu/{business['slug']}"
    
    # 3. Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(menu_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    # 4. Save to buffer and return as streaming image response
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    buffered.seek(0)
    
    return StreamingResponse(buffered, media_type="image/png")

# --- Business CRUD Endpoints ---

@app.post("/api/business", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
def create_business(business: BusinessCreate, conn = Depends(get_db)):
    """
    Register/Onboard a new business.
    """
    # Clean slug to lowercase
    slug = business.slug.strip().lower()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO business (name, slug, pin)
                VALUES (%s, %s, %s)
                RETURNING id, name, slug, pin, created_at
                """,
                (business.name.strip(), slug, business.pin.strip())
            )
            new_business = cur.fetchone()
            return new_business
    except psycopg2.IntegrityError as e:
        # Check if it is a unique key violation on slug
        if "slug" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Business slug '{slug}' already exists. Please choose another one."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e)}"
        )

@app.get("/api/business/{slug}", response_model=BusinessResponse)
def get_business(slug: str, conn = Depends(get_db)):
    """
    Fetch details of a business by slug.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id, name, slug, pin, created_at FROM business WHERE slug = %s",
            (slug.strip().lower(),)
        )
        business = cur.fetchone()
        if not business:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business with slug '{slug}' not found"
            )
        return business

@app.get("/api/business", response_model=List[BusinessResponse])
def list_businesses(conn = Depends(get_db)):
    """
    List all businesses.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, name, slug, pin, created_at FROM business ORDER BY name ASC")
        return cur.fetchall()

@app.put("/api/business/{slug}", response_model=BusinessResponse)
def update_business(
    slug: str,
    business_update: BusinessUpdate,
    current_business = Depends(verify_business),
    conn = Depends(get_db)
):
    """
    Update business details. Requires authentication headers.
    Only the matching business owner can update their business details.
    """
    target_slug = slug.strip().lower()
    if current_business["slug"] != target_slug:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this business"
        )
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE business
            SET name = %s, pin = %s
            WHERE slug = %s
            RETURNING id, name, slug, pin, created_at
            """,
            (business_update.name.strip(), business_update.pin.strip(), target_slug)
        )
        updated = cur.fetchone()
        return updated

@app.delete("/api/business/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business(
    slug: str,
    current_business = Depends(verify_business),
    conn = Depends(get_db)
):
    """
    Delete a business. Requires authentication headers.
    Only the matching business owner can delete their business.
    """
    target_slug = slug.strip().lower()
    if current_business["slug"] != target_slug:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this business"
        )
    
    with conn.cursor() as cur:
        cur.execute("DELETE FROM business WHERE slug = %s", (target_slug,))
    return None


# --- Item CRUD Endpoints ---

@app.post("/api/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    item: ItemCreate,
    current_business = Depends(verify_business),
    conn = Depends(get_db)
):
    """
    Create a new catalog item. Requires authentication headers.
    The item is automatically linked to the authenticated business.
    """
    # Check and upload base64 image if provided
    if item.image_url and item.image_url.startswith("data:image/"):
        try:
            uploaded_url = upload_base64_image(item.image_url)
            if uploaded_url:
                item.image_url = uploaded_url
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload item image: {str(e)}"
            )

    # Generate the vector embedding using text-embedding-004 model
    embedding_vector = get_item_embedding(item.name, item.description, item.tags)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO items (business_id, name, price, description, tags, image_url, embedding)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, business_id, name, price, description, tags, image_url, created_at
            """,
            (
                current_business["id"],
                item.name.strip(),
                item.price,
                item.description.strip(),
                item.tags,
                item.image_url,
                embedding_vector
            )
        )
        new_item = cur.fetchone()
        if new_item:
            new_item["business_slug"] = current_business["slug"]
        return new_item

@app.get("/api/items", response_model=List[ItemResponse])
def list_items(business_slug: Optional[str] = None, conn = Depends(get_db)):
    """
    List items. Optionally filtered by business_slug.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if business_slug:
            cur.execute(
                """
                SELECT i.id, i.business_id, b.slug AS business_slug, i.name, i.price, i.description, i.tags, i.image_url, i.created_at
                FROM items i
                JOIN business b ON i.business_id = b.id
                WHERE b.slug = %s
                ORDER BY i.name ASC
                """,
                (business_slug.strip().lower(),)
            )
        else:
            cur.execute(
                """
                SELECT i.id, i.business_id, b.slug AS business_slug, i.name, i.price, i.description, i.tags, i.image_url, i.created_at
                FROM items i
                JOIN business b ON i.business_id = b.id
                ORDER BY i.name ASC
                """
            )
        return cur.fetchall()

@app.get("/api/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: str, conn = Depends(get_db)):
    """
    Fetch an item by ID.
    """
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT i.id, i.business_id, b.slug AS business_slug, i.name, i.price, i.description, i.tags, i.image_url, i.created_at
                FROM items i
                JOIN business b ON i.business_id = b.id
                WHERE i.id = %s
                """,
                (item_id,)
            )
            item = cur.fetchone()
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item with ID '{item_id}' not found"
                )
            return item
    except psycopg2.Error as e:
        # Catch invalid UUID format error
        if "invalid input syntax for type uuid" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid item ID format: '{item_id}'"
            )
        raise

@app.put("/api/items/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: str,
    item_update: ItemUpdate,
    current_business = Depends(verify_business),
    conn = Depends(get_db)
):
    """
    Update item details. Requires authentication headers.
    Only the business owner who owns the item can update it.
    """
    # 1. Fetch item to check ownership
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT business_id FROM items WHERE id = %s", (item_id,))
            item = cur.fetchone()
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item with ID '{item_id}' not found"
                )
            
            # Check if this item belongs to the authenticated business
            if str(item["business_id"]) != str(current_business["id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to update items for another business"
                )
            
        # Check and upload base64 image if provided
        if item_update.image_url and item_update.image_url.startswith("data:image/"):
            try:
                uploaded_url = upload_base64_image(item_update.image_url)
                if uploaded_url:
                    item_update.image_url = uploaded_url
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload item image: {str(e)}"
                )

        # Generate new vector embedding using text-embedding-004 model
        embedding_vector = get_item_embedding(item_update.name, item_update.description, item_update.tags)
            
        # 2. Update the item
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE items
                SET name = %s, price = %s, description = %s, tags = %s, image_url = %s, embedding = %s
                WHERE id = %s
                RETURNING id, business_id, name, price, description, tags, image_url, created_at
                """,
                (
                    item_update.name.strip(),
                    item_update.price,
                    item_update.description.strip(),
                    item_update.tags,
                    item_update.image_url,
                    embedding_vector,
                    item_id
                )
            )
            updated = cur.fetchone()
            if updated:
                updated["business_slug"] = current_business["slug"]
            return updated
    except psycopg2.Error as e:
        if "invalid input syntax for type uuid" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid item ID format: '{item_id}'"
            )
        raise

@app.delete("/api/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: str,
    current_business = Depends(verify_business),
    conn = Depends(get_db)
):
    """
    Delete an item. Requires authentication headers.
    Only the business owner who owns the item can delete it.
    """
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT business_id FROM items WHERE id = %s", (item_id,))
            item = cur.fetchone()
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item with ID '{item_id}' not found"
                )
            
            # Check if this item belongs to the authenticated business
            if str(item["business_id"]) != str(current_business["id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to delete items for another business"
                )
            
            # Delete the item
            cur.execute("DELETE FROM items WHERE id = %s", (item_id,))
    except psycopg2.Error as e:
        if "invalid input syntax for type uuid" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid item ID format: '{item_id}'"
            )
        raise
    return None


@app.post("/api/query")
async def query_menu(
    business_slug: str = Form(...),
    query: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None)
):
    """
    Unified vector search endpoint supporting text search and speech-to-text voice search.
    """
    if not query and not audio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either query (text) or audio file must be provided."
        )

    # 1. Handle voice input transcription
    search_text = query
    if audio:
        try:
            audio_bytes = await audio.read()
            if len(audio_bytes) == 0:
                raise ValueError("Uploaded audio file is empty.")
            search_text = transcribe_audio(audio_bytes)
            if not search_text:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Could not transcribe audio. Please speak clearly or try text search."
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Speech recognition error: {str(e)}"
            )

    # 2. Perform vector search and LLM re-ranking
    try:
        items, interpreted_query = search_vector_menu(business_slug, search_text)
        return {
            "items": items,
            "interpretedQuery": interpreted_query,
            "transcribedText": search_text if audio else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(e)}"
        )

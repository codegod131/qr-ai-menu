from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import qrcode
import io
import base64
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="QR AI Menu Backend")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional: initialize Supabase client
# url: str = os.environ.get("SUPABASE_URL", "")
# key: str = os.environ.get("SUPABASE_KEY", "")
# if url and key:
#     supabase: Client = create_client(url, key)

@app.get("/")
def read_root():
    return {"message": "Welcome to QR AI Menu Backend"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

class QRRequest(BaseModel):
    url: str

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

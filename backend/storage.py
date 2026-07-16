import os
import re
import uuid
import base64
import logging
import boto3
from botocore.config import Config
from typing import Optional

logger = logging.getLogger(__name__)

# Load S3 credentials
S3_KEY_ID = os.getenv("S3_KEY_ID")
S3_KEY = os.getenv("S3_KEY")
S3_ENDPOINT = os.getenv("S3_ENDPOINT")
S3_REGION = os.getenv("S3_REGION")

BUCKET_NAME = "menu-assets"

def get_s3_client():
    if not all([S3_KEY_ID, S3_KEY, S3_ENDPOINT, S3_REGION]):
        logger.warning("S3 credentials not fully configured in environment.")
        return None
    try:
        return boto3.client(
            's3',
            aws_access_key_id=S3_KEY_ID,
            aws_secret_access_key=S3_KEY,
            endpoint_url=S3_ENDPOINT,
            region_name=S3_REGION,
            config=Config(signature_version='s3v4')
        )
    except Exception as e:
        logger.error(f"Failed to create S3 client: {e}")
        return None

def upload_base64_image(base64_str: str) -> Optional[str]:
    """
    Checks if base64_str is a base64 encoded image data URL.
    If so, decodes it, uploads it to Supabase Storage using S3, and returns the public URL.
    Otherwise, returns None.
    """
    if not isinstance(base64_str, str) or not base64_str.startswith("data:image/"):
        return None

    s3_client = get_s3_client()
    if not s3_client:
        raise ValueError("S3 client is not configured.")

    # Match format: data:image/<ext>;base64,<data>
    match = re.match(r"^data:image/([^;]+);base64,(.+)$", base64_str)
    if not match:
        raise ValueError("Invalid data URI format for image.")

    image_ext = match.group(1)
    base64_data = match.group(2)

    try:
        file_bytes = base64.b64decode(base64_data)
    except Exception as e:
        raise ValueError(f"Failed to decode base64 image data: {e}")

    # Map file extensions to content types if needed, or default
    content_type = f"image/{image_ext}"
    
    # Generate unique file name
    file_name = f"{uuid.uuid4()}.{image_ext}"

    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=file_name,
            Body=file_bytes,
            ContentType=content_type
        )
    except Exception as e:
        logger.error(f"S3 put_object failed for {file_name}: {e}")
        raise RuntimeError(f"Failed to upload image to Supabase Storage: {e}")

    # Extract project reference to form public URL
    # e.g., S3_ENDPOINT is https://hzgbxoxfuduymyfcdjqf.storage.supabase.co/storage/v1/s3
    project_ref_match = re.search(r"https://([^.]+)\.storage\.supabase\.co", S3_ENDPOINT)
    if not project_ref_match:
        raise ValueError("Could not parse Supabase project ref from S3_ENDPOINT.")
        
    project_ref = project_ref_match.group(1)
    public_url = f"https://{project_ref}.supabase.co/storage/v1/object/public/{BUCKET_NAME}/{file_name}"
    
    return public_url

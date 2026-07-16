import os
import json
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Tuple

from google import genai
from google.genai import types

try:
    from google.cloud import speech_v2
    from google.cloud.speech_v2.types import cloud_speech
    SPEECH_AVAILABLE = True
except ImportError:
    SPEECH_AVAILABLE = False

from database import get_db_conn
from embeddings import client, get_gemini_embedding

logger = logging.getLogger(__name__)

def fallback_transcribe_with_gemini(audio_content: bytes) -> str:
    """
    Fallback transcription using Gemini model if Speech-to-Text V2 fails.
    """
    global client
    # Initialize if not initialized
    if not client:
        try:
            client = genai.Client()
        except Exception:
            pass
                
    if not client:
        raise ValueError("Gemini client not configured for transcription fallback.")
        
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(
                    data=audio_content,
                    mime_type="audio/webm",
                ),
                "Transcribe the audio exactly. If you hear Malayalam, transcribe or translate it. Output only the transcription."
            ]
        )
        transcript = response.text.strip() if response.text else ""
        logger.info(f"Gemini fallback transcription: '{transcript}'")
        return transcript
    except Exception as e:
        logger.error(f"Gemini fallback transcription failed: {e}")
        raise ValueError(f"Transcription failed: {e}")

def transcribe_audio(audio_content: bytes) -> str:
    """
    Transcribes audio bytes to text using Google Cloud Speech-to-Text V2.
    """
    if not SPEECH_AVAILABLE:
        logger.warning("google-cloud-speech is not installed. Falling back to Gemini transcription.")
        return fallback_transcribe_with_gemini(audio_content)

    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "qr-ai-502319")
    location = "global"
    
    try:
        speech_client = speech_v2.SpeechClient()
        
        # Configure inline recognition
        config = cloud_speech.RecognitionConfig(
            auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
            language_codes=["en-US", "ml-IN"],  # Support English and Malayalam
            model="long",
            features=cloud_speech.RecognitionFeatures(
                enable_automatic_punctuation=True,
            ),
        )
        
        request = cloud_speech.RecognizeRequest(
            recognizer=f"projects/{project_id}/locations/{location}/recognizers/_",
            config=config,
            content=audio_content,
        )
        
        response = speech_client.recognize(request=request)
        
        transcript_parts = []
        for result in response.results:
            if result.alternatives:
                transcript_parts.append(result.alternatives[0].transcript)
                
        transcript = " ".join(transcript_parts).strip()
        logger.info(f"Speech-to-Text transcribed: '{transcript}'")
        return transcript
        
    except Exception as e:
        logger.error(f"Speech-to-Text recognition failed: {e}. Falling back to Gemini.")
        try:
            return fallback_transcribe_with_gemini(audio_content)
        except Exception as fallback_err:
            logger.error(f"Gemini fallback transcription failed: {fallback_err}")
            raise ValueError(f"Speech recognition failed: {e}")

def translate_query_if_needed(query: str) -> Tuple[str, bool]:
    """
    If the query contains non-ASCII characters, translate it to English.
    Returns (translated_query, is_translated).
    """
    if not any(ord(c) > 127 for c in query):
        return query, False
        
    global client
    # Ensure client is initialized
    if not client:
        try:
            client = genai.Client()
        except Exception:
            pass
                
    if not client:
        logger.warning("Gemini Client not configured, cannot translate query.")
        return query, False
        
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f'Translate this restaurant menu search query to plain English. Only output the English translation, absolutely nothing else: "{query}"'
        )
        translated = response.text.strip() if response.text else query
        logger.info(f"Translated query '{query}' to '{translated}'")
        return translated, True
    except Exception as e:
        logger.error(f"Failed to translate query '{query}': {e}")
        return query, False

def translate_explanation(explanation: str, target_language_query: str) -> str:
    """
    Translates an explanation back to the language of target_language_query.
    """
    global client
    # Ensure client is initialized
    if not client:
        try:
            client = genai.Client()
        except Exception:
            pass

    if not client:
        return explanation
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f'Translate this explanation to the language used in this query: "{target_language_query}". The explanation is: "{explanation}". Only return the translation, absolutely nothing else.'
        )
        translated = response.text.strip() if response.text else explanation
        return translated
    except Exception as e:
        logger.error(f"Failed to translate explanation back: {e}")
        return explanation

def search_vector_menu(business_slug: str, query: str) -> Tuple[List[Dict[str, Any]], str]:
    """
    Performs vector similarity search on the menu items for a business.
    """
    # 1. Translate query if needed
    search_query, is_translated = translate_query_if_needed(query)
    
    # 2. Generate embedding for query
    query_embedding = get_gemini_embedding(search_query)
    embedding_str = f"[{','.join(str(x) for x in query_embedding)}]"
    
    # 3. Retrieve matching items using the match_items Postgres function
    results = []
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT i.id, i.business_id, i.name, i.price, i.description, i.tags, i.image_url, i.created_at, m.similarity
                FROM match_items(%s::halfvec, %s, %s, %s) m
                JOIN items i ON m.id = i.id
                """,
                (embedding_str, 0.1, 5, business_slug)
            )
            rows = cur.fetchall()
            for r in rows:
                results.append({
                    "id": str(r["id"]),
                    "business_id": str(r["business_id"]),
                    "name": r["name"],
                    "price": float(r["price"]),
                    "description": r["description"],
                    "tags": r["tags"],
                    "image_url": r["image_url"],
                    "created_at": r["created_at"],
                    "similarity": float(r["similarity"])
                })
                
    if not results:
        # Fallback empty result
        interpreted = f"AI understood: Search query '{query}' did not match any items."
        if is_translated:
            interpreted = translate_explanation(interpreted, query)
        return [], interpreted

    # 4. LLM Re-Ranking & Explanations
    global client
    # Ensure client is initialized
    if not client:
        try:
            client = genai.Client()
        except Exception:
            pass

    interpreted_query = f"AI understood: Show items related to '{query}'"
    if is_translated:
        interpreted_query = translate_explanation(interpreted_query, query)

    if not client:
        logger.warning("Gemini Client not configured. Returning database similarity results directly.")
        # Default explanations
        final_items = []
        for r in results:
            item = dict(r)
            item["explanation"] = "Matches search query."
            final_items.append(item)
        return final_items, interpreted_query

    try:
        items_for_llm = [
            {
                "id": r["id"],
                "name": r["name"],
                "description": r["description"],
                "tags": r["tags"]
            }
            for r in results
        ]
        
        prompt = f"""You are a helpful assistant. A user searched for: "{search_query}" in the menu of a restaurant.
Here are the matches from our database:
{json.dumps(items_for_llm)}

Please re-rank these items based on their relevance to the search query.
Return a JSON array of objects, where each object has:
- "id": (string, the UUID of the item)
- "rank": (integer, 1 being most relevant, 2 next, etc.)
- "explanation": (string, a brief, one-sentence explanation of why it fits the query, e.g. "This dish is highly rated for spice and easily feeds two people.")
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        llm_text = response.text.strip() if response.text else "[]"
        rankings = json.loads(llm_text)
        
        ranking_map = {item["id"]: item for item in rankings}
        
        ranked_items = []
        for r in results:
            info = ranking_map.get(r["id"], {"rank": 99, "explanation": "Matches your query."})
            ranked_items.append((info.get("rank", 99), info.get("explanation", "Matches your query."), r))
            
        ranked_items.sort(key=lambda x: x[0])
        
        final_items = []
        for rank, explanation, r in ranked_items:
            item = dict(r)
            if is_translated:
                explanation = translate_explanation(explanation, query)
            item["explanation"] = explanation
            final_items.append(item)
            
        # Optional: Let Gemini generate a nice interpreted query text summarizing user preference
        try:
            interp_resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f'Generate a single short sentence (10 words max) of what user is looking for based on their query: "{search_query}". Start with "AI understood: You want/are looking for..."'
            )
            if interp_resp.text:
                interpreted_query = interp_resp.text.strip()
                if is_translated:
                    interpreted_query = translate_explanation(interpreted_query, query)
        except Exception:
            pass
            
        return final_items, interpreted_query

    except Exception as e:
        logger.error(f"Failed LLM re-ranking: {e}")
        final_items = []
        for r in results:
            item = dict(r)
            item["explanation"] = "Matches search query."
            final_items.append(item)
        return final_items, interpreted_query

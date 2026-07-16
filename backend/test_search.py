import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from search_pipeline import (
    translate_query_if_needed,
    translate_explanation,
    search_vector_menu,
    transcribe_audio
)

class TestSearchPipeline(unittest.TestCase):

    @patch("search_pipeline.client")
    def test_translate_query_if_needed_ascii(self, mock_client):
        # ASCII query should not call client
        query, translated = translate_query_if_needed("spicy salad")
        self.assertEqual(query, "spicy salad")
        self.assertFalse(translated)
        mock_client.models.generate_content.assert_not_called()

    @patch("search_pipeline.client")
    def test_translate_query_if_needed_non_ascii(self, mock_client):
        # Non-ASCII query should call Gemini generate_content
        mock_response = MagicMock()
        mock_response.text = "spicy chicken"
        mock_client.models.generate_content.return_value = mock_response

        query, translated = translate_query_if_needed("എരിവുള്ള ചിക്കൻ")
        self.assertEqual(query, "spicy chicken")
        self.assertTrue(translated)
        mock_client.models.generate_content.assert_called_once()

    @patch("search_pipeline.client")
    def test_translate_explanation(self, mock_client):
        mock_response = MagicMock()
        mock_response.text = "വിശദീകരണം"
        mock_client.models.generate_content.return_value = mock_response

        res = translate_explanation("explanation", "എരിവുള്ള ചിക്കൻ")
        self.assertEqual(res, "വിശദീകരണം")
        mock_client.models.generate_content.assert_called_once()

    @patch("search_pipeline.get_db_conn")
    @patch("search_pipeline.get_gemini_embedding")
    @patch("search_pipeline.client")
    def test_search_vector_menu_success(self, mock_client, mock_embedding, mock_db_conn):
        # Setup mocks
        mock_embedding.return_value = [0.1] * 3072
        
        # Mock DB cursor
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "business_id": "22222222-2222-2222-2222-222222222222",
                "name": "Spicy Salad",
                "price": 12.99,
                "description": "Tasty salad",
                "tags": ["salad", "spicy"],
                "image_url": "https://example.com/salad.jpg",
                "created_at": "2026-07-16T12:00:00Z",
                "similarity": 0.85
            }
        ]
        
        mock_conn = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur
        mock_db_conn.return_value.__enter__.return_value = mock_conn

        # Mock LLM ranking response
        mock_rank_resp = MagicMock()
        mock_rank_resp.text = '[{"id": "11111111-1111-1111-1111-111111111111", "rank": 1, "explanation": "Perfect healthy option with a kick."}]'
        
        mock_interp_resp = MagicMock()
        mock_interp_resp.text = "AI understood: You want spicy salads."

        mock_client.models.generate_content.side_effect = [mock_rank_resp, mock_interp_resp]

        # Execute
        items, query_text = search_vector_menu("cafe-mocha", "spicy salad")

        # Verify
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["name"], "Spicy Salad")
        self.assertEqual(items[0]["explanation"], "Perfect healthy option with a kick.")
        self.assertEqual(query_text, "AI understood: You want spicy salads.")

if __name__ == "__main__":
    unittest.main()

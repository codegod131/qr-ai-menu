import unittest
from fastapi.testclient import TestClient
from main import app

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.test_slug = "test-restaurant-unique-123"
        self.test_pin = "4321"
        self.test_business_name = "Test Restaurant"

        # Clean up any leftover business from previous failures
        # (This is just a precaution; the delete test at the end handles normal cleanup)
        pass

    def test_e2e_flow(self):
        # 1. Check health
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})

        # 2. Create business
        biz_data = {
            "name": self.test_business_name,
            "slug": self.test_slug,
            "pin": self.test_pin
        }
        response = self.client.post("/api/business", json=biz_data)
        self.assertEqual(response.status_code, 201)
        biz_json = response.json()
        self.assertEqual(biz_json["name"], self.test_business_name)
        self.assertEqual(biz_json["slug"], self.test_slug)
        self.assertEqual(biz_json["pin"], self.test_pin)
        biz_id = biz_json["id"]

        # Try to recreate same business (should fail with 400 because of unique slug constraint)
        response = self.client.post("/api/business", json=biz_data)
        self.assertEqual(response.status_code, 400)
        self.assertIn("already exists", response.json()["detail"])

        # 3. Fetch business
        response = self.client.get(f"/api/business/{self.test_slug}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], biz_id)

        # 4. Create Item without headers (should fail with 422 - validation/header missing)
        item_data = {
            "name": "Super Burger",
            "price": 12.99,
            "description": "Delicious beef burger",
            "tags": ["burger", "beef", "lunch"],
            "image_url": "https://example.com/burger.jpg"
        }
        response = self.client.post("/api/items", json=item_data)
        self.assertEqual(response.status_code, 422)

        # 5. Create Item with invalid pin (should fail with 401)
        headers_invalid_pin = {
            "x-business-slug": self.test_slug,
            "x-business-pin": "wrong-pin"
        }
        response = self.client.post("/api/items", json=item_data, headers=headers_invalid_pin)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid business PIN")

        # 6. Create Item with invalid slug (should fail with 404)
        headers_invalid_slug = {
            "x-business-slug": "non-existent-slug-xyz",
            "x-business-pin": self.test_pin
        }
        response = self.client.post("/api/items", json=item_data, headers=headers_invalid_slug)
        self.assertEqual(response.status_code, 404)

        # 7. Create Item with valid headers (should succeed)
        headers_valid = {
            "x-business-slug": self.test_slug,
            "x-business-pin": self.test_pin
        }
        response = self.client.post("/api/items", json=item_data, headers=headers_valid)
        self.assertEqual(response.status_code, 201)
        item_json = response.json()
        self.assertEqual(item_json["name"], "Super Burger")
        self.assertEqual(item_json["price"], 12.99)
        self.assertEqual(item_json["business_id"], biz_id)
        item_id = item_json["id"]

        # 8. List items (unfiltered)
        response = self.client.get("/api/items")
        self.assertEqual(response.status_code, 200)
        items = response.json()
        self.assertTrue(len(items) >= 1)
        self.assertTrue(any(i["id"] == item_id for i in items))

        # List items (filtered by business slug)
        response = self.client.get(f"/api/items?business_slug={self.test_slug}")
        self.assertEqual(response.status_code, 200)
        items_filtered = response.json()
        self.assertTrue(len(items_filtered) >= 1)
        self.assertTrue(all(i["business_id"] == biz_id for i in items_filtered))

        # 9. Get specific item
        response = self.client.get(f"/api/items/{item_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Super Burger")

        # 10. Update Item (valid headers)
        update_data = {
            "name": "Mega Burger",
            "price": 14.99,
            "description": "Double patty delicious beef burger",
            "tags": ["burger", "beef", "mega"],
            "image_url": "https://example.com/mega-burger.jpg"
        }
        response = self.client.put(f"/api/items/{item_id}", json=update_data, headers=headers_valid)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Mega Burger")
        self.assertEqual(response.json()["price"], 14.99)

        # Update Item (invalid business - e.g. create another business and try to edit this item)
        # Create second business
        biz_data_2 = {
            "name": "Second Restaurant",
            "slug": "second-restaurant",
            "pin": "0000"
        }
        response = self.client.post("/api/business", json=biz_data_2)
        self.assertEqual(response.status_code, 201)
        biz2_json = response.json()
        headers_biz2 = {
            "x-business-slug": "second-restaurant",
            "x-business-pin": "0000"
        }

        # Try to update business 1's item with business 2's credentials (should fail with 403)
        response = self.client.put(f"/api/items/{item_id}", json=update_data, headers=headers_biz2)
        self.assertEqual(response.status_code, 403)
        self.assertIn("not authorized", response.json()["detail"].lower())

        # 11. Delete Item (should fail with biz2 credentials, succeed with biz1)
        response = self.client.delete(f"/api/items/{item_id}", headers=headers_biz2)
        self.assertEqual(response.status_code, 403)

        response = self.client.delete(f"/api/items/{item_id}", headers=headers_valid)
        self.assertEqual(response.status_code, 204)

        # Verify item is deleted
        response = self.client.get(f"/api/items/{item_id}")
        self.assertEqual(response.status_code, 404)

        # 12. Clean up businesses
        response = self.client.delete(f"/api/business/{self.test_slug}", headers=headers_valid)
        self.assertEqual(response.status_code, 204)

        response = self.client.delete(f"/api/business/second-restaurant", headers=headers_biz2)
        self.assertEqual(response.status_code, 204)

        # Verify business is deleted
        response = self.client.get(f"/api/business/{self.test_slug}")
        self.assertEqual(response.status_code, 404)

if __name__ == "__main__":
    unittest.main()

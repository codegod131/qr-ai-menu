# Innovation Accounting: Metrics & Logging Guide

To validate whether semantic/descriptive search actually beats a plain list/filter for customers, we need to gather real data from user tests.

---

## 1. Key Metrics to Capture

| Metric | Measurement Method | Target Goal | What it Tells You |
| :--- | :--- | :--- | :--- |
| **Item Add Completion & Time** | Time elapsed from opening add form to submission; count of abandoned forms. | < 30 seconds per item; > 90% completion. | Is writing descriptive attributes too high-friction for business staff? |
| **Query Relevant Result Rate** | Percentage of queries where the tester rated the results as relevant (via thumbs up/down). | > 80% relevance score. | Is the vector search + LLM explanation actually useful? |
| **Time-to-Find** | Time elapsed from scanning the QR/landing on page to clicking thumbs-up or adding item to choices. | < 15 seconds. | Is semantic search faster than scrolling a menu? |
| **Query Reformulation Rate** | Count of consecutive queries by a single user session within 2 minutes. | < 1.5 queries per session. | High rate means search quality is weak (user had to try multiple search phrases). |
| **Thumbs Up/Down Ratio** | Tap count of inline thumbs-up vs thumbs-down on item cards. | > 4:1 (80% positive). | Real-time sentiment and search quality indicator. |

---

## 2. Event Logging Database Schema

We should create a `search_logs` and `analytics_events` table in Supabase to record user actions:

```sql
-- Search Logs
CREATE TABLE search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100), -- Anonymous frontend session identifier
    business_slug VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    results_returned JSONB,  -- Array of item IDs returned with their similarity score
    selected_item_id UUID,   -- ID of the item the user tapped/clicked on
    response_time_ms INT,    -- Backend query execution time
    thumbs_rating BOOLEAN,   -- TRUE for thumbs-up, FALSE for thumbs-down, NULL for no rating
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Client Analytics (Staff interactions)
CREATE TABLE client_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_slug VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'item_add_start', 'item_add_success', 'qr_view'
    duration_seconds INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

---

## 3. Frontend Logging Implementation (Next.js)

To capture these metrics on the frontend, standard events should be dispatched to backend endpoints:

1. **On Search Input Submit**:
   Post to `/api/logs/search` with `session_id`, `business_slug`, `query_text`, and `response_time_ms`.
2. **On Result Click**:
   Post to `/api/logs/click` with `log_id` and `selected_item_id`.
3. **On Thumbs Up/Down**:
   Post to `/api/logs/feedback` with `log_id` and `thumbs_rating` (true/false).

Keep these endpoints fast and asynchronous to avoid blocking user interactions.

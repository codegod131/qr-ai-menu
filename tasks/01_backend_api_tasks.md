# Backend / API Actionable Tasks
**Owner:** Member 1 (Role A)
**Stack:** FastAPI (Python), Supabase (Postgres)

## Day 1: Foundations
- [ ] Set up the FastAPI project structure and environment variables.
- [ ] Initialize Supabase connection and client in the backend.
- [ ] Define the Database schema in Supabase:
  - `Business` table (id, slug, pin/code).
  - `Item` table (id, business_id, name, price, description, tags, image_url).
  - Enable `pgvector` extension and add an `embedding` vector column to the `Item` table.
- [ ] Implement simple Business Code authentication middleware.
- [ ] Create CRUD API endpoints for `Business`.
- [ ] Create CRUD API endpoints for `Item` (only Client can add).

## Day 2: Core Loop
- [ ] Finish CRUD operations and harden error handling.
- [ ] (Optional) Implement image upload functionality to Supabase Storage.
- [ ] Build the business slug/PIN onboarding flow.
- [ ] Create API endpoints for event logging (metrics collection: query logs, results shown, taps).

## Day 3: Measure + Learn + Polish
- [ ] Fix obvious bugs discovered during full team QA.
- [ ] Assist with tuning relevance (handling bad matches, empty results).
- [ ] Final polish of API responses for speed and clarity.

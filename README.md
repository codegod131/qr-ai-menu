# QR AI Menu

This is a monorepo containing a Next.js frontend and a FastAPI backend for the QR AI Menu platform.

## Tech Stack

*   **Frontend:** Next.js + Tailwind CSS
*   **Backend:** FastAPI (Python)
*   **Database:** Supabase (Postgres + pgvector)
*   **AI:** OpenAI / Anthropic / Gemini SDKs
*   **QR Generation:** Python `qrcode` library

## Setup Instructions

### Prerequisites
*   Node.js (v18 or higher)
*   Python (3.9 or higher)
*   Supabase Account

### 1. Root Installation

Install the root dependencies. This installs `concurrently` to run both the frontend and backend servers together.

```bash
npm install
```

### 2. Install Sub-project Dependencies

Run the following command from the root folder to install dependencies for both the frontend and the backend:

```bash
npm run install:all
```

*Alternatively, you can install them individually:*
*   **Frontend:** `cd frontend && npm install`
*   **Backend:** `cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`

### 3. Environment Variables

#### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Add any AI API keys you plan to use:
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GEMINI_API_KEY=your_gemini_api_key
```

#### Frontend (`frontend/.env.local`)
Create a `.env.local` file in the `frontend/` directory if you need to expose any public variables (e.g., `NEXT_PUBLIC_SUPABASE_URL`).

### 4. Running the Development Servers

You can run both the frontend and backend simultaneously from the root directory:

```bash
npm run dev
```

This will start:
*   **Frontend:** http://localhost:3000
*   **Backend:** http://127.0.0.1:8000 (Swagger API Docs at http://127.0.0.1:8000/docs)

*Alternatively, you can run them separately using the scripts defined in package.json:*
*   **Frontend:** `npm run dev:frontend`
*   **Backend:** `npm run dev:backend`

## Deployment
*   **Frontend:** Can be easily deployed to Vercel.
*   **Backend:** Can be deployed to Railway or Render using the included FastAPI setup.

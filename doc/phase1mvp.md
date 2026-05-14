that has below features or flow 
user login to the system, and create the new API/group and inside setup the output structure, define the json structure and get basic information about the document what type of document ect... so that it is eacy to understand to the claude  and save and then have option to test that group in the web itself to upload a document and see the response. dont save the document in the server simply do the understande the doc and respond to that document thats all


╔══════════════════════════════════════════════════════════════════╗
║                    DOCUFY — PHASE 1 MVP                         ║
║              Full Build Prompt (AI-Ready)                        ║
╚══════════════════════════════════════════════════════════════════╝

You are building "Docufy" — a SaaS platform where users create API 
groups with predefined JSON output schemas. When a document is 
uploaded to that API, Claude reads and extracts data matching the 
schema. Documents are NEVER stored — only processed in memory.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend   : React + Vite + TypeScript
Styling    : Tailwind CSS + shadcn/ui
State      : Zustand (global) + React Query (server state)
HTTP       : Axios with interceptors

Backend    : FastAPI (Python 3.12)
Database   : PostgreSQL + SQLAlchemy ORM + Alembic migrations
Auth       : JWT (access token 15min + refresh token 7days)
AI         : Anthropic Python SDK → claude-haiku-4-5
File       : python-multipart (in-memory only, never saved to disk)

Deployment : vercel

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT EXAMPLE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

docufy/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx       ← list of API groups
│   │   │   ├── GroupCreate.tsx     ← create new group
│   │   │   ├── GroupDetail.tsx     ← edit + test group
│   │   │   └── NotFound.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── GroupCard.tsx
│   │   │   ├── SchemaEditor.tsx    ← JSON schema textarea + validator
│   │   │   ├── DocTypeSelector.tsx ← document type info inputs
│   │   │   ├── TestPanel.tsx       ← upload doc + see live response
│   │   │   └── JsonViewer.tsx      ← formatted JSON output display
│   │   ├── store/
│   │   │   └── authStore.ts        ← Zustand auth state
│   │   ├── api/
│   │   │   └── client.ts           ← Axios instance + interceptors
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py                 ← FastAPI app entry
│   │   ├── config.py               ← env vars / settings
│   │   ├── database.py             ← SQLAlchemy engine + session
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   └── group.py
│   │   ├── schemas/                ← Pydantic request/response models
│   │   │   ├── auth.py
│   │   │   └── group.py
│   │   ├── routers/
│   │   │   ├── auth.py             ← /auth/register, /auth/login, /auth/refresh
│   │   │   ├── groups.py           ← CRUD for API groups
│   │   │   └── extract.py          ← /extract/{group_id} → Claude call
│   │   ├── services/
│   │   │   ├── auth_service.py     ← JWT create/verify logic
│   │   │   ├── claude_service.py   ← build prompt + call Claude API
│   │   │   └── document_service.py ← file reading in memory
│   │   └── middleware/
│   │       └── auth_middleware.py  ← JWT guard dependency
│   ├── alembic/                    ← DB migrations
│   ├── requirements.txt
│   └── .env

Commands to Run: 
.\.venv\Scripts\activate
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
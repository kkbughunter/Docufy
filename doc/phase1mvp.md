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

Frontend   : React 18 + Vite + TypeScript
Styling    : Tailwind CSS + shadcn/ui
State      : Zustand (global) + React Query (server state)
HTTP       : Axios with interceptors

Backend    : FastAPI (Python 3.12)
Database   : PostgreSQL 15 + SQLAlchemy ORM + Alembic migrations
Auth       : JWT (access token 15min + refresh token 7days)
AI         : Anthropic Python SDK → claude-sonnet-4-6
File       : python-multipart (in-memory only, never saved to disk)

Deployment : Single Ubuntu VPS
             - Nginx (reverse proxy)
             - PM2 or systemd for FastAPI
             - Vite build served as static files via Nginx
             - PostgreSQL running locally on VPS
             - Let's Encrypt SSL (Certbot)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT STRUCTURE
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE SCHEMA (PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TABLE: users
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  email         VARCHAR(255) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  full_name     VARCHAR(255)
  created_at    TIMESTAMP DEFAULT NOW()
  updated_at    TIMESTAMP DEFAULT NOW()

TABLE: api_groups
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE
  name            VARCHAR(255) NOT NULL
  description     TEXT
  
  -- Document context (helps Claude understand what to expect)
  document_type   VARCHAR(100)     ← e.g. "resume", "invoice", "custom"
  document_hint   TEXT             ← free text: "This is a Tamil Nadu 
                                      electricity bill with fields: 
                                      consumer number, units consumed..."
  language_hint   VARCHAR(50)      ← e.g. "English", "Tamil", "Mixed"
  
  -- The output schema user defines
  output_schema   JSONB NOT NULL   ← the JSON structure to extract into
  
  -- API access
  api_key         VARCHAR(64) UNIQUE DEFAULT gen_random_api_key()
  
  is_active       BOOLEAN DEFAULT TRUE
  created_at      TIMESTAMP DEFAULT NOW()
  updated_at      TIMESTAMP DEFAULT NOW()

NOTE: No document table. Documents are NEVER persisted.
      Only the schema and metadata about the document type are saved.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND API ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTH (public)
  POST /auth/register        { email, password, full_name }
  POST /auth/login           { email, password } → { access_token, refresh_token }
  POST /auth/refresh         { refresh_token } → { access_token }

GROUPS (JWT protected)
  GET    /groups             → list all groups for logged-in user
  POST   /groups             → create new group
  GET    /groups/{id}        → get single group detail
  PUT    /groups/{id}        → update group (schema, hints, name)
  DELETE /groups/{id}        → delete group
  POST   /groups/{id}/rotate-key → generate new api_key

EXTRACTION
  POST /extract/{group_id}
    - Auth: Bearer JWT (for web test panel)
      OR X-API-Key header (for external API usage)
    - Body: multipart/form-data → file (required)
    - File is read into memory, NEVER written to disk
    - Calls Claude with group's schema + document hints
    - Returns: { success: true, data: { ...extracted JSON... } }
    - On error: { success: false, error: "..." }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENT PROCESSING (in-memory, never saved)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Accepted file types and how to read them in memory:

  Images (PNG, JPG, JPEG, WEBP):
    → Read as bytes → base64 encode
    → Send to Claude as image block with correct media_type

  PDF:
    → Read as bytes → base64 encode
    → Send to Claude as document block (media_type: application/pdf)

  DOCX:
    → Use python-docx to extract text from BytesIO stream
    → Send extracted text as plain text in user message

  XLSX / XLS:
    → Use openpyxl / pandas to read from BytesIO
    → Convert all sheets to CSV-like text
    → Send as plain text

  CSV / TXT / MD / JSON:
    → Decode bytes as UTF-8
    → Send as plain text (truncate at 80,000 chars)

  File size limit: 10MB max
  Validate MIME type before processing.
  Raise 400 error for unsupported types.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAUDE PROMPT CONSTRUCTION (claude_service.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System prompt:
  """
  You are Docufy, a precise document data extraction engine.
  You always respond with ONLY valid JSON — no markdown fences,
  no explanation, no preamble, no trailing text.
  Missing fields must be null. Dates must be ISO-8601 (YYYY-MM-DD).
  Numbers must be actual JSON numbers, not strings.
  Arrays must be actual JSON arrays even if only one item.
  """

User message — build dynamically from the group config:

  """
  Document context:
  - Type: {group.document_type}
  - Description: {group.document_hint}
  - Language: {group.language_hint}

  Extract all information from the provided document and return
  a JSON object that EXACTLY matches this schema:

  {group.output_schema}

  Rules:
  - Return ONLY the JSON object. Nothing else.
  - Every field in the schema must appear in the response.
  - Use null for any field not found in the document.
  - Do not add extra fields not in the schema.
  """

Then attach the document content as:
  - image block (for images)
  - document block (for PDFs)
  - additional text block (for text-based files)

Model   : claude-sonnet-4-6
Tokens  : max_tokens=4096
Temp    : default (do not set — deterministic extraction preferred)

After response:
  - Strip any accidental ```json or ``` fences
  - Parse as JSON
  - If parse fails → return 422 with error message
  - Never return raw Claude response text to the client

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRONTEND PAGES & FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. LOGIN / REGISTER PAGE
   - Simple centered card
   - Email + password fields
   - On login success → store access_token in Zustand + localStorage
   - Redirect to /dashboard

2. DASHBOARD PAGE (/dashboard)
   - Top navbar: "Docufy" logo + user email + logout
   - "New Group" button (top right)
   - List of GroupCards:
       Group name | Document type | Created date | API Key (masked) 
       | [Test] [Edit] [Delete] buttons
   - Empty state: illustration + "Create your first API group"

3. CREATE / EDIT GROUP PAGE (/groups/new or /groups/:id/edit)
   - Form with these sections:

   SECTION A — Basic Info
     - Group Name (required) e.g. "Resume Parser"
     - Description (optional)

   SECTION B — Document Context
     (This helps Claude understand what it's reading)
     - Document Type: dropdown
         [ Resume | Invoice | Receipt | Contract | ID Card |
           Medical Report | Bank Statement | Custom ]
     - Document Description: textarea
         Placeholder: "Describe what this document looks like.
         e.g. This is a job resume in PDF format, usually contains
         candidate name, contact info, work experience, skills..."
     - Language: dropdown
         [ English | Tamil | Hindi | Mixed | Other ]

   SECTION C — Output Schema
     - Label: "Define JSON output structure"
     - Large textarea (monospace font)
     - Real-time JSON validation (show green tick or red error)
     - Quick template buttons:
         [ Resume ] [ Invoice ] [ ID Card ] [ Receipt ] [ Custom ]
       Clicking fills the textarea with a starter schema
     - Helper text: "Use string, number, date, boolean, [string] 
       as type hints for each field"

   SAVE button → POST /groups or PUT /groups/:id

4. GROUP DETAIL / TEST PAGE (/groups/:id)
   - Left panel: Group info + schema (read-only with Edit button)
   - Right panel: TEST PANEL

   TEST PANEL:
     - Drop zone: "Upload a document to test"
       Accept: PDF, PNG, JPG, DOCX, XLSX, CSV, TXT
     - On file select → show file name + size badge
     - [Run Extraction] button
     - Loading state: spinner + "Reading document..."
     - Result:
         ✅ Success → formatted JSON viewer with copy button
         ❌ Error   → red error message

   API INFO section (below test panel):
     - Endpoint: POST https://api.docufy.com/extract/{group_id}
     - Auth header: X-API-Key: {masked api_key} [reveal] [copy]
     - [Rotate API Key] button
     - Code snippet tabs: cURL | Python | JavaScript

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECURITY REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Passwords: bcrypt hash (rounds=12), never stored plain
- JWT: HS256, secret from env, access=15min, refresh=7days
- API keys: 32-byte random hex, stored hashed in DB (sha256),
  show to user only once on creation — same as password reset flow
  (PHASE 1 simplification: store plain but mask in UI is acceptable)
- ANTHROPIC_API_KEY: backend env only, never exposed to frontend
- File upload: validate MIME + extension, 10MB limit, memory only
- CORS: allow only your frontend domain in production
- Rate limit: 30 requests/minute per user (use slowapi in FastAPI)
- All group operations: verify group.user_id == current_user.id

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENVIRONMENT VARIABLES (.env)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Backend
DATABASE_URL=postgresql://docufy:password@localhost:5432/docufy_db
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-very-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_FILE_SIZE_MB=10
ALLOWED_ORIGINS=https://docufy.com

# Frontend (Vite)
VITE_API_BASE_URL=https://api.docufy.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VPS DEPLOYMENT SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ubuntu 22.04 VPS setup order:

1. PostgreSQL
   sudo apt install postgresql
   createdb docufy_db + createuser docufy

2. Python environment
   python3 -m venv venv
   pip install -r requirements.txt
   alembic upgrade head   ← run migrations

3. FastAPI with systemd
   Create /etc/systemd/system/docufy-api.service
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2

4. Frontend build
   npm run build → dist/
   Copy dist/ to /var/www/docufy/

5. Nginx config
   server {
     listen 443 ssl;
     server_name docufy.com;
     
     # Serve frontend
     location / {
       root /var/www/docufy;
       try_files $uri /index.html;
     }
     
     # Proxy API
     location /api/ {
       proxy_pass http://127.0.0.1:8000/;
     }
   }

6. SSL: certbot --nginx -d docufy.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — WHAT IS OUT OF SCOPE (build these in Phase 2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✗ Subscription / billing / Stripe
✗ Usage tracking / token cost dashboard
✗ Team / organisation accounts
✗ Webhook support
✗ Extraction history / logs
✗ Email verification
✗ Forgot password flow
✗ Custom domain per user
✗ SDKs / client libraries

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOW BUILD DOCUFY PHASE 1.
Start with the backend. Generate all files completely.
Do not use placeholder comments — write real working code.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
.\.venv\Scripts\activate
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
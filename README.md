# Tax Document Intelligence Pipeline

An AI-powered tax document processing system that automates W-2 data extraction for CPA firms. Built for Aiola CPA to eliminate manual data entry during tax season.

---

## Problem

CPAs at Aiola CPA manually type data from client PDFs into Drake tax software. With 500+ real estate investor clients each submitting 5–20 documents, this amounts to:

- **1,250+ hours** of data entry per tax season
- **5–10% human error rate** on SSNs, EINs, and dollar amounts
- **$187,500/year** in CPA time at $150/hour

---

## Solution

A three-stage workflow that replaces manual entry:

```
Client PDF → Claude AI Extraction → CPA Review → Drake CSV Export
```

1. **Upload** — CPA uploads W-2 PDFs via drag-and-drop
2. **Extract** — Claude reads the PDF and returns structured JSON in ~10 seconds
3. **Review** — CPA sees original PDF side-by-side with extracted data, edits if needed, approves
4. **Export** — One-click Drake-compatible CSV download

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.10+, FastAPI |
| Database | SQLAlchemy + SQLite (dev) / PostgreSQL (prod) |
| Authentication | JWT via python-jose |
| Password Hashing | passlib + bcrypt |
| AI Extraction | Anthropic Claude API (claude-sonnet-4-6) |
| PDF Parsing | pdfplumber |
| File Storage | Local filesystem (dev) / AWS S3 (prod) |
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| Font | IBM Plex Mono |
| HTTP Client | Fetch API |

---

## Project Structure

```
TDIP/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, route registration
│   │   ├── config.py                # Environment settings (pydantic-settings)
│   │   ├── database.py              # SQLAlchemy engine + session factory
│   │   ├── models.py                # ORM models: User, Client, Document, AuditLog
│   │   ├── schemas.py               # Pydantic request/response schemas
│   │   ├── auth.py                  # JWT creation, password hashing, auth dependency
│   │   ├── routes/
│   │   │   ├── auth.py              # POST /login, GET /me
│   │   │   ├── clients.py           # CRUD for clients
│   │   │   ├── documents.py         # Upload, extract, review, approve, serve PDF
│   │   │   └── export.py            # Drake CSV generation + download
│   │   └── services/
│   │       ├── claude_service.py    # Claude API extraction + mock fallback
│   │       └── storage_service.py  # Local filesystem + S3 abstraction
│   ├── seed_data.py                 # Populates demo user, clients, and documents
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                  # Router + protected routes
        ├── index.css                # Tailwind directives + design tokens
        ├── contexts/
        │   └── AuthContext.jsx      # Global auth state, login/logout
        ├── services/
        │   └── api.js               # All fetch calls to the backend
        └── components/
            ├── Login.jsx            # Login form
            ├── Navbar.jsx           # Top navigation bar
            ├── Dashboard.jsx        # Document table, stats, filter tabs
            ├── UploadModal.jsx      # Drag-and-drop PDF upload
            └── ReviewPanel.jsx      # Split-screen PDF viewer + editable form
```

---

## Database Schema

```
users
  id, email, hashed_password, full_name, is_active, created_at

clients
  id, name, email, cpa_id → users.id, created_at

documents
  id, client_id → clients.id, filename, file_path, file_size
  document_type  (w2 | 1099 | k1 | other)
  tax_year, status, extracted_data (JSON), confidence_score
  extraction_error, created_at, updated_at

audit_logs
  id, user_id → users.id, document_id → documents.id
  action, details, ip_address, created_at
```

**Document status flow:**
```
pending → processing → review → approved → exported
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user info |

All other endpoints require `Authorization: Bearer <token>` header.

### Clients

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/clients/` | List all clients for the CPA |
| POST | `/api/clients/` | Create a new client |
| GET | `/api/clients/{id}` | Get a single client |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/documents/` | List all documents |
| POST | `/api/documents/upload` | Upload a PDF (`multipart/form-data`) |
| POST | `/api/documents/{id}/extract` | Trigger AI extraction (async) |
| GET | `/api/documents/{id}` | Get document + extracted data |
| PUT | `/api/documents/{id}` | Update extracted data (CPA edits) |
| POST | `/api/documents/{id}/approve` | Mark document as approved |
| GET | `/api/documents/{id}/file` | Stream the original PDF |

### Export

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/export/drake/{id}` | Download Drake-formatted CSV |

### Diagnostics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health check |
| GET | `/test-claude` | Verify Claude API key is working |

---

## Extraction — How It Works

1. PDF is uploaded and stored (local or S3)
2. CPA clicks **Extract** → endpoint sets status to `processing` and enqueues a background task
3. Background task:
   - Reads PDF bytes from storage
   - Extracts text with `pdfplumber`
   - Sends text to Claude with a structured prompt
   - Parses Claude's JSON response
   - Writes all W-2 fields + confidence score to `documents.extracted_data`
   - Sets status to `review`
4. Frontend polls `GET /api/documents/` every 3 seconds while any doc is `processing`
5. When status flips to `review`, the poll stops and the Review action becomes available

**If no API key is set**, the service returns a realistic mock W-2 extraction so the demo works end-to-end.

### Extracted W-2 Fields

```
employer_name, employer_ein, employer_address
employee_name, employee_ssn_last4, employee_address
tax_year
box1_wages, box2_federal_income_tax
box3_ss_wages, box4_ss_tax_withheld
box5_medicare_wages, box6_medicare_tax_withheld
box12a_code, box12a_amount, box12b_code, box12b_amount
box13_statutory_employee, box13_retirement_plan, box13_third_party_sick_pay
box14_other
box15_state, box15_employer_state_id
box16_state_wages, box17_state_income_tax
box18_local_wages, box19_local_tax, box20_locality_name
confidence_score (0.0 – 1.0), extraction_notes
```

---

## Drake CSV Export Format

The export matches Drake Tax Software's import spec:

```
Record Type, Tax Year, Employer EIN, Employer Name, Employer Address,
Employee Name, Employee SSN, Employee Address,
Box 1–6 (wages + taxes), Box 12a/12b (codes + amounts),
Box 13 checkboxes, Box 14 other,
Box 15–20 (state + local), Client, Document ID, Confidence
```

SSNs are stored and exported as `XXX-XX-1234` (last 4 digits only).

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY

# Seed demo data
python seed_data.py

# Start API server
python -m uvicorn app.main:app --reload --port 5001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)  
API docs: [http://localhost:5001/docs](http://localhost:5001/docs)

### Demo Login

```
Email:    nick@aiolacpa.com
Password: password
```

---

## Environment Variables

```bash
# backend/.env

DATABASE_URL=sqlite:///./taxdoc.db          # Swap for postgres:// in prod
SECRET_KEY=change-this-in-production        # Used to sign JWTs
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

ANTHROPIC_API_KEY=sk-ant-...               # Leave blank to use mock extraction

STORAGE_TYPE=local                          # "local" or "s3"
LOCAL_STORAGE_PATH=./uploads

# Only needed when STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_REGION=us-east-1
```

---

## Security

| Concern | Implementation |
|---|---|
| Authentication | JWT with HS256, 8-hour expiry |
| Password storage | bcrypt hashing via passlib |
| SSN protection | Only last 4 digits stored or exported |
| File access | All file endpoints require valid JWT |
| Tenant isolation | Every query filters by `cpa_id = current_user.id` |
| S3 encryption | Server-side AES-256 when using S3 storage |
| Audit trail | Every upload, extraction, approval, and export is logged to `audit_logs` |
| CORS | Restricted to known frontend origins |

---

## Switching to Production

| Component | Change |
|---|---|
| Database | Set `DATABASE_URL=postgresql://...` |
| File storage | Set `STORAGE_TYPE=s3` + AWS credentials |
| Secret key | Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| Frontend API URL | Update `BASE` in `frontend/src/services/api.js` |
| CORS | Update `allow_origins` in `backend/app/main.py` |

---

## Business Impact

| Metric | Value |
|---|---|
| Clients | 500+ real estate investors |
| Time saved per client | ~2 hours |
| Total hours saved | 1,000+ hours/season |
| CPA hourly rate | $150 |
| Annual value | **$150,000+** |
| Error reduction | Manual 5–10% → AI <1% |
| Replaces SaaS tools | $5,000–10,000/year |

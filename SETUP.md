# Tax Document Intelligence Pipeline — Setup

## Quick Start

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed demo data (creates DB + demo user + 5 clients + sample docs)
python seed_data.py

# Start API server
uvicorn app.main:app --reload --port 8000
```

API runs at: http://localhost:8000  
Docs at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:5173

---

## Demo Login

```
Email:    nick@aiolacpa.com
Password: password
```

---

## Claude API (for real extraction)

Edit `backend/.env` and add your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key, the system uses realistic mock extraction data automatically.

---

## Demo Flow

1. **Login** → nick@aiolacpa.com / password
2. **Dashboard** → See 5 pre-loaded documents in various states
3. **Extract** → Click "Extract" on a Pending document → status → Processing → Review
4. **Review** → Side-by-side PDF + editable extracted fields
5. **Approve** → Click "Approve" → status → Approved
6. **Export** → Click "Export" → downloads Drake-formatted CSV

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI entry point
│   │   ├── models.py        SQLAlchemy models
│   │   ├── routes/          API endpoints
│   │   └── services/        Claude AI + file storage
│   ├── seed_data.py         Demo data seeder
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/      React UI components
        ├── contexts/        Auth context
        └── services/        API client
```

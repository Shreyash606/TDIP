# Tax Document Intelligence Pipeline
### Case Study Submission by Shreyash Thakare

A tool that reads W-2 PDFs, extracts all tax fields using AI, lets a CPA review and edit the data, and exports a file that imports directly into Drake Tax Software. No manual data entry.

Live demo: https://tdip.vercel.app
Login: jane@email.com / 1234567890

---

## What It Does

1. Upload: Drag and drop a W-2 PDF onto the dashboard
2. Extract: Click Extract. The AI reads every field in about 10 seconds
3. Review: See the original PDF on the left and extracted data on the right. Edit anything incorrect
4. Approve: Click Approve when the data is correct
5. Export: Download a CSV formatted for Drake Tax Software

---

## Run It Locally

You need two things installed before you start.

- Python 3.10 or newer: https://www.python.org/downloads
- Node.js 18 or newer: https://nodejs.org

---

### Step 1: Download the project

```
git clone https://github.com/Shreyash606/TDIP.git
cd TDIP
```

---

### Step 2: Set up the backend

Open a terminal and run these commands one at a time.

```
cd backend
```

```
python -m pip install -r requirements.txt
```

```
python seed_data.py
```

This creates the database and loads 5 sample clients with documents.

```
python generate_demo_pdfs.py
```

This creates the sample W-2 PDF files for the review screen.

```
python -m uvicorn app.main:app --reload --port 5001
```

The server is now running. Leave this terminal open.

---

### Step 3: Set up the frontend

Open a second terminal.

```
cd frontend
npm install
npm run dev
```

---

### Step 4: Open the app

Go to http://localhost:5173 in your browser.

Local login:
```
You can create your own account by clicking on CREATE ONE
```

Live site login (https://tdip.vercel.app):
```
Email:    jane@email.com
Password: 1234567890
```

---

## What You See After Logging In

The dashboard shows 5 pre-loaded documents in different stages.

| Document | Status | Action |
|---|---|---|
| John Doe W-2 | Ready for Review | Click Review to see PDF side-by-side |
| Sarah Johnson W-2 | Approved | Click Export to download CSV |
| Michael Chen W-2 | Pending | Click Extract to run AI extraction |
| Emily Rodriguez W-2 | Pending | Click Extract to run AI extraction |
| John Doe 1099 | Pending | Click Extract to run AI extraction |

---

## Enable Live AI Extraction

By default the app uses pre-filled sample data. To run real AI extraction:

1. Open backend/.env in a text editor
2. Add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...
```
3. Restart the backend server

Without a key, every extraction returns sample data and the full workflow still runs.

---

## Project Layout

```
backend/
  app/
    main.py              Server entry point
    models.py            Database tables
    auth.py              Login and security
    routes/
      auth.py            Login endpoint
      clients.py         Client management
      documents.py       Upload, extract, review, approve
      export.py          Drake CSV download
    services/
      claude_service.py  AI extraction logic
      storage_service.py File storage
  seed_data.py           Creates demo data
  generate_demo_pdfs.py  Creates sample PDF files
  requirements.txt

frontend/
  src/
    components/
      Dashboard.jsx      Document list and stats
      ReviewPanel.jsx    PDF viewer and editable fields
      UploadModal.jsx    Drag-and-drop upload
    services/
      api.js             All server communication
```

---

## Environment Variables

Edit backend/.env to configure the backend.

```
DATABASE_URL=sqlite:///./taxdoc.db     The database file location
SECRET_KEY=change-this-in-production   Used to sign login tokens
ANTHROPIC_API_KEY=sk-ant-...           AI extraction, optional for demo
STORAGE_TYPE=local                     Where files are stored
LOCAL_STORAGE_PATH=./uploads           Folder for uploaded PDFs
```

---

## Deployed Version

- Frontend: https://tdip.vercel.app
- Backend: https://courageous-beauty-production-6d0f.up.railway.app

Login on the live site with jane@email.com / 1234567890.

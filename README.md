# Client Intake and Document Collection Tool
### Case Study Submission by Shreyash Thakare

A tool for CPA firms to collect client tax information and supporting documents. CPAs fill out the intake form while sitting with the client. Firm leadership gets a read-only dashboard across every CPA and every submission.

Live demo: https://tdip.vercel.app

Admin login: admin@sdt.com / password123
CPA login: sarah@sdt.com / password123

---

## What It Does

CPAs log in and see their own client list. They create a new intake for a client, fill in the full tax questionnaire during or after the client meeting, upload supporting documents, and mark the form complete.

Firm leadership logs in as Admin and sees every intake across every CPA. They can see which CPA owns each form, what the current status is, and all submitted details. They cannot edit anything.

No client login. The CPA fills the form on behalf of the client.

---

## Demo Accounts

All passwords are `password123`.

| Email | Role | Clients |
|---|---|---|
| admin@sdt.com | Admin (read-only, sees all) | — |
| sarah@sdt.com | CPA | John Doe, Emily Rodriguez, Michael Chen |
| james@sdt.com | CPA | Robert Kim, Priya Patel |

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

Create the `.env` file:

```
DATABASE_URL=sqlite:///./taxdoc.db
SECRET_KEY=change-this-in-production
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads
```

Start the server:

```
python -m uvicorn app.main:app --reload --port 5001
```

The server is now running. Leave this terminal open.

---

### Step 3: Seed demo data

Open a second terminal in the `backend` folder and run:

```
python fresh_seed.py
```

This wipes the database and loads 5 realistic client intakes across two CPAs at different completion stages.

---

### Step 4: Set up the frontend

Open a third terminal.

```
cd frontend
npm install
npm run dev
```

---

### Step 5: Open the app

Go to http://localhost:5173 in your browser.

Log in with any of the demo accounts above.

---

## What You See After Logging In

**CPA (sarah@sdt.com)**

Three clients are pre-loaded. John Doe and Michael Chen have complete intakes with all fields filled. Emily Rodriguez is in progress.

Click any intake to open the form. Edit any field and click Save. Upload supporting documents in the Documents section. Mark the intake complete when done.

**Admin (admin@sdt.com)**

All five intakes across both CPAs are visible. The table shows which CPA owns each intake. Every field is visible but nothing is editable.

---

## Project Layout

```
backend/
  app/
    main.py              Server entry point
    models.py            Database tables
    auth.py              Login, JWT tokens, role enforcement
    database.py          SQLAlchemy setup
    routes/
      auth.py            Login and register endpoints
      intake.py          Intake CRUD, document upload, download
      clients.py         Client management
    services/
      storage_service.py File storage (local or S3)
  fresh_seed.py          Wipes DB and loads demo data
  requirements.txt

frontend/
  src/
    components/
      Home.jsx                Landing page, role-based cards
      IntakeDashboard.jsx     Intake list (CPA: own intakes, Admin: all)
      IntakeReviewPanel.jsx   Full intake form, document upload
      CreateIntakeModal.jsx   New intake modal for CPAs
      Navbar.jsx              Navigation bar
      Login.jsx               Login page
      Register.jsx            Register page (CPA or Admin)
    contexts/
      AuthContext.jsx         JWT token management
    services/
      api.js                  All backend communication
```

---

## Environment Variables

Edit `backend/.env` to configure the backend.

```
DATABASE_URL=sqlite:///./taxdoc.db     Database file (swap to PostgreSQL URL for prod)
SECRET_KEY=change-this-in-production   Signs JWT tokens
STORAGE_TYPE=local                     local or s3
LOCAL_STORAGE_PATH=./uploads           Upload folder (local mode)
AWS_ACCESS_KEY_ID=                     S3 credentials (s3 mode only)
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

---

## Deployed Version

- Frontend: https://tdip.vercel.app
- Backend: https://courageous-beauty-production-6d0f.up.railway.app

Auto-deploys from the `main` branch on GitHub push.

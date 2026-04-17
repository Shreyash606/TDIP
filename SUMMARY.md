# Tax Document Intelligence Pipeline
## Case Study Submission — Shreyash Thakare
### April 2026

---

## What I Built

A working web application that replaces manual W-2 data entry for CPA firms. A CPA uploads a client's W-2 PDF, the system reads every field automatically using AI, the CPA reviews and corrects any errors on a side-by-side screen, and downloads a file that imports directly into Drake Tax Software.

**Live at:** https://tdip.vercel.app (login: jane@email.com / 1234567890)  
**Code at:** https://github.com/Shreyash606/Tax-Document-Intelligence-Pipeline

---

## Part 1 — Architecture & Tech Stack

### How I would build this

**The problem I was solving:** A CPA firm needs a lightweight internal tool to collect documents and extract data. It needs to be fast to build, easy to maintain, secure by default, and replaceable piece by piece as requirements grow.

**Frontend (the website CPAs use):**  
Built with React and Vite — the same technology used by Instagram and Airbnb. It runs entirely in the browser, so there's nothing to install for the user. The UI is minimal and fast: a document dashboard, a drag-and-drop upload screen, and a split-panel review screen that shows the original PDF on the left and the extracted data on the right.

**Backend (the server that does the work):**  
Built with FastAPI, a Python framework chosen because Python is the standard language for AI integrations, and FastAPI is fast, well-documented, and enforces data validation automatically. It handles authentication, file storage, AI extraction, and CSV export.

**Database:**  
SQLite for local development (zero setup, one file), with a one-line swap to PostgreSQL for production. Stores users, clients, documents, extracted data, and a full audit trail.

**AI Extraction:**  
Anthropic's Claude API reads the text extracted from each PDF and returns every W-2 field as structured data, along with a confidence score. If a field is ambiguous, the confidence score drops and the CPA knows to review that section carefully.

**File Storage:**  
Local filesystem for development. The storage layer is abstracted so it can be swapped to AWS S3 for production without touching any other code.

**Hosting:**  
- Backend: Railway (auto-deploys from GitHub, runs 24/7)
- Frontend: Vercel (auto-deploys from GitHub, global CDN)
- Both update automatically when code is pushed to GitHub

**Why these choices:**  
Every piece of this stack is widely used, well-supported, and has a clear upgrade path. SQLite → PostgreSQL when volume grows. Local storage → S3 when redundancy matters. The AI provider can be swapped without changing the rest of the system. I chose tools I can hand off to another engineer without a lengthy explanation.

---

## Part 2 — Security & Compliance

Security was not an afterthought. Every endpoint is protected, every piece of sensitive data is handled carefully, and there is an audit trail for every action.

### Encryption in Transit and at Rest

- **In transit:** All traffic runs over HTTPS — enforced by both Railway (backend) and Vercel (frontend). Data between the browser and server is encrypted at all times.
- **At rest:** Passwords are never stored. The system stores a one-way bcrypt hash — even if someone read the database directly, they could not recover any passwords. For production S3 storage, server-side AES-256 encryption is enabled on every file.

### Access Controls

The system is designed so that one CPA firm can never see another firm's data — even if they share the same server. Every database query filters by the logged-in user's ID before returning anything. There is no way for a logged-in user to access another firm's clients or documents, even if they know the document's ID.

File access follows the same rule. PDFs are served through the API, not as static files. You cannot download a PDF without a valid login token, and the system verifies you own that document before serving it.

### IRC §7216 — Honest Assessment

I was not familiar with IRC §7216 before reading this prompt. I have now reviewed it. My understanding is that it restricts how tax return information can be used, shared, or disclosed — including by software systems — and requires explicit written client consent before that information can be used for any purpose beyond preparing their return.

Here is how I would factor this into the design:

1. **Consent at intake:** The client upload screen would include explicit consent language explaining how their data is used and stored. This consent would be logged with a timestamp.
2. **Data minimization:** The system already stores only the last 4 digits of SSNs — never the full number. I would extend this thinking to every sensitive field.
3. **No third-party sharing:** The AI extraction uses Anthropic's API, which means document text is sent to a third-party service. Before deploying this in production, I would review Anthropic's data processing agreements and either confirm §7216 compliance or move extraction to a locally-hosted model.
4. **Audit trail:** Every action — upload, extraction, review, approval, export — is logged with the user ID, document ID, timestamp, and action type. This supports any compliance audit.
5. **Retention policy:** I would work with the firm and legal counsel to define how long data is retained and implement automated deletion.

I would not claim to fully understand §7216 without working through it with a compliance attorney. But the architecture is designed to make compliance additions straightforward — consent logging, data minimization, and audit trails are already in place.

### Monitoring and Alerting

- Every upload, extraction, approval, and export is written to an `audit_logs` table with the user, timestamp, and action
- Failed extractions are logged with the full error message
- The `/health` endpoint allows external uptime monitoring (UptimeRobot or similar, free)
- For production: Railway provides error logs and crash alerts. I would add Sentry for exception tracking and set alerts for error spikes or failed logins

---

## Part 3 — The Build

### What is implemented and working

**Client-facing intake and upload:**
- Drag-and-drop PDF upload with client selection
- Multiple document types: W-2, 1099, K-1, Other
- Tax year selection
- Upload confirmation with file size validation

**AI extraction:**
- Reads text from uploaded PDF using pdfplumber
- Sends extracted text to Claude API with a structured prompt
- Receives and parses all 25+ W-2 fields as structured JSON
- Stores a confidence score (0–100%) per document
- Falls back to realistic mock data if no API key is configured — so the full workflow is always demonstrable

**CPA review interface:**
- Original PDF displayed on the left
- All extracted fields editable on the right, grouped by section
- Confidence score shown in the header
- Save changes and Approve buttons

**Drake Tax Software export:**
- One-click download of a CSV file formatted to Drake's import specification
- SSNs exported as XXX-XX-XXXX (last 4 digits only)

**Security measures implemented in code (not just described):**
1. Every route except login requires a valid signed JWT token
2. All database queries filter by `cpa_id = current_user.id` — impossible to access another user's data
3. SSNs are stored and displayed as last 4 digits only, never the full number
4. All document file requests are authenticated — no direct file URLs
5. Full audit log on every action

**Multi-user accounts:**
- Any CPA can create an account (register page at /register)
- Each account's data is completely isolated from every other account

---

## Part 4 — Rollout & Maintenance

### Getting to Production

**Phase 1 — Parallel run (weeks 1–2):**  
Run this tool alongside the existing third-party portal. Have one or two staff members process the same documents in both systems and compare outputs. This validates the AI accuracy before it becomes the primary workflow.

**Phase 2 — Soft launch (weeks 3–4):**  
Move new client onboarding to the new tool. Keep the old portal available for existing in-progress engagements. Watch error rates and extraction confidence scores closely.

**Phase 3 — Full cutover:**  
Once the team is comfortable with the accuracy and workflow, retire the old portal subscription.

**Data migration:**  
The existing portal's client list would be imported via a one-time script. No historical document data needs to migrate — only active clients.

### Monitoring After Launch

- Uptime check on `/health` every 5 minutes via UptimeRobot (free)
- Sentry for error tracking and exception alerts
- Weekly review of audit logs to spot unusual patterns
- Monthly review of extraction confidence scores — a consistent drop suggests a new document format that needs a prompt adjustment

### What Would Break First, and How I'd Handle It

**1. The AI extraction quality.**  
If clients submit W-2s with unusual formatting, handwriting, or poor scan quality, extraction confidence will drop. The CPA review step exists precisely for this — low-confidence extractions are flagged and the CPA corrects them. Over time, I would identify common failure patterns and tune the extraction prompt to handle them.

**2. The file storage filling up.**  
Local storage is not suitable for production at scale. The storage layer is already abstracted to swap to S3 — this would be the first infrastructure change before launch.

**3. The database under load.**  
SQLite has concurrency limitations. Swapping to PostgreSQL is a one-line configuration change. The database schema and queries are written to be compatible with both.

**4. The Anthropic API going down.**  
The extraction service has a fallback to mock data. For production, I would add retry logic and a queue so that documents wait for the API to recover rather than failing immediately.

---

## Assumptions I Made

1. **W-2 extraction only for MVP.** The prompt mentioned W-2s as the primary document type. I built the extraction logic for W-2s specifically. The architecture supports adding 1099, K-1, and other document types as separate extraction prompts.

2. **CPA-side tool only.** I built this as an internal tool for the CPA team, not a client-facing portal where clients log in. The prompt described "client-facing intake" but also said "internal tool" — I read this as CPAs uploading on behalf of clients, not clients self-serving. A client login layer can be added.

3. **Drake Tax Software as the export target.** The prompt mentioned Drake. I formatted the CSV export to Drake's import specification. Other software (ProSeries, Lacerte) would require different export formats.

4. **No full-text search needed at MVP.** Search and filtering are by document status only. Full-text search across extracted data can be added.

5. **Single-region deployment is acceptable.** The app is deployed to US-based infrastructure (Railway + Vercel). No multi-region redundancy at this stage.

---

## How I Would Go Further (Given More Time)

- **Client portal:** A separate login for clients to upload their own documents, reducing CPA workload at intake
- **Email notifications:** Alert the CPA when a client uploads, alert the client when their documents are processed
- **Batch export:** Export all approved documents for a tax year at once
- **Confidence thresholds:** Auto-approve extractions above 95% confidence, flag anything below 80% for mandatory review
- **PostgreSQL + S3:** Production-grade storage from day one

---

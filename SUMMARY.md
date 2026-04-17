# Tax Document Intelligence Pipeline
## Case Study Submission: Shreyash Thakare
### April 2026

Live demo: https://tdip.vercel.app (login: jane@email.com / 1234567890)
Code: https://github.com/Shreyash606/TDIP

---

## What I Built

A web application that replaces manual W-2 data entry for CPA firms. A CPA uploads a client W-2 PDF. The system reads every field using AI. The CPA reviews and corrects errors on a split screen. One click downloads a file that imports directly into Drake Tax Software.

---

## Part 1: Architecture and Tech Stack

### The Problem

A CPA firm needs a lightweight internal tool to collect documents and extract data. It needs to be fast to build, easy to maintain, secure by default, and swappable piece by piece as requirements grow.

### Frontend

Built with React and Vite. Runs entirely in the browser. No installation required for the user. The UI has three screens: a document dashboard, a drag-and-drop upload screen, and a split-panel review screen with the original PDF on the left and extracted data on the right.

### Backend

Built with FastAPI, a Python framework. Python is the standard language for AI integrations. FastAPI enforces data validation automatically and is well-documented. The backend handles authentication, file storage, AI extraction, and CSV export.

### Database

SQLite for local development. Zero setup, one file. One configuration line swaps it to PostgreSQL for production. Stores users, clients, documents, extracted data, and a full audit trail.

### AI Extraction

Anthropic's Claude API reads the text extracted from each PDF and returns every W-2 field as structured data, along with a confidence score. A low confidence score tells the CPA to review that section.

### File Storage

Local filesystem for development. The storage layer is abstracted. One configuration change swaps it to AWS S3 for production without touching any other code.

### Hosting

- Backend: Railway, auto-deploys from GitHub, runs 24/7
- Frontend: Vercel, auto-deploys from GitHub, global CDN

Both update automatically on every push to GitHub.

### Why These Choices

Every piece of this stack is widely used and well-supported. SQLite upgrades to PostgreSQL when volume grows. Local storage upgrades to S3 when redundancy matters. The AI provider swaps without changing the rest of the system. I chose tools another engineer can pick up without a lengthy explanation.

---

## Part 2: Security and Compliance

Every endpoint is protected. Every piece of sensitive data is handled carefully. There is an audit trail for every action.

### Encryption in Transit and at Rest

In transit: All traffic runs over HTTPS, enforced by Railway and Vercel. Data between the browser and server is encrypted at all times.

At rest: Passwords are never stored in plain text. The system stores a one-way bcrypt hash. Reading the database directly does not expose any passwords. For production S3 storage, server-side AES-256 encryption is enabled on every file.

### Access Controls

One CPA firm cannot see another firm's data, even on a shared server. Every database query filters by the logged-in user's ID before returning anything. A logged-in user cannot access another firm's clients or documents, even with a known document ID.

PDFs are served through the API, not as static files. You need a valid login token to download a PDF. The system also checks that you own that document before serving it.

### IRC Section 7216: Honest Assessment

I was not familiar with IRC Section 7216 before reading this prompt. I reviewed it. My understanding: it restricts how tax return information is used, shared, or disclosed, including in software systems. It requires explicit written client consent before information is used for any purpose beyond preparing their return.

Here is how I would factor this into the design:

1. Consent at intake: The upload screen would include explicit consent language explaining how data is used and stored. The consent is logged with a timestamp.
2. Data minimization: The system already stores only the last 4 digits of SSNs. I would extend this to every sensitive field.
3. Third-party review: The AI extraction sends document text to Anthropic's API. Before deploying to production, I would review Anthropic's data processing agreements and confirm Section 7216 compliance, or move extraction to a locally-hosted model.
4. Audit trail: Every action (upload, extraction, review, approval, export) is logged with the user ID, document ID, timestamp, and action type. This supports any compliance audit.
5. Retention policy: I would work with the firm and legal counsel to define how long data is kept and automate deletion.

I would not claim to fully understand Section 7216 without working through it with a compliance attorney. The architecture makes compliance additions straightforward. Consent logging, data minimization, and audit trails are already in place.

### Monitoring and Alerting

- Every upload, extraction, approval, and export writes to an audit_logs table with the user, timestamp, and action
- Failed extractions are logged with the full error message
- The /health endpoint supports external uptime monitoring via UptimeRobot or similar tools
- Railway provides error logs and crash alerts. Sentry would add exception tracking and alerts for error spikes or failed logins

---

## Part 3: The Build

### What Is Implemented and Working

Client-facing intake and upload:
- Drag-and-drop PDF upload with client selection
- Document types: W-2, 1099, K-1, Other
- Tax year selection
- Upload confirmation with file size validation

AI extraction:
- Reads text from uploaded PDF using pdfplumber
- Sends extracted text to Claude API with a structured prompt
- Parses all 25+ W-2 fields as structured JSON
- Stores a confidence score (0 to 100%) per document
- Falls back to sample data when no API key is configured, so the full workflow is always demonstrable

CPA review interface:
- Original PDF on the left
- All extracted fields editable on the right, grouped by section
- Confidence score shown in the header
- Save and Approve buttons

Drake Tax Software export:
- One-click download of a CSV file matching Drake's import specification
- SSNs exported as XXX-XX-XXXX (last 4 digits only)

Security measures in the code (not descriptions):
1. Every route except login requires a valid signed JWT token
2. All database queries filter by cpa_id = current_user.id. Accessing another user's data is not possible
3. SSNs are stored and displayed as last 4 digits only
4. All document file requests are authenticated. No direct file URLs exist
5. Full audit log on every action

Multi-user accounts:
- Any CPA creates an account at /register
- Each account's data is fully isolated from every other account

---

## Part 4: Rollout and Maintenance

### Getting to Production

Phase 1, weeks 1 to 2: Run this tool alongside the existing third-party portal. Have staff process the same documents in both systems and compare outputs. This validates AI accuracy before it becomes the primary workflow.

Phase 2, weeks 3 to 4: Move new client onboarding to the new tool. Keep the old portal for in-progress engagements. Watch error rates and extraction confidence scores closely.

Phase 3, full cutover: Once the team is comfortable, retire the old portal subscription.

Data migration: Import the existing client list via a one-time script. No historical document data needs to migrate.

### Monitoring After Launch

- Uptime check on /health every 5 minutes via UptimeRobot
- Sentry for error tracking and exception alerts
- Weekly review of audit logs to spot unusual patterns
- Monthly review of extraction confidence scores. A consistent drop means a new document format needs a prompt update

### What Breaks First

1. AI extraction quality. Clients submit W-2s with unusual formatting, handwriting, or poor scan quality. Extraction confidence drops. The CPA review step exists for this. Low-confidence extractions are flagged and corrected. I would identify common failure patterns and update the extraction prompt.

2. File storage fills up. Local storage does not scale to production. The storage layer is already abstracted for S3. This is the first infrastructure change before launch.

3. Database under load. SQLite has concurrency limits. Swapping to PostgreSQL is one configuration line. The schema and queries work with both.

4. Anthropic API downtime. The extraction service falls back to sample data. For production, I would add retry logic and a queue so documents wait for the API to recover.

---

## Assumptions

1. W-2 extraction only for MVP. The case study focused on W-2s. I built the extraction logic for W-2s. The architecture supports adding 1099, K-1, and other document types as separate extraction prompts.

2. CPA-side tool only. I built this as an internal tool for the CPA team. The prompt described client-facing intake but also said internal tool. I read this as CPAs uploading on behalf of clients. A client login layer can be added.

3. Drake Tax Software as the export target. I formatted the CSV export to Drake's import specification. Other software (ProSeries, Lacerte) would need different export formats.

4. No full-text search at MVP. Filtering is by document status only. Full-text search across extracted data can be added later.

5. Single-region deployment is acceptable. The app runs on US-based infrastructure. No multi-region redundancy at this stage.

---

## What I Would Build Next

- Client portal: A separate login for clients to upload their own documents, reducing CPA workload at intake
- Email notifications: Alert the CPA when a client uploads, alert the client when documents are processed
- Batch export: Export all approved documents for a tax year in one action
- Confidence thresholds: Auto-approve extractions above 95% confidence, flag anything below 80% for mandatory review
- PostgreSQL and S3: Production-grade storage from day one

---

Submitted by Shreyash Thakare
wakulkar.a@northeastern.edu

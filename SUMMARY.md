# Client Intake and Document Collection Tool
## Case Study Submission: Shreyash Thakare
### April 2026

Live demo: https://tdip.vercel.app
Code: https://github.com/Shreyash606/TDIP

Admin login: admin@sdt.com / password123
CPA login: sarah@sdt.com / password123

---

## Part 1: Architecture and Tech Stack

### The Problem

A CPA firm needs a lightweight tool to collect client tax information and documents. CPAs sit with clients, fill out the form on their behalf, and upload supporting documents. Firm leadership needs visibility into all activity across every CPA. The tool needs to be fast to build, easy to maintain, and secure by default.

### Frontend

Built with React and Vite. It runs entirely in the browser with no installation required. The interface has three screens: a landing page that routes the user based on their role, a CPA intake form where they fill in client details and upload documents, and an admin dashboard where firm leadership can view every submission across every CPA.

React was chosen because it is the most widely supported frontend framework. Any engineer the firm hires will know it. Vite keeps the build fast. Tailwind CSS keeps the styling consistent without a design system.

### Backend

Built with FastAPI, a Python framework. Python is the standard language for data and business logic tools. FastAPI validates every request automatically, generates interactive API documentation at /docs, and is straightforward to maintain. Every endpoint is documented and testable without a separate tool.

### Database

SQLite for local development. Zero setup, one file on disk. One environment variable swaps it to PostgreSQL for production. The schema and all queries work identically on both. No migration framework is needed at this stage. The database holds users, clients, intake submissions, uploaded documents, and a full audit trail.

### Document Storage

Files are stored on the local filesystem during development. The storage layer is fully abstracted. One configuration line switches it to AWS S3 for production without changing any other code. Files are never served as public URLs. Every download request goes through the API, which checks authentication and authorization before returning the file.

### Authentication

JWT Bearer tokens with role-based access control. Three roles exist: CPA, Admin, and a legacy Client role. CPAs can create intake forms and fill them in for their own clients only. Admins can view all submissions across all CPAs but cannot edit anything. Every token is signed with a secret key and expires after 8 hours.

### Hosting

Backend: Railway. Auto-deploys from GitHub on every push. Runs 24 hours a day.
Frontend: Vercel. Auto-deploys from GitHub. Served over a global CDN.

Both update automatically when code is pushed to the main branch.

### Why These Choices

Every piece of this stack is widely used and well-documented. SQLite upgrades to PostgreSQL without touching the application code. Local storage upgrades to S3 the same way. A new engineer can understand the full codebase in an afternoon. I chose tools the firm can hire for, not tools that require a specialist.

---

## Part 2: Security and Compliance

### Encryption in Transit

All traffic runs over HTTPS. Railway and Vercel both enforce this. There is no plain HTTP option in production. Data between the browser and the server is encrypted at every point.

### Encryption at Rest

Passwords are never stored in plain text. The system stores a bcrypt hash with a work factor of 12. Reading the database directly reveals nothing useful. For uploaded files in production S3 storage, server-side AES-256 encryption is enabled on every object by default.

### Access Controls

Every API endpoint requires a valid signed JWT token. Unauthenticated requests receive a 401 before any data is touched.

CPA access is scoped to their own data. Every database query that returns clients or intake submissions filters by the logged-in CPA's user ID. A CPA with a valid token cannot access another CPA's clients or forms, even if they know the record ID. This is enforced at the query level, not just the UI level.

Admin access is read-only. Admins can view all submissions but the update endpoints reject admin tokens with a 403. This is enforced in the backend route handlers, not controlled by the frontend.

Files are served through authenticated endpoints only. There are no public file URLs. The download endpoint validates the token, confirms the user has access to that specific intake, and then returns the file.

### IRC Section 7216: Honest Assessment

I was not familiar with IRC Section 7216 before reading this prompt. My understanding after reviewing it: it restricts how tax return information can be used, shared, or disclosed, including through software systems. It requires explicit written client consent before information is used for any purpose beyond preparing their return.

Here is how I would factor this into the design.

Consent at intake. Before the CPA fills in any client data, the form would include a consent statement explaining how the information is stored and used. The CPA confirms consent on behalf of the client. The consent is logged with a timestamp and the CPA's user ID.

Data minimization. The current system stores only the last four digits of Social Security numbers. I would review every sensitive field and apply the same principle. Store what is needed for tax preparation and nothing more.

Third-party review. The system does not currently send client data to any third-party AI service. If AI extraction were added for this workflow, I would review the vendor's data processing agreements before enabling it and confirm Section 7216 compliance before going to production.

Audit trail. Every action in the system writes a record to the audit log with the user ID, the record affected, the timestamp, and the action type. This supports any compliance review.

Retention policy. I would work with the firm and legal counsel to define how long client data is kept and build automated deletion into the system before launch.

I would not claim to fully understand Section 7216 without working through it with a compliance attorney. The architecture makes compliance additions straightforward because the controls are built into the data layer, not bolted on afterward.

### Monitoring and Alerting

Every upload, save, and status change writes to an audit_logs table with the user, timestamp, and action. Failed requests are logged with the full error.

The /health endpoint supports external uptime monitoring. UptimeRobot or a similar tool can check it every five minutes and alert if the server goes down.

Railway provides error logs and crash alerts for the backend. Sentry would add exception tracking, error rate monitoring, and alerts for unusual activity patterns.

---

## Part 3: The Build

### What Is Implemented and Working

Two user roles with separate experiences.

CPA login: The CPA sees their clients and intake forms. They create a new intake for a client, fill in the full tax questionnaire during or after the client meeting, upload supporting documents, and mark the form complete. The form covers personal information, filing status, spouse and dependent details, all income source types, deductions, and bank information for direct deposit.

Admin login: Firm leadership logs in and sees every client intake across every CPA. They can see which CPA owns each form, what the current status is, and all submitted details. They cannot edit anything.

Security measures implemented in the code, not just described.

1. Every route except login and register requires a valid signed JWT token. Invalid or expired tokens receive a 401 before any data is accessed.
2. CPA database queries filter by cpa_id equal to the logged-in user's ID. Accessing another CPA's data is structurally impossible, not just blocked at the UI layer.
3. Passwords are stored as bcrypt hashes. The plain text password is never written to disk or logged.
4. File downloads are authenticated. The download endpoint decodes the JWT, checks the user's role, and verifies they have access to that specific intake before returning any bytes.
5. Admin tokens are rejected by the update endpoints with a 403. Read-only access is enforced in the backend, not controlled by the frontend.

### Assumptions Made

CPAs fill in the form on behalf of clients. The case study described a client-facing intake tool, but also described an internal firm tool. I read the primary need as reducing manual work during the CPA-client meeting. The form is designed for a CPA to fill in while speaking with the client. A client-facing portal can be added as a second phase without changing the data model.

No document processing at intake. The tool collects and stores documents. It does not extract data from them at intake. That is a separate workflow. Keeping them separate makes each part simpler and easier to maintain.

Standard deduction as the default. The deduction preference field defaults to standard. The CPA changes it to itemized if that is what the client needs.

---

## Part 4: Rollout and Maintenance

### Getting to Production

Phase 1, weeks 1 to 2: Run the new tool in parallel with the existing intake process. CPAs use both systems for the same clients and compare results. This validates that the form captures everything the old process captured.

Phase 2, weeks 3 and 4: Move new client intakes to the new tool. Keep the old process for clients already in progress. Watch error rates and make sure no data is lost.

Phase 3: Full cutover. Once every CPA is comfortable with the workflow, retire the old tool.

Data migration: Existing client records import through a one-time script. The client and intake tables can be populated from a CSV export of the current system. No historical document data needs to migrate.

### Monitoring After Launch

Uptime check on /health every five minutes via UptimeRobot.
Sentry for exception tracking and error rate alerts.
Weekly review of audit logs to check for unusual access patterns.
Monthly review of form completion rates. If CPAs are consistently skipping sections, the form needs to be adjusted.

### What Breaks First

1. File storage fills up. Local storage on the server does not scale. The storage layer is already abstracted. Switching to S3 is one environment variable change. This happens before launch, not after.

2. Database under load. SQLite has concurrency limits that will surface when multiple CPAs are using the system simultaneously. Switching to PostgreSQL is one configuration line. This is the first infrastructure change before the firm goes above five users.

3. Form completeness. CPAs will find fields that are missing or sections that do not match their actual workflow. The form is built to be extended. Adding a field is a one-line change to the database model and a one-line addition to the form component.

4. Permission edge cases. As the firm grows and roles become more complex, the current three-role model may need to expand. The role check is centralized in the authentication middleware, so adding a new role or permission does not require touching every endpoint.

---

Submitted by Shreyash Thakare

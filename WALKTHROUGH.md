# Demo Walkthrough
## 5–10 minute presentation guide

---

## Before You Start

- [ ] Backend running: `cd backend && python -m uvicorn app.main:app --reload --port 5001`
- [ ] Frontend running: `cd frontend && npm run dev`
- [ ] Demo data loaded: `cd backend && python fresh_seed.py`
- [ ] Browser open at http://localhost:5173, not logged in
- [ ] GitHub repo open in another tab: github.com/Shreyash606/TDIP
- [ ] DB Browser for SQLite open on `backend/taxdoc.db` to show encrypted fields

---

## The Story (say this first)

> "Every tax season, a CPA sits down with a client and collects their information — SSN, income sources, dependents, bank details for the refund, supporting documents. Today that happens on paper or over email. Data gets lost, consent is never formally recorded, and firm leadership has no visibility into what's happening across the team.
>
> This tool fixes that. The CPA fills in a structured form during the client meeting, uploads the documents, and marks the intake complete. Leadership logs in and sees every submission across every CPA in one place — who has what, what's done, what's still open."

---

## Demo Flow

### 1. Login as CPA — 1 minute

- Go to http://localhost:5173
- Log in: `sarah@sdt.com` / `password123`
- **Say:** "Each CPA has their own account. They can only see their own clients — that's enforced at the database level, not just the interface."

---

### 2. CPA Dashboard — 1 minute

- Show the list of three clients: John Doe (Complete), Emily Rodriguez (In Progress), Michael Chen (Complete)
- **Say:** "This is everything Sarah is responsible for. She can see at a glance what's done and what still needs work. She can't see James Carter's clients even though they're in the same firm."

---

### 3. Open a Complete Intake — 2 minutes

- Click **John Doe**
- Scroll through the form — personal info, filing status, spouse details, income sources, deductions
- Point out the SSN field: shows `***-**-4321`
- **Say:** "The CPA sees the last 4 digits of the SSN — enough to verify they have the right client, but not the full number. The full SSN is only visible to firm leadership."
- Point out the bank fields — show the Reveal button
- **Say:** "Bank routing and account numbers are masked by default. The CPA clicks Reveal when they need to verify them."
- Point out the §7216 consent section — show it's checked with a timestamp
- **Say:** "Before any intake can be marked complete, the CPA confirms the client has given consent under IRC §7216. That confirmation is logged with a timestamp that can't be changed."
- Show the Documents panel on the right
- **Say:** "Supporting documents are uploaded here and tied to this specific intake. There are no public URLs — every download goes through the server, which checks who you are first."

---

### 4. Edit an In-Progress Intake — 1 minute

- Go back, click **Emily Rodriguez**
- Change a field — e.g. toggle an income source
- Click **Save →**
- Show the green **Saved** confirmation
- Change the status dropdown to **Complete**, click **Update Status →**
- Show the green **Updated** confirmation
- **Say:** "Every save is immediate. The CPA doesn't have to submit a form — they save as they go."

---

### 5. Log Out and Log In as Admin — 2 minutes

- Log out, log in: `admin@sdt.com` / `password123`
- Show the dashboard — all 5 intakes across both CPAs, with a CPA column
- **Say:** "Firm leadership sees everything. Every CPA, every client, every status."
- Click **John Doe**
- Show the SSN field — full number visible: `412-74-4321`
- **Say:** "Admin sees the full SSN. CPAs see the last 4. That's the access control."
- Show bank fields — "On file (restricted)"
- **Say:** "Bank numbers aren't visible to admin — they're for the CPA to handle with the client. Admin just needs to know the data is there."
- Show consent section — date and time visible
- Try clicking any field — nothing is editable
- **Say:** "Admin is read-only. The update endpoints on the server reject admin tokens with a permission error. It's not just hidden in the UI — it's blocked on the server."

---

### 6. Show the Database — 1 minute (if asked about security)

- Switch to DB Browser for SQLite
- Open `intake_submissions`, browse to `taxpayer_ssn_last4`
- **Say:** "This is what the database actually stores. Not the SSN — Fernet ciphertext. Without the encryption key, this is completely unreadable. The key lives in the server's environment variables, never in the code."
- Show `bank_routing_number` — same ciphertext
- Show `audit_logs` — point out user ID, action, IP address, timestamp
- **Say:** "Every file upload and download writes a row here. Full audit trail."

---

## If They Ask

**"What about §7216?"**
> "It governs how client tax data can be used and shared. Two things are built for it now: the consent checkbox is required and permanently timestamped on every intake, and the system doesn't send client data to any third-party service. Before going live I'd sit with a compliance attorney and go through it section by section. The architecture makes compliance additions easy — the controls are in the data layer."

**"Is this production-ready?"**
> "The core is solid. Before launch: swap SQLite for PostgreSQL, local storage for S3, connect Sentry for error monitoring. Those are all single config line changes — no code changes. The encryption, access controls, and audit trail are already in place."

**"What would you build next?"**
> "In priority order: MFA on logins — it's the highest-impact security improvement for a tool handling financial data. Then a client portal so clients can fill in their own basic information before the meeting. Then AI document extraction — upload a W-2 and have the system read the fields automatically."

**"How would you roll this out?"**
> "Two-week parallel run alongside whatever the firm uses today. CPAs use both for the same clients, compare results, flag anything missing. Then new clients move to the new tool, existing in-progress clients stay in the old one. Full cutover once the team is comfortable."

**"Why can the admin see the full SSN?"**
> "Firm leadership needs it for compliance review and in case a CPA makes an error. The CPA collects it and verifies last 4, the admin has full access for oversight. It's the same model banks use — tellers see masked numbers, compliance officers see everything."

---

## What to Skip

- Registration page (mention it exists, don't demo it)
- The `/docs` API explorer (only if they ask about the API)
- Error states

---

## Closing Line

> "What's here is a working, deployed system with real security — encrypted sensitive fields, role-based access enforced on the server, consent tracking, a full audit trail, and rate limiting on logins. It's not a prototype that gestures at security. The foundation is production-grade. Scaling it up is configuration, not architecture."

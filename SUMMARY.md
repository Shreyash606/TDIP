# Client Intake and Document Collection Tool
### Shreyash Thakare — April 2026

Live demo: https://tdip.vercel.app
Code: https://github.com/Shreyash606/TDIP

| Account | Email | Password |
|---|---|---|
| Admin (firm leadership) | admin@sdt.com | password123 |
| CPA — Sarah Miller | sarah@sdt.com | password123 |
| CPA — James Carter | james@sdt.com | password123 |
| Client — Alex Smith | alex.smith@client.com | password123 |

---

## Part 1: Architecture and Stack

**The problem.** CPAs collect client tax information by email, phone, and spreadsheet — slow, error-prone, and hard to track. This tool replaces that. Clients log in, fill their own intake form, upload their documents, and submit directly to their CPA. The CPA reviews what was submitted, adds notes, and marks the return complete. Firm leadership sees every submission across every CPA in one place.

**Frontend** — React. Runs in the browser, no install required. Four views: client portal, CPA intake dashboard, CPA intake review form, admin dashboard.

**Backend** — Python (FastAPI). Handles all business logic, security checks, and file storage. Auto-generates API documentation at `/docs`.

**Database** — SQLite for local development. One line in the config file switches it to PostgreSQL for production. No code changes needed.

**File storage** — Files are stored locally during development. One config line switches it to AWS S3 for production. Files are organized as `clients/{client_id}/{tax_year}/{filename}` — tied to a specific client and year, not just dumped in a folder.

**Hosting** — Backend on Railway, frontend on Vercel. Both auto-deploy when code is pushed to GitHub. No manual deployments.

---

## Part 2: Security and Compliance

### Encryption

**In transit** — All traffic is HTTPS. Railway and Vercel enforce this. No plain HTTP option exists in production.

**Passwords** — Stored as bcrypt hashes (work factor 12). If someone stole the database, they could not recover any password.

**Uploaded files** — When stored in AWS S3, every file is encrypted with AES-256. This is enforced in code, not left as an S3 setting someone could accidentally turn off.

**Sensitive fields** — Social Security numbers, spouse SSNs, bank routing numbers, and bank account numbers are encrypted with Fernet (a standard symmetric encryption algorithm) before they are written to the database. The encryption key lives in the server's environment variables — never in the code. If someone stole the database file, they would see unreadable ciphertext for every sensitive field.

### Access Controls

Every person who logs in gets a signed token that expires after 8 hours. Every request to the server includes this token. The server checks it before touching any data.

**CPAs** can only see their own clients and their own intake forms. This is enforced at the database query level — it is structurally impossible for a CPA to access another CPA's data, even if they knew the record ID.

**Admins** can see all submissions across all CPAs but cannot edit anything. The update endpoints reject admin tokens with a permission error. This is enforced on the server, not just hidden in the interface.

**File downloads** have no public URLs. Every file request goes through the server, which checks who you are and whether you have access to that specific intake before sending a single byte.

**Login is rate-limited** to 5 attempts per minute per IP address. Too many failed attempts returns an error. This blocks brute-force attacks on CPA and admin passwords.

**File uploads** are validated before storage: only PDF, JPG, PNG, TIFF, DOC, and DOCX are accepted, files must be under 20 MB, and empty files are rejected.

**Security headers** are added to every server response. These prevent common browser-based attacks like clickjacking and MIME-type sniffing.

### What CPAs and Admins Can See

| Field | CPA | Admin |
|---|---|---|
| Full SSN | No — sees last 4 only (`***-**-4321`) | Yes — full number visible |
| Bank routing / account | Masked — Reveal button to view | "On file (restricted)" |
| Other client details | Full access to their own clients | Read-only across all clients |

### IRC §7216

This law restricts how tax return information can be used and shared, including in software. Before I could claim full compliance I would work through it with a compliance attorney. Here is what is built now based on my reading of it.

**Consent is tracked.** The intake form includes a required checkbox the CPA must confirm before completing an intake: *"Client has provided consent for this firm to collect and use their tax information in accordance with IRC §7216."* The server records a timestamp and the CPA's identity when this is checked. The record is permanent.

**Data minimization.** The system collects only what is needed. SSNs are stored encrypted. The system does not send client data to any external service.

**Audit trail.** Every file upload and download is logged with who did it, when, from what IP address, and which file. Every change to an intake is timestamped. This log is available for any compliance review.

### Monitoring

- `/health` endpoint — can be checked every 5 minutes by an uptime monitoring service (UptimeRobot, etc.). Alerts if the server goes down.
- Server logs on Railway — all errors and crashes are captured.
- Audit log table — records every access, upload, and download. Review weekly for anything unusual: access outside business hours, the same file downloaded many times, or an unusually high volume of failed logins.
- Sentry (not yet connected) — would add real-time error alerts and track spikes in failed requests.

---

## Part 3: What Is Built

**Client experience** — Register with name, email, and password. Automatically connected to a CPA. Fill in personal information, income sources, and deductions using plain-language questions. Upload W-2s, 1099s, and other documents with category labels. Submit when ready — the form locks and the CPA is notified. If anything is missing, the CPA can add notes.

**CPA experience** — Log in, see your clients, open an intake filled in by the client, review everything, add CPA notes, confirm §7216 consent, upload additional documents, and mark the intake complete.

**Admin experience** — Log in, see every intake across every CPA, see which CPA owns it, read all details, see consent status. Cannot edit anything.

**Security measures that exist in code, not just on paper:**

1. Every endpoint requires a valid signed token. No token, no data.
2. CPA queries filter by the logged-in CPA's ID at the SQL level. Cross-access is structurally impossible.
3. Passwords are bcrypt hashed. Plaintext is never stored or logged.
4. File downloads are authenticated and authorized on the server before any bytes are sent.
5. Admin tokens are rejected by update endpoints with a 403 error.
6. Login is rate-limited to 5 per minute per IP.
7. File uploads are validated for type, size, and content before storage.
8. SSN and bank fields are Fernet-encrypted before database writes.
9. §7216 consent is logged with a timestamp that cannot be retroactively removed.
10. Every file upload and download writes an audit log entry.
11. Security headers are applied to every HTTP response.

**Assumptions made — documented explicitly:**

**Single CPA assignment.** When a client registers, the system automatically assigns them to the first active CPA in the database. This is the right default for a single-CPA firm and keeps the onboarding flow instant — no admin action required.

As the firm grows, load distribution becomes necessary. The data model already supports all common strategies — only `clients.cpa_id` changes:

| Strategy | Description |
|---|---|
| Round Robin | Cycle through CPAs in order — simple and fair |
| Workload-based | Assign to the CPA with the fewest open intakes |
| Manual assignment | Admin picks the CPA at client registration |
| Specialization | Route by client type (freelancer, business owner, retiree) |

**One intake per client per tax year.** Each client has exactly one intake submission. The system does not support amended returns, corrections after submission, or multiple filings for the same year. This covers the standard case — a client files once, the CPA reviews once.

**Tax year defaults to 2024.** The current tax year is set at registration time and does not change. A multi-year workflow (e.g. filing 2023 and 2024 in the same system) would require a year-selection step and a separate intake record per year. The data model supports this — only the intake creation logic needs updating.

**Admin is read-only by design.** Admins can view every intake across every CPA but cannot edit, reassign, or delete anything. Update endpoints reject admin tokens with a 403 error, enforced on the server. This is a deliberate design choice: firm leadership needs visibility, not write access that could interfere with active CPA work.

**Client submission is permanent.** Once a client submits their intake to the CPA, the form locks and cannot be edited or retracted. The CPA sees exactly what was submitted. If a client needs to correct something after submission, the CPA handles it manually through notes. This keeps the submission record clean and prevents mid-review changes from creating confusion.

**Other assumptions:**
- The tool collects and stores documents. AI extraction is a separate workflow (prototype exists in the codebase but is not part of the intake flow).
- Three roles — Client, CPA, and Admin — cover the described use case. Additional roles (e.g. a reviewer tier) can be added without touching existing endpoints.

---

## Part 4: Rollout and Improvements

### Getting to Production

**Phase 1 (weeks 1–2):** Run alongside the existing process. CPAs use both. Compare results and catch anything missing.

**Phase 2 (weeks 3–4):** New clients go into the new tool. Existing in-progress clients stay in the old process.

**Phase 3:** Full cutover. Retire the old process.

Before going live: set `FIELD_ENCRYPTION_KEY` in Railway, switch `STORAGE_TYPE` to `s3`, switch `DATABASE_URL` to PostgreSQL, and connect Sentry.

### What Breaks First

1. **File storage fills up.** Local storage does not scale. Switch to S3 before launch — one config line.
2. **Database under load.** SQLite struggles with multiple simultaneous users. Switch to PostgreSQL before going above five users — one config line.
3. **Missing form fields.** CPAs will find fields that do not match their workflow. Adding a field is a one-line change.

### How to Make It Better

| Improvement | Why It Matters |
|---|---|
| Multi-factor authentication (MFA) | Protects accounts even if a password is stolen. High priority for an internal tool handling financial data. |
| Client mobile app | Native app for document capture — photograph W-2s on the spot. |
| AI document extraction | Upload a W-2 and have the system read the fields automatically. Reduces manual data entry. |
| Automated data retention | Automatically delete client records after a defined period per firm policy and §7216 requirements. |
| Fernet key rotation | Periodically replace the encryption key and re-encrypt all records. Limits exposure if a key is ever compromised. |
| Audit log dashboard | Show the audit trail in the admin interface, not just in the database. |
| Email notifications | Notify the admin when a CPA marks an intake complete. |

---

Submitted by Shreyash Thakare

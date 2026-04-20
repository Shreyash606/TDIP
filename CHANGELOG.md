# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned
- MFA via TOTP (`pyotp`)
- API-level SSN masking by caller role
- Email notifications on intake submission (fastapi-mail + SendGrid)
- httpOnly cookie token storage
- Fernet key rotation utility
- Automated test suite (auth, role enforcement, encryption round-trip)

---

## [2.1.0] — 2026-04-20

### Fixed
- Save button in client portal no longer clears form fields after API response. `handleSave` now only syncs `intake` metadata state; `form` state is preserved as typed. Document upload/delete only refreshes the documents list, leaving other fields untouched.

### Changed
- `submitted` status in IntakeDashboard now shows purple dot and "Client Submitted" label (previously green "Submitted") — visually distinguishes client-submitted intakes from CPA-completed ones

### Docs
- Added SECURITY.md with vulnerability reporting process and known limitations
- Added CHANGELOG.md (this file)
- Added Architecture Decision Records under `docs/decisions/`
- Added Mermaid system architecture diagram to README
- WALKTHROUGH.md expanded with proof-of-implementation section mapping every SUMMARY.md claim to code

---

## [2.0.0] — 2026-04-18

### Added
- **Client self-service portal** — clients register, fill their own intake form, upload documents, and submit directly to their CPA
- `POST /api/auth/register` with `role=client` auto-creates `Client` record and `IntakeSubmission` linked to first active CPA (single-CPA assumption, documented with scaling strategies)
- Client-specific intake routes: `GET /intake/my`, `PUT /intake/my`, `POST /intake/my/submit`, `POST /intake/my/documents`, `DELETE /intake/my/documents/{id}`, `GET /intake/my/documents/{id}/file`
- `ClientIntakeForm.jsx` — full client-facing form with SSN masking, bank number reveal, document upload, and submit-lock
- `Register.jsx` — account type selection (Client / CPA / Admin) with auto-assign messaging for client role
- `Home.jsx` — role-based landing: clients see "My Tax Return" card; CPAs and admins see their respective dashboards
- `/my-intake` route in `App.jsx`
- Demo client account: `alex.smith@client.com / password123`
- Single CPA assumption documented in README and SUMMARY with Round Robin / workload-based / manual / specialization scaling strategies

### Changed
- `fresh_seed.py` — added Alex Smith client user linked to Sarah Miller

---

## [1.2.0] — 2026-04-10

### Added
- Field-level Fernet encryption for `taxpayer_ssn_last4`, `spouse_ssn_last4`, `bank_routing_number`, `bank_account_number`
- `encryption_service.py` — `encrypt()` / `decrypt()` with graceful degradation when `FIELD_ENCRYPTION_KEY` not set
- Role-differentiated SSN display: CPAs see last 4 only (`***-**-4321`), admins see full number
- `SensitiveField` component with Reveal toggle for bank routing/account numbers
- `MaskedSSNField` component — enter full SSN, displayed masked after save

### Fixed
- SSN was previously stored as plaintext — now encrypted at rest

---

## [1.1.0] — 2026-04-05

### Added
- IRC §7216 consent checkbox on intake form — required before marking complete
- `consent_obtained` and `consent_obtained_at` columns on `intake_submissions` — timestamp set on first consent, never cleared
- Audit log table (`audit_logs`) — every file upload and download logged with user, timestamp, IP, and details
- Rate limiting on login endpoint — 5 requests/minute per IP via `slowapi`
- Security headers middleware — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- `/health` endpoint for uptime monitoring

### Changed
- File upload validation expanded: checks both extension and MIME type, rejects empty files, enforces 20MB limit

---

## [1.0.0] — 2026-03-28

### Added
- Initial release — CPA-facing intake tool
- User authentication with JWT (bcrypt passwords, 8-hour token expiry)
- Three roles: `cpa`, `admin`, `client` (admin read-only enforced server-side)
- `IntakeSubmission` model with ~50 fields covering personal info, spouse, dependents (JSON), income sources, deductions, bank info
- CPA intake dashboard (`IntakeDashboard`) and review form (`IntakeReviewPanel`)
- Admin read-only view across all CPAs
- Document upload/download for intake submissions — authenticated endpoints only, no public URLs
- W-2 AI extraction workflow — `pdfplumber` → Claude Haiku → structured JSON → CPA review → Drake Tax Software CSV export
- Mock extraction mode when `ANTHROPIC_API_KEY` not set
- SQLite / PostgreSQL abstraction via `DATABASE_URL`
- Local / AWS S3 file storage abstraction via `STORAGE_TYPE` — S3 enforces AES-256 server-side encryption in code
- `fresh_seed.py` — demo data: 5 client intakes across 2 CPAs with realistic encrypted fields
- Deployed: frontend on Vercel, backend on Railway, auto-deploy on GitHub push

# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, **do not open a public GitHub issue.**

Report it privately by emailing: **shreyashthakrey606@gmail.com**

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept if possible)
- Any suggested remediation

You will receive an acknowledgement within 48 hours and a resolution plan within 7 days. If the issue is confirmed, a fix will be released as quickly as possible and you will be credited in the changelog (unless you prefer to remain anonymous).

---

## Supported Versions

| Version | Supported |
|---|---|
| 2.x (current) | ✅ Yes |
| 1.x | ❌ No — upgrade to 2.x |

---

## Security Design

### Authentication
- Passwords hashed with **bcrypt** (work factor 12) — never stored in plaintext
- Sessions managed via **signed JWTs** (HS256) that expire after 8 hours
- Login endpoint **rate-limited to 5 requests/minute per IP** via slowapi

### Sensitive Data at Rest
- **SSNs, spouse SSNs, bank routing numbers, and bank account numbers** are encrypted with **Fernet (AES-128-CBC + HMAC-SHA256)** before being written to the database
- The encryption key (`FIELD_ENCRYPTION_KEY`) is stored in server environment variables — never in source code or version control
- Passwords are one-way bcrypt hashes and cannot be recovered

### Sensitive Data in Transit
- All production traffic is **HTTPS-only** (enforced by Railway and Vercel at the platform level)
- CORS is restricted to known origins (`tdip.vercel.app` and localhost dev ports)

### Access Control
- Role-based access enforced at the **database query level** — CPA queries include `WHERE cpa_id = current_user.id`; cross-CPA access is structurally impossible even with a direct API call
- Admin tokens are **rejected by all update endpoints** (403)
- File downloads require authentication and ownership verification before any bytes are read

### File Uploads
- Only **PDF, JPG, PNG, TIFF, DOC, DOCX** accepted — checked by both file extension and MIME type
- Files capped at **20 MB**
- Empty files rejected
- Filenames sanitized to remove path traversal characters

### Security Headers
Every HTTP response includes:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### Audit Logging
Every file upload and download is logged with user identity, timestamp, IP address, and file details.

---

## Known Limitations (Honest Disclosure)

| Gap | Status | Mitigation Plan |
|---|---|---|
| No MFA | Not yet implemented | Planned: TOTP via `pyotp` |
| SSN masking is UI-only | Backend returns full decrypted SSN | Planned: mask at `_serialize_intake` level by role |
| JWT stored in localStorage | Accessible to XSS | Planned: migrate to httpOnly cookies |
| No Content Security Policy | Not set | Planned before production |
| No Fernet key rotation | Single key in use | Planned: versioned key rotation with re-encryption |
| SQLite in dev | Serializes writes | Swap to PostgreSQL for production (`DATABASE_URL`) |

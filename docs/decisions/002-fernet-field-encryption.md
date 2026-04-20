# ADR 002 — Fernet Field-Level Encryption for SSN and Bank Fields

**Date:** 2026-04-10
**Status:** Accepted

---

## Context

The system stores Social Security Numbers, spouse SSNs, bank routing numbers, and bank account numbers. These are the highest-sensitivity fields in the dataset — exposure would constitute a serious privacy breach and potential regulatory violation.

Three approaches were considered:
1. Store plaintext (rely on DB access controls only)
2. Full database encryption (encrypt the entire DB file)
3. Field-level encryption (encrypt individual sensitive columns)

---

## Decision

Use **Fernet field-level encryption** for the four sensitive fields: `taxpayer_ssn_last4`, `spouse_ssn_last4`, `bank_routing_number`, `bank_account_number`.

---

## Reasoning

**Why not plaintext?**
Database access controls (passwords, network rules) are one layer of defense. If the DB file is stolen, copied, or accessed via a misconfigured backup, all SSNs would be immediately readable. Defense in depth requires the data itself to be unreadable without a separate key.

**Why not full DB encryption?**
Full disk/file encryption (e.g. SQLite Encryption Extension, pgcrypto at the column level for all data) protects everything but adds significant complexity — key management at the DB layer, potential performance impact, and tooling limitations. For this project, only 4 fields need strong protection; full DB encryption would be over-engineering.

**Why Fernet specifically?**
Fernet (from the `cryptography` library) is:
- AES-128-CBC with HMAC-SHA256 for authentication — tampered ciphertext is rejected, not silently decrypted to garbage
- The encryption key is a URL-safe base64 string — easy to generate, store in env vars, and rotate
- Symmetric — same key encrypts and decrypts, which is appropriate here (no public/private key asymmetry needed)
- Standard Python — no C extension compilation issues

**Alternative considered:** `pgcrypto` (PostgreSQL-level encryption). Rejected because it ties the encryption to PostgreSQL — the project supports SQLite for local dev, and we'd lose the DB abstraction.

---

## Implementation

```python
# encryption_service.py — graceful degradation
def encrypt(value):
    f = _get_fernet()
    if f is None:
        return value  # dev mode: no key configured, store plaintext
    return f.encrypt(value.encode()).decode()
```

The service degrades gracefully: if `FIELD_ENCRYPTION_KEY` is not set, fields are stored as plaintext. This means local development works without any setup. Production requires the key to be set in Railway environment variables.

---

## Consequences

**Positive:**
- Stolen database file reveals only ciphertext for SSN and bank fields
- Key lives in environment variables — separate from the codebase and the database
- The same `decrypt()` call handles both encrypted and plaintext values without breaking — safe to deploy to an existing plaintext database

**Negative:**
- Cannot run `WHERE taxpayer_ssn_last4 = ?` queries — encrypted values are not queryable. This is acceptable; we never need to search by SSN
- No key rotation mechanism built yet. If the key is compromised, all encrypted fields need to be re-encrypted with a new key. This is a known gap documented in SECURITY.md
- Losing the key means losing access to all encrypted data permanently — key backup is critical

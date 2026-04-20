# ADR 003 — Client Self-Registration Over CPA-Invite Flow

**Date:** 2026-04-18
**Status:** Accepted

---

## Context

The system needed a way to onboard clients to the portal. Two approaches were considered:

**Option A — CPA-invite flow:** CPA creates a client record, the system generates a one-time invite token, CPA sends the link to the client, client registers via the token URL.

**Option B — Self-registration with auto-assignment:** Client registers directly at `/register`, selects the "Client" role, and is automatically assigned to a CPA.

---

## Decision

Use **Option B: self-registration with auto-assignment** to the first active CPA.

---

## Reasoning

The invite flow (Option A) was the initial design. It was abandoned after evaluating scope vs. benefit:

**Invite flow complexity:**
- Token generation and storage on `Client` model
- Token expiry logic (tokens should expire after 48-72 hours)
- Token validation endpoint
- CPA UI to generate and copy invite links
- Email delivery (or manual link-sharing) for each client
- Error handling for expired/already-used tokens

**Self-registration simplicity:**
- One registration endpoint, one extra role option
- Auto-assignment query: `SELECT * FROM users WHERE role='cpa' AND is_active=1 LIMIT 1`
- Client is active and filling their form within 60 seconds of registration

For a single-CPA firm (the documented assumption for this prototype), auto-assignment is correct 100% of the time. For a multi-CPA firm, auto-assignment would need to be replaced with a smarter strategy — but only `clients.cpa_id` changes. The rest of the system is unaffected.

---

## Single-CPA Assumption

The auto-assign logic picks the **first active CPA** in the database:
```python
default_cpa = db.query(User).filter(
    User.role == "cpa",
    User.is_active == True,
).first()
```

This is explicitly documented as an assumption. When the firm scales, the query is replaced with one of:
- **Round Robin**: track last-assigned index, cycle through CPAs
- **Workload-based**: `ORDER BY open_intake_count ASC`
- **Manual**: admin UI to assign CPA at registration
- **Specialization**: route by client type (freelancer, business owner, retiree)

Only this one query changes. No schema migrations, no frontend changes.

---

## Consequences

**Positive:**
- Zero friction onboarding for clients — register and start filling the form immediately
- No email infrastructure needed
- No token management, no expiry logic
- Correct behavior for the documented single-CPA assumption

**Negative:**
- No client-to-CPA matching in the current flow — any client who registers is assigned to the first CPA regardless of fit
- No way for a firm with multiple CPAs to direct a client to a specific CPA without modifying the registration flow
- If no active CPA exists when a client registers, registration fails with a clear error message — this is a hard dependency that should be monitored

# ADR 001 — Use FastAPI Instead of Flask or Django REST Framework

**Date:** 2026-03-28
**Status:** Accepted

---

## Context

The backend needs to handle:
- Role-based authentication with JWT tokens
- Complex Pydantic-validated request/response schemas (~50-field intake form)
- Async file I/O for document uploads
- Auto-generated API documentation for demoing to stakeholders

Three candidates were evaluated: Flask, Django REST Framework (DRF), and FastAPI.

---

## Decision

Use **FastAPI**.

---

## Reasoning

| Requirement | Flask | DRF | FastAPI |
|---|---|---|---|
| Automatic request validation | Manual (marshmallow/pydantic separately) | Serializers (verbose) | Native Pydantic — one class |
| Auto API docs | Third-party (flasgger) | drf-spectacular (setup required) | Built-in at `/docs` — zero config |
| Async file I/O | Possible but awkward | No native async | Native `async def` handlers |
| Type safety | None | Partial | Full — IDE catches bugs before runtime |
| Dependency injection for auth | Decorators / middleware | Permissions classes | `Depends()` — one line per endpoint |

FastAPI's `Depends()` pattern makes adding auth to an endpoint a single parameter:
```python
def my_endpoint(current_user = Depends(require_cpa)):
```
With Flask you'd write a decorator. With DRF you'd configure a permission class. FastAPI's approach is explicit per-endpoint, which is easier to audit for security.

---

## Consequences

**Positive:**
- Pydantic validation catches malformed requests before any business logic runs — no manual `if not field: return 400` boilerplate
- `/docs` (Swagger UI) and `/redoc` auto-generated from route signatures — useful for demos and debugging
- Type hints throughout make the codebase self-documenting
- Async file handling keeps the server responsive during large uploads

**Negative:**
- FastAPI has no built-in admin interface (Django has one). We have no admin UI — the admin role only sees data through the same React frontend
- No built-in ORM — SQLAlchemy is added separately (this is fine; it's the standard choice)
- Smaller ecosystem than Django for batteries-included features (email, background jobs, etc.)

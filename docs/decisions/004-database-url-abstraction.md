# ADR 004 — DATABASE_URL Abstraction for SQLite / PostgreSQL Portability

**Date:** 2026-03-28
**Status:** Accepted

---

## Context

The project needs a database that works with zero setup for local development but can be replaced with a production-grade database for deployment without code changes.

Options considered:
1. Hardcode SQLite everywhere
2. Hardcode PostgreSQL everywhere (requires running Postgres locally)
3. Abstract behind `DATABASE_URL` environment variable using SQLAlchemy

---

## Decision

Use **SQLAlchemy ORM** with `DATABASE_URL` as the only configuration point. Default to SQLite for local dev.

---

## Reasoning

SQLAlchemy is the de facto ORM for Python web applications and supports both SQLite and PostgreSQL with the same API. The only difference between the two is the connection URL format:

```
sqlite:///./taxdoc.db          ← local dev, zero setup
postgresql://user:pw@host/db   ← production (Railway, Neon, Supabase, etc.)
```

Switching is a single environment variable change — no code modifications, no schema rewrites, no migration scripts for the initial deployment.

**Why not hardcode PostgreSQL?**
Requiring PostgreSQL locally adds friction: Docker setup, or a local Postgres installation, or a cloud DB just for dev. For a prototype with one developer, this slows down iteration without benefit.

**Why not hardcode SQLite everywhere?**
SQLite uses file-level write locking. Under concurrent writes from multiple users, requests serialize. Above ~5 simultaneous users, this causes `OperationalError: database is locked`. Not suitable for production.

---

## Implementation

```python
# config.py
database_url: str = "sqlite:///./taxdoc.db"

# database.py
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)
```

The `check_same_thread=False` argument is SQLite-specific (required for FastAPI's async handling) and is conditionally applied only when the URL contains "sqlite".

Tables are created on startup via `Base.metadata.create_all(bind=engine)` — works for both engines.

---

## Consequences

**Positive:**
- Local development requires no external services
- Switching to PostgreSQL for production is one environment variable — zero code changes
- The same migration path works for any SQLAlchemy-supported database (MySQL, etc.)

**Negative:**
- `fresh_seed.py` uses raw `sqlite3` module rather than SQLAlchemy — it does not work with PostgreSQL without rewriting. This is a known limitation; the seed script is for demo purposes only
- SQLite and PostgreSQL have some behavioral differences (e.g. case sensitivity, JSON support) that could surface as subtle bugs if complex queries are added. For this project's query patterns, no differences were observed
- `Base.metadata.create_all()` on startup is fine for development but is not a proper migration strategy. For production schema evolution, Alembic should be added

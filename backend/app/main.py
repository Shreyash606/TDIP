import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

from .database import Base, engine
from .routes import auth, clients, documents, export

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Tax Document Intelligence Pipeline",
    description="AI-powered W-2 extraction for CPAs",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/test-claude")
async def test_claude():
    """Quick smoke-test for the Claude API key and connection."""
    from .config import settings
    from .services.claude_service import _extract_w2_sync
    import asyncio

    if not settings.anthropic_api_key:
        return {"status": "error", "detail": "ANTHROPIC_API_KEY is empty"}

    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=settings.anthropic_api_key)
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=20,
            messages=[{"role": "user", "content": "Reply with just: OK"}],
        )
        return {"status": "ok", "reply": msg.content[0].text, "key_prefix": settings.anthropic_api_key[:12]}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

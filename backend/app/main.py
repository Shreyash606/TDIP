import logging

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

from .database import Base, engine
from .limiter import limiter
from .routes import auth, clients, documents, export, intake

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Client Intake and Document Collection Tool",
    description="CPA client intake and document collection. Internal use only.",
    version="2.0.0",
)

from .config import settings as _settings

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(intake.router, prefix="/api/intake", tags=["Intake"])


@app.get("/health")
def health():
    return {"status": "ok"}

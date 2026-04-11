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

from .config import settings as _settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.get_allowed_origins(),
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


@app.get("/seed-demo")
def seed_demo():
    """One-time endpoint to create demo user and sample data."""
    import json
    from .database import SessionLocal
    from .models import User, Client, Document, AuditLog
    from .auth import get_password_hash

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "nick@sdt.com").first():
            return {"status": "already_seeded", "message": "Demo data already exists. Login: nick@sdt.com / password"}

        user = User(email="nick@sdt.com", hashed_password=get_password_hash("password"), full_name="Nick SDT")
        db.add(user)
        db.flush()

        clients_data = [("John Doe", "john.doe@gmail.com"), ("Sarah Johnson", "sarah.j@gmail.com"),
                        ("Michael Chen", "m.chen@gmail.com"), ("Emily Rodriguez", "e.rodriguez@gmail.com"),
                        ("Robert Kim", "r.kim@gmail.com")]
        clients = []
        for name, email in clients_data:
            c = Client(name=name, email=email, cpa_id=user.id)
            db.add(c)
            clients.append(c)
        db.flush()

        mock_data = {"employer_name": "ACME REAL ESTATE LLC", "employer_ein": "12-3456789",
                     "employer_address": "100 Business Plaza, New York, NY 10001",
                     "employee_name": "John Doe", "employee_ssn_last4": "1234",
                     "employee_address": "456 Oak Avenue, Brooklyn, NY 11201", "tax_year": "2024",
                     "box1_wages": 75250.00, "box2_federal_income_tax": 12500.00,
                     "box3_ss_wages": 75250.00, "box4_ss_tax_withheld": 4665.50,
                     "box5_medicare_wages": 75250.00, "box6_medicare_tax_withheld": 1091.13,
                     "box12a_code": "D", "box12a_amount": 3500.00, "box12b_code": "", "box12b_amount": 0.00,
                     "box13_statutory_employee": False, "box13_retirement_plan": True, "box13_third_party_sick_pay": False,
                     "box14_other": "", "box15_state": "NY", "box15_employer_state_id": "NY-123456",
                     "box16_state_wages": 75250.00, "box17_state_income_tax": 5517.50,
                     "box18_local_wages": 75250.00, "box19_local_tax": 1736.50, "box20_locality_name": "NYC",
                     "confidence_score": 0.95, "extraction_notes": ""}

        sarah_data = {**mock_data, "employee_name": "Sarah Johnson", "employee_ssn_last4": "5678",
                      "box1_wages": 92000.00, "box2_federal_income_tax": 16000.00}

        docs = [
            dict(client=clients[0], filename="w2_john_doe_2024.pdf",        status="review",    confidence=0.95, data=mock_data),
            dict(client=clients[1], filename="w2_sarah_johnson_2024.pdf",   status="approved",  confidence=0.98, data=sarah_data),
            dict(client=clients[2], filename="w2_michael_chen_2024.pdf",    status="pending",   confidence=None, data=None),
            dict(client=clients[3], filename="w2_emily_rodriguez_2024.pdf", status="pending",   confidence=None, data=None),
            dict(client=clients[0], filename="1099_john_doe_2024.pdf",      status="pending",   confidence=None, data=None),
        ]
        for d in docs:
            db.add(Document(client_id=d["client"].id, filename=d["filename"],
                            file_path=f"./uploads/demo/{d['filename']}", file_size=245760,
                            document_type="w2", tax_year="2024", status=d["status"],
                            extracted_data=json.dumps(d["data"]) if d["data"] else None,
                            confidence_score=d["confidence"]))
        db.commit()
        return {"status": "ok", "message": "Demo data seeded. Login: nick@sdt.com / password"}
    finally:
        db.close()


@app.get("/test-ai")
async def test_ai():
    """Smoke-test for the Gemini API key and connection."""
    from .config import settings

    if not settings.gemini_api_key:
        return {"status": "error", "detail": "GEMINI_API_KEY is not set"}

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Reply with just: OK")
        return {"status": "ok", "reply": response.text.strip(), "key_prefix": settings.gemini_api_key[:12]}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

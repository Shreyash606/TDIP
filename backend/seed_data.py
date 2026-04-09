"""Run once to populate the database with demo data.

Usage:
    cd backend
    python seed_data.py
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.auth import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import AuditLog, Client, Document, User

Base.metadata.create_all(bind=engine)

MOCK_EXTRACTION = {
    "employer_name": "ACME REAL ESTATE LLC",
    "employer_ein": "12-3456789",
    "employer_address": "100 Business Plaza, New York, NY 10001",
    "employee_name": "John Doe",
    "employee_ssn_last4": "1234",
    "employee_address": "456 Oak Avenue, Brooklyn, NY 11201",
    "tax_year": "2024",
    "box1_wages": 75250.00,
    "box2_federal_income_tax": 12500.00,
    "box3_ss_wages": 75250.00,
    "box4_ss_tax_withheld": 4665.50,
    "box5_medicare_wages": 75250.00,
    "box6_medicare_tax_withheld": 1091.13,
    "box12a_code": "D",
    "box12a_amount": 3500.00,
    "box12b_code": "",
    "box12b_amount": 0.00,
    "box13_statutory_employee": False,
    "box13_retirement_plan": True,
    "box13_third_party_sick_pay": False,
    "box14_other": "",
    "box15_state": "NY",
    "box15_employer_state_id": "NY-123456",
    "box16_state_wages": 75250.00,
    "box17_state_income_tax": 5517.50,
    "box18_local_wages": 75250.00,
    "box19_local_tax": 1736.50,
    "box20_locality_name": "NYC",
    "confidence_score": 0.95,
    "extraction_notes": "",
}


def seed():
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "nick@aiolacpa.com").first():
            print("Demo data already exists. Skipping.")
            return

        user = User(
            email="nick@aiolacpa.com",
            hashed_password=get_password_hash("password"),
            full_name="Nick Aiola",
        )
        db.add(user)
        db.flush()

        clients_raw = [
            ("John Doe", "john.doe@gmail.com"),
            ("Sarah Johnson", "sarah.j@gmail.com"),
            ("Michael Chen", "m.chen@gmail.com"),
            ("Emily Rodriguez", "e.rodriguez@gmail.com"),
            ("Robert Kim", "r.kim@gmail.com"),
        ]
        clients = []
        for name, email in clients_raw:
            c = Client(name=name, email=email, cpa_id=user.id)
            db.add(c)
            clients.append(c)
        db.flush()

        sarah_data = {**MOCK_EXTRACTION, "employee_name": "Sarah Johnson", "employee_ssn_last4": "5678", "box1_wages": 92000.00, "box2_federal_income_tax": 16000.00}

        docs = [
            dict(client=clients[0], filename="w2_john_doe_2024.pdf",      status="review",      confidence=0.95, data=MOCK_EXTRACTION, dtype="w2"),
            dict(client=clients[1], filename="w2_sarah_johnson_2024.pdf", status="approved",    confidence=0.98, data=sarah_data,      dtype="w2"),
            dict(client=clients[2], filename="w2_michael_chen_2024.pdf",  status="pending",     confidence=None, data=None,            dtype="w2"),
            dict(client=clients[3], filename="w2_emily_rodriguez_2024.pdf", status="processing", confidence=None, data=None,           dtype="w2"),
            dict(client=clients[0], filename="1099_john_doe_2024.pdf",    status="pending",     confidence=None, data=None,            dtype="1099"),
        ]

        for d in docs:
            doc = Document(
                client_id=d["client"].id,
                filename=d["filename"],
                file_path=f"./uploads/demo/{d['filename']}",
                file_size=245760,
                document_type=d["dtype"],
                tax_year="2024",
                status=d["status"],
                extracted_data=json.dumps(d["data"]) if d["data"] else None,
                confidence_score=d["confidence"],
            )
            db.add(doc)

        db.commit()
        print("Demo data seeded successfully.")
        print("  Login: nick@aiolacpa.com / password")

    finally:
        db.close()


if __name__ == "__main__":
    seed()

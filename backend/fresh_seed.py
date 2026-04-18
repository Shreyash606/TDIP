"""
Wipes and reseeds the DB with clean demo data.
Run: python fresh_seed.py
"""
import json, sqlite3, os, sys
sys.path.insert(0, os.path.dirname(__file__))

# Load .env so FIELD_ENCRYPTION_KEY is available before importing the app
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.auth import get_password_hash
from app.services.encryption_service import encrypt

SENSITIVE = {"taxpayer_ssn_last4", "spouse_ssn_last4", "bank_routing_number", "bank_account_number"}

def e(row):
    """Encrypt sensitive fields in a seed row."""
    return {k: (encrypt(v) if k in SENSITIVE and isinstance(v, str) else v) for k, v in row.items()}

DB = os.path.join(os.path.dirname(__file__), "taxdoc.db")
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# ── Wipe existing data ────────────────────────────────────────────────────────
for t in ["intake_documents", "intake_submissions", "audit_logs", "documents", "clients", "users"]:
    cur.execute(f"DELETE FROM {t}")
conn.commit()
print("Wiped existing data.")

# ── Add new columns if upgrading an existing DB ───────────────────────────────
for col, typedef in [
    ("consent_obtained", "INTEGER DEFAULT 0"),
    ("consent_obtained_at", "TEXT"),
]:
    try:
        cur.execute(f"ALTER TABLE intake_submissions ADD COLUMN {col} {typedef}")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # column already exists

PW = get_password_hash("password123")

# ── Users ─────────────────────────────────────────────────────────────────────
users = [
    ("admin@sdt.com",   "Firm Admin",    "admin"),
    ("sarah@sdt.com",   "Sarah Miller",  "cpa"),
    ("james@sdt.com",   "James Carter",  "cpa"),
]
for email, name, role in users:
    cur.execute("INSERT INTO users (email, hashed_password, full_name, is_active, role) VALUES (?,?,?,1,?)",
                (email, PW, name, role))

conn.commit()
admin_id = cur.execute("SELECT id FROM users WHERE email='admin@sdt.com'").fetchone()["id"]
sarah_id = cur.execute("SELECT id FROM users WHERE email='sarah@sdt.com'").fetchone()["id"]
james_id = cur.execute("SELECT id FROM users WHERE email='james@sdt.com'").fetchone()["id"]
print(f"Created users: admin_id={admin_id}, sarah_id={sarah_id}, james_id={james_id}")

# ── Clients ───────────────────────────────────────────────────────────────────
clients_data = [
    ("John Doe",        "john.doe@email.com",      sarah_id),
    ("Emily Rodriguez", "emily.r@email.com",        sarah_id),
    ("Michael Chen",    "m.chen@email.com",         sarah_id),
    ("Robert Kim",      "r.kim@email.com",          james_id),
    ("Priya Patel",     "priya.patel@email.com",    james_id),
]
for name, email, cpa_id in clients_data:
    cur.execute("INSERT INTO clients (name, email, cpa_id) VALUES (?,?,?)", (name, email, cpa_id))

conn.commit()
def cid(name):
    return cur.execute("SELECT id FROM clients WHERE name=?", (name,)).fetchone()["id"]

COLS = {r[1] for r in cur.execute("PRAGMA table_info(intake_submissions)").fetchall()}

def insert_intake(row):
    row = {k: v for k, v in row.items() if k in COLS}
    cols = ", ".join(row.keys())
    ph   = ", ".join("?" * len(row))
    cur.execute(f"INSERT INTO intake_submissions ({cols}) VALUES ({ph})", list(row.values()))

# ── Intakes ───────────────────────────────────────────────────────────────────

# 1. John Doe — Complete (Sarah's client)
insert_intake(e({
    "client_id": cid("John Doe"), "cpa_id": sarah_id, "tax_year": "2024",
    "status": "complete", "submitted_at": "2026-04-02 10:15:00", "created_at": "2026-04-01 09:00:00",
    "taxpayer_first_name": "John", "taxpayer_last_name": "Doe",
    "taxpayer_ssn_last4": "412-74-4321", "taxpayer_dob": "03/15/1982",
    "taxpayer_occupation": "Software Engineer", "taxpayer_phone": "(212) 555-0101",
    "taxpayer_address_street": "456 Oak Avenue", "taxpayer_address_city": "Brooklyn",
    "taxpayer_address_state": "NY", "taxpayer_address_zip": "11201",
    "filing_status": "married_filing_jointly", "has_spouse": 1,
    "spouse_first_name": "Emily", "spouse_last_name": "Doe",
    "spouse_ssn_last4": "534-61-8765", "spouse_dob": "07/22/1984", "spouse_occupation": "Registered Nurse",
    "dependents_json": json.dumps([
        {"name": "Lily Doe",  "dob": "05/10/2015", "relationship": "Child", "ssn_last4": "1111"},
        {"name": "Jake Doe",  "dob": "11/03/2018", "relationship": "Child", "ssn_last4": "2222"},
    ]),
    "has_w2_income": 1, "has_1099_int": 1, "has_1099_div": 1,
    "deduction_preference": "itemized",
    "has_charitable_contributions": 1, "charitable_cash_amount": 2500.0,
    "has_child_care_expenses": 1, "child_care_amount": 8400.0,
    "had_aca_marketplace_insurance": 0, "made_estimated_tax_payments": 0,
    "prior_year_agi": 142000.0,
    "bank_routing_number": "021000021", "bank_account_number": "****4892", "bank_account_type": "checking",
    "additional_notes": "Home equity loan taken out in March. W-2 and all 1099s received.",
    "cpa_notes": "All documents verified. Return complete.",
    "consent_obtained": 1, "consent_obtained_at": "2026-04-01 09:05:00",
}))

# 2. Emily Rodriguez — In Progress (Sarah's client)
insert_intake(e({
    "client_id": cid("Emily Rodriguez"), "cpa_id": sarah_id, "tax_year": "2024",
    "status": "in_progress", "created_at": "2026-04-10 11:00:00",
    "taxpayer_first_name": "Emily", "taxpayer_last_name": "Rodriguez",
    "taxpayer_ssn_last4": "287-53-2233", "taxpayer_dob": "06/14/1995",
    "taxpayer_occupation": "High School Teacher", "taxpayer_phone": "(347) 555-0099",
    "taxpayer_address_street": "73 Maple Lane", "taxpayer_address_city": "Bronx",
    "taxpayer_address_state": "NY", "taxpayer_address_zip": "10451",
    "filing_status": "single", "has_spouse": 0,
    "dependents_json": json.dumps([]),
    "has_w2_income": 1,
    "deduction_preference": "standard",
    "has_educator_expenses": 1, "educator_expenses_amount": 300.0,
    "has_student_loan_interest": 1, "student_loan_interest_amount": 2100.0,
    "prior_year_agi": 51200.0,
    "bank_routing_number": "267084131", "bank_account_number": "****5591", "bank_account_type": "checking",
    "additional_notes": "First year filing as a full-time employee after graduating.",
}))

# 3. Michael Chen — Complete (Sarah's client)
insert_intake(e({
    "client_id": cid("Michael Chen"), "cpa_id": sarah_id, "tax_year": "2024",
    "status": "complete", "submitted_at": "2026-03-28 14:00:00", "created_at": "2026-03-27 10:00:00",
    "taxpayer_first_name": "Michael", "taxpayer_last_name": "Chen",
    "taxpayer_ssn_last4": "319-44-5544", "taxpayer_dob": "12/05/1975",
    "taxpayer_occupation": "Restaurant Owner", "taxpayer_phone": "(718) 555-0234",
    "taxpayer_address_street": "210 Canal Street", "taxpayer_address_city": "New York",
    "taxpayer_address_state": "NY", "taxpayer_address_zip": "10013",
    "filing_status": "married_filing_jointly", "has_spouse": 1,
    "spouse_first_name": "Lisa", "spouse_last_name": "Chen",
    "spouse_ssn_last4": "408-27-3311", "spouse_dob": "04/17/1978", "spouse_occupation": "Accountant",
    "dependents_json": json.dumps([
        {"name": "Kevin Chen", "dob": "08/20/2008", "relationship": "Child", "ssn_last4": "4455"},
    ]),
    "has_w2_income": 1, "has_k1_income": 1, "has_1099_div": 1,
    "has_rental_income": 1, "has_1099_int": 1,
    "deduction_preference": "itemized",
    "has_charitable_contributions": 1, "charitable_cash_amount": 5000.0,
    "has_medical_expenses": 1, "medical_expenses_amount": 12000.0,
    "has_real_estate": 1,
    "real_estate_json": json.dumps([{"address": "45 Elm St, Queens NY 11374", "type": "Rental", "ownership_pct": 100}]),
    "made_estimated_tax_payments": 1, "estimated_payments_amount": 18000.0,
    "has_foreign_accounts": 1,
    "prior_year_agi": 310000.0,
    "bank_routing_number": "021000089", "bank_account_number": "****7712", "bank_account_type": "savings",
    "additional_notes": "Owns restaurant LLC + one rental property in Queens.",
    "cpa_notes": "Schedule C and Schedule E required. All documents received.",
    "consent_obtained": 1, "consent_obtained_at": "2026-03-27 10:05:00",
}))

# 4. Robert Kim — In Progress (James's client)
insert_intake(e({
    "client_id": cid("Robert Kim"), "cpa_id": james_id, "tax_year": "2024",
    "status": "in_progress", "created_at": "2026-04-12 09:30:00",
    "taxpayer_first_name": "Robert", "taxpayer_last_name": "Kim",
    "taxpayer_ssn_last4": "501-38-9988", "taxpayer_dob": "02/28/1968",
    "taxpayer_occupation": "Retired — Former Engineer", "taxpayer_phone": "(914) 555-0311",
    "taxpayer_address_street": "15 Harbor View Dr", "taxpayer_address_city": "White Plains",
    "taxpayer_address_state": "NY", "taxpayer_address_zip": "10601",
    "filing_status": "married_filing_jointly", "has_spouse": 1,
    "spouse_first_name": "Grace", "spouse_last_name": "Kim",
    "spouse_ssn_last4": "622-19-6677", "spouse_dob": "11/09/1970", "spouse_occupation": "Part-time librarian",
    "dependents_json": json.dumps([]),
    "has_1099_r": 1, "has_ssa_1099": 1, "has_1099_div": 1, "has_1099_int": 1,
    "deduction_preference": "standard",
    "made_estimated_tax_payments": 1, "estimated_payments_amount": 4800.0,
    "prior_year_agi": 87200.0,
    "bank_routing_number": "322271627", "bank_account_number": "****0041", "bank_account_type": "checking",
    "additional_notes": "Pension from Boeing + Social Security. No W-2 income this year.",
}))

# 5. Priya Patel — Complete (James's client)
insert_intake(e({
    "client_id": cid("Priya Patel"), "cpa_id": james_id, "tax_year": "2024",
    "status": "complete", "submitted_at": "2026-04-05 16:20:00", "created_at": "2026-04-04 10:00:00",
    "taxpayer_first_name": "Priya", "taxpayer_last_name": "Patel",
    "taxpayer_ssn_last4": "743-85-6612", "taxpayer_dob": "09/18/1988",
    "taxpayer_occupation": "Freelance UX Designer", "taxpayer_phone": "(646) 555-0182",
    "taxpayer_address_street": "88 Bedford St Apt 4B", "taxpayer_address_city": "New York",
    "taxpayer_address_state": "NY", "taxpayer_address_zip": "10014",
    "filing_status": "single", "has_spouse": 0,
    "dependents_json": json.dumps([]),
    "has_1099_nec": 1, "has_1099_misc": 1, "has_1099_int": 1,
    "deduction_preference": "itemized",
    "has_home_office": 1, "home_office_sqft": 200,
    "has_vehicle_use": 1, "vehicle_business_miles": 4200.0,
    "has_student_loan_interest": 1, "student_loan_interest_amount": 1850.0,
    "had_aca_marketplace_insurance": 1,
    "made_estimated_tax_payments": 1, "estimated_payments_amount": 9000.0,
    "prior_year_agi": 98400.0,
    "bank_routing_number": "322271627", "bank_account_number": "****3301", "bank_account_type": "checking",
    "additional_notes": "Three main clients: Studio X, BrandCo, Freelance marketplace. Paid quarterly estimated taxes.",
    "cpa_notes": "Schedule C filed. Home office 200sqft / 1200sqft total = 16.7%. Mileage log provided.",
    "consent_obtained": 1, "consent_obtained_at": "2026-04-04 10:05:00",
}))

conn.commit()
conn.close()

print()
print("=" * 50)
print("DEMO LOGIN CREDENTIALS")
print("=" * 50)
print()
print("ADMIN (read-only, sees all CPAs)")
print("  Email:    admin@sdt.com")
print("  Password: password123")
print()
print("CPA 1 — Sarah Miller (3 clients)")
print("  Email:    sarah@sdt.com")
print("  Password: password123")
print("  Clients:  John Doe, Emily Rodriguez, Michael Chen")
print()
print("CPA 2 — James Carter (2 clients)")
print("  Email:    james@sdt.com")
print("  Password: password123")
print("  Clients:  Robert Kim, Priya Patel")
print()
print("Intake statuses:")
print("  John Doe       -> Complete")
print("  Emily Rodriguez -> In Progress")
print("  Michael Chen   -> Complete")
print("  Robert Kim     -> In Progress")
print("  Priya Patel    -> Complete")

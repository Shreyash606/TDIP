from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, nullable=False, default="cpa")  # "cpa" or "client"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    clients = relationship("Client", back_populates="cpa", foreign_keys="[Client.cpa_id]")
    audit_logs = relationship("AuditLog", back_populates="user")
    intake_submissions = relationship("IntakeSubmission", back_populates="client_user", foreign_keys="[IntakeSubmission.client_user_id]")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String)
    cpa_id = Column(Integer, ForeignKey("users.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # linked client portal account
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cpa = relationship("User", back_populates="clients", foreign_keys=[cpa_id])
    user = relationship("User", foreign_keys=[user_id])
    documents = relationship("Document", back_populates="client")
    intake_submissions = relationship("IntakeSubmission", back_populates="client")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)
    document_type = Column(String, default="w2")
    tax_year = Column(String)
    status = Column(String, default="pending")
    extracted_data = Column(Text)
    confidence_score = Column(Float)
    extraction_error = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="documents")
    audit_logs = relationship("AuditLog", back_populates="document")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(Text)
    ip_address = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")
    document = relationship("Document", back_populates="audit_logs")


class IntakeSubmission(Base):
    __tablename__ = "intake_submissions"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    client_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cpa_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tax_year = Column(String, default="2024")
    status = Column(String, default="draft")  # draft, submitted, under_review, complete

    # Personal Info
    taxpayer_first_name = Column(String)
    taxpayer_last_name = Column(String)
    taxpayer_ssn_last4 = Column(String)
    taxpayer_dob = Column(String)
    taxpayer_occupation = Column(String)
    taxpayer_phone = Column(String)
    taxpayer_address_street = Column(String)
    taxpayer_address_city = Column(String)
    taxpayer_address_state = Column(String)
    taxpayer_address_zip = Column(String)
    filing_status = Column(String)  # single, married_filing_jointly, married_filing_separately, head_of_household, qualifying_widow

    # Spouse
    has_spouse = Column(Boolean, default=False)
    spouse_first_name = Column(String)
    spouse_last_name = Column(String)
    spouse_ssn_last4 = Column(String)
    spouse_dob = Column(String)
    spouse_occupation = Column(String)

    # Dependents (JSON array)
    dependents_json = Column(Text)

    # Income Sources
    has_w2_income = Column(Boolean, default=False)
    has_1099_nec = Column(Boolean, default=False)
    has_1099_misc = Column(Boolean, default=False)
    has_1099_int = Column(Boolean, default=False)
    has_1099_div = Column(Boolean, default=False)
    has_1099_b = Column(Boolean, default=False)
    has_1099_r = Column(Boolean, default=False)
    has_ssa_1099 = Column(Boolean, default=False)
    has_k1_income = Column(Boolean, default=False)
    has_rental_income = Column(Boolean, default=False)
    has_alimony_received = Column(Boolean, default=False)
    alimony_received_amount = Column(Float)
    has_gambling_winnings = Column(Boolean, default=False)
    has_foreign_income = Column(Boolean, default=False)
    has_crypto_transactions = Column(Boolean, default=False)
    other_income_description = Column(Text)

    # Real Estate
    has_real_estate = Column(Boolean, default=False)
    real_estate_json = Column(Text)  # JSON array of property objects

    # Deductions
    deduction_preference = Column(String, default="standard")
    has_medical_expenses = Column(Boolean, default=False)
    medical_expenses_amount = Column(Float)
    has_charitable_contributions = Column(Boolean, default=False)
    charitable_cash_amount = Column(Float)
    charitable_noncash_amount = Column(Float)
    has_student_loan_interest = Column(Boolean, default=False)
    student_loan_interest_amount = Column(Float)
    has_educator_expenses = Column(Boolean, default=False)
    educator_expenses_amount = Column(Float)
    has_home_office = Column(Boolean, default=False)
    home_office_sqft = Column(Integer)
    has_vehicle_use = Column(Boolean, default=False)
    vehicle_business_miles = Column(Float)
    has_energy_credits = Column(Boolean, default=False)
    has_child_care_expenses = Column(Boolean, default=False)
    child_care_amount = Column(Float)
    has_tuition_expenses = Column(Boolean, default=False)
    tuition_amount = Column(Float)

    # Other Info
    had_aca_marketplace_insurance = Column(Boolean, default=False)
    made_estimated_tax_payments = Column(Boolean, default=False)
    estimated_payments_amount = Column(Float)
    has_foreign_accounts = Column(Boolean, default=False)
    received_irs_notice = Column(Boolean, default=False)
    irs_notice_description = Column(Text)
    prior_year_agi = Column(Float)
    bank_routing_number = Column(String)
    bank_account_number = Column(String)
    bank_account_type = Column(String, default="checking")
    additional_notes = Column(Text)
    cpa_notes = Column(Text)

    # IRC §7216 consent — must be confirmed by CPA before data is used for tax prep
    consent_obtained = Column(Boolean, default=False)
    consent_obtained_at = Column(DateTime(timezone=True), nullable=True)

    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="intake_submissions")
    client_user = relationship("User", foreign_keys=[client_user_id], back_populates="intake_submissions")
    cpa = relationship("User", foreign_keys=[cpa_id])
    documents = relationship("IntakeDocument", back_populates="intake")


class IntakeDocument(Base):
    __tablename__ = "intake_documents"

    id = Column(Integer, primary_key=True, index=True)
    intake_id = Column(Integer, ForeignKey("intake_submissions.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)
    category = Column(String, default="other")  # w2, 1099_nec, 1099_misc, 1099_int, 1099_div, 1099_b, 1099_r, ssa_1099, k1, 1098_mortgage, 1095a, bank_statement, prior_year_return, property_docs, other
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    intake = relationship("IntakeSubmission", back_populates="documents")

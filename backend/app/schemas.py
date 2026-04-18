from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "cpa"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None


class ClientResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExtractionDataUpdate(BaseModel):
    extracted_data: dict


# ── Intake schemas ────────────────────────────────────────────────────────────

class IntakeDocumentResponse(BaseModel):
    id: int
    intake_id: int
    filename: str
    file_size: Optional[int] = None
    category: str
    created_at: datetime

    model_config = {"from_attributes": True}


class IntakeSubmissionCreate(BaseModel):
    client_id: int
    tax_year: str = "2024"


class IntakeSubmissionUpdate(BaseModel):
    taxpayer_first_name: Optional[str] = None
    taxpayer_last_name: Optional[str] = None
    taxpayer_ssn_last4: Optional[str] = None
    taxpayer_dob: Optional[str] = None
    taxpayer_occupation: Optional[str] = None
    taxpayer_phone: Optional[str] = None
    taxpayer_address_street: Optional[str] = None
    taxpayer_address_city: Optional[str] = None
    taxpayer_address_state: Optional[str] = None
    taxpayer_address_zip: Optional[str] = None
    filing_status: Optional[str] = None
    has_spouse: Optional[bool] = None
    spouse_first_name: Optional[str] = None
    spouse_last_name: Optional[str] = None
    spouse_ssn_last4: Optional[str] = None
    spouse_dob: Optional[str] = None
    spouse_occupation: Optional[str] = None
    dependents: Optional[List[Dict]] = None
    has_w2_income: Optional[bool] = None
    has_1099_nec: Optional[bool] = None
    has_1099_misc: Optional[bool] = None
    has_1099_int: Optional[bool] = None
    has_1099_div: Optional[bool] = None
    has_1099_b: Optional[bool] = None
    has_1099_r: Optional[bool] = None
    has_ssa_1099: Optional[bool] = None
    has_k1_income: Optional[bool] = None
    has_rental_income: Optional[bool] = None
    has_alimony_received: Optional[bool] = None
    alimony_received_amount: Optional[float] = None
    has_gambling_winnings: Optional[bool] = None
    has_foreign_income: Optional[bool] = None
    has_crypto_transactions: Optional[bool] = None
    other_income_description: Optional[str] = None
    has_real_estate: Optional[bool] = None
    real_estate_entries: Optional[List[Dict]] = None
    deduction_preference: Optional[str] = None
    has_medical_expenses: Optional[bool] = None
    medical_expenses_amount: Optional[float] = None
    has_charitable_contributions: Optional[bool] = None
    charitable_cash_amount: Optional[float] = None
    charitable_noncash_amount: Optional[float] = None
    has_student_loan_interest: Optional[bool] = None
    student_loan_interest_amount: Optional[float] = None
    has_educator_expenses: Optional[bool] = None
    educator_expenses_amount: Optional[float] = None
    has_home_office: Optional[bool] = None
    home_office_sqft: Optional[int] = None
    has_vehicle_use: Optional[bool] = None
    vehicle_business_miles: Optional[float] = None
    has_energy_credits: Optional[bool] = None
    has_child_care_expenses: Optional[bool] = None
    child_care_amount: Optional[float] = None
    has_tuition_expenses: Optional[bool] = None
    tuition_amount: Optional[float] = None
    had_aca_marketplace_insurance: Optional[bool] = None
    made_estimated_tax_payments: Optional[bool] = None
    estimated_payments_amount: Optional[float] = None
    has_foreign_accounts: Optional[bool] = None
    received_irs_notice: Optional[bool] = None
    irs_notice_description: Optional[str] = None
    prior_year_agi: Optional[float] = None
    bank_routing_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_type: Optional[str] = None
    additional_notes: Optional[str] = None


class IntakeReviewUpdate(BaseModel):
    status: str
    cpa_notes: Optional[str] = None


class IntakeSubmissionResponse(BaseModel):
    id: int
    client_id: int
    client_name: Optional[str] = None
    client_user_id: Optional[int] = None
    cpa_id: int
    tax_year: str
    status: str
    cpa_notes: Optional[str] = None
    taxpayer_first_name: Optional[str] = None
    taxpayer_last_name: Optional[str] = None
    taxpayer_ssn_last4: Optional[str] = None
    taxpayer_dob: Optional[str] = None
    taxpayer_occupation: Optional[str] = None
    taxpayer_phone: Optional[str] = None
    taxpayer_address_street: Optional[str] = None
    taxpayer_address_city: Optional[str] = None
    taxpayer_address_state: Optional[str] = None
    taxpayer_address_zip: Optional[str] = None
    filing_status: Optional[str] = None
    has_spouse: Optional[bool] = None
    spouse_first_name: Optional[str] = None
    spouse_last_name: Optional[str] = None
    spouse_ssn_last4: Optional[str] = None
    spouse_dob: Optional[str] = None
    spouse_occupation: Optional[str] = None
    dependents: Optional[List[Dict]] = None
    has_w2_income: Optional[bool] = None
    has_1099_nec: Optional[bool] = None
    has_1099_misc: Optional[bool] = None
    has_1099_int: Optional[bool] = None
    has_1099_div: Optional[bool] = None
    has_1099_b: Optional[bool] = None
    has_1099_r: Optional[bool] = None
    has_ssa_1099: Optional[bool] = None
    has_k1_income: Optional[bool] = None
    has_rental_income: Optional[bool] = None
    has_alimony_received: Optional[bool] = None
    alimony_received_amount: Optional[float] = None
    has_gambling_winnings: Optional[bool] = None
    has_foreign_income: Optional[bool] = None
    has_crypto_transactions: Optional[bool] = None
    other_income_description: Optional[str] = None
    has_real_estate: Optional[bool] = None
    real_estate_entries: Optional[List[Dict]] = None
    deduction_preference: Optional[str] = None
    has_medical_expenses: Optional[bool] = None
    medical_expenses_amount: Optional[float] = None
    has_charitable_contributions: Optional[bool] = None
    charitable_cash_amount: Optional[float] = None
    charitable_noncash_amount: Optional[float] = None
    has_student_loan_interest: Optional[bool] = None
    student_loan_interest_amount: Optional[float] = None
    has_educator_expenses: Optional[bool] = None
    educator_expenses_amount: Optional[float] = None
    has_home_office: Optional[bool] = None
    home_office_sqft: Optional[int] = None
    has_vehicle_use: Optional[bool] = None
    vehicle_business_miles: Optional[float] = None
    has_energy_credits: Optional[bool] = None
    has_child_care_expenses: Optional[bool] = None
    child_care_amount: Optional[float] = None
    has_tuition_expenses: Optional[bool] = None
    tuition_amount: Optional[float] = None
    had_aca_marketplace_insurance: Optional[bool] = None
    made_estimated_tax_payments: Optional[bool] = None
    estimated_payments_amount: Optional[float] = None
    has_foreign_accounts: Optional[bool] = None
    received_irs_notice: Optional[bool] = None
    irs_notice_description: Optional[str] = None
    prior_year_agi: Optional[float] = None
    bank_routing_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_type: Optional[str] = None
    additional_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    documents: List[IntakeDocumentResponse] = []

    model_config = {"from_attributes": True}

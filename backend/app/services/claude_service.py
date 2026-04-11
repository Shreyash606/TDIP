import asyncio
import io
import json

from ..config import settings

EXTRACTION_PROMPT = """You are a tax document extraction specialist. Extract all data from the W-2 tax form text below and return it as valid JSON.

Rules:
- SSN: store ONLY the last 4 digits for security
- All monetary amounts as plain numbers (no $ signs or commas)
- Use null for missing text fields, 0 for missing numeric fields
- confidence_score: 0.0-1.0 based on document clarity

W-2 FORM TEXT:
{pdf_text}

Return ONLY valid JSON — no markdown, no explanation — with this exact structure:
{{
  "employer_name": "",
  "employer_ein": "XX-XXXXXXX",
  "employer_address": "",
  "employee_name": "",
  "employee_ssn_last4": "XXXX",
  "employee_address": "",
  "tax_year": "2024",
  "box1_wages": 0.00,
  "box2_federal_income_tax": 0.00,
  "box3_ss_wages": 0.00,
  "box4_ss_tax_withheld": 0.00,
  "box5_medicare_wages": 0.00,
  "box6_medicare_tax_withheld": 0.00,
  "box12a_code": "",
  "box12a_amount": 0.00,
  "box12b_code": "",
  "box12b_amount": 0.00,
  "box13_statutory_employee": false,
  "box13_retirement_plan": false,
  "box13_third_party_sick_pay": false,
  "box14_other": "",
  "box15_state": "",
  "box15_employer_state_id": "",
  "box16_state_wages": 0.00,
  "box17_state_income_tax": 0.00,
  "box18_local_wages": 0.00,
  "box19_local_tax": 0.00,
  "box20_locality_name": "",
  "confidence_score": 0.95,
  "extraction_notes": ""
}}"""


async def extract_w2(file_content: bytes, filename: str) -> dict:
    return await asyncio.to_thread(_extract_w2_sync, file_content, filename)


def _extract_w2_sync(file_content: bytes, filename: str) -> dict:
    pdf_text = _extract_pdf_text(file_content)

    if not pdf_text.strip():
        pdf_text = f"[scanned image — filename: {filename}]"

    if not settings.gemini_api_key:
        print("[EXTRACTION] No Gemini API key — using mock data", flush=True)
        return {"success": True, "data": _mock_w2_data(filename)}

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        response = model.generate_content(
            EXTRACTION_PROMPT.format(pdf_text=pdf_text[:8000]),
            generation_config={"temperature": 0, "max_output_tokens": 2048},
        )

        raw = response.text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1])

        data = json.loads(raw)
        return {"success": True, "data": data}

    except json.JSONDecodeError as e:
        return {"success": False, "error": f"JSON parse error: {e}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _extract_pdf_text(file_content: bytes) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
            return "\n".join(pages)
    except Exception:
        return ""


def _mock_w2_data(filename: str) -> dict:
    return {
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
        "extraction_notes": "Demo mode — add GEMINI_API_KEY for live extraction",
    }

import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import auth as auth_utils, models
from ..database import get_db

router = APIRouter()


@router.get("/drake/{document_id}")
def export_drake(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    document = (
        db.query(models.Document)
        .join(models.Client)
        .filter(
            models.Document.id == document_id,
            models.Client.cpa_id == current_user.id,
            models.Document.status.in_(["approved", "review", "exported"]),
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found or not yet approved")

    if not document.extracted_data:
        raise HTTPException(status_code=400, detail="No extracted data available")

    data = json.loads(document.extracted_data)
    client = document.client

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Record Type", "Tax Year", "Employer EIN", "Employer Name", "Employer Address",
        "Employee Name", "Employee SSN", "Employee Address",
        "Box 1 Wages", "Box 2 Federal Tax",
        "Box 3 SS Wages", "Box 4 SS Tax",
        "Box 5 Medicare Wages", "Box 6 Medicare Tax",
        "Box 12a Code", "Box 12a Amount",
        "Box 12b Code", "Box 12b Amount",
        "Box 13 Statutory", "Box 13 Retirement", "Box 13 Third Party Sick",
        "Box 14 Other",
        "Box 15 State", "Box 15 State ID",
        "Box 16 State Wages", "Box 17 State Tax",
        "Box 18 Local Wages", "Box 19 Local Tax", "Box 20 Locality",
        "Client", "Document ID", "Confidence",
    ])

    writer.writerow([
        "W2",
        data.get("tax_year", document.tax_year or "2024"),
        data.get("employer_ein", ""),
        data.get("employer_name", ""),
        data.get("employer_address", ""),
        data.get("employee_name", ""),
        f"XXX-XX-{data.get('employee_ssn_last4', '????')}",
        data.get("employee_address", ""),
        data.get("box1_wages", 0),
        data.get("box2_federal_income_tax", 0),
        data.get("box3_ss_wages", 0),
        data.get("box4_ss_tax_withheld", 0),
        data.get("box5_medicare_wages", 0),
        data.get("box6_medicare_tax_withheld", 0),
        data.get("box12a_code", ""),
        data.get("box12a_amount", 0),
        data.get("box12b_code", ""),
        data.get("box12b_amount", 0),
        data.get("box13_statutory_employee", False),
        data.get("box13_retirement_plan", False),
        data.get("box13_third_party_sick_pay", False),
        data.get("box14_other", ""),
        data.get("box15_state", ""),
        data.get("box15_employer_state_id", ""),
        data.get("box16_state_wages", 0),
        data.get("box17_state_income_tax", 0),
        data.get("box18_local_wages", 0),
        data.get("box19_local_tax", 0),
        data.get("box20_locality_name", ""),
        client.name,
        document.id,
        data.get("confidence_score", 0),
    ])

    # Mark exported
    document.status = "exported"
    audit = models.AuditLog(
        user_id=current_user.id,
        document_id=document_id,
        action="document_exported",
        details=f"Exported Drake CSV — client: {client.name}",
    )
    db.add(audit)
    db.commit()

    output.seek(0)
    safe_name = client.name.lower().replace(" ", "_")
    year = data.get("tax_year", document.tax_year or "2024")
    filename = f"w2_{safe_name}_{year}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

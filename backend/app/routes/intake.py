import io
import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.orm import Session

from .. import auth as auth_utils, models, schemas
from ..config import settings
from ..database import get_db
from ..services import storage_service
from ..services.encryption_service import decrypt, encrypt

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".doc", ".docx"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

# Fields that contain sensitive PII — encrypted at rest when FIELD_ENCRYPTION_KEY is set
ENCRYPTED_FIELDS = {"taxpayer_ssn_last4", "spouse_ssn_last4", "bank_routing_number", "bank_account_number"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_intake(submission: models.IntakeSubmission) -> dict:
    data = {c.name: getattr(submission, c.name) for c in submission.__table__.columns}
    data["client_name"] = submission.client.name if submission.client else None
    data["cpa_name"] = submission.cpa.full_name if submission.cpa else None
    data["dependents"] = json.loads(submission.dependents_json) if submission.dependents_json else []
    data["real_estate_entries"] = json.loads(submission.real_estate_json) if submission.real_estate_json else []
    data["documents"] = [
        {"id": d.id, "intake_id": d.intake_id, "filename": d.filename,
         "file_size": d.file_size, "category": d.category, "created_at": d.created_at}
        for d in submission.documents
    ]
    # Decrypt sensitive fields before returning
    for field in ENCRYPTED_FIELDS:
        if data.get(field):
            data[field] = decrypt(data[field])
    return data


def _get_user_from_token(token: str, db: Session) -> models.User:
    from jose import JWTError, jwt
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _log_audit(db: Session, user_id: int, action: str, details: str, ip_address: str = None):
    entry = models.AuditLog(user_id=user_id, action=action, details=details, ip_address=ip_address)
    db.add(entry)


def _validate_upload(file: UploadFile, content: bytes):
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"File type not allowed. Accepted: PDF, JPG, PNG, TIFF, DOC, DOCX."
        )
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=422, detail="File MIME type not allowed.")
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 20 MB limit.")
    if len(content) == 0:
        raise HTTPException(status_code=422, detail="File is empty.")


# ── Client: view and fill their own intake ───────────────────────────────────

def _get_client_intake(current_user, db):
    client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="No client record found.")
    intake = db.query(models.IntakeSubmission).filter(
        models.IntakeSubmission.client_id == client.id
    ).first()
    if not intake:
        raise HTTPException(status_code=404, detail="No intake found.")
    return client, intake


@router.get("/my")
def get_my_intake(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_client),
):
    _, intake = _get_client_intake(current_user, db)
    return _serialize_intake(intake)


@router.put("/my")
def update_my_intake(
    body: schemas.IntakeSubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_client),
):
    _, intake = _get_client_intake(current_user, db)
    if intake.status == "submitted":
        raise HTTPException(status_code=403, detail="Your intake has been submitted and is locked.")

    update_data = body.model_dump(exclude_none=True)
    if "dependents" in update_data:
        intake.dependents_json = json.dumps(update_data.pop("dependents"))
    if "real_estate_entries" in update_data:
        intake.real_estate_json = json.dumps(update_data.pop("real_estate_entries"))
    for field in ENCRYPTED_FIELDS:
        if field in update_data and update_data[field]:
            update_data[field] = encrypt(update_data[field])
    if update_data.get("consent_obtained") and not intake.consent_obtained:
        update_data["consent_obtained_at"] = datetime.utcnow()
    for field, value in update_data.items():
        if hasattr(intake, field):
            setattr(intake, field, value)
    intake.status = "in_progress"
    db.commit()
    db.refresh(intake)
    return _serialize_intake(intake)


@router.post("/my/submit")
def submit_my_intake(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_client),
):
    _, intake = _get_client_intake(current_user, db)
    if intake.status == "submitted":
        raise HTTPException(status_code=400, detail="Already submitted.")
    intake.status = "submitted"
    intake.submitted_at = datetime.utcnow()
    db.commit()
    db.refresh(intake)
    return _serialize_intake(intake)


@router.post("/my/documents", status_code=201)
async def upload_my_document(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form(default="other"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_client),
):
    client, intake = _get_client_intake(current_user, db)
    if intake.status == "submitted":
        raise HTTPException(status_code=403, detail="Cannot upload documents after submission.")
    content = await file.read()
    _validate_upload(file, content)
    path_prefix = f"clients/{client.id}/{intake.tax_year}"
    file_path = await storage_service.save_file(content, file.filename, current_user.id, path_prefix=path_prefix)
    doc = models.IntakeDocument(
        intake_id=intake.id, filename=file.filename,
        file_path=file_path, file_size=len(content), category=category,
    )
    db.add(doc)
    db.flush()
    _log_audit(db, current_user.id, "document_uploaded",
               f"intake_id={intake.id} filename={file.filename} size={len(content)}",
               request.client.host if request.client else None)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "filename": doc.filename, "category": doc.category, "file_size": doc.file_size}


@router.delete("/my/documents/{doc_id}")
def delete_my_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_client),
):
    _, intake = _get_client_intake(current_user, db)
    if intake.status == "submitted":
        raise HTTPException(status_code=403, detail="Cannot delete documents after submission.")
    doc = db.query(models.IntakeDocument).filter(
        models.IntakeDocument.id == doc_id,
        models.IntakeDocument.intake_id == intake.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    db.delete(doc)
    db.commit()
    return {"message": "Deleted"}


@router.get("/my/documents/{doc_id}/file")
async def get_my_document_file(
    doc_id: int,
    request: Request,
    db: Session = Depends(get_db),
    token: str = Query(default=None),
):
    if not token:
        auth_header = request.headers.get("Authorization", "")
        scheme, tok = get_authorization_scheme_param(auth_header)
        if scheme.lower() != "bearer" or not tok:
            raise HTTPException(status_code=401, detail="Not authenticated")
        token = tok
    current_user = _get_user_from_token(token, db)
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Access denied")
    _, intake = _get_client_intake(current_user, db)
    doc = db.query(models.IntakeDocument).filter(
        models.IntakeDocument.id == doc_id,
        models.IntakeDocument.intake_id == intake.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    content = await storage_service.get_file(doc.file_path)
    return StreamingResponse(io.BytesIO(content), media_type="application/octet-stream",
                             headers={"Content-Disposition": f"inline; filename={doc.filename}"})


# ── CPA: create intake for a client ──────────────────────────────────────────

@router.post("/", status_code=201)
def create_intake(
    body: schemas.IntakeSubmissionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_cpa),
):
    client = db.query(models.Client).filter(
        models.Client.id == body.client_id,
        models.Client.cpa_id == current_user.id,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    submission = models.IntakeSubmission(
        client_id=body.client_id,
        cpa_id=current_user.id,
        tax_year=body.tax_year,
        status="in_progress",
    )
    db.add(submission)
    db.flush()
    _log_audit(db, current_user.id, "intake_created",
               f"intake_id={submission.id} client_id={body.client_id}",
               request.client.host if request.client else None)
    db.commit()
    db.refresh(submission)
    return _serialize_intake(submission)


# ── List intakes: CPA sees theirs, admin sees all ─────────────────────────────

@router.get("/")
def list_intakes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if current_user.role not in ("cpa", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    q = db.query(models.IntakeSubmission)
    if current_user.role == "cpa":
        q = q.filter(models.IntakeSubmission.cpa_id == current_user.id)

    submissions = q.order_by(
        models.IntakeSubmission.updated_at.desc().nullslast(),
        models.IntakeSubmission.created_at.desc(),
    ).all()
    return [_serialize_intake(s) for s in submissions]


# ── Get single intake ─────────────────────────────────────────────────────────

@router.get("/{intake_id}")
def get_intake(
    intake_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    submission = db.query(models.IntakeSubmission).filter(
        models.IntakeSubmission.id == intake_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Intake not found")
    if current_user.role == "cpa" and submission.cpa_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role not in ("cpa", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    return _serialize_intake(submission)


# ── CPA: update/fill intake form ──────────────────────────────────────────────

@router.put("/{intake_id}")
def update_intake(
    intake_id: int,
    body: schemas.IntakeSubmissionUpdate,
    action: str = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_cpa),
):
    submission = db.query(models.IntakeSubmission).filter(
        models.IntakeSubmission.id == intake_id,
        models.IntakeSubmission.cpa_id == current_user.id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Intake not found")

    update_data = body.model_dump(exclude_none=True)

    if "dependents" in update_data:
        submission.dependents_json = json.dumps(update_data.pop("dependents"))
    if "real_estate_entries" in update_data:
        submission.real_estate_json = json.dumps(update_data.pop("real_estate_entries"))

    # Encrypt sensitive fields before writing to DB
    for field in ENCRYPTED_FIELDS:
        if field in update_data and update_data[field]:
            update_data[field] = encrypt(update_data[field])

    # Record consent timestamp when CPA marks consent obtained
    if update_data.get("consent_obtained") and not submission.consent_obtained:
        update_data["consent_obtained_at"] = datetime.utcnow()

    for field, value in update_data.items():
        if hasattr(submission, field):
            setattr(submission, field, value)

    if action == "complete":
        submission.status = "complete"
        submission.submitted_at = datetime.utcnow()
    elif action == "in_progress":
        submission.status = "in_progress"

    db.commit()
    db.refresh(submission)
    return _serialize_intake(submission)


# ── Admin: update status / notes ──────────────────────────────────────────────

@router.put("/{intake_id}/review")
def review_intake(
    intake_id: int,
    body: schemas.IntakeReviewUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if current_user.role not in ("cpa", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    submission = db.query(models.IntakeSubmission).filter(
        models.IntakeSubmission.id == intake_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Intake not found")
    if current_user.role == "cpa" and submission.cpa_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    submission.status = body.status
    submission.reviewed_at = datetime.utcnow()
    if body.cpa_notes is not None:
        submission.cpa_notes = body.cpa_notes
    db.commit()
    db.refresh(submission)
    return _serialize_intake(submission)


# ── Documents ─────────────────────────────────────────────────────────────────

@router.post("/{intake_id}/documents", status_code=201)
async def upload_intake_document(
    intake_id: int,
    request: Request,
    file: UploadFile = File(...),
    category: str = Form(default="other"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_cpa),
):
    submission = db.query(models.IntakeSubmission).filter(
        models.IntakeSubmission.id == intake_id,
        models.IntakeSubmission.cpa_id == current_user.id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Intake not found")

    content = await file.read()
    _validate_upload(file, content)

    # Store files under clients/{client_id}/{tax_year}/ for organized, auditable access
    path_prefix = f"clients/{submission.client_id}/{submission.tax_year}"
    file_path = await storage_service.save_file(content, file.filename, current_user.id, path_prefix=path_prefix)

    doc = models.IntakeDocument(
        intake_id=intake_id,
        filename=file.filename,
        file_path=file_path,
        file_size=len(content),
        category=category,
    )
    db.add(doc)
    db.flush()
    _log_audit(db, current_user.id, "document_uploaded",
               f"intake_id={intake_id} filename={file.filename} category={category} size={len(content)}",
               request.client.host if request.client else None)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "filename": doc.filename, "category": doc.category, "file_size": doc.file_size}


@router.delete("/{intake_id}/documents/{doc_id}")
def delete_intake_document(
    intake_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_cpa),
):
    doc = db.query(models.IntakeDocument).filter(
        models.IntakeDocument.id == doc_id,
        models.IntakeDocument.intake_id == intake_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.intake.cpa_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(doc)
    db.commit()
    return {"message": "Deleted"}


@router.get("/{intake_id}/documents/{doc_id}/file")
async def get_intake_document_file(
    intake_id: int,
    doc_id: int,
    request: Request,
    db: Session = Depends(get_db),
    token: str = Query(default=None),
):
    if not token:
        auth_header = request.headers.get("Authorization", "")
        scheme, token = get_authorization_scheme_param(auth_header)
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=401, detail="Not authenticated")

    current_user = _get_user_from_token(token, db)

    doc = db.query(models.IntakeDocument).filter(
        models.IntakeDocument.id == doc_id,
        models.IntakeDocument.intake_id == intake_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.role == "cpa" and doc.intake.cpa_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role not in ("cpa", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        content = await storage_service.get_file(doc.file_path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found on disk")

    _log_audit(db, current_user.id, "document_downloaded",
               f"intake_id={intake_id} doc_id={doc_id} filename={doc.filename}",
               request.client.host if request.client else None)
    db.commit()

    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"inline; filename={doc.filename}"},
    )

import io
import json
import logging
import traceback

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from .. import auth as auth_utils, models, schemas
from ..database import get_db, SessionLocal
from ..services import claude_service, storage_service

router = APIRouter()


@router.get("/")
def list_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    docs = (
        db.query(models.Document)
        .join(models.Client)
        .filter(models.Client.cpa_id == current_user.id)
        .order_by(models.Document.created_at.desc())
        .all()
    )
    return [
        {
            "id": d.id,
            "client_id": d.client_id,
            "client_name": d.client.name if d.client else None,
            "filename": d.filename,
            "document_type": d.document_type,
            "tax_year": d.tax_year,
            "status": d.status,
            "confidence_score": d.confidence_score,
            "file_size": d.file_size,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        }
        for d in docs
    ]


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    client_id: int = Form(...),
    document_type: str = Form(default="w2"),
    tax_year: str = Form(default="2024"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.cpa_id == current_user.id,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    file_content = await file.read()
    file_path = await storage_service.save_file(file_content, file.filename, current_user.id)

    document = models.Document(
        client_id=client_id,
        filename=file.filename,
        file_path=file_path,
        file_size=len(file_content),
        document_type=document_type,
        tax_year=tax_year,
        status="pending",
    )
    db.add(document)
    db.flush()

    audit = models.AuditLog(
        user_id=current_user.id,
        document_id=document.id,
        action="document_uploaded",
        details=f"Uploaded {file.filename} for client {client.name}",
    )
    db.add(audit)
    db.commit()
    db.refresh(document)

    return {"id": document.id, "status": "pending", "message": "Document uploaded successfully"}


@router.post("/{document_id}/extract")
async def extract_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    document = (
        db.query(models.Document)
        .join(models.Client)
        .filter(
            models.Document.id == document_id,
            models.Client.cpa_id == current_user.id,
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.status = "processing"
    document.extraction_error = None
    db.commit()

    background_tasks.add_task(
        run_extraction,
        document_id=document_id,
        file_path=document.file_path,
        filename=document.filename,
        user_id=current_user.id,
    )

    return {"status": "processing", "message": "Extraction started"}


async def run_extraction(document_id: int, file_path: str, filename: str, user_id: int):
    print(f"\n{'='*60}", flush=True)
    print(f"[EXTRACTION] Starting doc_id={document_id} file={file_path}", flush=True)
    db = SessionLocal()
    try:
        document = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not document:
            print(f"[EXTRACTION] ERROR: document {document_id} not found in DB", flush=True)
            return

        print(f"[EXTRACTION] Reading file...", flush=True)
        file_content = await storage_service.get_file(file_path)
        print(f"[EXTRACTION] File read OK — {len(file_content)} bytes", flush=True)

        print(f"[EXTRACTION] Calling Claude API...", flush=True)
        result = await claude_service.extract_w2(file_content, filename)
        print(f"[EXTRACTION] Claude returned: success={result['success']}", flush=True)

        if result["success"]:
            document.extracted_data = json.dumps(result["data"])
            document.confidence_score = result["data"].get("confidence_score", 0.90)
            document.status = "review"
            print(f"[EXTRACTION] SUCCESS — doc {document_id} set to review", flush=True)
        else:
            error_msg = result.get("error", "Unknown error")
            document.extraction_error = error_msg
            document.status = "pending"
            print(f"[EXTRACTION] FAILED — {error_msg}", flush=True)

        audit = models.AuditLog(
            user_id=user_id,
            document_id=document_id,
            action="document_extracted",
            details="Extraction succeeded" if result["success"] else f"Extraction failed: {result.get('error')}",
        )
        db.add(audit)
        db.commit()
        print(f"[EXTRACTION] DB committed", flush=True)

    except Exception as e:
        print(f"[EXTRACTION] UNHANDLED EXCEPTION for doc {document_id}:", flush=True)
        print(traceback.format_exc(), flush=True)
        try:
            document = db.query(models.Document).filter(models.Document.id == document_id).first()
            if document:
                document.status = "pending"
                document.extraction_error = str(e)
                db.commit()
        except Exception as inner:
            print(f"[EXTRACTION] Also failed to update DB: {inner}", flush=True)
    finally:
        db.close()
        print(f"{'='*60}\n", flush=True)


@router.get("/{document_id}")
def get_document(
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
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": document.id,
        "client_id": document.client_id,
        "client_name": document.client.name,
        "filename": document.filename,
        "document_type": document.document_type,
        "tax_year": document.tax_year,
        "status": document.status,
        "confidence_score": document.confidence_score,
        "extracted_data": json.loads(document.extracted_data) if document.extracted_data else None,
        "extraction_error": document.extraction_error,
        "file_size": document.file_size,
        "created_at": document.created_at.isoformat() if document.created_at else None,
    }


@router.put("/{document_id}")
def update_document(
    document_id: int,
    update_data: schemas.ExtractionDataUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    document = (
        db.query(models.Document)
        .join(models.Client)
        .filter(
            models.Document.id == document_id,
            models.Client.cpa_id == current_user.id,
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.extracted_data = json.dumps(update_data.extracted_data)
    db.commit()
    return {"message": "Document updated"}


@router.post("/{document_id}/approve")
def approve_document(
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
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.status = "approved"
    audit = models.AuditLog(
        user_id=current_user.id,
        document_id=document_id,
        action="document_approved",
        details="Reviewed and approved by CPA",
    )
    db.add(audit)
    db.commit()
    return {"status": "approved"}


@router.get("/{document_id}/file")
async def get_document_file(
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
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        file_content = await storage_service.get_file(document.file_path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found on disk")

    return StreamingResponse(
        io.BytesIO(file_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={document.filename}"},
    )

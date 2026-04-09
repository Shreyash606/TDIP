from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import auth as auth_utils, models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/", response_model=List[schemas.ClientResponse])
def list_clients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    return db.query(models.Client).filter(models.Client.cpa_id == current_user.id).order_by(models.Client.name).all()


@router.post("/", response_model=schemas.ClientResponse)
def create_client(
    client: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    db_client = models.Client(name=client.name, email=client.email, cpa_id=current_user.id)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


@router.get("/{client_id}", response_model=schemas.ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.cpa_id == current_user.id,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

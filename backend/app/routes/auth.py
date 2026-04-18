from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import auth as auth_utils, models, schemas
from ..config import settings
from ..database import get_db
from ..limiter import limiter

router = APIRouter()


@router.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    if user_in.role not in ("cpa", "admin", "client"):
        raise HTTPException(status_code=400, detail="Invalid role")

    user = models.User(
        email=user_in.email,
        hashed_password=auth_utils.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
    )
    db.add(user)
    db.flush()

    if user_in.role == "client":
        # Assign to first active CPA in the system (single-CPA assumption)
        default_cpa = db.query(models.User).filter(
            models.User.role == "cpa",
            models.User.is_active == True,
        ).first()
        if not default_cpa:
            raise HTTPException(status_code=400, detail="No CPA is available right now. Please contact the firm.")

        client = models.Client(
            name=user.full_name,
            email=user.email,
            cpa_id=default_cpa.id,
            user_id=user.id,
        )
        db.add(client)
        db.flush()

        intake = models.IntakeSubmission(
            client_id=client.id,
            cpa_id=default_cpa.id,
            client_user_id=user.id,
            tax_year="2024",
            status="in_progress",
        )
        db.add(intake)

    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth_utils.create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return current_user

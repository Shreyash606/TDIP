from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from . import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the bcrypt hash, False otherwise."""
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    """Return a bcrypt hash (work factor 12) of the given password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT containing the given payload plus an expiry claim.

    The token payload includes {"sub": user_email, "exp": timestamp}.
    Role is intentionally excluded so that role changes take effect on the
    next request without requiring re-login (see ADR 001).

    Args:
        data: Payload dict — typically {"sub": user.email}.
        expires_delta: Token lifetime. Defaults to settings.access_token_expire_minutes.

    Returns:
        Signed JWT string.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> "models.User":
    """FastAPI dependency — decode the Bearer token and return the authenticated User.

    Raises HTTP 401 if the token is missing, expired, tampered, or the user
    no longer exists in the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


def require_cpa(current_user=Depends(get_current_user)):
    """FastAPI dependency — allow only users with role='cpa'. Raises HTTP 403 otherwise."""
    if current_user.role != "cpa":
        raise HTTPException(status_code=403, detail="CPA access required")
    return current_user


def require_admin(current_user=Depends(get_current_user)):
    """FastAPI dependency — allow only users with role='admin'. Raises HTTP 403 otherwise."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_client(current_user=Depends(get_current_user)):
    """FastAPI dependency — allow only users with role='client'. Raises HTTP 403 otherwise."""
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Client access required")
    return current_user

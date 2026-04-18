"""
Field-level Fernet encryption for sensitive intake fields (SSN, bank numbers).
Requires FIELD_ENCRYPTION_KEY in .env — generate with:
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

If FIELD_ENCRYPTION_KEY is not set, fields are stored as plaintext (dev mode).
"""
from cryptography.fernet import Fernet, InvalidToken

from ..config import settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet | None:
    global _fernet
    if _fernet is None and settings.field_encryption_key:
        _fernet = Fernet(settings.field_encryption_key.encode())
    return _fernet


def encrypt(value: str | None) -> str | None:
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value  # no key configured — dev mode, store plaintext
    return f.encrypt(value.encode()).decode()


def decrypt(value: str | None) -> str | None:
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode()).decode()
    except (InvalidToken, Exception):
        return value  # already plaintext or key mismatch — return as-is

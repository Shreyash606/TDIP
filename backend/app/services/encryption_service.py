"""
Field-level Fernet encryption for sensitive intake fields (SSN, bank numbers).

Encrypted fields: taxpayer_ssn_last4, spouse_ssn_last4,
                  bank_routing_number, bank_account_number.

Requires FIELD_ENCRYPTION_KEY in .env — generate with:
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

If FIELD_ENCRYPTION_KEY is not set, fields are stored as plaintext (dev mode).
See docs/decisions/002-fernet-field-encryption.md for the rationale.
"""
from cryptography.fernet import Fernet, InvalidToken

from ..config import settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet | None:
    """Return a lazily-initialised Fernet instance, or None if no key is configured."""
    global _fernet
    if _fernet is None and settings.field_encryption_key:
        _fernet = Fernet(settings.field_encryption_key.encode())
    return _fernet


def encrypt(value: str | None) -> str | None:
    """Encrypt a plaintext string with Fernet (AES-128-CBC + HMAC-SHA256).

    Returns the ciphertext as a URL-safe base64 string. Returns the original
    value unchanged if it is falsy or if no encryption key is configured
    (dev mode — stores plaintext).

    Args:
        value: Plaintext string to encrypt, or None/empty.

    Returns:
        Fernet ciphertext string, original value if no key, or None if input is None.
    """
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value  # no key configured — dev mode, store plaintext
    return f.encrypt(value.encode()).decode()


def decrypt(value: str | None) -> str | None:
    """Decrypt a Fernet ciphertext string back to plaintext.

    Handles three cases transparently:
    - Valid ciphertext + correct key → decrypted plaintext
    - No key configured (dev mode) → returns value as-is
    - InvalidToken (plaintext value or wrong key) → returns value as-is

    The fallback-to-as-is behaviour means this function is safe to call on
    a database that was seeded before encryption was enabled.

    Args:
        value: Fernet ciphertext string, plaintext, or None/empty.

    Returns:
        Decrypted plaintext, original value if decryption is not possible, or None.
    """
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode()).decode()
    except (InvalidToken, Exception):
        return value  # already plaintext or key mismatch — return as-is

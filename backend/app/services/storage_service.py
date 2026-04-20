"""
Abstracted file storage — local filesystem (dev) or AWS S3 (production).

Switch between backends by setting STORAGE_TYPE in the environment:
  STORAGE_TYPE=local   → files saved under LOCAL_STORAGE_PATH (default: ./uploads)
  STORAGE_TYPE=s3      → files saved to AWS S3 with AES-256 server-side encryption

File paths are organised as:  clients/{client_id}/{tax_year}/{filename}
The returned path string is stored in the database and passed back to get_file()
for retrieval — local paths are filesystem paths; S3 paths begin with "s3://".

See docs/decisions/004-database-url-abstraction.md for the portability rationale.
"""
import re
from pathlib import Path

import aiofiles

from ..config import settings


def _safe_filename(filename: str) -> str:
    """Strip path-traversal and shell-special characters from a filename."""
    return re.sub(r"[^\w.\- ]", "_", filename)


async def save_file(content: bytes, filename: str, user_id: int, path_prefix: str | None = None) -> str:
    """Persist file content and return a storage path for later retrieval.

    Args:
        content: Raw file bytes.
        filename: Original filename — will be sanitised before storage.
        user_id: ID of the uploading user (used as fallback directory name).
        path_prefix: Directory prefix, e.g. "clients/1/2024". Takes precedence
                     over user_id when provided.

    Returns:
        Storage path string — filesystem path (local) or "s3://bucket/key" (S3).
    """
    if settings.storage_type == "s3":
        return await _save_s3(content, filename, user_id, path_prefix)
    return await _save_local(content, filename, user_id, path_prefix)


async def get_file(file_path: str) -> bytes:
    if file_path.startswith("s3://"):
        return await _get_s3(file_path)
    async with aiofiles.open(file_path, "rb") as f:
        return await f.read()


async def _save_local(content: bytes, filename: str, user_id: int, path_prefix: str | None) -> str:
    if path_prefix:
        directory = Path(settings.local_storage_path) / path_prefix
    else:
        directory = Path(settings.local_storage_path) / str(user_id)
    directory.mkdir(parents=True, exist_ok=True)

    safe = _safe_filename(filename)
    dest = directory / safe
    counter = 1
    while dest.exists():
        stem, suffix = Path(safe).stem, Path(safe).suffix
        dest = directory / f"{stem}_{counter}{suffix}"
        counter += 1

    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)

    return str(dest)


async def _save_s3(content: bytes, filename: str, user_id: int, path_prefix: str | None) -> str:
    import boto3

    if path_prefix:
        key = f"{path_prefix}/{_safe_filename(filename)}"
    else:
        key = f"documents/{user_id}/{_safe_filename(filename)}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )
    s3.put_object(
        Bucket=settings.aws_bucket_name,
        Key=key,
        Body=content,
        ServerSideEncryption="AES256",
    )
    return f"s3://{settings.aws_bucket_name}/{key}"


async def _get_s3(s3_path: str) -> bytes:
    import boto3

    path = s3_path[5:]
    bucket, key = path.split("/", 1)
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )
    resp = s3.get_object(Bucket=bucket, Key=key)
    return resp["Body"].read()

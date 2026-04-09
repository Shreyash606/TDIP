from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None


class ClientResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExtractionDataUpdate(BaseModel):
    extracted_data: dict

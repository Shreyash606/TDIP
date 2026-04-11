from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite:///./taxdoc.db"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    anthropic_api_key: str = ""

    storage_type: str = "local"
    local_storage_path: str = "./uploads"

    # Comma-separated list of allowed CORS origins
    # e.g. "https://tdip.vercel.app,http://localhost:5173"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:5174"

    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_bucket_name: Optional[str] = None
    aws_region: str = "us-east-1"

    def get_allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()

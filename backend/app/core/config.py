from pathlib import Path
from pydantic_settings import BaseSettings

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day
    lastfm_api_key: str
    lastfm_shared_secret: str
    lastfm_callback_url: str
    
    class Config:
        env_file = str(ENV_PATH)

settings = Settings()


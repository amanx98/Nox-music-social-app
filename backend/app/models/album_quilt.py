from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class AlbumQuilt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    source: str  # "lastfm"
    quilt_type: str = Field(default="albums")  # "albums" | "tracks"
    period: str
    image_path: str
    folder: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
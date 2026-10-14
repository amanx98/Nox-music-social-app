from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    type: str  # "artist" | "genre" | "custom" | "topic"
    creator_id: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    banner_url: Optional[str] = Field(default=None, nullable=True)
    icon_url: Optional[str] = Field(default=None, nullable=True)
    description: Optional[str] = Field(default=None, nullable=True)
    rules: Optional[str] = Field(default=None, nullable=True)
    theme_color: Optional[str] = Field(default=None, nullable=True)
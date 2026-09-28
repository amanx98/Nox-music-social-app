from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Thread(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    tag_id: int = Field(foreign_key="tag.id")
    title: str
    body: str
    image_url: Optional[str] = Field(default=None, nullable=True)
    media_type: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None, nullable=True)

from pydantic import BaseModel
from datetime import datetime

class ThreadCreate(BaseModel):
    tag_id: int
    title: str
    body: str
    image_url: Optional[str] = None
    media_type: Optional[str] = None

class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    media_type: Optional[str] = None
    tag_id: Optional[int] = None

class ThreadRead(BaseModel):
    id: int
    user_id: int
    tag_id: int
    title: str
    body: str
    image_url: Optional[str] = None
    media_type: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
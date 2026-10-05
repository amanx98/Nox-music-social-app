from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PostCreate(BaseModel):
    thread_id: int
    body: str

class PostUpdate(BaseModel):
    body: str

class PostRead(BaseModel):
    id: int
    thread_id: int
    user_id: int
    body: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    author_name: Optional[str] = None
    author_username: Optional[str] = None
    author_avatar_url: Optional[str] = None
    author_bio: Optional[str] = None
    thread_title: Optional[str] = None
    thread_author: Optional[str] = None
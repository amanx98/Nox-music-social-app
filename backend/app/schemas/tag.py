from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TagCreate(BaseModel):
    name: str
    type: str = "genre"
    description: Optional[str] = None
    rules: Optional[str] = None
    theme_color: Optional[str] = None
    banner_url: Optional[str] = None
    icon_url: Optional[str] = None

class TagUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[str] = None
    theme_color: Optional[str] = None
    banner_url: Optional[str] = None
    icon_url: Optional[str] = None

class TagRead(BaseModel):
    id: int
    name: str
    type: str
    creator_id: Optional[int] = None
    creator_username: Optional[str] = None
    creator_avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    banner_url: Optional[str] = None
    icon_url: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[str] = None
    theme_color: Optional[str] = None
    threads_count: int = 0
    posts_count: int = 0
    is_creator: bool = False
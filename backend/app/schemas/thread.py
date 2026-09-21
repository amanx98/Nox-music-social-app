from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ThreadCreate(BaseModel):
    tag_id: int
    title: str
    body: str

class ThreadRead(BaseModel):
    id: int
    user_id: int
    tag_id: int
    title: str
    body: str
    created_at: datetime
    # Enriched fields
    author_name: Optional[str] = None
    author_username: Optional[str] = None
    tag_name: Optional[str] = None
    tag_type: Optional[str] = None
    likes_count: int = 0
    reposts_count: int = 0
    post_count: int = 0
    is_liked: bool = False
    is_reposted: bool = False
    is_bookmarked: bool = False
    # Retweet / Repost timeline fields
    is_repost: bool = False
    reposted_by: Optional[str] = None
    reposted_at: Optional[datetime] = None
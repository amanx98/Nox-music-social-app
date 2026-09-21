from sqlmodel import SQLModel, Field, UniqueConstraint
from typing import Optional
from datetime import datetime

class ThreadLike(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "thread_id", name="unique_user_thread_like"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    thread_id: int = Field(foreign_key="thread.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ThreadRepost(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "thread_id", name="unique_user_thread_repost"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    thread_id: int = Field(foreign_key="thread.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ThreadBookmark(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "thread_id", name="unique_user_thread_bookmark"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    thread_id: int = Field(foreign_key="thread.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

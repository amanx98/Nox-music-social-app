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

class UserFollow(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("follower_id", "following_id", name="unique_user_follow"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    follower_id: int = Field(foreign_key="user.id", index=True)
    following_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Friendship(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("sender_id", "receiver_id", name="unique_friend_request"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    sender_id: int = Field(foreign_key="user.id", index=True)
    receiver_id: int = Field(foreign_key="user.id", index=True)
    status: str = Field(default="pending", index=True)  # pending, accepted, declined
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None, nullable=True)

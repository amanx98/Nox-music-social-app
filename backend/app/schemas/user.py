from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None

class UserRead(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    bio: Optional[str] = None

from datetime import datetime

class UserProfileRead(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: Optional[datetime] = None
    followers_count: int = 0
    following_count: int = 0
    friends_count: int = 0
    threads_count: int = 0
    is_following: bool = False
    is_followed_by: bool = False
    friendship_status: str = "none"  # "none" | "pending_sent" | "pending_received" | "friends"
    friendship_id: Optional[int] = None

class UserSummary(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_following: bool = False
    is_friend: bool = False

class FriendRequestRead(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    status: str
    created_at: datetime
    sender_username: Optional[str] = None
    sender_avatar_url: Optional[str] = None
    receiver_username: Optional[str] = None
    receiver_avatar_url: Optional[str] = None

class FollowActionResponse(BaseModel):
    success: bool
    is_following: bool
    followers_count: int

class FriendshipActionResponse(BaseModel):
    success: bool
    status: str
    friendship_id: Optional[int] = None
    friends_count: int

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
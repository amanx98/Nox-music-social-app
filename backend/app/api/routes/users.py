from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func, or_

from app.db.session import get_session
from app.models.user import User
from app.models.thread import Thread
from app.models.social import UserFollow, Friendship
from app.schemas.user import UserProfileRead, UserSummary, FollowActionResponse
from app.core.deps import get_current_user, get_optional_current_user

router = APIRouter(prefix="/users", tags=["users"])

def _get_target_user_by_username(username: str, session: Session) -> User:
    user = session.exec(
        select(User).where(func.lower(User.username) == username.strip().lower())
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '@{username}' not found")
    return user

def _build_user_summary(user: User, current_user: Optional[User], session: Session) -> UserSummary:
    is_following = False
    is_friend = False
    if current_user and current_user.id != user.id:
        is_following = session.exec(
            select(UserFollow).where(
                UserFollow.follower_id == current_user.id,
                UserFollow.following_id == user.id,
            )
        ).first() is not None

        is_friend = session.exec(
            select(Friendship).where(
                Friendship.status == "accepted",
                or_(
                    (Friendship.sender_id == current_user.id) & (Friendship.receiver_id == user.id),
                    (Friendship.sender_id == user.id) & (Friendship.receiver_id == current_user.id),
                ),
            )
        ).first() is not None

    return UserSummary(
        id=user.id,
        username=user.username,
        avatar_url=user.avatar_url,
        bio=user.bio,
        is_following=is_following,
        is_friend=is_friend,
    )

@router.get("/search", response_model=list[UserSummary])
def search_users(
    q: str = Query(..., min_length=1),
    limit: int = 15,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    query_str = f"%{q.strip().lower()}%"
    users = session.exec(
        select(User)
        .where(
            or_(
                func.lower(User.username).like(query_str),
                func.lower(User.bio).like(query_str),
            )
        )
        .limit(limit)
    ).all()
    return [_build_user_summary(u, current_user, session) for u in users]

@router.get("/{username}", response_model=UserProfileRead)
def get_user_profile(
    username: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    target = _get_target_user_by_username(username, session)

    # Counts
    followers_count = session.exec(
        select(func.count(UserFollow.id)).where(UserFollow.following_id == target.id)
    ).one()

    following_count = session.exec(
        select(func.count(UserFollow.id)).where(UserFollow.follower_id == target.id)
    ).one()

    threads_count = session.exec(
        select(func.count(Thread.id)).where(Thread.user_id == target.id)
    ).one()

    # Friends count (accepted relationships)
    friends_count = session.exec(
        select(func.count(Friendship.id)).where(
            Friendship.status == "accepted",
            or_(
                Friendship.sender_id == target.id,
                Friendship.receiver_id == target.id,
            ),
        )
    ).one()

    is_following = False
    is_followed_by = False
    friendship_status = "none"
    friendship_id = None

    if current_user and current_user.id != target.id:
        is_following = session.exec(
            select(UserFollow).where(
                UserFollow.follower_id == current_user.id,
                UserFollow.following_id == target.id,
            )
        ).first() is not None

        is_followed_by = session.exec(
            select(UserFollow).where(
                UserFollow.follower_id == target.id,
                UserFollow.following_id == current_user.id,
            )
        ).first() is not None

        existing_friendship = session.exec(
            select(Friendship).where(
                or_(
                    (Friendship.sender_id == current_user.id) & (Friendship.receiver_id == target.id),
                    (Friendship.sender_id == target.id) & (Friendship.receiver_id == current_user.id),
                )
            )
        ).first()

        if existing_friendship:
            friendship_id = existing_friendship.id
            if existing_friendship.status == "accepted":
                friendship_status = "friends"
            elif existing_friendship.status == "pending":
                if existing_friendship.sender_id == current_user.id:
                    friendship_status = "pending_sent"
                else:
                    friendship_status = "pending_received"
            else:
                friendship_status = "none"

    return UserProfileRead(
        id=target.id,
        username=target.username,
        email=target.email if (current_user and current_user.id == target.id) else None,
        avatar_url=target.avatar_url,
        banner_url=target.banner_url,
        bio=target.bio,
        created_at=target.created_at,
        followers_count=followers_count,
        following_count=following_count,
        friends_count=friends_count,
        threads_count=threads_count,
        is_following=is_following,
        is_followed_by=is_followed_by,
        friendship_status=friendship_status,
        friendship_id=friendship_id,
    )

@router.get("/{username}/followers", response_model=list[UserSummary])
def get_user_followers(
    username: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    target = _get_target_user_by_username(username, session)
    follower_links = session.exec(
        select(UserFollow).where(UserFollow.following_id == target.id)
    ).all()
    follower_ids = [f.follower_id for f in follower_links]
    if not follower_ids:
        return []

    users = session.exec(select(User).where(User.id.in_(follower_ids))).all()
    return [_build_user_summary(u, current_user, session) for u in users]

@router.get("/{username}/following", response_model=list[UserSummary])
def get_user_following(
    username: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    target = _get_target_user_by_username(username, session)
    following_links = session.exec(
        select(UserFollow).where(UserFollow.follower_id == target.id)
    ).all()
    following_ids = [f.following_id for f in following_links]
    if not following_ids:
        return []

    users = session.exec(select(User).where(User.id.in_(following_ids))).all()
    return [_build_user_summary(u, current_user, session) for u in users]

@router.get("/{username}/friends", response_model=list[UserSummary])
def get_user_friends(
    username: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    target = _get_target_user_by_username(username, session)
    friendships = session.exec(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                Friendship.sender_id == target.id,
                Friendship.receiver_id == target.id,
            ),
        )
    ).all()

    friend_ids = []
    for f in friendships:
        if f.sender_id == target.id:
            friend_ids.append(f.receiver_id)
        else:
            friend_ids.append(f.sender_id)

    if not friend_ids:
        return []

    users = session.exec(select(User).where(User.id.in_(friend_ids))).all()
    return [_build_user_summary(u, current_user, session) for u in users]

@router.post("/{user_id}/follow", response_model=FollowActionResponse)
def follow_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = session.exec(
        select(UserFollow).where(
            UserFollow.follower_id == current_user.id,
            UserFollow.following_id == user_id,
        )
    ).first()

    if not existing:
        follow = UserFollow(follower_id=current_user.id, following_id=user_id)
        session.add(follow)
        session.commit()

    followers_count = session.exec(
        select(func.count(UserFollow.id)).where(UserFollow.following_id == user_id)
    ).one()

    return FollowActionResponse(
        success=True,
        is_following=True,
        followers_count=followers_count,
    )

@router.post("/{user_id}/unfollow", response_model=FollowActionResponse)
def unfollow_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = session.exec(
        select(UserFollow).where(
            UserFollow.follower_id == current_user.id,
            UserFollow.following_id == user_id,
        )
    ).first()

    if existing:
        session.delete(existing)
        session.commit()

    followers_count = session.exec(
        select(func.count(UserFollow.id)).where(UserFollow.following_id == user_id)
    ).one()

    return FollowActionResponse(
        success=True,
        is_following=False,
        followers_count=followers_count,
    )

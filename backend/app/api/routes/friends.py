from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func, or_

from app.db.session import get_session
from app.models.user import User
from app.models.social import Friendship
from app.schemas.user import FriendshipActionResponse, FriendRequestRead
from app.core.deps import get_current_user

router = APIRouter(prefix="/friends", tags=["friends"])

def _count_user_friends(user_id: int, session: Session) -> int:
    return session.exec(
        select(func.count(Friendship.id)).where(
            Friendship.status == "accepted",
            or_(
                Friendship.sender_id == user_id,
                Friendship.receiver_id == user_id,
            ),
        )
    ).one()

@router.get("/requests", response_model=list[FriendRequestRead])
def get_friend_requests(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    requests = session.exec(
        select(Friendship).where(
            Friendship.status == "pending",
            or_(
                Friendship.receiver_id == current_user.id,
                Friendship.sender_id == current_user.id,
            ),
        ).order_by(Friendship.created_at.desc())
    ).all()

    result = []
    for req in requests:
        sender = session.get(User, req.sender_id)
        receiver = session.get(User, req.receiver_id)
        result.append(
            FriendRequestRead(
                id=req.id,
                sender_id=req.sender_id,
                receiver_id=req.receiver_id,
                status=req.status,
                created_at=req.created_at,
                sender_username=sender.username if sender else f"user_{req.sender_id}",
                sender_avatar_url=sender.avatar_url if sender else None,
                receiver_username=receiver.username if receiver else f"user_{req.receiver_id}",
                receiver_avatar_url=receiver.avatar_url if receiver else None,
            )
        )
    return result

@router.post("/request/{user_id}", response_model=FriendshipActionResponse)
def send_friend_request(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")

    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = session.exec(
        select(Friendship).where(
            or_(
                (Friendship.sender_id == current_user.id) & (Friendship.receiver_id == user_id),
                (Friendship.sender_id == user_id) & (Friendship.receiver_id == current_user.id),
            )
        )
    ).first()

    if existing:
        if existing.status == "accepted":
            return FriendshipActionResponse(
                success=True,
                status="friends",
                friendship_id=existing.id,
                friends_count=_count_user_friends(target.id, session),
            )
        elif existing.status == "pending":
            if existing.sender_id == current_user.id:
                return FriendshipActionResponse(
                    success=True,
                    status="pending_sent",
                    friendship_id=existing.id,
                    friends_count=_count_user_friends(target.id, session),
                )
            else:
                # The other user had already requested friendship! Auto-accept:
                existing.status = "accepted"
                existing.updated_at = datetime.utcnow()
                session.add(existing)
                session.commit()
                session.refresh(existing)
                return FriendshipActionResponse(
                    success=True,
                    status="friends",
                    friendship_id=existing.id,
                    friends_count=_count_user_friends(target.id, session),
                )
        else:
            # Re-requesting after previous decline
            existing.sender_id = current_user.id
            existing.receiver_id = user_id
            existing.status = "pending"
            existing.created_at = datetime.utcnow()
            existing.updated_at = None
            session.add(existing)
            session.commit()
            session.refresh(existing)
            return FriendshipActionResponse(
                success=True,
                status="pending_sent",
                friendship_id=existing.id,
                friends_count=_count_user_friends(target.id, session),
            )

    new_friendship = Friendship(
        sender_id=current_user.id,
        receiver_id=user_id,
        status="pending",
    )
    session.add(new_friendship)
    session.commit()
    session.refresh(new_friendship)

    return FriendshipActionResponse(
        success=True,
        status="pending_sent",
        friendship_id=new_friendship.id,
        friends_count=_count_user_friends(target.id, session),
    )

@router.post("/accept/{request_id}", response_model=FriendshipActionResponse)
def accept_friend_request(
    request_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    friendship = session.get(Friendship, request_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friendship.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this friend request")

    friendship.status = "accepted"
    friendship.updated_at = datetime.utcnow()
    session.add(friendship)
    session.commit()
    session.refresh(friendship)

    other_id = friendship.sender_id
    return FriendshipActionResponse(
        success=True,
        status="friends",
        friendship_id=friendship.id,
        friends_count=_count_user_friends(other_id, session),
    )

@router.post("/decline/{request_id}", response_model=FriendshipActionResponse)
def decline_friend_request(
    request_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    friendship = session.get(Friendship, request_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friendship.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to decline this friend request")

    other_id = friendship.sender_id
    session.delete(friendship)
    session.commit()

    return FriendshipActionResponse(
        success=True,
        status="none",
        friendship_id=None,
        friends_count=_count_user_friends(other_id, session),
    )

@router.post("/cancel/{request_id}", response_model=FriendshipActionResponse)
def cancel_friend_request(
    request_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    friendship = session.get(Friendship, request_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friendship.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this request")

    other_id = friendship.receiver_id
    session.delete(friendship)
    session.commit()

    return FriendshipActionResponse(
        success=True,
        status="none",
        friendship_id=None,
        friends_count=_count_user_friends(other_id, session),
    )

@router.delete("/{user_id}", response_model=FriendshipActionResponse)
def remove_friend(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    friendship = session.exec(
        select(Friendship).where(
            or_(
                (Friendship.sender_id == current_user.id) & (Friendship.receiver_id == user_id),
                (Friendship.sender_id == user_id) & (Friendship.receiver_id == current_user.id),
            )
        )
    ).first()

    if friendship:
        session.delete(friendship)
        session.commit()

    return FriendshipActionResponse(
        success=True,
        status="none",
        friendship_id=None,
        friends_count=_count_user_friends(user_id, session),
    )

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.user import User
from app.models.thread import Thread
from app.models.post import Post
from app.models.social import ThreadLike, ThreadRepost, Friendship
from app.core.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

class NotificationItem(BaseModel):
    id: str
    type: str  # reply, like, repost, friend_request
    title: str
    detail: str
    created_at: datetime
    link: Optional[str] = None
    sender_username: Optional[str] = None
    sender_avatar_url: Optional[str] = None

@router.get("/", response_model=List[NotificationItem])
def get_user_notifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    notifications: list[NotificationItem] = []

    # 1. Fetch user's thread IDs
    my_threads = session.exec(select(Thread).where(Thread.user_id == current_user.id)).all()
    my_thread_map = {t.id: t for t in my_threads if t.id is not None}
    my_thread_ids = list(my_thread_map.keys())

    if my_thread_ids:
        # A. Replies to my threads by others
        replies = session.exec(
            select(Post)
            .where(Post.thread_id.in_(my_thread_ids), Post.user_id != current_user.id)
            .order_by(Post.created_at.desc())
            .limit(10)
        ).all()

        reply_user_ids = {r.user_id for r in replies if r.user_id is not None}
        reply_users = {
            u.id: u for u in session.exec(select(User).where(User.id.in_(reply_user_ids))).all()
        } if reply_user_ids else {}

        for rep in replies:
            author = reply_users.get(rep.user_id)
            username = author.username if author else f"audiphile_{rep.user_id}"
            thread = my_thread_map.get(rep.thread_id)
            thread_title = f'"{thread.title[:30]}..."' if thread and thread.title else "your transmission"
            body_preview = (rep.body[:60] + "...") if len(rep.body) > 60 else rep.body

            notifications.append(
                NotificationItem(
                    id=f"reply-{rep.id}",
                    type="reply",
                    title="New Reply Transmission",
                    detail=f"@{username} replied to {thread_title}: '{body_preview}'",
                    created_at=rep.created_at,
                    link=f"/threads/{rep.thread_id}",
                    sender_username=username,
                    sender_avatar_url=author.avatar_url if author else None,
                )
            )

        # B. Likes on my threads by others
        likes = session.exec(
            select(ThreadLike)
            .where(ThreadLike.thread_id.in_(my_thread_ids), ThreadLike.user_id != current_user.id)
            .order_by(ThreadLike.created_at.desc())
            .limit(10)
        ).all()

        like_user_ids = {l.user_id for l in likes if l.user_id is not None}
        like_users = {
            u.id: u for u in session.exec(select(User).where(User.id.in_(like_user_ids))).all()
        } if like_user_ids else {}

        for lk in likes:
            author = like_users.get(lk.user_id)
            username = author.username if author else f"audiphile_{lk.user_id}"
            thread = my_thread_map.get(lk.thread_id)
            thread_title = f'"{thread.title[:30]}..."' if thread and thread.title else "your transmission"

            notifications.append(
                NotificationItem(
                    id=f"like-{lk.id}",
                    type="like",
                    title="Transmission Resonance",
                    detail=f"@{username} liked {thread_title}.",
                    created_at=lk.created_at,
                    link=f"/threads/{lk.thread_id}",
                    sender_username=username,
                    sender_avatar_url=author.avatar_url if author else None,
                )
            )

        # C. Reposts of my threads
        reposts = session.exec(
            select(ThreadRepost)
            .where(ThreadRepost.thread_id.in_(my_thread_ids), ThreadRepost.user_id != current_user.id)
            .order_by(ThreadRepost.created_at.desc())
            .limit(10)
        ).all()

        repost_user_ids = {r.user_id for r in reposts if r.user_id is not None}
        repost_users = {
            u.id: u for u in session.exec(select(User).where(User.id.in_(repost_user_ids))).all()
        } if repost_user_ids else {}

        for rp in reposts:
            author = repost_users.get(rp.user_id)
            username = author.username if author else f"audiphile_{rp.user_id}"
            thread = my_thread_map.get(rp.thread_id)
            thread_title = f'"{thread.title[:30]}..."' if thread and thread.title else "your transmission"

            notifications.append(
                NotificationItem(
                    id=f"repost-{rp.id}",
                    type="repost",
                    title="Transmission Relayed",
                    detail=f"@{username} reposted {thread_title} to their circle.",
                    created_at=rp.created_at,
                    link=f"/threads/{rp.thread_id}",
                    sender_username=username,
                    sender_avatar_url=author.avatar_url if author else None,
                )
            )

    # 2. Incoming Pending Friend Requests
    friend_requests = session.exec(
        select(Friendship)
        .where(Friendship.receiver_id == current_user.id, Friendship.status == "pending")
        .order_by(Friendship.created_at.desc())
        .limit(10)
    ).all()

    req_sender_ids = {fr.sender_id for fr in friend_requests if fr.sender_id is not None}
    req_senders = {
        u.id: u for u in session.exec(select(User).where(User.id.in_(req_sender_ids))).all()
    } if req_sender_ids else {}

    for fr in friend_requests:
        sender = req_senders.get(fr.sender_id)
        username = sender.username if sender else f"audiphile_{fr.sender_id}"
        notifications.append(
            NotificationItem(
                id=f"friend-{fr.id}",
                type="friend_request",
                title="Circle Connection Request",
                detail=f"@{username} requested to connect into your circle.",
                created_at=fr.created_at,
                link=f"/profile/{username}",
                sender_username=username,
                sender_avatar_url=sender.avatar_url if sender else None,
            )
        )

    # Sort all notifications newest first
    notifications.sort(key=lambda n: n.created_at, reverse=True)
    return notifications[:25]

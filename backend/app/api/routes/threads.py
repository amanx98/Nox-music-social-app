from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models.thread import Thread
from app.models.post import Post
from app.models.tag import Tag
from app.models.user import User
from app.models.social import ThreadLike, ThreadRepost, ThreadBookmark
from app.schemas.thread import ThreadCreate, ThreadRead
from app.core.deps import get_current_user, get_optional_current_user

router = APIRouter(prefix="/threads", tags=["threads"])

def _enrich_thread(
    thread: Thread,
    session: Session,
    current_user: Optional[User] = None,
    is_repost: bool = False,
    reposted_by: Optional[str] = None,
    reposted_at: Optional[datetime] = None,
) -> ThreadRead:
    author = session.get(User, thread.user_id)
    author_name = author.username if author else f"audiphile_{thread.user_id}"
    
    tag = session.get(Tag, thread.tag_id) if thread.tag_id else None
    tag_name = tag.name if tag else None
    tag_type = tag.type if tag else None

    # Counts
    post_count = session.exec(select(func.count(Post.id)).where(Post.thread_id == thread.id)).one()
    likes_count = session.exec(select(func.count(ThreadLike.id)).where(ThreadLike.thread_id == thread.id)).one()
    reposts_count = session.exec(select(func.count(ThreadRepost.id)).where(ThreadRepost.thread_id == thread.id)).one()

    # User interactions
    is_liked = False
    is_reposted = False
    is_bookmarked = False

    if current_user:
        is_liked = session.exec(
            select(ThreadLike).where(ThreadLike.thread_id == thread.id, ThreadLike.user_id == current_user.id)
        ).first() is not None

        is_reposted = session.exec(
            select(ThreadRepost).where(ThreadRepost.thread_id == thread.id, ThreadRepost.user_id == current_user.id)
        ).first() is not None

        is_bookmarked = session.exec(
            select(ThreadBookmark).where(ThreadBookmark.thread_id == thread.id, ThreadBookmark.user_id == current_user.id)
        ).first() is not None

    return ThreadRead(
        id=thread.id,
        user_id=thread.user_id,
        tag_id=thread.tag_id,
        title=thread.title,
        body=thread.body,
        created_at=thread.created_at,
        author_name=author_name,
        author_username=author_name,
        tag_name=tag_name,
        tag_type=tag_type,
        likes_count=likes_count,
        reposts_count=reposts_count,
        post_count=post_count,
        is_liked=is_liked,
        is_reposted=is_reposted,
        is_bookmarked=is_bookmarked,
        is_repost=is_repost,
        reposted_by=reposted_by,
        reposted_at=reposted_at,
    )

@router.post("/", response_model=ThreadRead)
def create_thread(
    thread_in: ThreadCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    thread = Thread(
        user_id=current_user.id,
        tag_id=thread_in.tag_id,
        title=thread_in.title,
        body=thread_in.body,
    )
    session.add(thread)
    session.commit()
    session.refresh(thread)
    return _enrich_thread(thread, session, current_user)

@router.get("/", response_model=list[ThreadRead])
def list_threads(
    tag_id: int | None = None,
    user_id: int | None = None,
    include_reposts: bool = False,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    # If filtering by a specific user profile and including retweets in the timeline
    if user_id is not None and include_reposts:
        profile_user = session.get(User, user_id)
        reposter_name = profile_user.username if profile_user else "listener"

        # 1. Original threads by user
        orig_threads = session.exec(
            select(Thread).where(Thread.user_id == user_id)
        ).all()
        enriched_orig = [
            (t.created_at, _enrich_thread(t, session, current_user, is_repost=False))
            for t in orig_threads
        ]

        # 2. Retweets / Reposts by user
        reposts = session.exec(
            select(ThreadRepost).where(ThreadRepost.user_id == user_id).order_by(ThreadRepost.created_at.desc())
        ).all()

        enriched_reposts = []
        for r in reposts:
            orig_t = session.get(Thread, r.thread_id)
            if orig_t:
                enriched_reposts.append((
                    r.created_at,
                    _enrich_thread(
                        orig_t,
                        session,
                        current_user,
                        is_repost=True,
                        reposted_by=reposter_name,
                        reposted_at=r.created_at,
                    )
                ))

        # Combine and sort newest timeline event first
        combined = enriched_orig + enriched_reposts
        combined.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in combined]

    query = select(Thread)
    if tag_id:
        query = query.where(Thread.tag_id == tag_id)
    if user_id:
        query = query.where(Thread.user_id == user_id)

    query = query.order_by(Thread.created_at.desc())
    threads = session.exec(query).all()
    return [_enrich_thread(t, session, current_user) for t in threads]

@router.post("/{thread_id}/like")
def toggle_like(
    thread_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    thread = session.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    existing = session.exec(
        select(ThreadLike).where(
            ThreadLike.thread_id == thread_id,
            ThreadLike.user_id == current_user.id
        )
    ).first()

    if existing:
        session.delete(existing)
        session.commit()
        liked = False
    else:
        new_like = ThreadLike(user_id=current_user.id, thread_id=thread_id)
        session.add(new_like)
        session.commit()
        liked = True

    likes_count = session.exec(
        select(func.count(ThreadLike.id)).where(ThreadLike.thread_id == thread_id)
    ).one()

    return {"liked": liked, "likes_count": likes_count, "thread_id": thread_id}

@router.post("/{thread_id}/repost")
def toggle_repost(
    thread_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    thread = session.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    existing = session.exec(
        select(ThreadRepost).where(
            ThreadRepost.thread_id == thread_id,
            ThreadRepost.user_id == current_user.id
        )
    ).first()

    if existing:
        session.delete(existing)
        session.commit()
        reposted = False
    else:
        new_repost = ThreadRepost(user_id=current_user.id, thread_id=thread_id)
        session.add(new_repost)
        session.commit()
        reposted = True

    reposts_count = session.exec(
        select(func.count(ThreadRepost.id)).where(ThreadRepost.thread_id == thread_id)
    ).one()

    return {"reposted": reposted, "reposts_count": reposts_count, "thread_id": thread_id}

@router.post("/{thread_id}/bookmark")
def toggle_bookmark(
    thread_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    thread = session.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    existing = session.exec(
        select(ThreadBookmark).where(
            ThreadBookmark.thread_id == thread_id,
            ThreadBookmark.user_id == current_user.id
        )
    ).first()

    if existing:
        session.delete(existing)
        session.commit()
        bookmarked = False
    else:
        new_bookmark = ThreadBookmark(user_id=current_user.id, thread_id=thread_id)
        session.add(new_bookmark)
        session.commit()
        bookmarked = True

    return {"bookmarked": bookmarked, "thread_id": thread_id}

@router.get("/user/{user_id}/likes", response_model=list[ThreadRead])
def list_user_likes(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    likes = session.exec(
        select(ThreadLike).where(ThreadLike.user_id == user_id).order_by(ThreadLike.created_at.desc())
    ).all()

    threads = []
    for like in likes:
        t = session.get(Thread, like.thread_id)
        if t:
            threads.append(_enrich_thread(t, session, current_user))
    return threads

@router.get("/user/{user_id}/reposts", response_model=list[ThreadRead])
def list_user_reposts(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    profile_user = session.get(User, user_id)
    reposter_name = profile_user.username if profile_user else "listener"

    reposts = session.exec(
        select(ThreadRepost).where(ThreadRepost.user_id == user_id).order_by(ThreadRepost.created_at.desc())
    ).all()

    threads = []
    for r in reposts:
        t = session.get(Thread, r.thread_id)
        if t:
            threads.append(
                _enrich_thread(
                    t,
                    session,
                    current_user,
                    is_repost=True,
                    reposted_by=reposter_name,
                    reposted_at=r.created_at,
                )
            )
    return threads

@router.get("/me/bookmarks", response_model=list[ThreadRead])
def list_my_bookmarks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    bookmarks = session.exec(
        select(ThreadBookmark).where(ThreadBookmark.user_id == current_user.id).order_by(ThreadBookmark.created_at.desc())
    ).all()

    threads = []
    for b in bookmarks:
        t = session.get(Thread, b.thread_id)
        if t:
            threads.append(_enrich_thread(t, session, current_user))
    return threads
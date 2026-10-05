from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.post import Post
from app.models.thread import Thread
from app.models.user import User
from app.schemas.post import PostCreate, PostRead, PostUpdate
from app.core.deps import get_current_user

router = APIRouter(prefix="/posts", tags=["posts"])

def _enrich_post(post: Post, session: Session) -> PostRead:
    author = session.get(User, post.user_id)
    author_name = author.username if author else f"audiphile_{post.user_id}"
    author_avatar_url = author.avatar_url if author else None
    author_bio = author.bio if author else None

    thread = session.get(Thread, post.thread_id)
    thread_title = thread.title if thread else None
    thread_author_user = session.get(User, thread.user_id) if thread else None
    thread_author = thread_author_user.username if thread_author_user else None

    return PostRead(
        id=post.id,
        thread_id=post.thread_id,
        user_id=post.user_id,
        body=post.body,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author_name=author_name,
        author_username=author_name,
        author_avatar_url=author_avatar_url,
        author_bio=author_bio,
        thread_title=thread_title,
        thread_author=thread_author,
    )

@router.patch("/{post_id}", response_model=PostRead)
def update_post(
    post_id: int,
    post_update: PostUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Reply not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this reply")

    if not post_update.body or not post_update.body.strip():
        raise HTTPException(status_code=400, detail="Reply content cannot be empty")

    post.body = post_update.body.strip()
    post.updated_at = datetime.utcnow()
    session.add(post)
    session.commit()
    session.refresh(post)
    return _enrich_post(post, session)

@router.post("/", response_model=PostRead)
def create_post(
    post_in: PostCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    post = Post(
        thread_id=post_in.thread_id,
        user_id=current_user.id,
        body=post_in.body,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return _enrich_post(post, session)

@router.get("/", response_model=list[PostRead])
def list_posts(
    thread_id: int | None = None,
    user_id: int | None = None,
    session: Session = Depends(get_session),
):
    query = select(Post)
    if thread_id is not None:
        query = query.where(Post.thread_id == thread_id)
    if user_id is not None:
        query = query.where(Post.user_id == user_id)

    query = query.order_by(Post.created_at.desc())
    posts = session.exec(query).all()
    return [_enrich_post(p, session) for p in posts]
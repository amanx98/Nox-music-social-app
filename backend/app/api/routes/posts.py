from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.post import Post
from app.models.thread import Thread
from app.models.user import User
from app.schemas.post import PostCreate, PostRead
from app.core.deps import get_current_user

router = APIRouter(prefix="/posts", tags=["posts"])

def _enrich_post(post: Post, session: Session) -> PostRead:
    author = session.get(User, post.user_id)
    author_name = author.username if author else f"audiphile_{post.user_id}"

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
        author_name=author_name,
        author_username=author_name,
        thread_title=thread_title,
        thread_author=thread_author,
    )

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
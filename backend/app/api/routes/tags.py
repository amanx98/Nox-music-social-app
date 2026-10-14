import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel import Session, select, func

from app.db.session import get_session
from app.models.tag import Tag
from app.models.user import User
from app.models.thread import Thread
from app.models.post import Post
from app.schemas.tag import TagCreate, TagRead, TagUpdate
from app.core.deps import get_current_user, get_optional_current_user

router = APIRouter(prefix="/tags", tags=["tags"])

BACKEND_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BACKEND_DIR / "static" / "uploads"
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
BANNER_DIR = os.path.join(UPLOAD_DIR, "banners")
os.makedirs(AVATAR_DIR, exist_ok=True)
os.makedirs(BANNER_DIR, exist_ok=True)

ALLOWED_IMG_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif", "svg"}

def _build_tag_read(
    tag: Tag,
    session: Session,
    current_user: Optional[User] = None,
    creator_user: Optional[User] = None,
    threads_count: Optional[int] = None,
    posts_count: Optional[int] = None,
) -> TagRead:
    # 1. Resolve Creator User
    if creator_user is None and tag.creator_id:
        creator_user = session.get(User, tag.creator_id)

    # 2. Resolve counts if not pre-aggregated
    if threads_count is None:
        threads_count = session.exec(
            select(func.count(Thread.id)).where(Thread.tag_id == tag.id)
        ).one() or 0

    if posts_count is None:
        thread_ids_query = select(Thread.id).where(Thread.tag_id == tag.id)
        posts_count = session.exec(
            select(func.count(Post.id)).where(Post.thread_id.in_(thread_ids_query))
        ).one() or 0

    # 3. Check ownership
    is_creator = False
    if current_user and hasattr(current_user, "id") and tag.creator_id and current_user.id == tag.creator_id:
        is_creator = True

    return TagRead(
        id=tag.id,
        name=tag.name,
        type=tag.type,
        creator_id=tag.creator_id,
        creator_username=creator_user.username if creator_user else None,
        creator_avatar_url=creator_user.avatar_url if creator_user else None,
        created_at=tag.created_at,
        banner_url=tag.banner_url,
        icon_url=tag.icon_url,
        description=tag.description,
        rules=tag.rules,
        theme_color=tag.theme_color or "#C7F43D",
        threads_count=threads_count,
        posts_count=posts_count,
        is_creator=is_creator,
    )

@router.get("/", response_model=list[TagRead])
def list_tags(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    tags = session.exec(select(Tag)).all()
    if not tags:
        return []

    tag_ids = [t.id for t in tags if t.id is not None]

    # Pre-aggregate thread counts per tag
    thread_counts_raw = session.exec(
        select(Thread.tag_id, func.count(Thread.id))
        .where(Thread.tag_id.in_(tag_ids))
        .group_by(Thread.tag_id)
    ).all()
    thread_counts = {tid: count for tid, count in thread_counts_raw}

    # Pre-aggregate post counts per tag (via threads)
    posts_counts_raw = session.exec(
        select(Thread.tag_id, func.count(Post.id))
        .join(Post, Post.thread_id == Thread.id)
        .where(Thread.tag_id.in_(tag_ids))
        .group_by(Thread.tag_id)
    ).all()
    posts_counts = {tid: count for tid, count in posts_counts_raw}

    # Pre-fetch creator users
    creator_ids = {t.creator_id for t in tags if t.creator_id}
    creators = {}
    if creator_ids:
        users = session.exec(select(User).where(User.id.in_(creator_ids))).all()
        creators = {u.id: u for u in users}

    results = []
    for tag in tags:
        results.append(_build_tag_read(
            tag=tag,
            session=session,
            current_user=current_user,
            creator_user=creators.get(tag.creator_id),
            threads_count=thread_counts.get(tag.id, 0),
            posts_count=posts_counts.get(tag.id, 0),
        ))
    return results

@router.get("/{name_or_id}", response_model=TagRead)
def get_tag_detail(
    name_or_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    tag = None
    if name_or_id.isdigit():
        tag = session.get(Tag, int(name_or_id))

    if not tag:
        clean_name = name_or_id.strip().lstrip("#").lower()
        tag = session.exec(
            select(Tag).where(func.lower(Tag.name) == clean_name)
        ).first()

    if not tag:
        raise HTTPException(status_code=404, detail=f"Community '{name_or_id}' not found")

    return _build_tag_read(tag, session, current_user)

@router.post("/", response_model=TagRead)
def create_tag(
    tag_in: TagCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    clean_name = tag_in.name.strip().lstrip("#")
    if not clean_name:
        raise HTTPException(status_code=400, detail="Community name cannot be empty")

    existing = session.exec(
        select(Tag).where(func.lower(Tag.name) == clean_name.lower())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Community '#{clean_name}' already exists")

    tag = Tag(
        name=clean_name,
        type=tag_in.type or "genre",
        creator_id=current_user.id,
        created_at=datetime.utcnow(),
        description=tag_in.description.strip() if tag_in.description else None,
        rules=tag_in.rules.strip() if tag_in.rules else None,
        theme_color=tag_in.theme_color or "#C7F43D",
        banner_url=tag_in.banner_url,
        icon_url=tag_in.icon_url,
    )
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return _build_tag_read(tag, session, current_user, creator_user=current_user)

@router.patch("/{tag_id}", response_model=TagRead)
def update_tag(
    tag_id: int,
    tag_update: TagUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Community not found")

    # If tag had no creator (legacy tag), allow current user to claim founding ownership
    if tag.creator_id is None:
        tag.creator_id = current_user.id
    elif tag.creator_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only the founder / creator of this community can customize its settings and appearance."
        )

    if tag_update.name is not None and tag_update.name.strip():
        new_name = tag_update.name.strip().lstrip("#")
        existing = session.exec(
            select(Tag).where(func.lower(Tag.name) == new_name.lower(), Tag.id != tag_id)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Community '#{new_name}' already exists")
        tag.name = new_name

    if tag_update.type is not None:
        tag.type = tag_update.type.strip()
    if tag_update.description is not None:
        tag.description = tag_update.description.strip() if tag_update.description.strip() else None
    if tag_update.rules is not None:
        tag.rules = tag_update.rules.strip() if tag_update.rules.strip() else None
    if tag_update.theme_color is not None:
        tag.theme_color = tag_update.theme_color.strip() if tag_update.theme_color.strip() else "#C7F43D"
    if tag_update.banner_url is not None:
        tag.banner_url = tag_update.banner_url.strip() if tag_update.banner_url.strip() else None
    if tag_update.icon_url is not None:
        tag.icon_url = tag_update.icon_url.strip() if tag_update.icon_url.strip() else None

    session.add(tag)
    session.commit()
    session.refresh(tag)
    return _build_tag_read(tag, session, current_user)

@router.post("/{tag_id}/banner", response_model=TagRead)
async def upload_tag_banner(
    tag_id: int,
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Community not found")

    if tag.creator_id is None:
        tag.creator_id = current_user.id
    elif tag.creator_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only the founder / creator of this community can customize its banner."
        )

    if file and file.filename:
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        if ext not in ALLOWED_IMG_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Unsupported image format. Allowed: JPG, PNG, WEBP, GIF, SVG.")

        max_banner_size = 10 * 1024 * 1024  # 10MB
        filename = f"community_banner_t{tag.id}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"
        filepath = os.path.join(BANNER_DIR, filename)

        total_bytes = 0
        try:
            with open(filepath, "wb") as f:
                while chunk := await file.read(64 * 1024):
                    total_bytes += len(chunk)
                    if total_bytes > max_banner_size:
                        f.close()
                        if os.path.exists(filepath):
                            os.remove(filepath)
                        raise HTTPException(status_code=413, detail="Banner exceeds 10MB size limit.")
                    f.write(chunk)
        except HTTPException:
            raise
        except Exception:
            if os.path.exists(filepath):
                os.remove(filepath)
            raise HTTPException(status_code=500, detail="Failed to save banner image.")

        tag.banner_url = f"/static/uploads/banners/{filename}"
    elif image_url is not None:
        clean_url = image_url.strip()
        tag.banner_url = clean_url if clean_url else None
    else:
        tag.banner_url = None

    session.add(tag)
    session.commit()
    session.refresh(tag)
    return _build_tag_read(tag, session, current_user)

@router.post("/{tag_id}/icon", response_model=TagRead)
async def upload_tag_icon(
    tag_id: int,
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Community not found")

    if tag.creator_id is None:
        tag.creator_id = current_user.id
    elif tag.creator_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only the founder / creator of this community can customize its icon."
        )

    if file and file.filename:
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        if ext not in ALLOWED_IMG_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Unsupported image format. Allowed: JPG, PNG, WEBP, GIF, SVG.")

        max_icon_size = 5 * 1024 * 1024  # 5MB
        filename = f"community_icon_t{tag.id}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"
        filepath = os.path.join(AVATAR_DIR, filename)

        total_bytes = 0
        try:
            with open(filepath, "wb") as f:
                while chunk := await file.read(64 * 1024):
                    total_bytes += len(chunk)
                    if total_bytes > max_icon_size:
                        f.close()
                        if os.path.exists(filepath):
                            os.remove(filepath)
                        raise HTTPException(status_code=413, detail="Icon exceeds 5MB size limit.")
                    f.write(chunk)
        except HTTPException:
            raise
        except Exception:
            if os.path.exists(filepath):
                os.remove(filepath)
            raise HTTPException(status_code=500, detail="Failed to save community icon.")

        tag.icon_url = f"/static/uploads/avatars/{filename}"
    elif image_url is not None:
        clean_url = image_url.strip()
        tag.icon_url = clean_url if clean_url else None
    else:
        tag.icon_url = None

    session.add(tag)
    session.commit()
    session.refresh(tag)
    return _build_tag_read(tag, session, current_user)
import os
import uuid
import re
import json
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models.thread import Thread
from app.models.post import Post
from app.models.tag import Tag
from app.models.user import User
from app.models.social import ThreadLike, ThreadRepost, ThreadBookmark
from app.schemas.thread import ThreadCreate, ThreadRead, ThreadUpdate
from app.core.deps import get_current_user, get_optional_current_user

router = APIRouter(prefix="/threads", tags=["threads"])

BACKEND_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BACKEND_DIR / "static" / "uploads"
THREAD_MEDIA_DIR = os.path.join(UPLOAD_DIR, "threads")
os.makedirs(THREAD_MEDIA_DIR, exist_ok=True)

ALLOWED_MEDIA_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".webp", ".svg"},
    "gif": {".gif"},
    "video": {".mp4", ".webm", ".mov"},
}

STOPWORDS = {
    'fav', 'favorite', 'favourites', 'favourite', 'album', 'albums', 'ep', 'lp', 'project', 'projects',
    'song', 'songs', 'track', 'tracks', 'record', 'records', 'discography', 'discog',
    'what', 'whats', "what's", 'is', 'are', 'your', 'the', 'a', 'an', 'of', 'on', 'in', 'for', 'to',
    'with', 'and', 'or', 'by', 'at', 'about', 'from', 'as', 'how', 'why', 'who', 'when',
    'think', 'thinks', 'thought', 'thoughts', 'opinion', 'opinions', 'take', 'takes', 'best', 'worst',
    'better', 'ranking', 'rankings', 'ranked', 'rate', 'listen', 'listened', 'listening', 'imo', 'imho',
    'drop', 'dropped', 'release', 'released', 'new', 'classic', 'classics', 'underrated', 'overrated',
    'goat', 'discussion', 'discuss', 'review', 'reviews', 'recommendation', 'recommendations',
    'sound', 'built', 'modern', 'music', 'anyone', 'any', 'my', 'me', 'i', 'you', 'we', 'they', 'it',
    'timeless', 'masterpiece', 'incredible', 'amazing', 'great', 'mid', 'trash', 'fire',
    'bus', 'london', 'night', 'south', 'years', 'later'
}

def _extract_music_candidates(text: str, tag: Optional[str] = None) -> list[str]:
    candidates = []
    clean = re.sub(r'\[.*?\]', '', text or '').strip()
    if not clean:
        return [tag] if tag else []

    # 1. Any quoted text e.g. "Pray for Haiti", 'In Rainbows'
    quotes = re.findall(r'["\'`“]([^"\'`“”]{2,40})["\'`”]', clean)
    candidates.extend([q.strip() for q in quotes if q.strip()])

    # 2. Before / after hyphen or colon (e.g. "Kendrick Lamar - GNX" or "Burial: Untrue")
    parts = re.split(r'[-—:]', clean)
    if len(parts) > 1:
        first_part = parts[0].strip()
        second_part = parts[1].strip()
        if 2 <= len(first_part) <= 40:
            candidates.append(first_part)
        if 2 <= len(second_part) <= 40:
            candidates.append(second_part)
        if 4 <= len(first_part) + len(second_part) <= 60:
            candidates.append(f"{first_part} {second_part}")

    # 3. Capitalized or all-caps music names (e.g. 'Radiohead In Rainbows', 'MIKE', 'Earl Sweatshirt')
    caps_matches = re.findall(r'\b(?:[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*|[A-Z0-9]{2,})\b', clean)
    for c in caps_matches:
        c_clean = c.strip()
        if c_clean.lower() not in STOPWORDS and len(c_clean) >= 2 and c_clean not in candidates:
            candidates.append(c_clean)

    # 4. Words filtering out stopwords
    words = re.findall(r'[A-Za-z0-9]+', clean)
    filtered = [w for w in words if w.lower() not in STOPWORDS]
    if filtered:
        joined_salient = " ".join(filtered[:3])
        if joined_salient not in candidates:
            candidates.append(joined_salient)

    if tag and tag not in candidates:
        candidates.append(tag)

    return candidates

def _lookup_music_art(query: str) -> Optional[dict]:
    if not query or len(query.strip()) < 2:
        return None
    enc = urllib.parse.quote(query.strip())
    
    # 1. Deezer General Search (track/album with 30s preview)
    try:
        url = f"https://api.deezer.com/search?q={enc}&limit=5"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as res:
            data = json.loads(res.read().decode())
            items = data.get("data", [])
            # Check for exact artist match first
            for item in items:
                art_name = item.get("artist", {}).get("name", "").lower()
                if art_name == query.lower():
                    art = (
                        item.get("album", {}).get("cover_xl")
                        or item.get("album", {}).get("cover_big")
                        or item.get("album", {}).get("cover_medium")
                    )
                    if art:
                        return {
                            "artwork_url": art,
                            "artist": item.get("artist", {}).get("name"),
                            "title": item.get("title"),
                            "album": item.get("album", {}).get("title"),
                            "preview_url": item.get("preview"),
                            "source": "deezer_exact"
                        }
            if items:
                first = items[0]
                art = (
                    first.get("album", {}).get("cover_xl")
                    or first.get("album", {}).get("cover_big")
                    or first.get("album", {}).get("cover_medium")
                )
                if art:
                    return {
                        "artwork_url": art,
                        "artist": first.get("artist", {}).get("name"),
                        "title": first.get("title"),
                        "album": first.get("album", {}).get("title"),
                        "preview_url": first.get("preview"),
                        "source": "deezer"
                    }
    except Exception:
        pass

    # 2. Deezer Album Search
    try:
        url = f"https://api.deezer.com/search/album?q={enc}&limit=5"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as res:
            data = json.loads(res.read().decode())
            items = data.get("data", [])
            for item in items:
                art_name = item.get("artist", {}).get("name", "").lower()
                if art_name == query.lower():
                    art = item.get("cover_xl") or item.get("cover_big") or item.get("cover_medium")
                    if art:
                        return {
                            "artwork_url": art,
                            "artist": item.get("artist", {}).get("name"),
                            "title": item.get("title"),
                            "album": item.get("title"),
                            "preview_url": None,
                            "source": "deezer_album_exact"
                        }
            if items:
                first = items[0]
                art = first.get("cover_xl") or first.get("cover_big") or first.get("cover_medium")
                if art:
                    return {
                        "artwork_url": art,
                        "artist": first.get("artist", {}).get("name"),
                        "title": first.get("title"),
                        "album": first.get("title"),
                        "preview_url": None,
                        "source": "deezer_album"
                    }
    except Exception:
        pass

    # 3. Deezer Artist Search (Artist portrait photography)
    try:
        url = f"https://api.deezer.com/search/artist?q={enc}&limit=5"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as res:
            data = json.loads(res.read().decode())
            items = data.get("data", [])
            for item in items:
                art_name = item.get("name", "").lower()
                if art_name == query.lower():
                    pic = item.get("picture_xl") or item.get("picture_big") or item.get("picture_medium")
                    if pic:
                        return {
                            "artwork_url": pic,
                            "artist": item.get("name"),
                            "title": item.get("name"),
                            "album": None,
                            "preview_url": None,
                            "source": "deezer_artist_exact"
                        }
            if items:
                first = items[0]
                pic = first.get("picture_xl") or first.get("picture_big") or first.get("picture_medium")
                if pic:
                    return {
                        "artwork_url": pic,
                        "artist": first.get("name"),
                        "title": first.get("name"),
                        "album": None,
                        "preview_url": None,
                        "source": "deezer_artist"
                    }
    except Exception:
        pass

    # 4. iTunes Search Fallback
    try:
        url = f"https://itunes.apple.com/search?term={enc}&entity=album&limit=2"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as res:
            data = json.loads(res.read().decode())
            results = data.get("results", [])
            if results:
                first = results[0]
                art = first.get("artworkUrl100", "").replace("100x100bb", "600x600bb")
                if art:
                    return {
                        "artwork_url": art,
                        "artist": first.get("artistName"),
                        "title": first.get("collectionName"),
                        "album": first.get("collectionName"),
                        "preview_url": None,
                        "source": "itunes"
                    }
    except Exception:
        pass

    return None

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
    author_avatar_url = author.avatar_url if author else None
    
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
        image_url=thread.image_url,
        media_type=thread.media_type,
        created_at=thread.created_at,
        author_name=author_name,
        author_username=author_name,
        author_avatar_url=author_avatar_url,
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
        updated_at=thread.updated_at,
    )

@router.post("/upload-media")
def upload_thread_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    media_type = None
    for m_type, extensions in ALLOWED_MEDIA_EXTENSIONS.items():
        if ext in extensions:
            media_type = m_type
            break

    if not media_type:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported media format '{ext}'. Allowed formats: images (.jpg, .png, .webp, .svg), gifs (.gif), and videos (.mp4, .webm, .mov)"
        )

    safe_name = os.path.basename(file.filename or "media").replace(" ", "_")
    filename = f"{uuid.uuid4().hex}_{safe_name}"
    filepath = os.path.join(THREAD_MEDIA_DIR, filename)

    with open(filepath, "wb") as buffer:
        buffer.write(file.file.read())

    return {
        "url": f"/static/uploads/threads/{filename}",
        "media_type": media_type,
        "filename": file.filename,
    }

@router.get("/resolve-music-art")
def resolve_music_art(
    text: str = "",
    tag: Optional[str] = None,
):
    candidates = _extract_music_candidates(text, tag)
    for cand in candidates:
        art_data = _lookup_music_art(cand)
        if art_data and art_data.get("artwork_url"):
            return art_data

    if tag:
        art_data = _lookup_music_art(tag)
        if art_data and art_data.get("artwork_url"):
            return art_data

    return {
        "artwork_url": "/assets/editorial/vinyl-desk.svg",
        "artist": None,
        "title": None,
        "album": None,
        "preview_url": None,
        "source": "fallback"
    }

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
        image_url=thread_in.image_url,
        media_type=thread_in.media_type,
    )
    session.add(thread)
    session.commit()
    session.refresh(thread)
    return _enrich_thread(thread, session, current_user)

@router.patch("/{thread_id}", response_model=ThreadRead)
def update_thread(
    thread_id: int,
    thread_update: ThreadUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    thread = session.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")

    if thread_update.title is not None and thread_update.title.strip():
        thread.title = thread_update.title.strip()
    if thread_update.body is not None and thread_update.body.strip():
        thread.body = thread_update.body.strip()
    if thread_update.image_url is not None:
        thread.image_url = thread_update.image_url if thread_update.image_url.strip() else None
    if thread_update.media_type is not None:
        thread.media_type = thread_update.media_type if thread_update.media_type.strip() else None
    if thread_update.tag_id is not None:
        thread.tag_id = thread_update.tag_id

    thread.updated_at = datetime.utcnow()
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
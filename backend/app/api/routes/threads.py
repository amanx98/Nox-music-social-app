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
from sqlmodel import Session, select, func, delete
from app.db.session import get_session
from app.models.thread import Thread
from app.models.post import Post
from app.models.tag import Tag
from app.models.user import User
from app.models.social import ThreadLike, ThreadRepost, ThreadBookmark
from app.schemas.thread import ThreadCreate, ThreadRead, ThreadUpdate
from app.core.deps import get_current_user, get_optional_current_user
from app.core.http import get_async_client

router = APIRouter(prefix="/threads", tags=["threads"])

BACKEND_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BACKEND_DIR / "static" / "uploads"
THREAD_MEDIA_DIR = os.path.join(UPLOAD_DIR, "threads")
os.makedirs(THREAD_MEDIA_DIR, exist_ok=True)

ALLOWED_MEDIA_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".webp"},
    "gif": {".gif"},
    "video": {".mp4", ".webm", ".mov"},
}

COMMON_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
    'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'of',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'morning', 'night', 'coffee',
    'outside', 'rain', 'rains', 'raining', 'day', 'days', 'life', 'good', 'bad', 'great', 'love', 'hate', 'think', 'thought',
    'really', 'taste', 'tastes', 'today', 'tomorrow', 'yesterday', 'people', 'person', 'time', 'times', 'feel', 'feeling',
    'look', 'looks', 'looking', 'see', 'seeing', 'make', 'makes', 'making', 'get', 'gets', 'getting', 'go', 'going',
    'come', 'coming', 'tell', 'telling', 'ask', 'asking', 'work', 'works', 'working', 'seem', 'seems', 'trying', 'try',
    'much', 'many', 'lot', 'lots', 'thing', 'things', 'post', 'thread', 'posts', 'threads', 'comment', 'comments'
}

STOP_VERBS = {
    'is', 'was', 'are', 'were', 'has', 'have', 'had', 'will', 'would', 'could', 'should', 'can', 'on', 'in', 'at',
    'with', 'for', 'about', 'from', 'to', 'and', 'or', 'but', 'all', 'still', 'one', 'of', 'the'
}

MUSIC_INDICATORS = {
    'album', 'albums', 'track', 'tracks', 'song', 'songs', 'record', 'records', 'ep', 'lp', 'vinyl', 'discography',
    'discog', 'producer', 'produced', 'listen', 'listened', 'listening', 'soundtrack', 'sample', 'sampled', 'bass',
    'vocals', 'sound', 'dubstep', 'ambient', 'rock', 'hiphop', 'rap', 'jazz', 'metal', 'electronic', 'synth', 'drums',
    'guitar', 'singer', 'artist', 'band', 'tunes', 'vibes', 'release', 'released', 'single', 'banger', 'masterpiece',
    'underrated', 'overrated', 'drop', 'dropped', 'playing', 'melody', 'riff', 'beat', 'beats', 'cover', 'covers', 'genre',
    'musician', 'chords', 'lyrics', 'flow', 'bars', 'feature', 'feat', 'ft'
}

def _clean_phrase(phrase: str) -> str:
    words = phrase.strip('\"\'` ,.-—:').split()
    clean_words = []
    for w in words:
        if clean_words and w.lower() in STOP_VERBS:
            break
        clean_words.append(w)
    return ' '.join(clean_words).strip('\"\'` ,.-—:')

def _extract_considerate_candidates(text: str, tag: Optional[str] = None) -> list[dict]:
    candidates = []
    clean = re.sub(r'\[.*?\]', '', text or '').strip()

    # 0. Explicit Track Reference (e.g. from Composer [TRACK] mode)
    ref_match = re.search(r'Track Reference:\s*([^\n\r]+)', text, re.IGNORECASE)
    if ref_match:
        candidates.append({'query': ref_match.group(1).strip(), 'tier': 'explicit_ref', 'weight': 100})

    # 1. Pattern: <Title> by <Artist>
    by_matches = re.finditer(r'([\"\'\w\s]{2,30}?)\s+by\s+([A-Z][a-zA-Z0-9\s\.\,\']{1,30})', clean, re.IGNORECASE)
    for m in by_matches:
        tit = _clean_phrase(m.group(1))
        art = _clean_phrase(m.group(2))
        if len(tit) >= 2 and len(art) >= 2 and art.lower() not in COMMON_WORDS:
            candidates.append({
                'query': f'{art} {tit}',
                'artist_hint': art,
                'title_hint': tit,
                'tier': 'pattern_by',
                'weight': 95
            })

    # 2. Pattern: <Artist>'s <Title> or <Artist>'s new album <Title>
    possessive = re.finditer(r'([A-Z][a-zA-Z0-9\s]{1,25})\'s\s+(?:new\s+)?(?:album|track|song|record|lp|ep)?\s*([\"\'\w\s]{2,25})?', clean)
    for m in possessive:
        art = _clean_phrase(m.group(1))
        tit = _clean_phrase(m.group(2) or '')
        if len(art) >= 2 and art.lower() not in COMMON_WORDS:
            q = f'{art} {tit}'.strip() if tit else art
            candidates.append({
                'query': q,
                'artist_hint': art,
                'title_hint': tit,
                'tier': 'pattern_possessive',
                'weight': 90
            })

    # 3. Pattern: <Artist> [-—:] <Title>
    dash_matches = re.finditer(r'([A-Z0-9][a-zA-Z0-9\s\.\,\']{1,25})\s*[-—:]\s*([A-Za-z0-9\s\.\,\']{2,25})', clean)
    for m in dash_matches:
        p1 = _clean_phrase(m.group(1))
        p2 = _clean_phrase(m.group(2))
        if len(p1) >= 2 and len(p2) >= 2 and p1.lower() not in COMMON_WORDS and p2.lower() not in COMMON_WORDS:
            candidates.append({
                'query': f'{p1} {p2}',
                'artist_hint': p1,
                'title_hint': p2,
                'tier': 'pattern_dash',
                'weight': 90
            })

    # 4. Phrases like: album <Title>, song <Title>, listening to <Artist/Album>
    context_matches = re.finditer(r'(?:listening to|album|track|song|record)\s+([A-Z][a-zA-Z0-9\s\.\,\']{2,30})', clean, re.IGNORECASE)
    for m in context_matches:
        phr = _clean_phrase(m.group(1))
        if len(phr) >= 2 and phr.lower() not in COMMON_WORDS:
            candidates.append({
                'query': phr,
                'tier': 'music_phrase',
                'weight': 82
            })

    # 5. Quoted phrases
    quotes = re.findall(r'[\"\'`“]([^\"\'`“”]{2,30})[\"\'`”]', clean)
    for q in quotes:
        clean_q = _clean_phrase(q)
        if clean_q.lower() not in COMMON_WORDS and len(clean_q) >= 2:
            candidates.append({
                'query': clean_q,
                'title_hint': clean_q,
                'tier': 'quoted',
                'weight': 78
            })

    # 6. Multi-word capitalized names (e.g. Radiohead In Rainbows, Boards of Canada, Frank Ocean)
    caps = re.findall(r'\b[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)+\b', clean)
    for c in caps:
        clean_c = _clean_phrase(c)
        words = clean_c.lower().split()
        if len(words) >= 2 and not all(w in COMMON_WORDS for w in words):
            candidates.append({
                'query': clean_c,
                'tier': 'capitalized_multi',
                'weight': 72
            })

    # 7. Single capitalized names ONLY if the post has music context
    has_music_context = any(w.lower() in MUSIC_INDICATORS for w in re.findall(r'[a-zA-Z]+', clean))
    if has_music_context:
        singles = re.findall(r'\b[A-Z][a-zA-Z0-9]{2,}\b', clean)
        for s in singles:
            if s.lower() not in COMMON_WORDS and len(s) >= 3:
                candidates.append({
                    'query': s,
                    'artist_hint': s,
                    'tier': 'capitalized_single_context',
                    'weight': 60
                })

    # 8. Tag synergy (if artist tag or specific topic)
    if tag and tag.lower() not in COMMON_WORDS:
        candidates.append({
            'query': tag,
            'artist_hint': tag,
            'tier': 'tag',
            'weight': 50
        })

    # Deduplicate while preserving highest weight
    seen = {}
    for c in candidates:
        norm = c['query'].lower()
        if norm not in seen or c['weight'] > seen[norm]['weight']:
            seen[norm] = c

    # Sort descending by weight
    return sorted(seen.values(), key=lambda x: x['weight'], reverse=True)

def _score_music_match(candidate: dict, item: dict, original_text: str) -> tuple[int, list[str]]:
    text_lower = original_text.lower()
    artist_name = (item.get('artist', {}).get('name') or '').lower()
    track_title = (item.get('title') or '').lower()
    album_title = (item.get('album', {}).get('title') or '').lower()
    rank = item.get('rank') or 0

    score = 0
    reasons = []

    # 1. Artist matching
    art_hint = (candidate.get('artist_hint') or '').lower()
    if art_hint and (art_hint in artist_name or artist_name in art_hint):
        score += 45
        reasons.append(f"artist_hint_matched ({artist_name})")
    elif artist_name and len(artist_name) >= 3 and artist_name in text_lower:
        score += 35
        reasons.append(f"artist_in_text ({artist_name})")

    # 2. Title / Album matching
    tit_hint = (candidate.get('title_hint') or '').lower()
    if tit_hint and (tit_hint in track_title or tit_hint in album_title):
        score += 40
        reasons.append(f"title_hint_matched ({tit_hint})")
    elif track_title and len(track_title) >= 3 and track_title in text_lower:
        score += 30
        reasons.append(f"track_in_text ({track_title})")
    elif album_title and len(album_title) >= 3 and album_title in text_lower:
        score += 30
        reasons.append(f"album_in_text ({album_title})")

    # 3. Candidate weight contribution
    score += int(candidate.get('weight', 50) * 0.2)

    # 4. Popularity / Rank confidence
    if rank > 200000:
        score += 10
        reasons.append("high_rank")
    elif rank > 50000:
        score += 5

    # 5. Penalties for false positives
    # If NEITHER artist nor title is anywhere in the original text, penalize heavily
    found_any = (artist_name and artist_name in text_lower) or (track_title and track_title in text_lower) or (album_title and album_title in text_lower)
    if not found_any:
        score -= 60
        reasons.append("neither_artist_nor_title_in_text_penalty")

    # If candidate is just a single common word
    if candidate['query'].lower() in COMMON_WORDS:
        score -= 50
        reasons.append("common_word_penalty")

    return score, reasons

async def _lookup_considerate_music(candidate: dict, original_text: str, client) -> Optional[dict]:
    query = candidate.get('query', '').strip()
    if not query or len(query) < 2:
        return None
    enc = urllib.parse.quote(query)

    best_match = None
    best_score = 0

    # 1. Deezer General Search (Tracks & Albums with preview)
    try:
        url = f"https://api.deezer.com/search?q={enc}&limit=5"
        res = await client.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=3.0)
        if res.status_code == 200:
            data = res.json()
            items = data.get("data", [])
            for item in items:
                art = (
                    item.get("album", {}).get("cover_xl")
                    or item.get("album", {}).get("cover_big")
                    or item.get("album", {}).get("cover_medium")
                )
                if not art:
                    continue
                sc, reasons = _score_music_match(candidate, item, original_text)
                if sc > best_score:
                    best_score = sc
                    best_match = {
                        "artwork_url": art,
                        "artist": item.get("artist", {}).get("name"),
                        "title": item.get("title"),
                        "album": item.get("album", {}).get("title"),
                        "preview_url": item.get("preview"),
                        "source": "deezer_track",
                        "score": sc,
                        "reasons": reasons
                    }
    except Exception:
        pass

    # 2. Deezer Album Search if score is not high
    if best_score < 75:
        try:
            url = f"https://api.deezer.com/search/album?q={enc}&limit=4"
            res = await client.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=3.0)
            if res.status_code == 200:
                data = res.json()
                items = data.get("data", [])
                for item in items:
                    art = item.get("cover_xl") or item.get("cover_big") or item.get("cover_medium")
                    if not art:
                        continue
                    dummy_item = {
                        "artist": item.get("artist", {}),
                        "title": item.get("title"),
                        "album": {"title": item.get("title")},
                        "rank": 100000
                    }
                    sc, reasons = _score_music_match(candidate, dummy_item, original_text)
                    if sc > best_score:
                        best_score = sc
                        best_match = {
                            "artwork_url": art,
                            "artist": item.get("artist", {}).get("name"),
                            "title": item.get("title"),
                            "album": item.get("title"),
                            "preview_url": None,
                            "source": "deezer_album",
                            "score": sc,
                            "reasons": reasons
                        }
        except Exception:
            pass

    # 3. iTunes Search Fallback
    if best_score < 65:
        try:
            url = f"https://itunes.apple.com/search?term={enc}&entity=album&limit=2"
            res = await client.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=3.0)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results", [])
                if results:
                    first = results[0]
                    art = first.get("artworkUrl100", "").replace("100x100bb", "600x600bb")
                    if art:
                        dummy_item = {
                            "artist": {"name": first.get("artistName")},
                            "title": first.get("collectionName"),
                            "album": {"title": first.get("collectionName")},
                            "rank": 80000
                        }
                        sc, reasons = _score_music_match(candidate, dummy_item, original_text)
                        if sc > best_score:
                            best_score = sc
                            best_match = {
                                "artwork_url": art,
                                "artist": first.get("artistName"),
                                "title": first.get("collectionName"),
                                "album": first.get("collectionName"),
                                "preview_url": None,
                                "source": "itunes",
                                "score": sc,
                                "reasons": reasons
                            }
        except Exception:
            pass

    # Accept only if confidence meets considerate threshold
    if best_match and best_score >= 60:
        return best_match
    return None

def _enrich_threads_batch(
    threads: list[Thread],
    session: Session,
    current_user: Optional[User] = None,
    repost_meta: Optional[dict[int, dict]] = None,
) -> list[ThreadRead]:
    if not threads:
        return []

    thread_ids = [t.id for t in threads if t.id is not None]
    user_ids = {t.user_id for t in threads if t.user_id is not None}
    tag_ids = {t.tag_id for t in threads if t.tag_id is not None}

    users = {u.id: u for u in session.exec(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    tags = {t.id: t for t in session.exec(select(Tag).where(Tag.id.in_(tag_ids))).all()} if tag_ids else {}

    post_counts = dict(session.exec(
        select(Post.thread_id, func.count(Post.id)).where(Post.thread_id.in_(thread_ids)).group_by(Post.thread_id)
    ).all()) if thread_ids else {}

    likes_counts = dict(session.exec(
        select(ThreadLike.thread_id, func.count(ThreadLike.id)).where(ThreadLike.thread_id.in_(thread_ids)).group_by(ThreadLike.thread_id)
    ).all()) if thread_ids else {}

    reposts_counts = dict(session.exec(
        select(ThreadRepost.thread_id, func.count(ThreadRepost.id)).where(ThreadRepost.thread_id.in_(thread_ids)).group_by(ThreadRepost.thread_id)
    ).all()) if thread_ids else {}

    user_likes = set()
    user_reposts = set()
    user_bookmarks = set()
    if current_user and thread_ids:
        user_likes = set(session.exec(
            select(ThreadLike.thread_id).where(ThreadLike.thread_id.in_(thread_ids), ThreadLike.user_id == current_user.id)
        ).all())
        user_reposts = set(session.exec(
            select(ThreadRepost.thread_id).where(ThreadRepost.thread_id.in_(thread_ids), ThreadRepost.user_id == current_user.id)
        ).all())
        user_bookmarks = set(session.exec(
            select(ThreadBookmark.thread_id).where(ThreadBookmark.thread_id.in_(thread_ids), ThreadBookmark.user_id == current_user.id)
        ).all())

    results = []
    for thread in threads:
        author = users.get(thread.user_id)
        author_name = author.username if author else f"audiphile_{thread.user_id}"
        tag = tags.get(thread.tag_id) if thread.tag_id else None

        meta = (repost_meta or {}).get(thread.id, {})
        is_repost = meta.get("is_repost", False)
        reposted_by = meta.get("reposted_by", None)
        reposted_at = meta.get("reposted_at", None)

        results.append(ThreadRead(
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
            author_avatar_url=author.avatar_url if author else None,
            author_bio=author.bio if author else None,
            tag_name=tag.name if tag else None,
            tag_type=tag.type if tag else None,
            likes_count=likes_counts.get(thread.id, 0),
            reposts_count=reposts_counts.get(thread.id, 0),
            post_count=post_counts.get(thread.id, 0),
            is_liked=thread.id in user_likes,
            is_reposted=thread.id in user_reposts,
            is_bookmarked=thread.id in user_bookmarks,
            is_repost=is_repost,
            reposted_by=reposted_by,
            reposted_at=reposted_at,
            updated_at=thread.updated_at,
        ))
    return results

def _enrich_thread(
    thread: Thread,
    session: Session,
    current_user: Optional[User] = None,
    is_repost: bool = False,
    reposted_by: Optional[str] = None,
    reposted_at: Optional[datetime] = None,
) -> ThreadRead:
    meta = {thread.id: {"is_repost": is_repost, "reposted_by": reposted_by, "reposted_at": reposted_at}} if thread.id else None
    enriched = _enrich_threads_batch([thread], session, current_user, repost_meta=meta)
    return enriched[0]

@router.post("/upload-media")
async def upload_thread_media(
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
            detail=f"Unsupported media format '{ext}'. Allowed formats: images (.jpg, .png, .webp), gifs (.gif), and videos (.mp4, .webm, .mov)"
        )

    # Size limits: 15MB for images/gifs, 50MB for videos
    max_size = 50 * 1024 * 1024 if media_type == "video" else 15 * 1024 * 1024
    max_mb = 50 if media_type == "video" else 15

    safe_name = os.path.basename(file.filename or "media").replace(" ", "_")
    filename = f"{uuid.uuid4().hex}_{safe_name}"
    filepath = os.path.join(THREAD_MEDIA_DIR, filename)

    total_bytes = 0
    try:
        with open(filepath, "wb") as buffer:
            while chunk := await file.read(64 * 1024):  # 64KB chunks
                total_bytes += len(chunk)
                if total_bytes > max_size:
                    buffer.close()
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {max_mb}MB"
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail="Failed to save uploaded media")

    return {
        "url": f"/static/uploads/threads/{filename}",
        "media_type": media_type,
        "filename": file.filename,
    }

@router.get("/resolve-music-art")
async def resolve_music_art(
    text: str = "",
    tag: Optional[str] = None,
):
    candidates = _extract_considerate_candidates(text, tag)
    best_result = None
    best_score = 0

    async with get_async_client() as client:
        for cand in candidates[:5]:
            result = await _lookup_considerate_music(cand, text, client)
            if result and result.get("score", 0) > best_score:
                best_score = result["score"]
                best_result = result
                if best_score >= 85:
                    break

    if best_result and best_score >= 60:
        return best_result

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

@router.get("/{thread_id}", response_model=ThreadRead)
def get_thread(
    thread_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    thread = session.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return _enrich_thread(thread, session, current_user)

@router.delete("/{thread_id}")
def delete_thread(
    thread_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    thread = session.get(Thread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this thread")

    # Clean up associated interactions and posts
    session.exec(delete(ThreadLike).where(ThreadLike.thread_id == thread_id))
    session.exec(delete(ThreadRepost).where(ThreadRepost.thread_id == thread_id))
    session.exec(delete(ThreadBookmark).where(ThreadBookmark.thread_id == thread_id))
    session.exec(delete(Post).where(Post.thread_id == thread_id))
    session.delete(thread)
    session.commit()
    return {"ok": True, "deleted_id": thread_id}

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
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    limit = min(max(1, limit), 100)
    offset = max(0, offset)

    # If filtering by a specific user profile and including retweets in the timeline
    if user_id is not None and include_reposts:
        profile_user = session.get(User, user_id)
        reposter_name = profile_user.username if profile_user else "listener"

        orig_threads = session.exec(
            select(Thread).where(Thread.user_id == user_id)
        ).all()

        reposts = session.exec(
            select(ThreadRepost).where(ThreadRepost.user_id == user_id).order_by(ThreadRepost.created_at.desc())
        ).all()
        repost_thread_ids = [r.thread_id for r in reposts]
        repost_threads_map = {
            t.id: t for t in session.exec(select(Thread).where(Thread.id.in_(repost_thread_ids))).all()
        } if repost_thread_ids else {}

        timeline_items = []
        for t in orig_threads:
            timeline_items.append((t.created_at, t, False, None, None))

        for r in reposts:
            orig_t = repost_threads_map.get(r.thread_id)
            if orig_t:
                timeline_items.append((r.created_at, orig_t, True, reposter_name, r.created_at))

        timeline_items.sort(key=lambda x: x[0], reverse=True)
        paged_items = timeline_items[offset : offset + limit]

        repost_meta = {
            item[1].id: {
                "is_repost": item[2],
                "reposted_by": item[3],
                "reposted_at": item[4]
            }
            for item in paged_items if item[2]
        }

        return _enrich_threads_batch([item[1] for item in paged_items], session, current_user, repost_meta=repost_meta)

    query = select(Thread)
    if tag_id:
        query = query.where(Thread.tag_id == tag_id)
    if user_id:
        query = query.where(Thread.user_id == user_id)

    query = query.order_by(Thread.created_at.desc()).offset(offset).limit(limit)
    threads = session.exec(query).all()
    return _enrich_threads_batch(threads, session, current_user)

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
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    limit = min(max(1, limit), 100)
    offset = max(0, offset)
    likes = session.exec(
        select(ThreadLike).where(ThreadLike.user_id == user_id).order_by(ThreadLike.created_at.desc()).offset(offset).limit(limit)
    ).all()

    thread_ids = [l.thread_id for l in likes]
    if not thread_ids:
        return []

    threads_map = {t.id: t for t in session.exec(select(Thread).where(Thread.id.in_(thread_ids))).all()}
    ordered_threads = [threads_map[tid] for tid in thread_ids if tid in threads_map]
    return _enrich_threads_batch(ordered_threads, session, current_user)

@router.get("/user/{user_id}/reposts", response_model=list[ThreadRead])
def list_user_reposts(
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    limit = min(max(1, limit), 100)
    offset = max(0, offset)
    profile_user = session.get(User, user_id)
    reposter_name = profile_user.username if profile_user else "listener"

    reposts = session.exec(
        select(ThreadRepost).where(ThreadRepost.user_id == user_id).order_by(ThreadRepost.created_at.desc()).offset(offset).limit(limit)
    ).all()

    thread_ids = [r.thread_id for r in reposts]
    if not thread_ids:
        return []

    threads_map = {t.id: t for t in session.exec(select(Thread).where(Thread.id.in_(thread_ids))).all()}
    ordered_threads = [threads_map[r.thread_id] for r in reposts if r.thread_id in threads_map]
    repost_meta = {
        r.thread_id: {
            "is_repost": True,
            "reposted_by": reposter_name,
            "reposted_at": r.created_at,
        }
        for r in reposts
    }
    return _enrich_threads_batch(ordered_threads, session, current_user, repost_meta=repost_meta)

@router.get("/me/bookmarks", response_model=list[ThreadRead])
def list_my_bookmarks(
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    limit = min(max(1, limit), 100)
    offset = max(0, offset)
    bookmarks = session.exec(
        select(ThreadBookmark).where(ThreadBookmark.user_id == current_user.id).order_by(ThreadBookmark.created_at.desc()).offset(offset).limit(limit)
    ).all()

    thread_ids = [b.thread_id for b in bookmarks]
    if not thread_ids:
        return []

    threads_map = {t.id: t for t in session.exec(select(Thread).where(Thread.id.in_(thread_ids))).all()}
    ordered_threads = [threads_map[tid] for tid in thread_ids if tid in threads_map]
    return _enrich_threads_batch(ordered_threads, session, current_user)
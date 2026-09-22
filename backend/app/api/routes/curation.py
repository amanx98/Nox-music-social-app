import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.deps import get_current_user
from app.db.session import get_session
from app.models.lastfm_profile import LastfmProfile
from app.models.playlist import Playlist
from app.models.taste_profile import TasteProfile
from app.models.user import User
from app.services.taste_engine import (
    build_taste_vector,
    compare_engines,
    generate_playlist,
    get_nox_recommendations,
)

router = APIRouter(prefix="/curation", tags=["curation"])

# How stale a cached TasteProfile can be before we rebuild (hours)
TASTE_VECTOR_TTL_HOURS = 24


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_lastfm_username(user_id: int, session: Session) -> str:
    """Look up the Last.fm username for a given user, raise 404 if not connected."""
    profile = session.exec(
        select(LastfmProfile).where(LastfmProfile.user_id == user_id)
    ).first()
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Last.fm not connected. Go to your profile settings to link your Last.fm account.",
        )
    return profile.lastfm_username


def _is_taste_profile_stale(profile: Optional[TasteProfile]) -> bool:
    if not profile:
        return True
    ttl = timedelta(hours=TASTE_VECTOR_TTL_HOURS)
    return datetime.utcnow() - profile.updated_at > ttl


def _load_or_create_taste_profile(user_id: int, session: Session) -> Optional[TasteProfile]:
    return session.exec(
        select(TasteProfile).where(TasteProfile.user_id == user_id)
    ).first()


def _save_taste_profile(
    user_id: int,
    taste_vector: dict,
    top_genres: list,
    seed_tracks: list,
    session: Session,
    cached_recommendations: Optional[list] = None,
    top_artists: Optional[list] = None,
) -> TasteProfile:
    existing = _load_or_create_taste_profile(user_id, session)
    if existing:
        existing.taste_vector = json.dumps(taste_vector)
        existing.top_genres = json.dumps(top_genres)
        existing.seed_tracks = json.dumps(seed_tracks)
        if cached_recommendations is not None:
            existing.cached_recommendations = json.dumps(cached_recommendations)
        if top_artists is not None:
            existing.top_artists = json.dumps(top_artists)
        existing.updated_at = datetime.utcnow()
        session.add(existing)
    else:
        existing = TasteProfile(
            user_id=user_id,
            taste_vector=json.dumps(taste_vector),
            top_genres=json.dumps(top_genres),
            seed_tracks=json.dumps(seed_tracks),
            cached_recommendations=json.dumps(cached_recommendations or []),
            top_artists=json.dumps(top_artists or []),
        )
        session.add(existing)
    session.commit()
    session.refresh(existing)
    return existing


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class GeneratePlaylistRequest(BaseModel):
    mood: Optional[str] = None
    seed_artist: Optional[str] = None
    name: Optional[str] = None
    length: int = 25


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/taste-vector")
async def get_taste_vector(
    refresh: bool = Query(False, description="Force rebuild even if cache is fresh"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Return the current user's taste vector (tag → score dict).

    The vector is rebuilt from Last.fm data if stale (>24h) or if `?refresh=true`.
    Also returns top_genres, top_tags for display, and mood tags.

    The taste vector is the foundation of the NOX recommendation engine.
    """
    lastfm_username = _get_lastfm_username(current_user.id, session)

    cached = _load_or_create_taste_profile(current_user.id, session)

    if refresh or _is_taste_profile_stale(cached) or not cached.taste_vector or cached.taste_vector == "{}":
        # Rebuild the vector from Last.fm
        taste_vector = await build_taste_vector(lastfm_username)
        top_genres = [
            tag for tag, _ in sorted(taste_vector.items(), key=lambda x: -x[1])
            if tag  # basic filter, engine handles blocklist
        ][:10]
        cached = _save_taste_profile(current_user.id, taste_vector, top_genres, [], session)
    else:
        taste_vector = json.loads(cached.taste_vector or "{}")
        top_genres = json.loads(cached.top_genres or "[]")

    # Top 15 tags sorted by score for display
    top_tags = sorted(taste_vector.items(), key=lambda x: -x[1])[:15]

    return {
        "taste_vector": taste_vector,
        "top_genres": top_genres[:5],
        "top_tags": [{"tag": t, "score": s} for t, s in top_tags],
        "dimension_count": len(taste_vector),
        "updated_at": cached.updated_at.isoformat() if cached else None,
        "lastfm_username": lastfm_username,
    }


@router.get("/recommendations")
async def get_recommendations(
    limit: int = Query(30, ge=5, le=50),
    refresh: bool = Query(False, description="Force recalculation"),
    mood: Optional[str] = Query(None, description="Optional mood filter"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Return NOX's content-based recommendations.
    Uses cached recommendations if available for sub-millisecond response.
    """
    lastfm_username = _get_lastfm_username(current_user.id, session)
    cached = _load_or_create_taste_profile(current_user.id, session)

    # Return cached recommendations if fresh, not refreshing, and no specific mood filter
    if cached and not refresh and not mood and getattr(cached, "cached_recommendations", None):
        try:
            cached_recs = json.loads(cached.cached_recommendations)
            if isinstance(cached_recs, list) and len(cached_recs) > 0 and not _is_taste_profile_stale(cached):
                top_genres = json.loads(cached.top_genres or "[]")
                taste_vector = json.loads(cached.taste_vector or "{}")
                return {
                    "engine": "nox_cosine_similarity",
                    "algorithm": "content-based (tag vector cosine similarity)",
                    "count": len(cached_recs[:limit]),
                    "recommendations": cached_recs[:limit],
                    "taste_summary": {
                        "top_genres": top_genres[:5],
                        "vector_dimensions": len(taste_vector),
                    },
                }
        except Exception:
            pass

    existing_vector = None
    existing_genres = None
    existing_artists = None
    if cached and not _is_taste_profile_stale(cached):
        try:
            existing_vector = json.loads(cached.taste_vector or "{}")
            existing_genres = json.loads(cached.top_genres or "[]")
            existing_artists = json.loads(cached.top_artists or "[]")
        except Exception:
            pass

    result = await get_nox_recommendations(
        lastfm_username,
        limit=limit,
        mood=mood,
        existing_taste_vector=existing_vector,
        existing_top_genres=existing_genres,
        existing_top_artists=existing_artists,
    )

    recs = result.get("recommendations", [])
    taste_vector = result.get("taste_vector", {})
    top_genres = result.get("top_genres", [])
    top_artists = result.get("top_artists", [])

    if not mood and recs:
        _save_taste_profile(
            current_user.id,
            taste_vector,
            top_genres,
            seed_tracks=[],
            cached_recommendations=recs,
            top_artists=top_artists,
            session=session,
        )

    return {
        "engine": "nox_cosine_similarity",
        "algorithm": "content-based (tag vector cosine similarity)",
        "count": len(recs),
        "recommendations": recs,
        "taste_summary": {
            "top_genres": top_genres[:5],
            "vector_dimensions": len(taste_vector),
        },
    }


@router.get("/compare")
async def get_engine_comparison(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Side-by-side comparison of our engine vs Last.fm's.

    Our engine: content-based (cosine similarity on tag vectors we build)
    Last.fm: collaborative filtering (track.getSimilar — who-listens-to-X-also-listens-to-Y)

    Returns:
    - nox_recs: our top 20 with scores + matching_tags
    - lastfm_recs: last.fm's top 20
    - overlap: tracks both engines agree on
    - nox_only: tracks only we recommended
    - lastfm_only: tracks only last.fm recommended
    - overlap_pct: Jaccard similarity % between result sets
    - top_tags: the 12 most influential dimensions of the user's taste vector
    """
    lastfm_username = _get_lastfm_username(current_user.id, session)

    result = await compare_engines(lastfm_username)

    # Save updated taste profile
    taste_vector = result.get("taste_vector", {})
    if taste_vector:
        top_tags = [item["tag"] for item in result.get("top_tags", [])]
        _save_taste_profile(current_user.id, taste_vector, top_tags[:5], result.get("seed_tracks", []), session)

    return result


@router.post("/playlist/generate")
async def generate_playlist_endpoint(
    body: GeneratePlaylistRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Generate a playlist from the user's taste vector.

    Optional params:
    - mood: filter tracks by mood tag (e.g. "dreamy", "dark", "energetic")
    - seed_artist: bias the playlist toward a specific artist's orbit
    - name: custom playlist name (auto-generated if omitted)
    - length: track count (default 25, max 50)
    """
    lastfm_username = _get_lastfm_username(current_user.id, session)

    playlist_data = await generate_playlist(
        lastfm_username,
        mood=body.mood,
        seed_artist=body.seed_artist,
        name=body.name,
        length=min(body.length, 50),
    )

    return {
        "engine": "nox_cosine_similarity",
        "playlist": playlist_data,
    }


@router.post("/playlist/save")
async def save_playlist(
    body: GeneratePlaylistRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Generate and immediately save a playlist to the user's library."""
    lastfm_username = _get_lastfm_username(current_user.id, session)

    playlist_data = await generate_playlist(
        lastfm_username,
        mood=body.mood,
        seed_artist=body.seed_artist,
        name=body.name,
        length=min(body.length, 50),
    )

    playlist = Playlist(
        user_id=current_user.id,
        name=playlist_data["name"],
        description=f"Generated by NOX engine. Mood: {body.mood or 'any'}",
        source="nox_engine",
        tracks=json.dumps(playlist_data["tracks"]),
    )
    session.add(playlist)
    session.commit()
    session.refresh(playlist)

    return {
        "id": playlist.id,
        "name": playlist.name,
        "track_count": len(playlist_data["tracks"]),
        "created_at": playlist.created_at.isoformat(),
    }


@router.get("/playlists")
def list_playlists(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return all saved playlists for the current user."""
    playlists = session.exec(
        select(Playlist).where(Playlist.user_id == current_user.id)
    ).all()

    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "source": p.source,
            "track_count": len(json.loads(p.tracks or "[]")),
            "tracks": json.loads(p.tracks or "[]"),
            "created_at": p.created_at.isoformat(),
        }
        for p in playlists
    ]


@router.delete("/playlists/{playlist_id}")
def delete_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete a saved playlist (must belong to current user)."""
    playlist = session.exec(
        select(Playlist).where(
            Playlist.id == playlist_id,
            Playlist.user_id == current_user.id,
        )
    ).first()

    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    session.delete(playlist)
    session.commit()
    return {"deleted": True, "playlist_id": playlist_id}

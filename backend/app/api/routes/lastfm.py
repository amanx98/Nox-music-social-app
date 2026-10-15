from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select, func

from app.db.session import get_session
from app.models.lastfm_profile import LastfmProfile
from app.models.user import User
from typing import Optional
from app.core.deps import get_current_user, get_optional_current_user
from app.core.security import decode_access_token
from app.services.lastfm_client import (
    get_lastfm_login_url,
    get_session_key,
    get_top_albums,
    get_top_tracks,
    get_top_artists,
    get_artist_details,
    get_now_playing,
)

import secrets
import time
from app.core.config import settings

router = APIRouter(prefix="/lastfm", tags=["lastfm"])

# Thread-safe state map with 15-minute TTL to prevent OAuth CSRF and concurrency collisions
pending_lastfm_states: dict[str, dict] = {}

@router.get("/login")
def lastfm_login(
    token: Optional[str] = None,
    redirect: bool = False,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    user = current_user
    if not user and token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            try:
                user = session.exec(select(User).where(User.id == int(payload["sub"]))).first()
            except Exception:
                pass

    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Prune expired states (> 15 minutes)
    now = time.time()
    expired = [s for s, data in list(pending_lastfm_states.items()) if now - data.get("created_at", 0) > 900]
    for s in expired:
        pending_lastfm_states.pop(s, None)

    state = secrets.token_urlsafe(32)
    pending_lastfm_states[state] = {"user_id": user.id, "created_at": now}
    login_url = get_lastfm_login_url(state=state)

    if redirect:
        return RedirectResponse(url=login_url)
    return {"login_url": login_url, "state": state}

@router.get("/callback")
async def lastfm_callback(
    token: str,
    state: Optional[str] = None,
    session: Session = Depends(get_session),
):
    if not state or state not in pending_lastfm_states:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired Last.fm authorization session. Please try connecting again from your profile."
        )

    state_data = pending_lastfm_states.pop(state)
    if time.time() - state_data.get("created_at", 0) > 900:
        raise HTTPException(
            status_code=400,
            detail="Last.fm authorization session timed out. Please try connecting again."
        )

    user_id = state_data["user_id"]

    session_data = await get_session_key(token)
    if not session_data or "session" not in session_data:
        err_msg = session_data.get("message") if isinstance(session_data, dict) else "Last.fm authentication failed"
        raise HTTPException(
            status_code=400,
            detail=f"Last.fm authorization failed: {err_msg}. Please try connecting again."
        )

    lastfm_session = session_data["session"]

    existing = session.exec(
        select(LastfmProfile).where(LastfmProfile.user_id == user_id)
    ).first()

    if existing:
        existing.lastfm_username = lastfm_session["name"]
        existing.session_key = lastfm_session["key"]
        session.add(existing)
    else:
        profile = LastfmProfile(
            user_id=user_id,
            lastfm_username=lastfm_session["name"],
            session_key=lastfm_session["key"],
        )
        session.add(profile)

    session.commit()

    frontend_base = settings.frontend_url.rstrip("/")
    return RedirectResponse(url=f"{frontend_base}/?lastfm=connected&lastfm_success=true")

def _resolve_lastfm_profile(
    session: Session,
    current_user: Optional[User] = None,
    username: Optional[str] = None,
) -> Optional[LastfmProfile]:
    # 1. When an explicit username is requested, resolve exclusively for that user
    if username and username.strip():
        clean_user = username.strip()
        app_user = session.exec(
            select(User).where(func.lower(User.username) == clean_user.lower())
        ).first()
        if app_user:
            return session.exec(
                select(LastfmProfile).where(LastfmProfile.user_id == app_user.id)
            ).first()

        p = session.exec(
            select(LastfmProfile).where(func.lower(LastfmProfile.lastfm_username) == clean_user.lower())
        ).first()
        if p:
            return p

        # Allow querying raw Last.fm username directly if not an app user
        return LastfmProfile(user_id=0, lastfm_username=clean_user, session_key="")

    # 2. Only if no username was provided, fall back to current authenticated user
    if current_user:
        return session.exec(select(LastfmProfile).where(LastfmProfile.user_id == current_user.id)).first()

    return None

@router.get("/status")
def get_lastfm_status(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if not current_user:
        return {"connected": False, "username": None}
    profile = session.exec(select(LastfmProfile).where(LastfmProfile.user_id == current_user.id)).first()
    return {
        "connected": profile is not None,
        "username": profile.lastfm_username if profile else None,
    }

@router.get("/top-albums")
async def lastfm_top_albums(
    period: str = "overall",
    username: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    profile = _resolve_lastfm_profile(session, current_user, username)
    if not profile or not profile.lastfm_username:
        raise HTTPException(status_code=404, detail="Last.fm not connected")

    try:
        data = await get_top_albums(profile.lastfm_username, period=period)
    except Exception:
        return []

    albums = (data.get("topalbums") or {}).get("album", [])
    if isinstance(albums, dict):
        albums = [albums]
    elif not isinstance(albums, list):
        albums = []

    def _extract_artist(alb):
        art = alb.get("artist")
        if isinstance(art, dict):
            return art.get("name", "")
        elif isinstance(art, str):
            return art
        return ""

    def _extract_image(alb):
        images = alb.get("image", [])
        if not isinstance(images, list):
            return None
        for size in ["extralarge", "large", "medium", "small"]:
            for img in images:
                if isinstance(img, dict) and img.get("size") == size:
                    url = img.get("#text")
                    if url and "2a96cbd8b46e442fc41c2b86b821562f" not in url:
                        return url
        return None

    return [
        {
            "name": album.get("name", "Unknown Record"),
            "artist": _extract_artist(album),
            "playcount": album.get("playcount", 0),
            "image_url": _extract_image(album),
        }
        for album in albums
        if isinstance(album, dict)
    ]

@router.get("/top-tracks")
async def lastfm_top_tracks(
    period: str = "overall",
    username: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    profile = _resolve_lastfm_profile(session, current_user, username)
    if not profile or not profile.lastfm_username:
        raise HTTPException(status_code=404, detail="Last.fm not connected")

    try:
        data = await get_top_tracks(profile.lastfm_username, period=period)
    except Exception:
        return []

    tracks = (data.get("toptracks") or {}).get("track", [])
    if isinstance(tracks, dict):
        tracks = [tracks]
    elif not isinstance(tracks, list):
        tracks = []

    def _extract_artist(t):
        art = t.get("artist")
        if isinstance(art, dict):
            return art.get("name", "")
        elif isinstance(art, str):
            return art
        return ""

    return [
        {
            "name": t.get("name", "Unknown Track"),
            "artist": _extract_artist(t),
            "playcount": t.get("playcount", 0),
            "image_url": next(
                (img.get("#text") for img in t.get("image", []) if isinstance(img, dict) and img.get("size") == "extralarge"),
                None,
            ),
        }
        for t in tracks
        if isinstance(t, dict)
    ]

@router.get("/top-artists")
async def lastfm_top_artists(
    period: str = "overall",
    username: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    profile = _resolve_lastfm_profile(session, current_user, username)
    if not profile or not profile.lastfm_username:
        raise HTTPException(status_code=404, detail="Last.fm not connected")

    try:
        data = await get_top_artists(profile.lastfm_username, period=period)
    except Exception:
        return []

    artists = (data.get("topartists") or {}).get("artist", [])
    if isinstance(artists, dict):
        artists = [artists]
    elif not isinstance(artists, list):
        artists = []

    return [
        {"name": a.get("name", "Unknown Artist"), "playcount": a.get("playcount", 0)}
        for a in artists
        if isinstance(a, dict)
    ]

@router.get("/artist-details")
async def lastfm_artist_details(artist: str):
    try:
        return await get_artist_details(artist)
    except Exception:
        return {
            "name": artist,
            "image": None,
            "images": [],
            "fans": None,
            "top_tracks": [],
        }

@router.get("/now-playing")
async def lastfm_now_playing(
    username: Optional[str] = None,
    linked_only: bool = False,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    fallback_empty = {
        "name": None,
        "artist": None,
        "album": None,
        "is_now_playing": False,
        "album_art": None,
        "landscape_art": None,
        "preview_url": None,
    }

    try:
        lfm_username = None

        if username and username.strip():
            clean_username = username.strip()
            # Check if username belongs to an app user (case-insensitive)
            app_user = session.exec(
                select(User).where(func.lower(User.username) == clean_username.lower())
            ).first()
            if app_user:
                profile = session.exec(select(LastfmProfile).where(LastfmProfile.user_id == app_user.id)).first()
                if profile:
                    lfm_username = profile.lastfm_username
            # Fall back to treating it as a raw Last.fm username, unless the caller
            # only wants app users with a linked Last.fm account (e.g. the Circle strip).
            if not lfm_username and not linked_only:
                lfm_username = clean_username
        elif current_user:
            profile = session.exec(select(LastfmProfile).where(LastfmProfile.user_id == current_user.id)).first()
            if profile:
                lfm_username = profile.lastfm_username

        if not lfm_username:
            return fallback_empty

        return await get_now_playing(lfm_username)
    except Exception:
        return fallback_empty
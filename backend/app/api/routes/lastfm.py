from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.lastfm_profile import LastfmProfile
from app.models.user import User
from app.core.deps import get_current_user
from app.services.lastfm_client import get_lastfm_login_url, get_session_key

router = APIRouter(prefix="/lastfm", tags=["lastfm"])

pending_lastfm_users: dict[str, int] = {}

@router.get("/login")
def lastfm_login(current_user: User = Depends(get_current_user)):
    pending_lastfm_users["awaiting"] = current_user.id
    return {"login_url": get_lastfm_login_url()}

@router.get("/callback")
async def lastfm_callback(token: str, session: Session = Depends(get_session)):
    user_id = pending_lastfm_users.pop("awaiting", None)
    if user_id is None:
        raise HTTPException(status_code=400, detail="No pending Last.fm login")

    session_data = await get_session_key(token)
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

    return RedirectResponse(url="http://localhost:5173/?lastfm=connected")

from app.services.lastfm_client import get_lastfm_login_url, get_session_key, get_top_albums
from sqlmodel import select

@router.get("/top-albums")
async def lastfm_top_albums(
    period: str = "overall",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    profile = session.exec(
        select(LastfmProfile).where(LastfmProfile.user_id == current_user.id)
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Last.fm not connected for this user")

    data = await get_top_albums(profile.lastfm_username, period=period)
    albums = data.get("topalbums", {}).get("album", [])
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

    return [
        {
            "name": album.get("name", "Unknown Record"),
            "artist": _extract_artist(album),
            "playcount": album.get("playcount", 0),
            "image_url": next(
                (img.get("#text") for img in album.get("image", []) if isinstance(img, dict) and img.get("size") == "extralarge"),
                None,
            ),
        }
        for album in albums
        if isinstance(album, dict)
    ]

from app.services.lastfm_client import get_lastfm_login_url, get_session_key, get_top_albums, get_top_tracks

@router.get("/top-tracks")
async def lastfm_top_tracks(
    period: str = "overall",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    profile = session.exec(
        select(LastfmProfile).where(LastfmProfile.user_id == current_user.id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Last.fm not connected for this user")

    data = await get_top_tracks(profile.lastfm_username, period=period)
    tracks = data.get("toptracks", {}).get("track", [])
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

from app.services.lastfm_client import get_top_artists, get_artist_details

@router.get("/top-artists")
async def lastfm_top_artists(
    period: str = "overall",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    profile = session.exec(
        select(LastfmProfile).where(LastfmProfile.user_id == current_user.id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Last.fm not connected for this user")

    data = await get_top_artists(profile.lastfm_username, period=period)
    artists = data.get("topartists", {}).get("artist", [])
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
    return await get_artist_details(artist)
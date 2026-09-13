from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.album_quilt import AlbumQuilt
from app.models.lastfm_profile import LastfmProfile
from app.models.user import User
from app.core.deps import get_current_user
from app.services.lastfm_client import get_top_albums, get_top_tracks, get_track_album_art
from app.services.quilt_generator import generate_quilt

router = APIRouter(prefix="/quilts", tags=["quilts"])

@router.post("/generate")
async def create_quilt(
    period: str = "overall",
    quilt_type: str = "albums",
    grid_size: int = 3,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    profile = session.exec(
        select(LastfmProfile).where(LastfmProfile.user_id == current_user.id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Last.fm not connected")

    limit = grid_size * grid_size

    if quilt_type == "tracks":
        data = await get_top_tracks(profile.lastfm_username, period=period, limit=limit)
        items_raw = data.get("toptracks", {}).get("track", [])
        albums = []
        for t in items_raw:
            art_url = await get_track_album_art(t["artist"]["name"], t["name"])
            albums.append({"image_url": art_url})
    else:
        data = await get_top_albums(profile.lastfm_username, period=period, limit=limit)
        items_raw = data.get("topalbums", {}).get("album", [])
        albums = [
            {
                "image_url": next(
                    (img["#text"] for img in a.get("image", []) if img["size"] == "extralarge"),
                    None,
                )
            }
            for a in items_raw
        ]

    filepath = await generate_quilt(albums, grid_size=grid_size)

    quilt = AlbumQuilt(
        user_id=current_user.id,
        source="lastfm",
        quilt_type=quilt_type,
        period=period,
        image_path=filepath,
    )
    session.add(quilt)
    session.commit()
    session.refresh(quilt)

    return {
        "id": quilt.id,
        "image_url": f"http://127.0.0.1:8000/{quilt.image_path}",
        "quilt_type": quilt.quilt_type,
        "period": quilt.period,
        "created_at": quilt.created_at,
    }

@router.get("/")
def list_quilts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    quilts = session.exec(
        select(AlbumQuilt).where(AlbumQuilt.user_id == current_user.id)
    ).all()
    return [
        {
            "id": q.id,
            "image_url": f"http://127.0.0.1:8000/{q.image_path}",
            "quilt_type": q.quilt_type,
            "period": q.period,
            "created_at": q.created_at,
        }
        for q in quilts
    ]

@router.delete("/{quilt_id}")
def delete_quilt(
    quilt_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    import os
    quilt = session.exec(
        select(AlbumQuilt).where(AlbumQuilt.id == quilt_id, AlbumQuilt.user_id == current_user.id)
    ).first()
    if not quilt:
        raise HTTPException(status_code=404, detail="Quilt not found")

    if quilt.image_path and os.path.exists(quilt.image_path):
        try:
            os.remove(quilt.image_path)
        except Exception:
            pass

    session.delete(quilt)
    session.commit()
    return {"ok": True, "message": "Quilt deleted", "id": quilt_id}
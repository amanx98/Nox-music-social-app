import hashlib
import httpx
from app.core.config import settings

LASTFM_AUTH_URL = "https://www.last.fm/api/auth"
LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/"

def get_lastfm_login_url() -> str:
    return f"{LASTFM_AUTH_URL}/?api_key={settings.lastfm_api_key}&cb={settings.lastfm_callback_url}"

def _sign_params(params: dict) -> str:
    sorted_items = sorted(params.items())
    sig_string = "".join(f"{k}{v}" for k, v in sorted_items)
    sig_string += settings.lastfm_shared_secret
    return hashlib.md5(sig_string.encode("utf-8")).hexdigest()

async def get_session_key(token: str) -> dict:
    params = {
        "method": "auth.getSession",
        "api_key": settings.lastfm_api_key,
        "token": token,
    }
    params["api_sig"] = _sign_params(params)
    params["format"] = "json"

    async with httpx.AsyncClient() as client:
        response = await client.get(LASTFM_API_BASE, params=params)
        response.raise_for_status()
        return response.json()

async def get_top_albums(username: str, period: str = "overall", limit: int = 9) -> dict:
    params = {
        "method": "user.getTopAlbums",
        "user": username,
        "api_key": settings.lastfm_api_key,
        "period": period,
        "limit": limit,
        "format": "json",
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(LASTFM_API_BASE, params=params)
        response.raise_for_status()
        return response.json()

async def get_top_tracks(username: str, period: str = "overall", limit: int = 9) -> dict:
    params = {
        "method": "user.getTopTracks",
        "user": username,
        "api_key": settings.lastfm_api_key,
        "period": period,
        "limit": limit,
        "format": "json",
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(LASTFM_API_BASE, params=params)
        response.raise_for_status()
        return response.json()

async def get_track_album_art(artist: str, track: str) -> str | None:
    params = {
        "method": "track.getInfo",
        "api_key": settings.lastfm_api_key,
        "artist": artist,
        "track": track,
        "format": "json",
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(LASTFM_API_BASE, params=params)
        if response.status_code != 200:
            return None
        data = response.json()
        images = data.get("track", {}).get("album", {}).get("image", [])
        url = next((img["#text"] for img in images if img["size"] == "extralarge"), None)
        # Last.fm's placeholder has this hash in the URL — skip it if found
        if url and "2a96cbd8b46e442fc41c2b86b821562f" in url:
            return None
        return url

async def get_top_artists(username: str, period: str = "overall", limit: int = 9) -> dict:
    params = {
        "method": "user.getTopArtists",
        "user": username,
        "api_key": settings.lastfm_api_key,
        "period": period,
        "limit": limit,
        "format": "json",
    }
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.get(LASTFM_API_BASE, params=params)
        response.raise_for_status()
        return response.json()

async def get_artist_details(artist_name: str) -> dict:
    result = {
        "name": artist_name,
        "image": None,
        "images": [],
        "fans": None,
        "top_tracks": [],
    }
    try:
        async with httpx.AsyncClient(verify=False, timeout=8.0) as client:
            resp = await client.get(f"https://api.deezer.com/search/artist?q={artist_name}")
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                if data:
                    a = data[0]
                    artist_id = a.get("id")
                    pic_xl = a.get("picture_xl")
                    pic_big = a.get("picture_big")
                    pic_med = a.get("picture_medium")

                    result["image"] = pic_xl or pic_big or pic_med
                    pics = [p for p in [pic_xl, pic_big, pic_med] if p]
                    result["images"] = list(dict.fromkeys(pics))
                    result["fans"] = a.get("nb_fan")

                    tracks_data = []
                    if artist_id:
                        track_resp = await client.get(f"https://api.deezer.com/artist/{artist_id}/top?limit=10")
                        if track_resp.status_code == 200:
                            tracks_data = track_resp.json().get("data", [])

                    # If artist top endpoint returned few or no tracks, search Deezer catalog by ranking
                    if len(tracks_data) < 5:
                        search_resp = await client.get("https://api.deezer.com/search", params={"q": artist_name, "order": "RANKING"})
                        if search_resp.status_code == 200:
                            search_tracks = search_resp.json().get("data", [])
                            seen_ids = {t.get("id") for t in tracks_data}
                            for st in search_tracks:
                                artist_item_name = st.get("artist", {}).get("name", "").lower()
                                if (artist_name.lower() in artist_item_name or artist_item_name in artist_name.lower()) and st.get("id") not in seen_ids:
                                    tracks_data.append(st)
                                    seen_ids.add(st.get("id"))
                                if len(tracks_data) >= 10:
                                    break

                    if tracks_data:
                        result["top_tracks"] = [
                            {
                                "id": t.get("id"),
                                "title": t.get("title"),
                                "duration": t.get("duration"),
                                "preview": t.get("preview"),
                                "album_title": t.get("album", {}).get("title"),
                                "album_cover": t.get("album", {}).get("cover_big") or t.get("album", {}).get("cover_medium"),
                            }
                            for t in tracks_data
                        ]
    except Exception:
        pass

    if not result["top_tracks"]:
        try:
            params = {
                "method": "artist.getTopTracks",
                "artist": artist_name,
                "api_key": settings.lastfm_api_key,
                "limit": 10,
                "format": "json",
            }
            async with httpx.AsyncClient(verify=False, timeout=8.0) as client:
                r = await client.get(LASTFM_API_BASE, params=params)
                if r.status_code == 200:
                    tracks = r.json().get("toptracks", {}).get("track", [])
                    result["top_tracks"] = [
                        {
                            "id": idx,
                            "title": tr.get("name"),
                            "playcount": tr.get("playcount"),
                            "listeners": tr.get("listeners"),
                            "preview": None,
                            "album_title": None,
                            "album_cover": next((img["#text"] for img in tr.get("image", []) if img["size"] == "large"), None),
                        }
                        for idx, tr in enumerate(tracks)
                    ]
        except Exception:
            pass

    return result
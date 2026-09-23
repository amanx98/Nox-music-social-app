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

    async with httpx.AsyncClient(verify=False) as client:
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
    async with httpx.AsyncClient(verify=False) as client:
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
    async with httpx.AsyncClient(verify=False) as client:
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
    async with httpx.AsyncClient(verify=False) as client:
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
    headers = {"User-Agent": "NoxMusicApp/1.0 (nox@example.com)"}
    try:
        async with httpx.AsyncClient(verify=False, timeout=8.0, headers=headers) as client:
            artist_id = None
            a = None
            
            # Step 1: Use Last.fm top tracks as an anchor to find the exact Deezer artist
            try:
                params = {
                    "method": "artist.getTopTracks",
                    "artist": artist_name,
                    "api_key": settings.lastfm_api_key,
                    "limit": 3,
                    "format": "json",
                }
                r = await client.get(LASTFM_API_BASE, params=params)
                if r.status_code == 200:
                    tracks = r.json().get("toptracks", {}).get("track", [])
                    if tracks and isinstance(tracks, list):
                        top_track_name = tracks[0].get("name")
                        if top_track_name:
                            search_resp = await client.get("https://api.deezer.com/search", params={"q": f"{artist_name} {top_track_name}", "limit": 1})
                            if search_resp.status_code == 200:
                                search_data = search_resp.json().get("data", [])
                                if search_data:
                                    # Verify the track actually belongs to the exact artist to prevent fuzzy-match bleeding
                                    import re
                                    found_artist = search_data[0].get("artist", {})
                                    found_norm = re.sub(r'[^a-z0-9]', '', found_artist.get("name", "").lower())
                                    req_norm = re.sub(r'[^a-z0-9]', '', artist_name.lower())
                                    if found_norm and req_norm and found_norm == req_norm:
                                        artist_id = found_artist.get("id")
            except Exception:
                pass
                
            if artist_id:
                # We found the exact artist ID using track correlation!
                resp = await client.get(f"https://api.deezer.com/artist/{artist_id}")
                if resp.status_code == 200:
                    a = resp.json()
            else:
                # Step 2: Fallback to exact name match + highest fan count
                resp = await client.get(f"https://api.deezer.com/search/artist?q={artist_name}")
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    if data:
                        target = re.sub(r'[^a-z0-9]', '', artist_name.lower())
                        exact_matches = [item for item in data if re.sub(r'[^a-z0-9]', '', item.get("name", "").lower()) == target]
                        if exact_matches:
                            a = max(exact_matches, key=lambda x: x.get("nb_fan", 0))
                        else:
                            a = data[0]
                        artist_id = a.get("id")
            
            if a:
                pic_xl = a.get("picture_xl") or a.get("picture_big") or a.get("picture_medium")
                if pic_xl:
                    result["image"] = pic_xl
                    result["images"].append(pic_xl)
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

            # Fetch distinct photos from TheAudioDB
            try:
                tadb_resp = await client.get("https://www.theaudiodb.com/api/v1/json/2/search.php", params={"s": artist_name})
                if tadb_resp.status_code == 200:
                    artists = tadb_resp.json().get("artists") or []
                    if artists:
                        target = re.sub(r'[^a-z0-9]', '', artist_name.lower())
                        artist_obj = next((item for item in artists if re.sub(r'[^a-z0-9]', '', item.get("strArtist", "").lower()) == target), artists[0])
                        
                        for key in ["strArtistFanart", "strArtistFanart2", "strArtistFanart3", "strArtistFanart4", "strArtistThumb"]:
                            photo_url = artist_obj.get(key)
                            if photo_url and photo_url not in result["images"]:
                                result["images"].append(photo_url)
            except Exception:
                pass

            # Removed Wikipedia scrape to prevent fetching random unrelated photos

            # If still no primary image but found other images, set first image as primary
            if not result["image"] and result["images"]:
                result["image"] = result["images"][0]
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


async def get_now_playing(lastfm_username: str) -> dict:
    """
    Fetch the currently playing (or most recently scrobbled) track for a user.
    Enriches with landscape artist artwork (TheAudioDB 16:9 fanart) and high-res album cover.
    """
    result = {
        "name": None,
        "artist": None,
        "album": None,
        "is_now_playing": False,
        "album_art": None,
        "landscape_art": None,
        "preview_url": None,
    }

    if not lastfm_username:
        return result

    headers = {"User-Agent": "NoxMusicApp/1.0 (nox@example.com)"}
    try:
        async with httpx.AsyncClient(verify=False, timeout=8.0, headers=headers) as client:
            # 1. Fetch recent tracks from Last.fm
            r = await client.get(
                LASTFM_API_BASE,
                params={
                    "method": "user.getRecentTracks",
                    "user": lastfm_username,
                    "api_key": settings.lastfm_api_key,
                    "limit": 2,
                    "format": "json",
                },
            )
            if r.status_code != 200:
                return result

            recent_tracks = r.json().get("recenttracks", {}).get("track", [])
            if isinstance(recent_tracks, dict):
                recent_tracks = [recent_tracks]
            if not recent_tracks:
                return result

            track = recent_tracks[0]
            name = track.get("name", "")
            artist = track.get("artist", {}).get("#text") if isinstance(track.get("artist"), dict) else track.get("artist", "")
            album = track.get("album", {}).get("#text") if isinstance(track.get("album"), dict) else track.get("album", "")
            attr = track.get("@attr", {})
            is_now_playing = attr.get("nowplaying") == "true" if isinstance(attr, dict) else False

            result["name"] = name
            result["artist"] = artist
            result["album"] = album
            result["is_now_playing"] = is_now_playing

            # Check for Last.fm image (filtering out the placeholder star hash)
            lfm_img = next(
                (img.get("#text") for img in track.get("image", []) if isinstance(img, dict) and img.get("size") == "extralarge"),
                None
            )
            if lfm_img and "2a96cbd8b46e442fc41c2b86b821562f" not in lfm_img:
                result["album_art"] = lfm_img

            # 2. Enrich with Deezer for album cover + 30s audio preview
            if artist and name:
                clean_name = re.sub(
                    r'[\(\[][^\)\]]*(?:feat|ft\.|remaster|version|deluxe|anniversary)[^\)\]]*[\)\]]',
                    '',
                    name,
                    flags=re.IGNORECASE
                ).strip()
                try:
                    dz_resp = await client.get(
                        "https://api.deezer.com/search",
                        params={"q": f"{artist} {clean_name or name}", "limit": 1},
                        timeout=3.5,
                    )
                    if dz_resp.status_code == 200:
                        dz_items = dz_resp.json().get("data", [])
                        if dz_items:
                            dz_track = dz_items[0]
                            result["preview_url"] = dz_track.get("preview")
                            alb = dz_track.get("album", {})
                            cover = alb.get("cover_xl") or alb.get("cover_big") or alb.get("cover_medium")
                            if cover and not result["album_art"]:
                                result["album_art"] = cover
                except Exception:
                    pass

            # 3. Fetch landscape artist fanart from TheAudioDB (wide 16:9 banner)
            if artist:
                try:
                    tadb_resp = await client.get(
                        "https://www.theaudiodb.com/api/v1/json/2/search.php",
                        params={"s": artist},
                        timeout=4.0,
                    )
                    if tadb_resp.status_code == 200:
                        artists = tadb_resp.json().get("artists") or []
                        if artists:
                            target = re.sub(r'[^a-z0-9]', '', artist.lower())
                            artist_obj = next(
                                (item for item in artists if re.sub(r'[^a-z0-9]', '', item.get("strArtist", "").lower()) == target),
                                artists[0]
                            )
                            # Wide landscape fanart fields
                            for key in ["strArtistFanart", "strArtistFanart2", "strArtistFanart3", "strArtistFanart4"]:
                                fanart = artist_obj.get(key)
                                if fanart:
                                    result["landscape_art"] = fanart
                                    break
                except Exception:
                    pass
    except Exception:
        pass

    return result
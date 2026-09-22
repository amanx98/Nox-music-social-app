"""
NOX Taste Engine — Multi-Dimensional Content-Based Recommendation System

How it works:
1. Fetch the user's top artists from Last.fm (raw data, not recommendations)
2. For each artist, fetch their top tags → build a weighted tag vector
3. The user's TASTE VECTOR = sum of (tag_vector * artist_rank_weight) for all artists
4. Candidate pool is sourced from MULTIPLE dimensions to avoid the mainstream trap:
   - tag.getTopTracks at RANDOM page offsets (not just page 1 = most popular)
   - artist.getSimilar for user's top artists → tracks from artists in their orbit
   - mood-specific tag sourcing when a mood is requested
5. Scoring is MULTI-DIMENSIONAL:
   - cosine_similarity(user_vec, track_vec)  ← tag content match
   - artist_affinity_bonus                   ← is this artist similar to yours?
   - mood_match_bonus                        ← does the track's tag set include the mood?
   - novelty_penalty                         ← penalize mega-popular tracks log-scaled
6. Compare vs Last.fm's own collaborative-filter recs (track.getSimilar)

We use Last.fm's data as raw material — we do the math ourselves.
"""

import asyncio
import json
import math
import random
from datetime import datetime, timedelta
from typing import Optional

import httpx

from app.core.config import settings

LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/"

# Tags we treat as "genre" dimensions (excludes meta-tags like "seen live", "favorites")
GENRE_BLOCKLIST = {
    "seen live", "favourite", "favorites", "love", "awesome", "best",
    "beautiful", "classic", "great", "amazing", "cool", "indie",
    "electronic", "alternative", "rock", "pop", "metal", "hip-hop",
    "rap", "rnb", "country", "folk", "jazz", "blues", "classical",
    "my favorite", "all time favorite", "under 2000 listeners",
}

# Mood tags we specifically want to detect and can use as candidate sources
MOOD_TAGS = {
    "melancholic", "melancholy", "sad", "dark", "dreamy", "atmospheric",
    "hypnotic", "energetic", "upbeat", "chill", "relaxing", "aggressive",
    "romantic", "nostalgic", "ethereal", "haunting", "intense", "peaceful",
    "euphoric", "bittersweet", "introspective", "danceable",
}

# How much more a top-ranked artist contributes vs a lower-ranked one
# Artist rank 1 gets weight 30, rank 2 gets 29, ..., rank 30 gets 1
def _rank_weight(rank: int, total: int = 30) -> float:
    return max(total - rank + 1, 1)

# Scoring weights for the multi-dimensional score
WEIGHT_COSINE      = 0.55   # tag vector cosine similarity (primary)
WEIGHT_ARTIST_AFF  = 0.20   # artist affinity (is this artist in user's orbit?)
WEIGHT_MOOD        = 0.15   # mood tag match (when mood is requested)
WEIGHT_NOVELTY     = 0.10   # novelty bonus (inverse popularity, log-scaled)


# ---------------------------------------------------------------------------
# Core math
# ---------------------------------------------------------------------------

def cosine_similarity(a: dict, b: dict) -> float:
    """
    Compute cosine similarity between two tag-weight dicts.
    Score = dot(a, b) / (|a| * |b|)
    Ranges 0.0 (no overlap) to 1.0 (identical direction).
    """
    if not a or not b:
        return 0.0

    dot = sum(a.get(k, 0.0) * v for k, v in b.items())
    mag_a = math.sqrt(sum(v ** 2 for v in a.values()))
    mag_b = math.sqrt(sum(v ** 2 for v in b.values()))

    if mag_a == 0 or mag_b == 0:
        return 0.0

    return dot / (mag_a * mag_b)


def _top_shared_tags(user_vec: dict, track_vec: dict, n: int = 3) -> list[str]:
    """Return the top N tags that most contributed to the similarity score."""
    contributions = {
        tag: user_vec.get(tag, 0.0) * weight
        for tag, weight in track_vec.items()
        if tag in user_vec
    }
    return [t for t, _ in sorted(contributions.items(), key=lambda x: -x[1])[:n]]


# ---------------------------------------------------------------------------
# Last.fm fetchers (raw data, not recommendations)
# ---------------------------------------------------------------------------

_lastfm_semaphore = asyncio.Semaphore(5)
_artist_tags_cache: dict[str, dict] = {}

async def _lastfm_get(params: dict, client: httpx.AsyncClient) -> dict:
    params = {**params, "api_key": settings.lastfm_api_key, "format": "json"}
    try:
        async with _lastfm_semaphore:
            r = await client.get(LASTFM_API_BASE, params=params, timeout=5.0)
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return {}


async def _get_artist_tags(artist: str, client: httpx.AsyncClient) -> dict:
    """
    Fetch top tags for an artist from Last.fm.
    Returns {tag_name: tag_weight} where weight is Last.fm's 0-100 relevance score.
    Caches results in memory to avoid redundant calls.
    """
    if not artist:
        return {}
    key = artist.lower().strip()
    if key in _artist_tags_cache:
        return _artist_tags_cache[key]

    data = await _lastfm_get({"method": "artist.getTopTags", "artist": artist}, client)
    tags = data.get("toptags", {}).get("tag", [])
    result = {}
    for tag in tags[:15]:  # top 15 tags per artist
        name = tag.get("name", "").lower().strip()
        count = int(tag.get("count", 0))
        if name and name not in GENRE_BLOCKLIST and count > 5:
            result[name] = count
    _artist_tags_cache[key] = result
    return result


async def _get_track_tags(track: str, artist: str, client: httpx.AsyncClient) -> dict:
    """Fetch top tags for a specific track."""
    data = await _lastfm_get(
        {"method": "track.getTopTags", "track": track, "artist": artist}, client
    )
    tags = data.get("toptags", {}).get("tag", [])
    result = {}
    for tag in tags[:10]:
        name = tag.get("name", "").lower().strip()
        count = int(tag.get("count", 0))
        if name and name not in GENRE_BLOCKLIST and count > 5:
            result[name] = count
    return result


async def _get_tag_top_tracks(
    tag: str,
    client: httpx.AsyncClient,
    limit: int = 30,
    page: Optional[int] = None,
) -> list[dict]:
    """
    Fetch tracks for a given tag.

    ANTI-MAINSTREAM TRICK: Last.fm page 1 = most globally scrobbled tracks.
    We randomly pick from pages 1–5 so we don't always get the same top 50.
    Page 1 still weighted more (50% chance) so quality stays high, but pages
    2-5 give us the deeper cuts.

    page=None → pick randomly; page=1 → explicitly get the chart leaders.
    """
    if page is None:
        # Weighted random: page 1 half the time, pages 2-5 the other half
        page = random.choices([1, 2, 3, 4, 5], weights=[50, 20, 15, 10, 5], k=1)[0]

    data = await _lastfm_get(
        {"method": "tag.getTopTracks", "tag": tag, "limit": limit, "page": page}, client
    )
    tracks = data.get("tracks", {}).get("track", [])
    if isinstance(tracks, dict):
        tracks = [tracks]
    return [
        {
            "name": t.get("name", ""),
            "artist": (
                t.get("artist", {}).get("name", "")
                if isinstance(t.get("artist"), dict)
                else t.get("artist", "")
            ),
            "image_url": next(
                (img.get("#text") for img in t.get("image", []) if img.get("size") == "extralarge"),
                None,
            ),
            "source": f"tag:{tag}:p{page}",  # track where this candidate came from
        }
        for t in tracks
        if isinstance(t, dict) and t.get("name")
    ]


async def _get_similar_artists(artist: str, client: httpx.AsyncClient, limit: int = 5) -> list[str]:
    """
    Fetch artists similar to `artist` via Last.fm's artist.getSimilar.
    Returns a list of artist names — these are the user's musical orbit.
    """
    data = await _lastfm_get(
        {"method": "artist.getSimilar", "artist": artist, "limit": limit}, client
    )
    similar = data.get("similarartists", {}).get("artist", [])
    if isinstance(similar, dict):
        similar = [similar]
    return [a.get("name", "") for a in similar if isinstance(a, dict) and a.get("name")]


async def _get_artist_top_tracks(artist: str, client: httpx.AsyncClient, limit: int = 10) -> list[dict]:
    """
    Fetch top tracks for a specific artist from Last.fm.
    Used to build artist-affinity candidates (not popularity-ranked globally,
    but ranked within this artist's own catalog).
    """
    data = await _lastfm_get(
        {"method": "artist.getTopTracks", "artist": artist, "limit": limit}, client
    )
    tracks = data.get("toptracks", {}).get("track", [])
    if isinstance(tracks, dict):
        tracks = [tracks]
    return [
        {
            "name": t.get("name", ""),
            "artist": artist,
            "image_url": next(
                (img.get("#text") for img in t.get("image", []) if img.get("size") == "large"),
                None,
            ),
            "listeners": int(t.get("listeners", 0)),
            "source": f"artist:{artist}",
        }
        for t in tracks
        if isinstance(t, dict) and t.get("name")
    ]


async def _get_track_similar_lastfm(track: str, artist: str, client: httpx.AsyncClient, limit: int = 20) -> list[dict]:
    """Last.fm's collaborative-filter similar tracks."""
    data = await _lastfm_get(
        {"method": "track.getSimilar", "track": track, "artist": artist, "limit": limit},
        client,
    )
    tracks = data.get("similartracks", {}).get("track", [])
    if isinstance(tracks, dict):
        tracks = [tracks]
    return [
        {
            "name": t.get("name", ""),
            "artist": t.get("artist", {}).get("name", "") if isinstance(t.get("artist"), dict) else t.get("artist", ""),
            "match": float(t.get("match", 0)),
            "image_url": next(
                (img.get("#text") for img in t.get("image", []) if img.get("size") == "extralarge"),
                None,
            ),
        }
        for t in tracks
        if isinstance(t, dict) and t.get("name")
    ]


async def _get_deezer_preview(track: str, artist: str, client: httpx.AsyncClient) -> Optional[str]:
    """Fetch a 30s Deezer preview URL for a track with strict 2.0s timeout."""
    try:
        r = await client.get(
            "https://api.deezer.com/search",
            params={"q": f"{artist} {track}", "limit": 1},
            timeout=2.0,
        )
        if r.status_code == 200:
            items = r.json().get("data", [])
            if items:
                return items[0].get("preview")
    except Exception:
        pass
    return None


async def _enrich_with_previews(tracks: list[dict]) -> list[dict]:
    """Fetch Deezer preview URLs for a batch of tracks concurrently."""
    async with httpx.AsyncClient(verify=False) as client:
        tasks = [_get_deezer_preview(t["name"], t["artist"], client) for t in tracks]
        previews = await asyncio.gather(*tasks)
    for track, preview in zip(tracks, previews):
        track["preview_url"] = preview
    return tracks


# ---------------------------------------------------------------------------
# Core engine functions
# ---------------------------------------------------------------------------

async def build_taste_vector(lastfm_username: str) -> dict:
    """
    Build the user's taste vector from their Last.fm listening history.

    Algorithm:
    1. Fetch top 15 artists (ordered by playcount = listening rank)
    2. For each artist, fetch their top tags from Last.fm
    3. Weight each tag by: tag_relevance_score * artist_rank_weight
       (artist ranked #1 contributes 15x more than artist ranked #15)
    4. Sum across all artists → normalize by max score
    5. Return {tag: normalized_score}

    Returns a dict like: {"dream-pop": 0.95, "shoegaze": 0.82, "4ad": 0.61, ...}
    """
    async with httpx.AsyncClient(verify=False) as client:
        # Step 1: Get top 15 artists (captures primary soundscape without excessive latency)
        artists_data = await _lastfm_get(
            {"method": "user.getTopArtists", "user": lastfm_username, "period": "overall", "limit": 15},
            client,
        )
        artists = artists_data.get("topartists", {}).get("artist", [])
        if isinstance(artists, dict):
            artists = [artists]

        if not artists:
            return {}

        # Step 2 + 3: Fetch tags for each artist concurrently, apply rank weights
        total_artists = min(len(artists), 15)
        tag_tasks = [
            _get_artist_tags(
                a.get("name", "") if isinstance(a, dict) else a,
                client
            )
            for a in artists[:total_artists]
        ]
        artist_tag_lists = await asyncio.gather(*tag_tasks)

        # Step 4: Weighted accumulation
        accumulated: dict[str, float] = {}
        for rank, (artist, tag_dict) in enumerate(zip(artists[:total_artists], artist_tag_lists), start=1):
            weight = _rank_weight(rank, total_artists)
            for tag, relevance in tag_dict.items():
                accumulated[tag] = accumulated.get(tag, 0.0) + (relevance * weight)

        # Step 5: Normalize to 0–1 range
        if accumulated:
            max_score = max(accumulated.values())
            taste_vector = {tag: round(score / max_score, 4) for tag, score in accumulated.items()}
        else:
            taste_vector = {}

    return taste_vector


async def get_candidates(
    taste_vector: dict,
    top_genres: list[str],
    top_artists: list[str],
    mood: Optional[str] = None,
    limit: int = 30,
) -> tuple[list[dict], set[str]]:
    """
    Build a rich, diverse candidate pool from THREE sources:
    1. TAG TRACKS (anti-mainstream random pages)
    2. ARTIST ORBIT (similar artist catalog cuts)
    3. MOOD SOURCING (if requested)

    Scaled efficiently based on desired limit to ensure fast response times.
    """
    is_compact = limit <= 10
    genre_count = 3 if is_compact else 4
    per_genre = 12 if is_compact else 16
    orbit_artist_cap = 5 if is_compact else 8
    per_orbit = 4 if is_compact else 5

    genres = top_genres[:genre_count]
    artists = top_artists[:2 if is_compact else 3]

    async with httpx.AsyncClient(verify=False) as client:
        tasks = []

        # Source 1: Tag tracks (randomized pages across top genres)
        for genre in genres:
            tasks.append(_get_tag_top_tracks(genre, client, limit=per_genre))

        # Source 3: Mood-specific sourcing (if mood requested)
        if mood:
            tasks.append(_get_tag_top_tracks(mood, client, limit=15, page=1))

        tag_results = await asyncio.gather(*tasks)

        # Source 2: Artist orbit — find similar artists for user's top artists
        similar_tasks = [_get_similar_artists(a, client, limit=3) for a in artists if a]
        similar_artist_batches = await asyncio.gather(*similar_tasks)

        # Flatten similar artists into a deduplicated set
        orbit_artists: set[str] = set()
        for batch in similar_artist_batches:
            orbit_artists.update(a.lower() for a in batch if a)
        for a in artists:
            orbit_artists.add(a.lower())

        # Fetch top tracks for each orbit artist concurrently
        orbit_track_tasks = [
            _get_artist_top_tracks(a, client, limit=per_orbit)
            for a in list(orbit_artists)[:orbit_artist_cap]
        ]
        orbit_track_batches = await asyncio.gather(*orbit_track_tasks)

    # Merge all sources, deduplicate by (name, artist)
    seen: set[tuple] = set()
    candidates: list[dict] = []

    def _add_batch(batch):
        for track in batch:
            if not track.get("name") or not track.get("artist"):
                continue
            key = (track["name"].lower(), track["artist"].lower())
            if key not in seen:
                seen.add(key)
                candidates.append(track)

    for batch in tag_results:
        _add_batch(batch)
    for batch in orbit_track_batches:
        _add_batch(batch)

    return candidates, orbit_artists


async def score_candidates(
    taste_vector: dict,
    candidates: list[dict],
    orbit_artists: set[str],
    mood: Optional[str] = None,
    limit: int = 30,
) -> list[dict]:
    """
    Multi-dimensional scoring for candidate tracks.
    Optimized: fetches tags only for unique artists (10-15 calls, cached),
    rather than making 180+ individual track tag requests to Last.fm.
    """
    unique_artists = list({t["artist"].strip() for t in candidates if t.get("artist")})
    async with httpx.AsyncClient(verify=False) as client:
        tag_tasks = [_get_artist_tags(a, client) for a in unique_artists]
        artist_tags_list = await asyncio.gather(*tag_tasks)
    artist_tags_map = {a.lower(): tags for a, tags in zip(unique_artists, artist_tags_list)}

    # Find listeners max for novelty normalization
    listeners_vals = [t.get("listeners", 0) for t in candidates if t.get("listeners", 0) > 0]
    max_listeners = max(listeners_vals) if listeners_vals else 1_000_000

    mood_lower = mood.lower() if mood else None
    scored = []

    for track in candidates:
        artist_lower = track.get("artist", "").lower().strip()
        track_vec = dict(artist_tags_map.get(artist_lower, {}))

        # Add the tag the track was discovered under (e.g. tag:soul:p1 -> "soul": 90)
        source = track.get("source", "")
        if source.startswith("tag:"):
            parts = source.split(":")
            if len(parts) >= 2:
                discovered_tag = parts[1].lower().strip()
                if discovered_tag:
                    track_vec[discovered_tag] = max(track_vec.get(discovered_tag, 0), 90)

        if not track_vec:
            continue

        # --- Dimension 1: Cosine similarity (tag content match) ---
        cos_score = cosine_similarity(taste_vector, track_vec)
        if cos_score == 0:
            continue

        # --- Dimension 2: Artist affinity bonus ---
        in_orbit = any(artist_lower == a or artist_lower in a or a in artist_lower
                       for a in orbit_artists)
        artist_bonus = 1.0 if in_orbit else 0.0

        # --- Dimension 3: Mood match bonus ---
        mood_bonus = 0.0
        if mood_lower and track_vec:
            mood_score = max(
                (v / 100.0 for k, v in track_vec.items() if mood_lower in k.lower()),
                default=0.0,
            )
            mood_bonus = min(mood_score, 1.0)

        # --- Dimension 4: Novelty bonus (inverse popularity) ---
        listeners = track.get("listeners", 0)
        if listeners > 0 and max_listeners > 1:
            novelty = 1.0 - (math.log(1 + listeners) / math.log(1 + max_listeners))
        else:
            novelty = 0.5

        # --- Weighted composite score ---
        if mood_lower:
            composite = (
                WEIGHT_COSINE * cos_score +
                WEIGHT_ARTIST_AFF * artist_bonus +
                WEIGHT_MOOD * mood_bonus +
                WEIGHT_NOVELTY * novelty
            )
        else:
            composite = (
                (WEIGHT_COSINE + WEIGHT_MOOD) * cos_score +
                WEIGHT_ARTIST_AFF * artist_bonus +
                WEIGHT_NOVELTY * novelty
            )

        shared_tags = _top_shared_tags(taste_vector, track_vec, n=3)
        scored.append({
            **track,
            "score": round(composite, 4),
            "score_breakdown": {
                "tag_similarity": round(cos_score, 3),
                "artist_affinity": round(artist_bonus, 3),
                "mood_match": round(mood_bonus, 3),
                "novelty": round(novelty, 3),
            },
            "matching_tags": shared_tags,
            "track_tags": list(track_vec.keys())[:5],
            "in_orbit": in_orbit,
        })

    # Sort by composite score descending
    scored.sort(key=lambda x: -x["score"])

    # Enforce artist diversity: cap each artist at 3 tracks in the final list
    artist_count: dict[str, int] = {}
    diverse = []
    for track in scored:
        a = track.get("artist", "").lower()
        if artist_count.get(a, 0) < 3:
            diverse.append(track)
            artist_count[a] = artist_count.get(a, 0) + 1
        if len(diverse) >= limit:
            break

    # Enrich ONLY the final top picks with previews (not all candidates)
    enriched = await _enrich_with_previews(diverse)
    return enriched


async def get_nox_recommendations(
    lastfm_username: str,
    limit: int = 30,
    mood: Optional[str] = None,
    existing_taste_vector: Optional[dict] = None,
    existing_top_genres: Optional[list[str]] = None,
    existing_top_artists: Optional[list[str]] = None,
) -> dict:
    """
    Full pipeline: build taste vector → multi-source candidates → multi-dim score → enrich.
    Supports using existing taste vector & top artists to bypass redundant Last.fm API hits.
    """
    if existing_taste_vector:
        taste_vector = existing_taste_vector
    else:
        taste_vector = await build_taste_vector(lastfm_username)

    if not taste_vector:
        return {"taste_vector": {}, "top_genres": [], "top_artists": [], "recommendations": []}

    top_genres = existing_top_genres or [
        tag for tag, _ in sorted(taste_vector.items(), key=lambda x: -x[1])
        if tag not in MOOD_TAGS
    ][:10]

    top_artists = existing_top_artists
    if not top_artists:
        async with httpx.AsyncClient(verify=False) as client:
            artists_data = await _lastfm_get(
                {"method": "user.getTopArtists", "user": lastfm_username, "period": "overall", "limit": 10},
                client,
            )
        raw_artists = artists_data.get("topartists", {}).get("artist", [])
        if isinstance(raw_artists, dict):
            raw_artists = [raw_artists]
        top_artists = [
            a.get("name", "") if isinstance(a, dict) else a
            for a in raw_artists[:10]
        ]

    # Multi-source candidate pool
    candidates, orbit_artists = await get_candidates(
        taste_vector=taste_vector,
        top_genres=top_genres,
        top_artists=top_artists,
        mood=mood,
        limit=limit,
    )

    if not candidates:
        return {"taste_vector": taste_vector, "top_genres": top_genres, "top_artists": top_artists, "recommendations": []}

    # Multi-dimensional scoring & preview enrichment
    enriched = await score_candidates(
        taste_vector=taste_vector,
        candidates=candidates,
        orbit_artists=orbit_artists,
        mood=mood,
        limit=limit,
    )

    return {
        "taste_vector": taste_vector,
        "top_genres": top_genres[:5],
        "top_artists": top_artists,
        "recommendations": enriched,
    }



async def get_lastfm_recommendations(lastfm_username: str, seed_tracks: list[dict], limit: int = 30) -> list[dict]:
    """
    Fetch Last.fm's collaborative-filter recommendations via track.getSimilar.
    Uses up to 5 seed tracks from the user's top tracks.
    This is the *baseline* we compare our engine against.
    """
    seeds = seed_tracks[:5]
    if not seeds:
        return []

    async with httpx.AsyncClient(verify=False) as client:
        tasks = [
            _get_track_similar_lastfm(s["name"], s["artist"], client, limit=20)
            for s in seeds
        ]
        results = await asyncio.gather(*tasks)

    # Flatten + deduplicate
    seen = set()
    flat = []
    for batch in results:
        for t in batch:
            key = (t["name"].lower(), t["artist"].lower())
            if key not in seen:
                seen.add(key)
                flat.append(t)

    # Sort by Last.fm match score (their internal ranking)
    flat.sort(key=lambda x: -x.get("match", 0))
    return flat[:limit]


async def compare_engines(lastfm_username: str) -> dict:
    """
    Run both our engine and Last.fm's engine, then compare results.

    Returns a CompareResult:
    {
      "nox_recs": [...],        ← our cosine-sim recs (with scores + tags)
      "lastfm_recs": [...],     ← last.fm's getSimilar recs
      "overlap": [...],         ← tracks both agree on
      "nox_only": [...],        ← our unique picks
      "lastfm_only": [...],     ← their unique picks
      "overlap_pct": float,     ← % agreement (Jaccard-style)
      "taste_vector": {...},    ← the vector we built
      "top_tags": [(tag, score)]← top 12 most influential tags
    }
    """
    # Fetch top tracks for seed (needed for Last.fm getSimilar)
    async with httpx.AsyncClient(verify=False) as client:
        seeds_data = await _lastfm_get(
            {"method": "user.getTopTracks", "user": lastfm_username, "period": "overall", "limit": 5},
            client,
        )
    seed_tracks_raw = seeds_data.get("toptracks", {}).get("track", [])
    if isinstance(seed_tracks_raw, dict):
        seed_tracks_raw = [seed_tracks_raw]
    seed_tracks = [
        {
            "name": t.get("name", ""),
            "artist": t.get("artist", {}).get("name", "") if isinstance(t.get("artist"), dict) else t.get("artist", ""),
        }
        for t in seed_tracks_raw[:5]
    ]

    # Run both engines concurrently
    nox_task = get_nox_recommendations(lastfm_username, limit=20)
    lastfm_task = get_lastfm_recommendations(lastfm_username, seed_tracks, limit=20)

    nox_result, lastfm_recs = await asyncio.gather(nox_task, lastfm_task)

    nox_recs = nox_result.get("recommendations", [])
    taste_vector = nox_result.get("taste_vector", {})

    # Build overlap sets by normalized (name, artist) key
    nox_keys = {(r["name"].lower(), r["artist"].lower()) for r in nox_recs}
    lastfm_keys = {(r["name"].lower(), r["artist"].lower()) for r in lastfm_recs}

    overlap_keys = nox_keys & lastfm_keys
    overlap = [r for r in nox_recs if (r["name"].lower(), r["artist"].lower()) in overlap_keys]
    nox_only = [r for r in nox_recs if (r["name"].lower(), r["artist"].lower()) not in overlap_keys]
    lastfm_only = [r for r in lastfm_recs if (r["name"].lower(), r["artist"].lower()) not in overlap_keys]

    # Jaccard similarity: |intersection| / |union|
    union_size = len(nox_keys | lastfm_keys)
    overlap_pct = round(len(overlap_keys) / union_size * 100, 1) if union_size > 0 else 0.0

    # Top 12 most influential tags for display
    top_tags = sorted(taste_vector.items(), key=lambda x: -x[1])[:12]

    return {
        "nox_recs": nox_recs,
        "lastfm_recs": lastfm_recs,
        "overlap": overlap,
        "nox_only": nox_only,
        "lastfm_only": lastfm_only,
        "overlap_pct": overlap_pct,
        "taste_vector": taste_vector,
        "top_tags": [{"tag": t, "score": s} for t, s in top_tags],
        "seed_tracks": seed_tracks,
    }


async def generate_playlist(
    lastfm_username: str,
    mood: Optional[str] = None,
    seed_artist: Optional[str] = None,
    name: Optional[str] = None,
    length: int = 25,
) -> dict:
    """
    Generate a playlist from the user's taste vector.

    Key improvements over naive filtering:
    - mood is passed INTO the engine (affects candidate sourcing + scoring weight),
      not just used as a post-filter. So "dreamy" tracks are sourced from the
      dreamy tag pool, not just filtered from a generic pool.
    - seed_artist biases the orbit so that artist's similar artists are weighted
      in candidate sourcing too.
    """
    # Pass mood directly into the engine so it sources mood-appropriate candidates
    nox_result = await get_nox_recommendations(lastfm_username, limit=60, mood=mood)
    recs = nox_result.get("recommendations", [])
    taste_vector = nox_result.get("taste_vector", {})
    top_genres = nox_result.get("top_genres", [])

    # If seed_artist provided: interleave seed-artist tracks into the list
    if seed_artist and recs:
        seed_lower = seed_artist.lower()
        orbit_boost = [r for r in recs if seed_lower in r.get("artist", "").lower()]
        others = [r for r in recs if seed_lower not in r.get("artist", "").lower()]
        # Interleave: 1 seed-artist track every 4 tracks
        mixed = []
        bi = iter(orbit_boost)
        oi = iter(others)
        for i in range(min(length, len(recs))):
            if i % 4 == 0:
                mixed.append(next(bi, next(oi, None)))
            else:
                mixed.append(next(oi, next(bi, None)))
        recs = [r for r in mixed if r is not None]

    tracks = recs[:length]

    # Auto-generate name if not provided
    if not name:
        top_tag = top_genres[0].title() if top_genres else "Mixed"
        mood_part = f" ({mood.title()})" if mood else ""
        month_year = datetime.utcnow().strftime("%b '%y")
        name = f"{top_tag}{mood_part} — {month_year}"

    return {
        "name": name,
        "source": "nox_engine",
        "mood": mood,
        "seed_artist": seed_artist,
        "track_count": len(tracks),
        "tracks": tracks,
        "taste_vector_preview": dict(list(taste_vector.items())[:10]),
    }


from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class TasteProfile(SQLModel, table=True):
    """
    Stores a user's computed taste vector — a weighted map of music tags
    derived from their Last.fm scrobble history.

    The taste_vector is a JSON-encoded dict: {tag_name: weighted_score}
    where score = sum(tag_weight * artist_rank_weight) across all top artists.
    This is the input to our cosine-similarity recommendation engine.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)

    # Core vector: JSON {tag: score} — the user's taste fingerprint
    taste_vector: str = Field(default="{}")

    # Derived summaries (pre-computed for fast display)
    top_artists: str = Field(default="[]")   # JSON [str] — top 10 artist names
    top_genres: str = Field(default="[]")    # JSON [str] — top 5 genre tags
    seed_tracks: str = Field(default="[]")   # JSON [{name, artist}] — for getSimilar baseline

    # Cache control — rebuilt when stale (default TTL: 24h)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

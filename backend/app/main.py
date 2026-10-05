from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from app.db.session import engine
from app.models.user import User
from app.api.routes.auth import router as auth_router
from app.models.post import Post
from app.models.lastfm_profile import LastfmProfile
from app.models.album_quilt import AlbumQuilt
from app.models.social import ThreadLike, ThreadRepost, ThreadBookmark, UserFollow, Friendship

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_private_network_access_headers(request, call_next):
    if request.method == "OPTIONS" and request.headers.get("access-control-request-private-network") == "true":
        from fastapi.responses import Response
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Private-Network": "true",
            },
        )
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = str(BACKEND_DIR / "static")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "quilts"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "uploads"), exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.on_event("startup")
def on_startup():
    from sqlmodel import SQLModel, Session, text
    SQLModel.metadata.create_all(engine)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE thread ADD COLUMN IF NOT EXISTS image_url VARCHAR;"))
            conn.execute(text("ALTER TABLE thread ADD COLUMN IF NOT EXISTS media_type VARCHAR;"))
            conn.execute(text("ALTER TABLE thread ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE post ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;"))
    except Exception:
        # SQLite doesn't support IF NOT EXISTS in ALTER TABLE; columns already created by create_all
        pass

    try:
        from app.db.seed import seed_database
        with Session(engine) as session:
            seed_database(session, force=False)
    except Exception as e:
        print(f"[Startup] Seed database check skipped: {e}")

app.include_router(auth_router)

@app.get("/health")
def health():
    return {"status": "ok"}

from app.models.tag import Tag
from app.models.thread import Thread

from app.api.routes.tags import router as tags_router
from app.api.routes.threads import router as threads_router
from app.api.routes.posts import router as posts_router
from app.api.routes.lastfm import router as lastfm_router
from app.api.routes.quilts import router as quilts_router
from app.api.routes.curation import router as curation_router
from app.api.routes.users import router as users_router
from app.api.routes.friends import router as friends_router

app.include_router(tags_router)
app.include_router(threads_router)
app.include_router(posts_router)
app.include_router(lastfm_router)
app.include_router(quilts_router)
app.include_router(curation_router)
app.include_router(users_router)
app.include_router(friends_router)

@app.post("/dev/seed")
def dev_seed():
    from sqlmodel import Session
    from app.db.seed import seed_database
    with Session(engine) as session:
        seed_database(session, force=True)
    return {"status": "seeded"}
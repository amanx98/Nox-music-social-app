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
    for table, col, col_type in [
        ("thread", "image_url", "VARCHAR"),
        ("thread", "media_type", "VARCHAR"),
        ("thread", "updated_at", "TIMESTAMP"),
        ("post", "updated_at", "TIMESTAMP"),
        ("albumquilt", "folder", "VARCHAR"),
        ("tag", "creator_id", "INTEGER"),
        ("tag", "created_at", "TIMESTAMP"),
        ("tag", "banner_url", "VARCHAR"),
        ("tag", "icon_url", "VARCHAR"),
        ("tag", "description", "TEXT"),
        ("tag", "rules", "TEXT"),
        ("tag", "theme_color", "VARCHAR"),
    ]:
        try:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};"))
        except Exception:
            pass

    try:
        from app.db.seed import seed_database
        with Session(engine) as session:
            seed_database(session, force=False)
    except Exception as e:
        print(f"[Startup] Seed database check skipped: {e}")

    try:
        with Session(engine) as session:
            _backfill_community_metadata(session)
    except Exception as e:
        print(f"[Startup] Community backfill check skipped: {e}")

def _backfill_community_metadata(session):
    from sqlmodel import select
    from app.models.tag import Tag
    from app.models.thread import Thread
    from app.models.user import User

    tags = session.exec(select(Tag)).all()
    if not tags:
        return

    DEFAULT_METADATA = {
        "shoegaze": {
            "description": "Reverb tails, dreampop tapes, wall-of-sound guitar pedals, and 90s Slowdive bootlegs.",
            "rules": "1. Post full album discussions or track dissections\n2. Share pedalboards and studio routing\n3. Respect fuzz dynamics",
            "theme_color": "#38BDF8",
            "icon_url": "/assets/avatars/shoegaze_queen.jpg",
            "banner_url": "/assets/editorial/gig-flyer.svg",
        },
        "ambient": {
            "description": "Brian Eno disciples, generative modular frequencies, cassette tape loops, and field recordings of midnight rain.",
            "rules": "1. Generative soundscapes and deep listening\n2. Cite hardware or tape chain when possible\n3. No abrasive loud mastering",
            "theme_color": "#C7F43D",
            "icon_url": "/assets/avatars/ambient_drifter.jpg",
            "banner_url": "/assets/editorial/ambient.svg",
        },
        "jazz": {
            "description": "Hard bop purists, Blue Note vinyl archivists, modal jazz explorations, and tube amp fidelity.",
            "rules": "1. Celebrate master recordings & original pressings\n2. Deep dive liner notes and session musicians\n3. All jazz eras welcome",
            "theme_color": "#F59E0B",
            "icon_url": "/assets/avatars/miles_ahead.jpg",
            "banner_url": "/assets/editorial/topster-nine.svg",
        },
        "dub techno": {
            "description": "Basic Channel disciples, tape delay echoes, submerged chord stabs, and 4 AM underground Berlin soundscapes.",
            "rules": "1. Keep the sub-bass deep and minimal\n2. Share vinyl release catalog codes\n3. Underground releases prioritized",
            "theme_color": "#10B981",
            "icon_url": "/assets/avatars/dub_techno_echo.jpg",
            "banner_url": "/assets/editorial/industrial.svg",
        },
        "post-punk": {
            "description": "Chorus basslines, cold wave drum machines, and monochrome sleeves. Joy Division, The Cure, Molchat Doma.",
            "rules": "1. Cold wave, goth rock, and darkwave takes\n2. Share lyrics and historical context\n3. Respect DIY tape scene",
            "theme_color": "#F43F5E",
            "icon_url": "/assets/avatars/post_punk_pete.jpg",
            "banner_url": "/assets/editorial/industrial.svg",
        },
        "city pop": {
            "description": "80s Japanese funk grooves, cassette rip aesthetics, lush brass sections, and Tokyo highway cruising.",
            "rules": "1. Original Japanese vinyl pressings & reissues\n2. Credit producers and session brass\n3. Share high quality sound rips",
            "theme_color": "#A855F7",
            "icon_url": "/assets/avatars/crate_digger_99.jpg",
            "banner_url": "/assets/editorial/vinyl-desk.svg",
        },
        "vinyl setup": {
            "description": "Turntable alignment, stylus care, phono preamps, and tube amplifier acoustics for vinyl obsessives.",
            "rules": "1. Share equipment specs & cartridge details\n2. Keep audio science grounded and respectful\n3. Show off record storage solutions",
            "theme_color": "#EAB308",
            "icon_url": "/assets/avatars/audiophile_dan.jpg",
            "banner_url": "/assets/editorial/vinyl-desk.svg",
        },
        "crate digging": {
            "description": "Sampling dusty 45s, flea market gold, thrift store record bins, and rare dollar-bin discoveries.",
            "rules": "1. Show the sleeve condition and deadwax etchings\n2. Share sample flips and drum breaks\n3. No gatekeeping obscure gems",
            "theme_color": "#FB923C",
            "icon_url": "/assets/avatars/crate_digger_99.jpg",
            "banner_url": "/assets/editorial/lofi-tape.svg",
        },
    }

    modified = False
    for tag in tags:
        lower_name = tag.name.lower().strip()
        if tag.creator_id is None:
            earliest_thread = session.exec(
                select(Thread).where(Thread.tag_id == tag.id).order_by(Thread.created_at.asc())
            ).first()
            if earliest_thread:
                tag.creator_id = earliest_thread.user_id
                modified = True
            else:
                first_user = session.exec(select(User).order_by(User.id.asc())).first()
                if first_user:
                    tag.creator_id = first_user.id
                    modified = True

        if lower_name in DEFAULT_METADATA:
            meta = DEFAULT_METADATA[lower_name]
            if not tag.description:
                tag.description = meta["description"]
                modified = True
            if not tag.rules:
                tag.rules = meta["rules"]
                modified = True
            if not tag.theme_color:
                tag.theme_color = meta["theme_color"]
                modified = True
            if not tag.icon_url:
                tag.icon_url = meta["icon_url"]
                modified = True
            if not tag.banner_url:
                tag.banner_url = meta["banner_url"]
                modified = True

        session.add(tag)

    if modified:
        session.commit()


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
from app.api.routes.notifications import router as notifications_router

app.include_router(tags_router)
app.include_router(threads_router)
app.include_router(posts_router)
app.include_router(lastfm_router)
app.include_router(quilts_router)
app.include_router(curation_router)
app.include_router(users_router)
app.include_router(friends_router)
app.include_router(notifications_router)

from app.core.config import settings
from fastapi import HTTPException

@app.post("/dev/seed")
def dev_seed():
    if settings.environment.lower() not in ("development", "dev", "test"):
        raise HTTPException(status_code=403, detail="Database seeding is disabled in production environments.")
    from sqlmodel import Session
    from app.db.seed import seed_database
    with Session(engine) as session:
        seed_database(session, force=True)
    return {"status": "seeded"}
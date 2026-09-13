from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from app.db.session import engine
from app.models.user import User
from app.api.routes.auth import router as auth_router
from app.models.post import Post
from app.models.lastfm_profile import LastfmProfile
from app.models.album_quilt import AlbumQuilt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
def on_startup():
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)

app.include_router(auth_router)

@app.get("/health")
def health():
    return {"status": "ok"}

from app.models.tag import Tag
from app.models.thread import Thread

from app.api.routes.tags import router as tags_router
from app.api.routes.threads import router as threads_router

app.include_router(tags_router)
app.include_router(threads_router)

from app.api.routes.posts import router as posts_router

app.include_router(posts_router)

from app.api.routes.lastfm import router as lastfm_router
app.include_router(lastfm_router)

from app.api.routes.quilts import router as quilts_router
app.include_router(quilts_router)
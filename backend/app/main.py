from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from app.db.session import engine
from app.models.user import User
from app.api.routes.auth import router as auth_router
from app.models.post import Post
from app.models.lastfm_profile import LastfmProfile
from app.models.album_quilt import AlbumQuilt
from app.models.social import ThreadLike, ThreadRepost, ThreadBookmark

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

from app.api.routes.curation import router as curation_router
app.include_router(curation_router)
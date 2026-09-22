import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select, func

from app.db.session import get_session
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user

from pathlib import Path

router = APIRouter(prefix="/auth", tags=["auth"])

BACKEND_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = str(BACKEND_DIR / "static" / "uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
BANNER_DIR = os.path.join(UPLOAD_DIR, "banners")

os.makedirs(AVATAR_DIR, exist_ok=True)
os.makedirs(BANNER_DIR, exist_ok=True)

@router.post("/register", response_model=UserRead)
def register(user_in: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(
        select(User).where((User.email == user_in.email) | (User.username == user_in.username))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already taken")

    user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    login_id = form_data.username.strip().lower()
    user = session.exec(
        select(User).where(
            (func.lower(User.email) == login_id) |
            (func.lower(User.username) == login_id)
        )
    ).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)

@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserRead)
def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url if user_update.avatar_url.strip() else None
    if user_update.banner_url is not None:
        current_user.banner_url = user_update.banner_url if user_update.banner_url.strip() else None

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user

@router.post("/avatar", response_model=UserRead)
async def upload_avatar(
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if file and file.filename:
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        if ext not in ["jpg", "jpeg", "png", "webp", "gif", "svg"]:
            raise HTTPException(status_code=400, detail="Unsupported image format. Allowed: JPG, PNG, WEBP, GIF, SVG.")
        
        filename = f"avatar_u{current_user.id}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"
        filepath = os.path.join(AVATAR_DIR, filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        current_user.avatar_url = f"/static/uploads/avatars/{filename}"
    elif image_url is not None:
        clean_url = image_url.strip()
        current_user.avatar_url = clean_url if clean_url else None
    else:
        current_user.avatar_url = None

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user

@router.post("/banner", response_model=UserRead)
async def upload_banner(
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if file and file.filename:
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        if ext not in ["jpg", "jpeg", "png", "webp", "gif", "svg"]:
            raise HTTPException(status_code=400, detail="Unsupported image format. Allowed: JPG, PNG, WEBP, GIF, SVG.")
        
        filename = f"banner_u{current_user.id}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"
        filepath = os.path.join(BANNER_DIR, filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        current_user.banner_url = f"/static/uploads/banners/{filename}"
    elif image_url is not None:
        clean_url = image_url.strip()
        current_user.banner_url = clean_url if clean_url else None
    else:
        current_user.banner_url = None

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user
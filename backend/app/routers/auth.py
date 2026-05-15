from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.auth_service import (
    create_access_token,
    create_oauth_state,
    create_token_pair,
    decode_oauth_state,
    decode_token,
)
from app.services.google_oauth_service import (
    build_google_authorization_url,
    exchange_code_for_google_profile,
)
from app.services.subscription_service import get_or_create_user_subscription

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> TokenResponse:
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Password registration is disabled. Use Google OAuth.",
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Password login is disabled. Use Google OAuth.",
    )


@router.get("/google/login")
def google_login(next: str | None = None) -> RedirectResponse:
    state = create_oauth_state(next)
    return RedirectResponse(build_google_authorization_url(state), status_code=status.HTTP_302_FOUND)


def _redirect_with_error(message: str) -> RedirectResponse:
    separator = "&" if "?" in settings.frontend_oauth_error_url else "?"
    url = f"{settings.frontend_oauth_error_url}{separator}{urlencode({'oauth_error': message})}"
    return RedirectResponse(url, status_code=status.HTTP_302_FOUND)


def _redirect_with_tokens(user: User, next_path: str) -> RedirectResponse:
    tokens = create_token_pair(user.id)
    fragment = urlencode(
        {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "email": user.email,
            "full_name": user.full_name or "",
            "avatar_url": user.avatar_url or "",
            "next": next_path,
        }
    )
    return RedirectResponse(
        f"{settings.frontend_oauth_success_url}#{fragment}",
        status_code=status.HTTP_302_FOUND,
    )


@router.get("/google/callback")
async def google_callback(
    db: Annotated[Session, Depends(get_db)],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    if error:
        return _redirect_with_error(error)

    if not code or not state:
        return _redirect_with_error("Missing Google OAuth callback parameters")

    try:
        next_path = decode_oauth_state(state)
        profile = await exchange_code_for_google_profile(code)
    except HTTPException as exc:
        return _redirect_with_error(str(exc.detail))

    user = db.scalar(select(User).where(User.google_sub == profile.google_sub))
    if user is None:
        user = db.scalar(select(User).where(User.email == _normalize_email(profile.email)))

    if user is None:
        user = User(
            email=profile.email,
            google_sub=profile.google_sub,
            full_name=profile.full_name,
            avatar_url=profile.avatar_url,
        )
        db.add(user)
    else:
        user.google_sub = profile.google_sub
        user.full_name = profile.full_name or user.full_name
        user.avatar_url = profile.avatar_url or user.avatar_url

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return _redirect_with_error("A Google account is already linked to another user")

    get_or_create_user_subscription(db, user)
    db.commit()
    db.refresh(user)
    return _redirect_with_tokens(user, next_path)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, db: Annotated[Session, Depends(get_db)]) -> AccessTokenResponse:
    user_id = decode_token(payload.refresh_token, expected_type="refresh")
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AccessTokenResponse(access_token=create_access_token(user.id))

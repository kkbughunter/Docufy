from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.config import settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES = ("openid", "email", "profile")


@dataclass(frozen=True)
class GoogleProfile:
    google_sub: str
    email: str
    email_verified: bool
    full_name: str | None
    avatar_url: str | None


def ensure_google_oauth_configured() -> None:
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured",
        )


def build_google_authorization_url(state: str) -> str:
    ensure_google_oauth_configured()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "state": state,
        "include_granted_scopes": "true",
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_google_profile(code: str) -> GoogleProfile:
    ensure_google_oauth_configured()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authorization code exchange failed",
        )

    token_payload = response.json()
    raw_id_token = token_payload.get("id_token")
    if not raw_id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google did not return an ID token",
        )

    try:
        verified = id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google ID token verification failed",
        ) from exc

    google_sub = str(verified.get("sub") or "")
    email = str(verified.get("email") or "").strip().lower()
    email_verified = bool(verified.get("email_verified"))

    if not google_sub or not email or not email_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email could not be verified",
        )

    return GoogleProfile(
        google_sub=google_sub,
        email=email,
        email_verified=email_verified,
        full_name=verified.get("name"),
        avatar_url=verified.get("picture"),
    )

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group import ApiGroup
from app.models.user import User
from app.schemas.extract import ExtractError, ExtractSuccess
from app.services.auth_service import decode_token
from app.services.claude_service import (
    ClaudeExtractionError,
    ClaudeResponseParseError,
    claude_service,
)
from app.services.document_service import process_upload

router = APIRouter(prefix="/extract", tags=["extract"])


def _http_error(status_code: int, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail=message)


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token:
        return token.strip()

    return None


def resolve_group_for_extraction(
    group_id: UUID,
    db: Session,
    authorization: str | None,
    x_api_key: str | None,
) -> ApiGroup:
    token = _bearer_token(authorization)

    if token:
        user_id = decode_token(token, expected_type="access")
        user = db.get(User, user_id)
        if user is None:
            raise _http_error(status.HTTP_401_UNAUTHORIZED, "User not found")

        group = db.scalar(
            select(ApiGroup).where(
                ApiGroup.id == group_id,
                ApiGroup.user_id == user.id,
                ApiGroup.is_active.is_(True),
            )
        )
    elif x_api_key:
        group = db.scalar(
            select(ApiGroup).where(
                ApiGroup.id == group_id,
                ApiGroup.api_key == x_api_key,
                ApiGroup.is_active.is_(True),
            )
        )
    else:
        raise _http_error(status.HTTP_401_UNAUTHORIZED, "Bearer token or X-API-Key is required")

    if group is None:
        raise _http_error(status.HTTP_404_NOT_FOUND, "Active API group not found")

    return group


def _error_response(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"success": False, "error": message})


@router.post("/{group_id}", response_model=ExtractSuccess | ExtractError)
async def extract_document(
    group_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File(...)],
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header()] = None,
) -> ExtractSuccess | JSONResponse:
    try:
        group = resolve_group_for_extraction(group_id, db, authorization, x_api_key)
        document = await process_upload(file)
        extracted_data = await claude_service.extract_json(group, document)
        return ExtractSuccess(data=extracted_data)
    except HTTPException as exc:
        return _error_response(exc.status_code, str(exc.detail))
    except ClaudeResponseParseError as exc:
        return _error_response(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    except ClaudeExtractionError:
        return _error_response(
            status.HTTP_502_BAD_GATEWAY,
            "Document extraction failed while calling Claude",
        )
    except Exception:
        return _error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Document extraction failed",
        )

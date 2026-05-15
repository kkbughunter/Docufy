from time import perf_counter
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.analytics import ApiRequestLog
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
from app.services.subscription_service import get_or_create_user_subscription
from app.services.usage_service import ensure_request_limit, get_file_size_limit_bytes

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
) -> tuple[ApiGroup, str]:
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
        auth_mode = "bearer"
    elif x_api_key:
        group = db.scalar(
            select(ApiGroup).where(
                ApiGroup.id == group_id,
                ApiGroup.api_key == x_api_key,
                ApiGroup.is_active.is_(True),
            )
        )
        auth_mode = "api_key"
    else:
        raise _http_error(status.HTTP_401_UNAUTHORIZED, "Bearer token or X-API-Key is required")

    if group is None:
        raise _http_error(status.HTTP_404_NOT_FOUND, "Active API group not found")

    return group, auth_mode


def _error_response(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"success": False, "error": message})


@router.post("/{group_id}", response_model=ExtractSuccess | ExtractError)
async def extract_document(
    group_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
    file: Annotated[UploadFile, File(...)],
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header()] = None,
) -> ExtractSuccess | JSONResponse:
    started_at = perf_counter()
    group: ApiGroup | None = None
    current_user: User | None = None
    auth_mode = "unknown"
    request_status = "request_failed"
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_message: str | None = None
    used_ai_call = False
    file_name = file.filename or "document"
    file_size_bytes: int | None = None

    try:
        group, auth_mode = resolve_group_for_extraction(group_id, db, authorization, x_api_key)
        current_user = group.user if group.user is not None else db.get(User, group.user_id)
        if current_user is None:
            raise _http_error(status.HTTP_401_UNAUTHORIZED, "User not found")

        usage_snapshot = ensure_request_limit(db, current_user)
        document = await process_upload(
            file,
            max_file_size_bytes=get_file_size_limit_bytes(usage_snapshot.plan.limits),
            max_file_size_mb=usage_snapshot.plan.limits.max_file_size_mb,
        )
        file_size_bytes = document.size_bytes
        used_ai_call = True
        subscription = get_or_create_user_subscription(db, current_user)
        if usage_snapshot.plan.limits.max_requests is not None:
            subscription.request_credits_balance = max(subscription.request_credits_balance - 1, 0)
            db.commit()
        extracted_data = await claude_service.extract_json(group, document)
        request_status = "success"
        status_code = status.HTTP_200_OK
        return ExtractSuccess(data=extracted_data)
    except HTTPException as exc:
        status_code = exc.status_code
        error_message = str(exc.detail)
        request_status = "limit_exceeded" if exc.status_code == status.HTTP_403_FORBIDDEN else "request_rejected"
        return _error_response(exc.status_code, str(exc.detail))
    except ClaudeResponseParseError as exc:
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        error_message = str(exc)
        request_status = "invalid_model_response"
        return _error_response(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    except ClaudeExtractionError:
        status_code = status.HTTP_502_BAD_GATEWAY
        error_message = "Document extraction failed while calling Claude"
        request_status = "provider_error"
        return _error_response(
            status.HTTP_502_BAD_GATEWAY,
            "Document extraction failed while calling Claude",
        )
    except Exception:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_message = "Document extraction failed"
        request_status = "request_failed"
        return _error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Document extraction failed",
        )
    finally:
        try:
            if group is not None:
                duration_ms = int((perf_counter() - started_at) * 1000)
                owner = current_user if current_user is not None else db.get(User, group.user_id)
                if owner is not None:
                    db.add(
                        ApiRequestLog(
                            user_id=owner.id,
                            group_id=group.id,
                            group_name=group.name,
                            endpoint_path=request.url.path,
                            http_method=request.method,
                            auth_mode=auth_mode,
                            request_status=request_status,
                            status_code=status_code,
                            duration_ms=duration_ms,
                            ai_model=settings.claude_model if used_ai_call else None,
                            used_ai_call=used_ai_call,
                            file_name=file_name,
                            file_size_bytes=file_size_bytes,
                            error_message=error_message,
                        )
                    )
                    db.commit()
        except Exception:
            db.rollback()

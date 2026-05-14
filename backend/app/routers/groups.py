from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.group import ApiGroup, generate_api_key
from app.models.user import User
from app.schemas.group import GroupCreate, GroupResponse, GroupUpdate

router = APIRouter(prefix="/groups", tags=["groups"])


def get_owned_group(db: Session, current_user: User, group_id: UUID) -> ApiGroup:
    group = db.scalar(
        select(ApiGroup).where(ApiGroup.id == group_id, ApiGroup.user_id == current_user.id)
    )

    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API group not found")

    return group


@router.get("", response_model=list[GroupResponse])
def list_groups(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ApiGroup]:
    return list(
        db.scalars(
            select(ApiGroup)
            .where(ApiGroup.user_id == current_user.id)
            .order_by(desc(ApiGroup.created_at))
        )
    )


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApiGroup:
    group = ApiGroup(user_id=current_user.id, **payload.model_dump())
    db.add(group)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create a unique API key",
        ) from exc

    db.refresh(group)
    return group


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApiGroup:
    return get_owned_group(db, current_user, group_id)


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    payload: GroupUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApiGroup:
    group = get_owned_group(db, current_user, group_id)

    for field, value in payload.model_dump().items():
        setattr(group, field, value)

    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    group = get_owned_group(db, current_user, group_id)
    db.delete(group)
    db.commit()


@router.post("/{group_id}/rotate-key", response_model=GroupResponse)
def rotate_api_key(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApiGroup:
    group = get_owned_group(db, current_user, group_id)
    group.api_key = generate_api_key()

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        group = get_owned_group(db, current_user, group_id)
        group.api_key = generate_api_key()
        db.commit()

    db.refresh(group)
    return group

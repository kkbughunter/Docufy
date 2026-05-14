from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GroupBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    document_type: str = Field(min_length=1, max_length=100)
    document_hint: str | None = None
    language_hint: str = Field(min_length=1, max_length=50)
    output_schema: dict[str, Any]

    @field_validator("output_schema")
    @classmethod
    def schema_must_be_object(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(value, dict) or not value:
            raise ValueError("output_schema must be a non-empty JSON object")
        return value


class GroupCreate(GroupBase):
    pass


class GroupUpdate(GroupBase):
    pass


class GroupResponse(GroupBase):
    id: UUID
    user_id: UUID
    api_key: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

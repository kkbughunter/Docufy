from typing import Any, Literal

from pydantic import BaseModel


class ExtractSuccess(BaseModel):
    success: Literal[True] = True
    data: dict[str, Any]


class ExtractError(BaseModel):
    success: Literal[False] = False
    error: str

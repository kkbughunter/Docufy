from __future__ import annotations

import json
from typing import Any

from anthropic import AsyncAnthropic
from fastapi import HTTPException, status

from app.config import settings
from app.models.group import ApiGroup
from app.services.document_service import ProcessedDocument

SYSTEM_PROMPT = """You are Docufy, a precise document data extraction engine.
You always respond with ONLY valid JSON - no markdown fences,
no explanation, no preamble, no trailing text.
Missing fields must be null. Dates must be ISO-8601 (YYYY-MM-DD).
Numbers must be actual JSON numbers, not strings.
Arrays must be actual JSON arrays even if only one item."""


class ClaudeExtractionError(Exception):
    pass


class ClaudeResponseParseError(Exception):
    pass


def _build_user_prompt(group: ApiGroup) -> str:
    schema_text = json.dumps(group.output_schema, indent=2, ensure_ascii=False)
    description = group.document_hint or "No additional description provided."

    return f"""Document context:
- Type: {group.document_type}
- Description: {description}
- Language: {group.language_hint}

Extract all information from the provided document and return
a JSON object that EXACTLY matches this schema:

{schema_text}

Rules:
- Return ONLY the JSON object. Nothing else.
- Every field in the schema must appear in the response.
- Use null for any field not found in the document.
- Do not add extra fields not in the schema."""


def _document_to_block(document: ProcessedDocument) -> dict[str, Any]:
    if document.kind == "image":
        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": document.media_type,
                "data": document.data,
            },
        }

    if document.kind == "pdf":
        return {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": document.data,
            },
        }

    return {
        "type": "text",
        "text": f"Document content from {document.filename}:\n\n{document.text or ''}",
    }


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()

    if not stripped.startswith("```"):
        return stripped

    lines = stripped.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]

    return "\n".join(lines).strip()


def _extract_text_from_response(response: Any) -> str:
    parts: list[str] = []

    for block in getattr(response, "content", []):
        block_type = getattr(block, "type", None)
        if block_type == "text":
            parts.append(getattr(block, "text", ""))
        elif isinstance(block, dict) and block.get("type") == "text":
            parts.append(str(block.get("text", "")))

    return "\n".join(parts).strip()


class ClaudeService:
    def __init__(self) -> None:
        if not settings.anthropic_api_key:
            self.client: AsyncAnthropic | None = None
        else:
            self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def extract_json(self, group: ApiGroup, document: ProcessedDocument) -> dict[str, Any]:
        if self.client is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ANTHROPIC_API_KEY is not configured",
            )

        content = [
            {"type": "text", "text": _build_user_prompt(group)},
            _document_to_block(document),
        ]

        try:
            response = await self.client.messages.create(
                model=settings.claude_model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": content}],
            )
        except Exception as exc:
            raise ClaudeExtractionError("Claude extraction failed") from exc

        response_text = _strip_code_fences(_extract_text_from_response(response))

        try:
            parsed = json.loads(response_text)
        except json.JSONDecodeError as exc:
            raise ClaudeResponseParseError("Claude returned invalid JSON") from exc

        if not isinstance(parsed, dict):
            raise ClaudeResponseParseError("Claude returned JSON, but not a JSON object")

        return parsed


claude_service = ClaudeService()

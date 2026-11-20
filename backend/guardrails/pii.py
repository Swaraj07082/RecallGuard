from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

PII_BLOCK_MESSAGE = (
    "You can't send personal information. "
    "Remove emails, phone numbers, SSNs, or card numbers and try again."
)

_REDACTION_LABELS: dict[str, str] = {
    "email": "[EMAIL]",
    "ssn": "[SSN]",
    "credit_card": "[CARD]",
    "phone": "[PHONE]",
}


class PIIBlockedError(ValueError):
    def __init__(self, types: list[str]) -> None:
        self.types = types
        super().__init__(PII_BLOCK_MESSAGE)


@dataclass(frozen=True)
class _Pattern:
    name: str
    regex: re.Pattern[str]


_PATTERNS: tuple[_Pattern, ...] = (
    _Pattern(
        "email",
        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    ),
    _Pattern(
        "ssn",
        re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    ),
    _Pattern(
        "credit_card",
        re.compile(
            r"\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}|\d{4}[ -]?\d{6}[ -]?\d{5}|\d{16})\b"
        ),
    ),
    _Pattern(
        "phone",
        re.compile(
            r"(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
            r"|(?:\+91[-.\s]?)?[6-9]\d{9})"
        ),
    ),
)


def detect_query_pii(text: str) -> list[str]:
    if not text or not text.strip():
        return []
    found: set[str] = set()
    for pattern in _PATTERNS:
        if pattern.regex.search(text):
            found.add(pattern.name)
    return sorted(found)


def assert_no_query_pii(text: str) -> None:
    types = detect_query_pii(text)
    if types:
        raise PIIBlockedError(types)


def redact_pii(text: str) -> tuple[str, list[str]]:
    if not text:
        return text, []
    found: set[str] = set()
    redacted = text
    for pattern in _PATTERNS:
        label = _REDACTION_LABELS[pattern.name]
        redacted, n = pattern.regex.subn(label, redacted)
        if n:
            found.add(pattern.name)
    return redacted, sorted(found)


def sanitize_chunks(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized: list[dict[str, Any]] = []
    for chunk in chunks:
        copy = dict(chunk)
        text = str(copy.get("text") or "")
        safe_text, types = redact_pii(text)
        copy["text"] = safe_text
        if types:
            copy["pii_redacted"] = types
        sanitized.append(copy)
    return sanitized

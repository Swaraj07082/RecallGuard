from __future__ import annotations

import re
from dataclasses import dataclass

INJECTION_BLOCK_MESSAGE = (
    "Your message looks like a prompt injection attempt. "
    "Please rephrase your question without instruction overrides."
)


class InjectionBlockedError(ValueError):
    def __init__(self, matched: list[str]) -> None:
        self.matched = matched
        super().__init__(INJECTION_BLOCK_MESSAGE)


@dataclass(frozen=True)
class _Rule:
    name: str
    regex: re.Pattern[str]


_RULES: tuple[_Rule, ...] = (
    _Rule(
        "ignore_instructions",
        re.compile(
            r"\bignore\s+(all\s+)?(previous|prior|above|earlier|all)\s+"
            r"(instructions?|prompts?|rules?|guidelines?)\b",
            re.I,
        ),
    ),
    _Rule(
        "disregard_rules",
        re.compile(
            r"\b(disregard|bypass|override)\s+(all\s+)?"
            r"(safety|security|system|previous|prior)?\s*"
            r"(instructions?|rules?|policies|guardrails?|filters?)\b",
            re.I,
        ),
    ),
    _Rule(
        "reveal_system_prompt",
        re.compile(
            r"\b(reveal|show|print|display|dump|repeat)\s+"
            r"(your\s+)?(system\s+)?(prompt|instructions?|rules?)\b",
            re.I,
        ),
    ),
    _Rule(
        "dump_documents",
        re.compile(
            r"\b(dump|exfiltrate|export|list|reveal)\s+"
            r"(all\s+)?(documents?|chunks?|context|memory|secrets?|keys?)\b",
            re.I,
        ),
    ),
    _Rule(
        "role_hijack",
        re.compile(
            r"\b(you\s+are\s+now|act\s+as|pretend\s+(you\s+are|to\s+be)|"
            r"jailbreak|developer\s+mode|dan\s+mode)\b",
            re.I,
        ),
    ),
    _Rule(
        "new_instructions",
        re.compile(
            r"(?:new\s+instructions?\s*:"
            r"|from\s+now\s+on\s+you\s+(?:must|will|should)\b"
            r"|do\s+not\s+follow\s+(?:your\s+)?(?:system|original)\s+"
            r"(?:prompt|instructions?)\b)",
            re.I,
        ),
    ),
)


def detect_prompt_injection(text: str) -> list[str]:
    if not text or not text.strip():
        return []
    matched: list[str] = []
    for rule in _RULES:
        if rule.regex.search(text):
            matched.append(rule.name)
    return matched


def assert_no_prompt_injection(text: str) -> None:
    matched = detect_prompt_injection(text)
    if matched:
        raise InjectionBlockedError(matched)

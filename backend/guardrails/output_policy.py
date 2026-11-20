from __future__ import annotations

import re
from dataclasses import dataclass, field

from backend.guardrails.pii import detect_query_pii, redact_pii

OUTPUT_BLOCK_MESSAGE = (
    "I can't return that response because it violated our safety policy. "
    "Please rephrase your question."
)

PASS_SCORE = 0.7

_SYSTEM_PROMPT_NEEDLES: tuple[str, ...] = (
    "you are recallguard's rag assistant",
    "answer only using the provided context chunks",
    "aitwin.me",
    "avatars.streamoji.com",
)

_PENALTIES: dict[str, float] = {
    "system_prompt_leak": 1.0,
    "exfiltration_markup": 1.0,
    "instruction_override_ack": 0.8,
    "secret_pattern": 1.0,
    "output_pii": 0.25,
}


@dataclass
class OutputScreenResult:
    allowed: bool
    score: float
    findings: list[str] = field(default_factory=list)
    text: str = ""


def _system_prompt_leak(text: str) -> bool:
    lowered = text.lower()
    hits = sum(1 for n in _SYSTEM_PROMPT_NEEDLES if n in lowered)
    return hits >= 2


_EXFIL_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"<\s*/?\s*system\s*>", re.I),
    re.compile(r"```(?:system|prompt)\b", re.I),
    re.compile(r"\bBEGIN\s+(SYSTEM|PROMPT|SECRET)\b", re.I),
    re.compile(r"\b(SYSTEM|DEVELOPER)\s*PROMPT\s*:", re.I),
    re.compile(r"\[INST\]|<<SYS>>", re.I),
)

_SECRET_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(sk|api)[_-][A-Za-z0-9]{16,}\b"),
    re.compile(r"\b(GROQ|OPENAI|AWS|LANGFUSE)_?API_?KEY\s*[=:]\s*\S+", re.I),
    re.compile(r"\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b"),
)

_OVERRIDE_ACK: re.Pattern[str] = re.compile(
    r"\b(i('ll| will)?\s+ignore\s+(my|the|all)\s+(previous\s+)?"
    r"(instructions?|rules?|policies|guidelines?)"
    r"|as\s+requested,?\s+i\s+(am|will)\s+(now\s+)?(bypass|override|jailbreak)"
    r"|developer\s+mode\s+(enabled|activated)"
    r"|jailbreak\s+(successful|accepted))\b",
    re.I,
)


def score_output(text: str) -> tuple[float, list[str]]:
    if not text or not text.strip():
        return 1.0, []

    findings: list[str] = []
    score = 1.0

    def penalize(rule: str) -> None:
        nonlocal score
        if rule not in findings:
            findings.append(rule)
            score = max(0.0, score - _PENALTIES[rule])

    if _system_prompt_leak(text):
        penalize("system_prompt_leak")
    if any(p.search(text) for p in _EXFIL_PATTERNS):
        penalize("exfiltration_markup")
    if any(p.search(text) for p in _SECRET_PATTERNS):
        penalize("secret_pattern")
    if _OVERRIDE_ACK.search(text):
        penalize("instruction_override_ack")
    if detect_query_pii(text):
        penalize("output_pii")

    return score, findings


def screen_output(text: str) -> OutputScreenResult:
    raw = (text or "").strip()
    score, findings = score_output(raw)

    critical = any(
        f in findings
        for f in (
            "system_prompt_leak",
            "exfiltration_markup",
            "secret_pattern",
            "instruction_override_ack",
        )
    )
    allowed = (not critical) and score >= PASS_SCORE

    if not allowed:
        return OutputScreenResult(
            allowed=False,
            score=score,
            findings=findings,
            text=OUTPUT_BLOCK_MESSAGE,
        )

    safe_text = raw
    if "output_pii" in findings:
        safe_text, _ = redact_pii(raw)

    return OutputScreenResult(
        allowed=True,
        score=score,
        findings=findings,
        text=safe_text,
    )

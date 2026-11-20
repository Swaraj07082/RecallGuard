from __future__ import annotations

from typing import Any

from backend.generator import generate_answer
from backend.guardrails import (
    assert_no_prompt_injection,
    assert_no_query_pii,
    sanitize_chunks,
    screen_output,
)
from backend.retriever import retrieve


def chat(message: str, *, k: int = 4) -> dict[str, Any]:
    cleaned = (message or "").strip()
    if not cleaned:
        raise ValueError("message must not be empty")

    assert_no_query_pii(cleaned)
    assert_no_prompt_injection(cleaned)

    chunks = sanitize_chunks(retrieve(cleaned, k=k))
    screened = screen_output(generate_answer(cleaned, chunks))
    return {
        "answer": screened.text,
        "chunks": chunks,
        "output_policy": {
            "allowed": screened.allowed,
            "score": screened.score,
            "findings": screened.findings,
        },
    }

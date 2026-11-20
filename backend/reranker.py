"""Rerank retrieved chunks with a local cross-encoder."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from sentence_transformers import CrossEncoder
from langfuse import observe

DEFAULT_RERANKER_MODEL = os.getenv(
    "RERANKER_MODEL",
    "cross-encoder/ms-marco-MiniLM-L-6-v2",
)


@lru_cache(maxsize=1)
def get_reranker() -> CrossEncoder:
    return CrossEncoder(DEFAULT_RERANKER_MODEL)

@observe(name="rerank")
def rerank(
    query: str,
    chunks: list[dict[str, Any]],
    *,
    top_k: int,
) -> list[dict[str, Any]]:
    """Score (query, chunk) pairs and return the top_k chunks."""
    if not chunks:
        return []

    top_k = max(1, min(top_k, len(chunks)))
    cleaned = (query or "").strip()
    if not cleaned:
        return chunks[:top_k]

    pairs = [(cleaned, chunk.get("text") or "") for chunk in chunks]
    scores = get_reranker().predict(pairs)

    ranked = sorted(
        zip(chunks, scores, strict=True),
        key=lambda item: float(item[1]),
        reverse=True,
    )

    results: list[dict[str, Any]] = []
    for rank, (chunk, score) in enumerate(ranked[:top_k]):
        item = dict(chunk)
        item["rank"] = rank
        item["vector_score"] = float(chunk.get("score", 0.0))
        item["score"] = float(score)  # cross-encoder score (higher is better)
        item["rerank_score"] = float(score)
        results.append(item)
    return results

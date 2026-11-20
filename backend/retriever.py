from __future__ import annotations

from typing import Any

from backend.indexer import get_vector_store
from backend.reranker import rerank
from langfuse import observe

CANDIDATE_MULTIPLIER = 5
MAX_CANDIDATES = 50


@observe(name="retrieve", as_type="retriever")
def retrieve(query: str, k: int = 4) -> list[dict[str, Any]]:
    cleaned = (query or "").strip()
    if not cleaned:
        return []

    k = max(1, min(k, 20))
    candidate_k = min(max(k * CANDIDATE_MULTIPLIER, k), MAX_CANDIDATES)
    pairs = get_vector_store().similarity_search_with_score(cleaned, k=candidate_k)

    candidates: list[dict[str, Any]] = []
    for doc, score in pairs:
        meta = doc.metadata or {}
        candidates.append(
            {
                "text": doc.page_content,
                "score": float(score),
                "doc_id": meta.get("doc_id", ""),
                "filename": meta.get("filename", ""),
                "url": meta.get("url", ""),
                "source_site": meta.get("source_site", ""),
                "title": meta.get("title", ""),
                "chunk_index": meta.get("chunk_index", 0),
            }
        )

    return rerank(cleaned, candidates, top_k=k)

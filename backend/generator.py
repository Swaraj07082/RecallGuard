from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from groq import Groq
from langfuse import observe

load_dotenv()

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

SYSTEM_PROMPT = (
    "You are RecallGuard's RAG assistant for Ai Twin (aitwin.me) and Streamoji "
    "Avatars (avatars.streamoji.com). Answer only using the provided context "
    "chunks. If the context is insufficient, say you do not have enough "
    "information. Be concise and cite page URLs when useful."
)


def _build_context(chunks: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for chunk in chunks:
        source = (
            chunk.get("url")
            or chunk.get("filename")
            or chunk.get("doc_id")
            or "unknown"
        )
        index = chunk.get("chunk_index", "?")
        parts.append(f"[source={source} chunk={index}]\n{chunk.get('text', '').strip()}")
    return "\n\n".join(parts)


@observe(name="generate_answer", as_type="generation")
def generate_answer(query: str, chunks: list[dict[str, Any]]) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")

    if not chunks:
        return "I could not find relevant information in the indexed documents."

    context = _build_context(chunks)
    user_prompt = (
        f"Question:\n{query.strip()}\n\n"
        f"Context chunks:\n{context}\n\n"
        "Answer the question using only the context above."
    )

    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )
    message = completion.choices[0].message.content
    return (message or "").strip()

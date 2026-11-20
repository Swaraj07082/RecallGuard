from __future__ import annotations

import re
import unicodedata
from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def cleanup_text(text: str) -> str:
    """Normalize crawled/HTML text before chunking."""
    if not text:
        return ""

    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\x00", "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Chunk each page separately; assign a continuous global chunk_index."""
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

    chunks: list[dict[str, Any]] = []
    chunk_index = 0
    for page in pages:
        text = cleanup_text(page.get("text") or "")
        if not text:
            continue

        url = str(page.get("url") or page.get("filename") or "")
        for piece in text_splitter.split_text(text):
            chunks.append(
                {
                    "text": piece,
                    "chunk_index": chunk_index,
                    "doc_id": str(page.get("id") or ""),
                    "filename": url,
                    "url": url,
                    "source_site": str(page.get("source_site") or ""),
                    "title": str(page.get("title") or ""),
                }
            )
            chunk_index += 1

    return chunks


def create_documents(chunks: list[dict[str, Any]]) -> list[Document]:
    documents: list[Document] = []
    for chunk in chunks:
        documents.append(
            Document(
                page_content=chunk["text"],
                metadata={
                    "doc_id": chunk.get("doc_id") or "",
                    "filename": chunk.get("filename") or "",
                    "url": chunk.get("url") or "",
                    "source_site": chunk.get("source_site") or "",
                    "title": chunk.get("title") or "",
                    "chunk_index": int(chunk.get("chunk_index") or 0),
                },
            )
        )
    return documents

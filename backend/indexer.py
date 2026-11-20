from __future__ import annotations

import shutil
from functools import lru_cache
from pathlib import Path

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

CHROMA_DIR = Path(__file__).resolve().parent / "chroma_db"
COLLECTION_NAME = "recallguard_docs"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def get_vector_store() -> Chroma:
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings(),
        persist_directory=str(CHROMA_DIR),
    )


def clear_vector_store() -> None:
    get_vector_store.cache_clear()
    if CHROMA_DIR.exists():
        shutil.rmtree(CHROMA_DIR, ignore_errors=True)
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)


def index_documents(docs: list[Document]) -> int:
    if not docs:
        return 0
    store = get_vector_store()
    ids = store.add_documents(docs)
    return len(ids)


def similarity_search(query: str, k: int = 4) -> list[Document]:
    if not query.strip():
        return []
    return get_vector_store().similarity_search(query, k=k)

from __future__ import annotations

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langfuse import get_client, observe
from pydantic import BaseModel, Field

from backend.agent import chat
from backend.chunker import chunk_text, create_documents
from backend.crawler import ALLOWED_SITEMAPS, crawl_sites
from backend.eval.online_eval import run_rag_triad, should_sample
from backend.generator import generate_answer
from backend.guardrails import (
    InjectionBlockedError,
    PIIBlockedError,
    assert_no_prompt_injection,
    assert_no_query_pii,
    sanitize_chunks,
    screen_output,
)
from backend.indexer import clear_vector_store, get_vector_store, index_documents
from backend.retriever import retrieve

app = FastAPI(title="RecallGuard API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/status")
async def corpus_status() -> dict[str, object]:
    try:
        count = int(get_vector_store()._collection.count())
    except Exception:
        count = 0
    return {"status": "ok", "chunk_count": count}


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    k: int = Field(4, ge=1, le=20)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    k: int = Field(4, ge=1, le=20)


@app.post("/query")
@observe(name="query_documents")
async def query_documents(body: QueryRequest, background_tasks: BackgroundTasks) -> dict:
    try:
        assert_no_query_pii(body.query)
        assert_no_prompt_injection(body.query)
    except (PIIBlockedError, InjectionBlockedError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        chunks = sanitize_chunks(retrieve(body.query, k=body.k))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"retrieve failed: {exc}") from exc

    try:
        screened = screen_output(generate_answer(body.query, chunks))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"generate failed: {exc}") from exc

    query = body.query.strip()
    if should_sample():
        trace_id = get_client().get_current_trace_id()
        background_tasks.add_task(
            run_rag_triad,
            query,
            screened.text,
            chunks,
            trace_id,
        )

    return {
        "query": query,
        "answer": screened.text,
        "chunks": chunks,
        "output_policy": {
            "allowed": screened.allowed,
            "score": screened.score,
            "findings": screened.findings,
        },
    }


@app.post("/chat")
@observe(name="chat_turn")
async def chat_turn(body: ChatRequest, background_tasks: BackgroundTasks) -> dict:
    try:
        result = chat(body.message, k=body.k)
    except (PIIBlockedError, InjectionBlockedError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"chat failed: {exc}") from exc

    if should_sample():
        trace_id = get_client().get_current_trace_id()
        background_tasks.add_task(
            run_rag_triad,
            body.message.strip(),
            result["answer"],
            result["chunks"],
            trace_id,
        )

    return result


@app.post("/ingest")
async def ingest_sites() -> dict:
    try:
        clear_vector_store()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"clear store failed: {exc}") from exc

    try:
        pages_ok, pages_failed = crawl_sites(ALLOWED_SITEMAPS)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"crawl failed: {exc}") from exc

    chunk_count = 0
    indexed_count = 0
    index_error: str | None = None

    if pages_ok:
        try:
            documents = create_documents(chunk_text(pages_ok))
            chunk_count = len(documents)
            indexed_count = index_documents(documents)
        except Exception as exc:
            index_error = str(exc)

    sources = sorted({p["source_site"] for p in pages_ok})
    result = {
        "sitemaps": list(ALLOWED_SITEMAPS),
        "pages_ok": len(pages_ok),
        "pages_failed": pages_failed,
        "chunk_count": chunk_count,
        "indexed_count": indexed_count,
        "sources": sources,
    }
    if index_error:
        result["index_error"] = index_error
    return result

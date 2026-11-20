"""CLI: clear Chroma, crawl both sitemaps, chunk, and index."""

from __future__ import annotations

import json

from backend.chunker import chunk_text, create_documents
from backend.crawler import ALLOWED_SITEMAPS, crawl_sites
from backend.indexer import clear_vector_store, index_documents


def main() -> None:
    print("Clearing vector store...")
    clear_vector_store()

    print(f"Crawling {len(ALLOWED_SITEMAPS)} sitemaps...")
    pages_ok, pages_failed = crawl_sites(ALLOWED_SITEMAPS)
    print(f"pages_ok={len(pages_ok)} pages_failed={len(pages_failed)}")
    for fail in pages_failed[:20]:
        print(f"  fail: {fail['url']} -> {fail['reason']}")

    documents = create_documents(chunk_text(pages_ok))
    print(f"chunk_count={len(documents)}; indexing...")
    indexed = index_documents(documents)
    result = {
        "pages_ok": len(pages_ok),
        "pages_failed": len(pages_failed),
        "chunk_count": len(documents),
        "indexed_count": indexed,
        "sources": sorted({p["source_site"] for p in pages_ok}),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

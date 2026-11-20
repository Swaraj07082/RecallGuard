"""Crawl fixed sitemaps and extract clean page text for RAG ingest."""

from __future__ import annotations

import hashlib
import re
import time
import xml.etree.ElementTree as ET
from typing import Any
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

ALLOWED_SITEMAPS = (
    "https://aitwin.me/sitemap.xml",
    "https://avatars.streamoji.com/sitemap.xml",
)

MIN_TEXT_CHARS = 100
REQUEST_TIMEOUT = 30.0
POLITE_DELAY_SEC = 0.25
USER_AGENT = "RecallGuardBot/0.1 (+local-rag-ingest)"


def _source_site(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def _doc_id_for_url(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def parse_sitemap_urls(sitemap_url: str, client: httpx.Client) -> list[str]:
    response = client.get(sitemap_url)
    response.raise_for_status()
    root = ET.fromstring(response.text)
    urls: list[str] = []
    for node in root.iter():
        if node.tag.endswith("loc") and node.text:
            loc = node.text.strip()
            if loc:
                urls.append(loc)
    # de-dupe, preserve order
    seen: set[str] = set()
    ordered: list[str] = []
    for url in urls:
        if url not in seen:
            seen.add(url)
            ordered.append(url)
    return ordered


def extract_text_from_html(html: str, url: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "svg", "iframe"]):
        tag.decompose()
    for tag in soup.find_all(["nav", "footer", "header", "aside"]):
        tag.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    root = soup.find("main") or soup.find("article") or soup.body or soup
    text = root.get_text("\n", strip=True) if root else ""
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not title:
        title = urlparse(url).path or url
    return title, text


def fetch_page(url: str, client: httpx.Client) -> dict[str, Any]:
    response = client.get(url, follow_redirects=True)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "")
    if "html" not in content_type.lower() and not response.text.lstrip().lower().startswith(
        ("<!doctype html", "<html")
    ):
        raise ValueError(f"non-html content-type: {content_type or 'unknown'}")

    title, text = extract_text_from_html(response.text, url)
    if len(text) < MIN_TEXT_CHARS:
        raise ValueError(f"extracted text too short ({len(text)} chars)")

    path = urlparse(url).path or "/"
    return {
        "id": _doc_id_for_url(url),
        "url": url,
        "title": title,
        "source_site": _source_site(url),
        "filename": path,
        "text": text,
        "char_count": len(text),
    }


def crawl_sites(
    sitemap_urls: tuple[str, ...] = ALLOWED_SITEMAPS,
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Crawl allowed sitemaps. Returns (pages_ok, pages_failed)."""
    pages_ok: list[dict[str, Any]] = []
    pages_failed: list[dict[str, str]] = []

    headers = {"User-Agent": USER_AGENT}
    with httpx.Client(timeout=REQUEST_TIMEOUT, headers=headers) as client:
        all_urls: list[str] = []
        for sitemap in sitemap_urls:
            try:
                all_urls.extend(parse_sitemap_urls(sitemap, client))
            except Exception as exc:  # noqa: BLE001
                pages_failed.append({"url": sitemap, "reason": f"sitemap failed: {exc}"})

        seen: set[str] = set()
        for url in all_urls:
            if url in seen:
                continue
            seen.add(url)
            try:
                pages_ok.append(fetch_page(url, client))
            except Exception as exc:  # noqa: BLE001
                pages_failed.append({"url": url, "reason": str(exc)})
            time.sleep(POLITE_DELAY_SEC)

    return pages_ok, pages_failed

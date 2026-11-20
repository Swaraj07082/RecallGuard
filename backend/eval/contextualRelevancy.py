from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Allow `python -m eval.contextualPrecision` from the backend/ directory.
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from deepeval import evaluate
from deepeval.evaluate.configs import CacheConfig, DisplayConfig
from deepeval.metrics import ContextualRelevancyMetric
from deepeval.models import OpenRouterModel
from deepeval.test_case import LLMTestCase

from backend.generator import generate_answer
from backend.retriever import retrieve

GOLDEN_PATH = Path(__file__).resolve().parent / "golden_dataset.json"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY is not set")

# LLM-as-judge via OpenRouter (RAG answers still use Groq).
# Default: cheap/high-throughput Flash-Lite to reduce cost and rate-limit hits.
JUDGE_MODEL = os.getenv("DEEPEVAL_OPENROUTER_MODEL", "google/gemini-2.5-flash-lite")

goldens = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))

# Keep a small subset active to avoid Groq TPM limits while generating answers.
ACTIVE_GOLDEN_IDS = {
    "aitwin_what_is",
    "aitwin_create",
    "streamoji_welcome",
    "streamoji_blendshapes",
    # "aitwin_player",
    # "aitwin_get_twins",
    # "aitwin_join_meeting",
    # "aitwin_livekit",
    # "aitwin_pricing",
    # "aitwin_docs_hub",
    # "aitwin_heygen_alt",
    # "aitwin_browser_avatars",
    # "streamoji_glb",
    # "streamoji_auth",
    # "streamoji_credits",
    # "streamoji_unity",
    # "streamoji_web_quickstart",
    # "streamoji_faq",
}
goldens = [g for g in goldens if g["id"] in ACTIVE_GOLDEN_IDS]


print(f"loaded {len(goldens)} goldens")
print(f"judge model: openrouter/{JUDGE_MODEL}")

judge = OpenRouterModel(model=JUDGE_MODEL, api_key=OPENROUTER_API_KEY)
metric = ContextualRelevancyMetric(model=judge, include_reason=True)

# Windows portalocker shared-lock can leave the on-disk cache as None and crash.
cache_config = CacheConfig(write_cache=False, use_cache=False)
display_config = DisplayConfig(show_indicator=True, print_results=True)

test_cases: list[LLMTestCase] = []
for golden in goldens:
    chunks = retrieve(golden["query"], k=4)
    context_texts = [c.get("text") or "" for c in chunks]
    test_cases.append(
        LLMTestCase(
            input=golden["query"],
            actual_output=generate_answer(golden["query"], chunks),
            retrieval_context=context_texts,
        )
    )

result = evaluate(
    test_cases,
    [metric],
    cache_config=cache_config,
    display_config=display_config,
)
print(result)

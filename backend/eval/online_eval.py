"""Online RAG triad scoring helper."""

from __future__ import annotations

import logging
import os
import random
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

logger = logging.getLogger(__name__)

DEFAULT_JUDGE_MODEL = "google/gemini-2.5-flash-lite"


def should_sample(sample_rate: float | None = None) -> bool:
    if sample_rate is None:
        sample_rate = float(os.getenv("ONLINE_EVAL_SAMPLE_RATE", "0.1"))
    sample_rate = max(0.0, min(1.0, sample_rate))
    if sample_rate <= 0.0:
        return False
    if sample_rate >= 1.0:
        return True
    return random.random() < sample_rate


def _publish_scores_to_langfuse(
    trace_id: str,
    scores: dict[str, Any],
) -> None:
    from langfuse import get_client

    lf = get_client()
    for name, data in scores.items():
        value = data.get("score")
        if value is None:
            continue
        lf.create_score(
            trace_id=trace_id,
            name=name,
            value=float(value),
            data_type="NUMERIC",
            comment=data.get("reason") or None,
            metadata={
                "success": data.get("success"),
                "threshold": data.get("threshold"),
            },
        )
    lf.flush()


def run_rag_triad(
    query: str,
    answer: str,
    chunks: list[dict[str, Any]],
    trace_id: str | None = None,
) -> dict[str, Any] | None:
    """
    Score one turn with Contextual Relevancy + Faithfulness + Answer Relevancy.
    If trace_id is provided, attach scores to that Langfuse trace.
    Returns scores dict, or None on failure / missing API key.
    """
    try:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            logger.warning("run_rag_triad skipped: OPENROUTER_API_KEY is not set")
            return None

        from deepeval.metrics import (
            AnswerRelevancyMetric,
            ContextualRelevancyMetric,
            FaithfulnessMetric,
        )
        from deepeval.models import OpenRouterModel
        from deepeval.test_case import LLMTestCase

        judge_model = os.getenv("DEEPEVAL_OPENROUTER_MODEL", DEFAULT_JUDGE_MODEL)
        judge = OpenRouterModel(model=judge_model, api_key=api_key)

        metrics = [
            ("contextual_relevancy", ContextualRelevancyMetric(
                model=judge, include_reason=True, async_mode=False
            )),
            ("faithfulness", FaithfulnessMetric(
                model=judge, include_reason=True, async_mode=False
            )),
            ("answer_relevancy", AnswerRelevancyMetric(
                model=judge, include_reason=True, async_mode=False
            )),
        ]

        test_case = LLMTestCase(
            input=query,
            actual_output=answer,
            retrieval_context=[c.get("text") or "" for c in chunks],
        )

        scores: dict[str, Any] = {}
        for key, metric in metrics:
            metric.measure(test_case)
            scores[key] = {
                "score": metric.score,
                "success": metric.success,
                "reason": getattr(metric, "reason", None),
                "threshold": getattr(metric, "threshold", None),
            }

        if trace_id:
            try:
                _publish_scores_to_langfuse(trace_id, scores)
                logger.info(
                    "published triad scores to langfuse trace_id=%s scores=%s",
                    trace_id,
                    {k: v.get("score") for k, v in scores.items()},
                )
            except Exception:  # noqa: BLE001
                logger.exception(
                    "failed to publish triad scores to langfuse trace_id=%s",
                    trace_id,
                )

        return scores
    except Exception:  # noqa: BLE001
        logger.exception("run_rag_triad failed")
        return None

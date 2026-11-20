"""Run all offline RAG metrics and write baseline/candidate JSON."""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from deepeval import evaluate
from deepeval.evaluate.configs import AsyncConfig, CacheConfig, DisplayConfig
from deepeval.metrics import (
    AnswerRelevancyMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
    FaithfulnessMetric,
)
from deepeval.models import OpenRouterModel
from deepeval.test_case import LLMTestCase

from backend.eval.metric_registry import DEEPEVAL_NAME_TO_KEY, METRICS
from backend.generator import generate_answer
from backend.retriever import retrieve

GOLDEN_PATH = Path(__file__).resolve().parent / "golden_dataset.json"
DEFAULT_JUDGE_MODEL = "google/gemini-2.5-flash-lite"

# Keep a small subset active to avoid Groq TPM limits while generating answers.
ACTIVE_GOLDEN_IDS = {
    "aitwin_what_is",
    "aitwin_create",
    "streamoji_welcome",
    "streamoji_blendshapes",
}


def _load_goldens() -> list[dict[str, Any]]:
    goldens = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    return [g for g in goldens if g["id"] in ACTIVE_GOLDEN_IDS]


def _build_test_cases(goldens: list[dict[str, Any]]) -> list[LLMTestCase]:
    cases: list[LLMTestCase] = []
    for golden in goldens:
        chunks = retrieve(golden["query"], k=4)
        context_texts = [c.get("text") or "" for c in chunks]
        cases.append(
            LLMTestCase(
                input=golden["query"],
                actual_output=generate_answer(golden["query"], chunks),
                expected_output=golden["expected_output"],
                retrieval_context=context_texts,
            )
        )
    return cases


def _make_metrics(judge: OpenRouterModel) -> list[Any]:
    # Serialize judge calls to avoid OpenRouter 429s.
    return [
        ContextualRelevancyMetric(model=judge, include_reason=True, async_mode=False),
        ContextualPrecisionMetric(model=judge, include_reason=True, async_mode=False),
        ContextualRecallMetric(model=judge, include_reason=True, async_mode=False),
        FaithfulnessMetric(model=judge, include_reason=True, async_mode=False),
        AnswerRelevancyMetric(model=judge, include_reason=True, async_mode=False),
    ]


def _average_scores(result: Any) -> dict[str, float]:
    buckets: dict[str, list[float]] = {key: [] for key in METRICS}
    for test_result in result.test_results or []:
        for metric_data in test_result.metrics_data or []:
            key = DEEPEVAL_NAME_TO_KEY.get(metric_data.name)
            if key is None or metric_data.score is None:
                continue
            buckets[key].append(float(metric_data.score))

    averages: dict[str, float] = {}
    for key, values in buckets.items():
        if not values:
            raise RuntimeError(f"no scores collected for metric '{key}'")
        averages[key] = statistics.fmean(values)
    return averages


def _aggregate_metric_runs(
    run_scores: list[dict[str, float]],
) -> dict[str, dict[str, Any]]:
    metrics_out: dict[str, dict[str, Any]] = {}
    for key, spec in METRICS.items():
        values = [run[key] for run in run_scores]
        mean = statistics.fmean(values)
        std = statistics.pstdev(values) if len(values) > 1 else 0.0
        noise = max(float(spec["default_noise"]), 2.0 * std)
        metrics_out[key] = {
            "mean": mean,
            "values": values,
            "std": std,
            "noise": noise,
            "higher_is_better": bool(spec["higher_is_better"]),
        }
    return metrics_out


def run_regression(*, runs: int) -> dict[str, Any]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    judge_model = os.getenv("DEEPEVAL_OPENROUTER_MODEL", DEFAULT_JUDGE_MODEL)
    goldens = _load_goldens()
    if not goldens:
        raise RuntimeError("no active goldens selected")

    print(f"loaded {len(goldens)} goldens")
    print(f"judge model: openrouter/{judge_model}")
    print(f"runs: {runs}")

    judge = OpenRouterModel(model=judge_model, api_key=api_key)
    cache_config = CacheConfig(write_cache=False, use_cache=False)
    display_config = DisplayConfig(show_indicator=True, print_results=False)
    async_config = AsyncConfig(max_concurrent=1, throttle_value=1.0)

    run_scores: list[dict[str, float]] = []
    for run_idx in range(1, runs + 1):
        print(f"\n=== regression run {run_idx}/{runs}: generate answers ===")
        test_cases = _build_test_cases(goldens)
        print(f"=== regression run {run_idx}/{runs}: evaluate {len(METRICS)} metrics ===")
        result = evaluate(
            test_cases,
            _make_metrics(judge),
            async_config=async_config,
            cache_config=cache_config,
            display_config=display_config,
        )
        averages = _average_scores(result)
        run_scores.append(averages)
        print(
            f"run {run_idx} averages: "
            + ", ".join(f"{k}={v:.4f}" for k, v in averages.items())
        )

    payload = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "judge_model": judge_model,
        "runs": runs,
        "golden_ids": [g["id"] for g in goldens],
        "metrics": _aggregate_metric_runs(run_scores),
    }
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run all offline RAG metrics into a baseline/candidate JSON file.",
    )
    parser.add_argument(
        "--out",
        required=True,
        type=Path,
        help="Output JSON path (e.g. eval/baseline.json or eval/candidate.json)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=3,
        help="How many full eval passes to average (default: 3). Use 1 for candidate runs.",
    )
    args = parser.parse_args()
    if args.runs < 1:
        raise SystemExit("--runs must be >= 1")

    payload = run_regression(runs=args.runs)
    out_path = args.out
    if not out_path.is_absolute():
        out_path = Path.cwd() / out_path
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {out_path}")
    for key, data in payload["metrics"].items():
        print(
            f"  {key}: mean={data['mean']:.4f} std={data['std']:.4f} "
            f"noise={data['noise']:.4f} higher_is_better={data['higher_is_better']}"
        )


if __name__ == "__main__":
    main()

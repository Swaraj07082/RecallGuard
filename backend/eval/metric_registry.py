"""Registry of offline RAG regression metrics: direction + default noise."""

from __future__ import annotations

from typing import TypedDict


class MetricSpec(TypedDict):
    higher_is_better: bool
    default_noise: float
    # DeepEval MetricData.name as shown in evaluate results.
    deepeval_name: str


# Scores are on a 0–1 scale unless noted later (e.g. latency in ms).
METRICS: dict[str, MetricSpec] = {
    "contextual_relevancy": {
        "higher_is_better": True,
        "default_noise": 0.05,
        "deepeval_name": "Contextual Relevancy",
    },
    "contextual_precision": {
        "higher_is_better": True,
        "default_noise": 0.05,
        "deepeval_name": "Contextual Precision",
    },
    "contextual_recall": {
        "higher_is_better": True,
        "default_noise": 0.05,
        "deepeval_name": "Contextual Recall",
    },
    "faithfulness": {
        "higher_is_better": True,
        "default_noise": 0.05,
        "deepeval_name": "Faithfulness",
    },
    "answer_relevancy": {
        "higher_is_better": True,
        "default_noise": 0.05,
        "deepeval_name": "Answer Relevancy",
    },
}


DEEPEVAL_NAME_TO_KEY: dict[str, str] = {
    spec["deepeval_name"]: key for key, spec in METRICS.items()
}

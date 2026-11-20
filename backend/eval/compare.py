"""Compare candidate.json vs baseline.json with direction-aware noise bands."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.eval.metric_registry import METRICS


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _mean(payload: dict[str, Any], metric: str) -> float:
    metrics = payload.get("metrics") or {}
    if metric not in metrics:
        raise KeyError(f"metric '{metric}' missing from results JSON")
    value = metrics[metric].get("mean")
    if value is None:
        raise KeyError(f"metric '{metric}' has no mean")
    return float(value)


def _noise(baseline: dict[str, Any], metric: str) -> float:
    spec = METRICS[metric]
    baseline_noise = float((baseline.get("metrics") or {}).get(metric, {}).get("noise") or 0.0)
    return max(float(spec["default_noise"]), baseline_noise)


def _is_regression(
    *,
    baseline_mean: float,
    candidate_mean: float,
    noise: float,
    higher_is_better: bool,
) -> bool:
    if higher_is_better:
        return candidate_mean < (baseline_mean - noise)
    return candidate_mean > (baseline_mean + noise)


def compare(baseline: dict[str, Any], candidate: dict[str, Any]) -> int:
    rows: list[dict[str, Any]] = []
    failed = 0

    print("metric                  baseline  candidate   delta    noise  status")
    print("-" * 72)

    for key, spec in METRICS.items():
        base = _mean(baseline, key)
        cand = _mean(candidate, key)
        noise = _noise(baseline, key)
        delta = cand - base
        higher = bool(spec["higher_is_better"])
        regressed = _is_regression(
            baseline_mean=base,
            candidate_mean=cand,
            noise=noise,
            higher_is_better=higher,
        )
        if regressed:
            status = "REGRESS"
            failed += 1
        elif (higher and cand > base + noise) or ((not higher) and cand < base - noise):
            status = "IMPROVE"
        else:
            status = "OK"

        rows.append(
            {
                "metric": key,
                "baseline": base,
                "candidate": cand,
                "delta": delta,
                "noise": noise,
                "status": status,
            }
        )
        print(
            f"{key:<22} {base:>8.4f}  {cand:>8.4f}  {delta:>+6.4f}  "
            f"{noise:>6.4f}  {status}"
        )

    print("-" * 72)
    if failed:
        print(f"FAIL: {failed} metric(s) regressed beyond noise band")
        return 1

    print("PASS: no regressions beyond noise band")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare candidate RAG metric JSON against baseline with noise bands.",
    )
    parser.add_argument("--baseline", required=True, type=Path)
    parser.add_argument("--candidate", required=True, type=Path)
    args = parser.parse_args()

    baseline = _load_json(args.baseline)
    candidate = _load_json(args.candidate)
    raise SystemExit(compare(baseline, candidate))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Aggregate raw experiment results into tables, figures and a Markdown report.

Input : experiments/results/raw/<EXP>/*.json  (written by experiments/lib/harness.js)
Output: experiments/results/summary/<EXP>.csv   tidy per-level statistics
        experiments/results/summary/<EXP>_pairwise.csv  level-vs-baseline tests
        experiments/results/figures/<EXP>.png|svg  distribution plots
        experiments/results/REPORT.md              human-readable report

Statistics
----------
Latency samples are not normally distributed (right-skewed, occasional
outliers), so the analysis is rank-based:

* location: median with a percentile-bootstrap 95 % CI (B = 2000, seeded);
* comparison against the first level (the baseline): two-sided Mann-Whitney U
  (scipy) with Holm correction across the comparisons within an experiment;
* effect size: Cliff's delta, reported with the usual thresholds
  (|d| < 0.147 negligible, < 0.33 small, < 0.474 medium, else large), plus the
  ratio of medians, which is what practitioners want to know.

If several runs exist for an experiment (e.g. different MongoDB versions) each
run is analysed separately and all appear in the report, keyed by server
version and start time.
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import matplotlib
import numpy as np
import pandas as pd
from scipy import stats

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "experiments" / "results" / "raw"
SUMMARY_DIR = ROOT / "experiments" / "results" / "summary"
FIGURE_DIR = ROOT / "experiments" / "results" / "figures"
REPORT = ROOT / "experiments" / "results" / "REPORT.md"

BOOTSTRAP_B = 2000
RNG_SEED = 20251003


# ----------------------------------------------------------------- statistics
def bootstrap_median_ci(x: np.ndarray, b: int = BOOTSTRAP_B, seed: int = RNG_SEED):
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(x), size=(b, len(x)))
    medians = np.median(x[idx], axis=1)
    return float(np.percentile(medians, 2.5)), float(np.percentile(medians, 97.5))


def cliffs_delta(a: np.ndarray, b: np.ndarray) -> float:
    """Probability that a value from a exceeds one from b, minus the reverse."""
    a = np.asarray(a)[:, None]
    b = np.asarray(b)[None, :]
    return float((np.sign(a - b)).mean())


def effect_label(d: float) -> str:
    d = abs(d)
    if d < 0.147:
        return "negligible"
    if d < 0.33:
        return "small"
    if d < 0.474:
        return "medium"
    return "large"


def holm(pvals: List[float]) -> List[float]:
    """Holm-Bonferroni adjusted p-values."""
    m = len(pvals)
    order = np.argsort(pvals)
    adjusted = np.empty(m)
    running = 0.0
    for rank, i in enumerate(order):
        running = max(running, (m - rank) * pvals[i])
        adjusted[i] = min(1.0, running)
    return adjusted.tolist()


# -------------------------------------------------------------------- loading
def load_runs() -> Dict[str, List[dict]]:
    runs: Dict[str, List[dict]] = {}
    for path in sorted(RAW_DIR.glob("E*/*.json")):
        with open(path, encoding="utf-8") as fh:
            run = json.load(fh)
        run["_path"] = path
        runs.setdefault(run["experiment"]["id"], []).append(run)
    return runs


def run_label(run: dict) -> str:
    env = run["environment"]
    ver = env["server"].get("version") or "unknown"
    topo = env["topology"].get("kind", "?")
    started = run["started_at"][:19].replace("T", " ")
    return f"MongoDB {ver} ({topo}), {started} UTC"


# ------------------------------------------------------------------- analysis
def summarise(run: dict) -> pd.DataFrame:
    rows = []
    unit = run["experiment"]["design"]["unit"]
    for level in run["levels"]:
        x = np.asarray(level["samples"], dtype=float)
        lo, hi = bootstrap_median_ci(x)
        rows.append(
            {
                "experiment": run["experiment"]["id"],
                "server_version": run["environment"]["server"].get("version"),
                "topology": run["environment"]["topology"].get("kind"),
                "level": level["name"],
                "unit": unit,
                "n": len(x),
                "median": float(np.median(x)),
                "median_ci_lo": lo,
                "median_ci_hi": hi,
                "mean": float(x.mean()),
                "sd": float(x.std(ddof=1)) if len(x) > 1 else 0.0,
                "cv": float(x.std(ddof=1) / x.mean()) if len(x) > 1 and x.mean() else float("nan"),
                "p25": float(np.percentile(x, 25)),
                "p75": float(np.percentile(x, 75)),
                "p95": float(np.percentile(x, 95)),
                "min": float(x.min()),
                "max": float(x.max()),
                "probe": json.dumps(level.get("probe") or {}, sort_keys=True),
            }
        )
    return pd.DataFrame(rows)


def pairwise(run: dict) -> pd.DataFrame:
    levels = run["levels"]
    base = levels[0]
    bx = np.asarray(base["samples"], dtype=float)
    rows = []
    for level in levels[1:]:
        x = np.asarray(level["samples"], dtype=float)
        u, p = stats.mannwhitneyu(x, bx, alternative="two-sided")
        d = cliffs_delta(x, bx)
        rows.append(
            {
                "experiment": run["experiment"]["id"],
                "server_version": run["environment"]["server"].get("version"),
                "baseline": base["name"],
                "level": level["name"],
                "median_ratio": (
                    float(np.median(x) / np.median(bx)) if np.median(bx) else float("nan")
                ),
                "mann_whitney_U": float(u),
                "p_value": float(p),
                "cliffs_delta": d,
                "effect": effect_label(d),
            }
        )
    df = pd.DataFrame(rows)
    if not df.empty:
        df["p_holm"] = holm(df["p_value"].tolist())
        df["significant_0.05"] = df["p_holm"] < 0.05
    return df


def plot(run: dict, out_base: Path) -> None:
    unit = run["experiment"]["design"]["unit"]
    names = [lvl["name"] for lvl in run["levels"]]
    data = [np.asarray(lvl["samples"], dtype=float) for lvl in run["levels"]]

    fig, ax = plt.subplots(figsize=(max(6, 1.6 * len(names)), 4.2))
    ax.boxplot(
        data, tick_labels=names, showfliers=False, medianprops={"color": "#1f4e79", "linewidth": 2}
    )
    rng = np.random.default_rng(RNG_SEED)
    for i, x in enumerate(data, start=1):
        jitter = rng.uniform(-0.18, 0.18, size=len(x))
        ax.scatter(np.full(len(x), i) + jitter, x, s=10, alpha=0.45, color="#4c78a8", linewidths=0)
    spread = max(float(np.max(d) / max(np.min(d), 1e-9)) for d in data if len(d))
    if spread > 50:
        ax.set_yscale("log")
    ax.set_ylabel(unit)
    ax.set_title(f"{run['experiment']['id']} — {run['experiment']['title']}", fontsize=10)
    ax.set_xlabel(run["experiment"]["design"]["independent"], fontsize=9)
    ax.grid(axis="y", alpha=0.3)
    ax.text(
        0.01,
        0.01,
        f"{run_label(run)} · n={run['parameters']['trials']} per level · boxes: IQR, line: median",
        transform=ax.transAxes,
        fontsize=7,
        color="#555",
    )
    fig.tight_layout()
    fig.savefig(out_base.with_suffix(".png"), dpi=150)
    fig.savefig(out_base.with_suffix(".svg"))
    plt.close(fig)


def fmt_num(x: float, unit: str) -> str:
    if unit == "docs/s":
        return f"{x:,.0f}"
    if x >= 100:
        return f"{x:,.0f}"
    if x >= 10:
        return f"{x:.1f}"
    return f"{x:.2f}"


def render_report(
    runs: Dict[str, List[dict]],
    summaries: Dict[str, List[pd.DataFrame]],
    pairs: Dict[str, List[pd.DataFrame]],
) -> str:
    out: List[str] = []
    out.append("# Experiment Report\n")
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    out.append(f"Generated {stamp} by `experiments/analysis/analyze.py`.\n")
    out.append(
        "Each experiment lists its hypothesis, the measured levels (median with 95 % bootstrap "
        "CI, p95, coefficient of variation), a rank-based comparison of every level against the "
        "first (baseline) level, and the environment the run was captured in. Raw per-trial "
        "samples are in `raw/`; tidy tables in `summary/`. See `docs/research/METHODOLOGY.md` "
        "for the protocol and `docs/research/THREATS_TO_VALIDITY.md` for caveats.\n"
    )
    out.append("## Contents\n")
    for exp_id in sorted(runs):
        out.append(f"- [{exp_id} — {runs[exp_id][0]['experiment']['title']}](#{exp_id.lower()})")
    out.append("")

    for exp_id in sorted(runs):
        for run, summ, pair in zip(runs[exp_id], summaries[exp_id], pairs[exp_id]):
            exp = run["experiment"]
            unit = exp["design"]["unit"]
            env = run["environment"]
            out.append(f"## {exp_id}\n")
            out.append(f"**{exp['title']}**  \n*Run:* {run_label(run)}\n")
            out.append(f"**Hypothesis.** {exp['hypothesis']}\n")
            prm = run["parameters"]
            out.append(
                f"**Design.** Independent variable: {exp['design']['independent']}. "
                f"Dependent variable: {exp['design']['dependent']} ({unit}). "
                f"{prm['trials']} trials per level after {prm['warmup']} warm-up iterations, "
                f"{prm['order']} order, seed {prm['seed']}."
            )
            if exp["design"].get("controlled"):
                out.append(" Controlled: " + "; ".join(exp["design"]["controlled"]) + ".")
            if exp["design"].get("notes"):
                out.append(f" {exp['design']['notes']}")
            out.append("")
            fig_rel = f"figures/{exp_id}_{run['_path'].stem}.png"
            out.append(f"![{exp_id}]({fig_rel})\n")
            out.append(f"| level | n | median ({unit}) | 95 % CI | p95 | CV | probe |")
            out.append("|---|---:|---:|---|---:|---:|---|")
            for _, r in summ.iterrows():
                probe = json.loads(r["probe"])
                probe_txt = ", ".join(f"{k}={v}" for k, v in probe.items()) if probe else ""
                ci = f"[{fmt_num(r['median_ci_lo'], unit)}, {fmt_num(r['median_ci_hi'], unit)}]"
                out.append(
                    f"| `{r['level']}` | {r['n']} | {fmt_num(r['median'], unit)} | {ci} | "
                    f"{fmt_num(r['p95'], unit)} | {r['cv']:.2f} | {probe_txt} |"
                )
            out.append("")
            if not pair.empty:
                base_name = pair.iloc[0]["baseline"]
                out.append(
                    f"Comparison against baseline `{base_name}` "
                    "(Mann-Whitney U, Holm-adjusted):\n"
                )
                out.append("| level | median ratio | Cliff's δ | effect | p (Holm) |")
                out.append("|---|---:|---:|---|---:|")
                for _, r in pair.iterrows():
                    out.append(
                        f"| `{r['level']}` | {r['median_ratio']:.2f}× | {r['cliffs_delta']:+.2f} "
                        f"| {r['effect']} | {r['p_holm']:.2e} |"
                    )
                out.append("")
            srv = env["server"]
            host = env["server_host"]
            ds = env.get("dataset") or {}
            out.append("<details><summary>Environment</summary>\n")
            cache_bytes = srv.get("wiredtiger_cache_max_bytes")
            cache_gib = (
                cache_bytes / 2**30 if isinstance(cache_bytes, (int, float)) else float("nan")
            )
            client = env["client_host"]
            commit = (env["repository"].get("git_commit") or "unknown")[:12]
            out.append(
                f"- Server: MongoDB {srv.get('version')} ({srv.get('storage_engine')}, "
                f"cache {cache_gib:.1f} GiB), topology {env['topology'].get('kind')} "
                f"with {env['topology'].get('members')} member(s)\n"
                f"- Server host: {host.get('os')}, {host.get('cpu_arch')}, "
                f"{host.get('cpu_cores')} cores, {host.get('mem_mb')} MB\n"
                f"- Client: mongosh {client.get('mongosh')}, node {client.get('node')}, "
                f"{client.get('cpu_model')}\n"
                f"- Repository commit: `{commit}`\n"
                f"- Dataset: generator {ds.get('generator_version')}, "
                f"parameters {json.dumps(ds.get('parameters'))}\n"
                f"- Raw file: `raw/{exp_id}/{run['_path'].name}`\n"
            )
            out.append("</details>\n")
    return "\n".join(out) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--no-figures", action="store_true")
    args = parser.parse_args()

    runs = load_runs()
    if not runs:
        print(f"no results under {RAW_DIR}")
        return 1
    # Outputs are derived entirely from raw/, so rebuild them from scratch.
    for d in (SUMMARY_DIR, FIGURE_DIR):
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True, exist_ok=True)

    summaries: Dict[str, List[pd.DataFrame]] = {}
    pairs: Dict[str, List[pd.DataFrame]] = {}
    for exp_id, exp_runs in runs.items():
        for run in exp_runs:
            summaries.setdefault(exp_id, []).append(summarise(run))
            pairs.setdefault(exp_id, []).append(pairwise(run))
            if not args.no_figures:
                plot(run, FIGURE_DIR / f"{exp_id}_{run['_path'].stem}")
        pd.concat(summaries[exp_id]).to_csv(
            SUMMARY_DIR / f"{exp_id}.csv", index=False, float_format="%.4f"
        )
        pw = pd.concat(pairs[exp_id])
        if not pw.empty:
            pw.to_csv(SUMMARY_DIR / f"{exp_id}_pairwise.csv", index=False, float_format="%.4g")
        print(f"{exp_id}: {len(exp_runs)} run(s) analysed")

    REPORT.write_text(render_report(runs, summaries, pairs), encoding="utf-8")
    print(f"report written to {REPORT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

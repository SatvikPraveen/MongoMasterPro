#!/usr/bin/env bash
# experiments/run.sh — run one or more experiment specs with mongosh.
#
#   experiments/run.sh [-u URI] [-t TRIALS] [-w WARMUP] [-o RESULTS_DIR] [-c CONTAINER] E01 [E02 ...] | all
#
# -u  connection string (default mongodb://localhost:27017/?directConnection=true)
# -t  trials per level (overrides the spec)       -w  warm-up iterations per level
# -o  results directory (default experiments/results/raw)
# -c  run mongosh inside a docker container that has the repo mounted at /app
#     (results are then written under /app/<-o>, so the mount must be writable)
#
# Every run records the git commit, server build, topology and dataset manifest
# in the result file; see experiments/lib/harness.js.
set -euo pipefail

URI="mongodb://localhost:27017/?directConnection=true"; TRIALS=""; WARMUP=""; OUT=""; CONTAINER=""
while getopts "u:t:w:o:c:" opt; do
  case $opt in
    u) URI=$OPTARG ;; t) TRIALS=$OPTARG ;; w) WARMUP=$OPTARG ;; o) OUT=$OPTARG ;; c) CONTAINER=$OPTARG ;;
    *) sed -n '2,13p' "$0"; exit 2 ;;
  esac
done
shift $((OPTIND - 1))
[ $# -ge 1 ] || { sed -n '2,13p' "$0"; exit 2; }

ROOT=$(cd "$(dirname "$0")/.." && pwd)
if [ "$1" = "all" ]; then
  SPECS=("$ROOT"/experiments/specs/E*.js)
else
  SPECS=()
  for id in "$@"; do
    match=$(ls "$ROOT"/experiments/specs/"${id}"_*.js 2>/dev/null | head -1)
    [ -n "$match" ] || { echo "no spec for $id under experiments/specs" >&2; exit 1; }
    SPECS+=("$match")
  done
fi

GIT_SHA=$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)
status=0
for spec in "${SPECS[@]}"; do
  rel=${spec#"$ROOT"/}
  echo "▶ $rel"
  envs=(MMP_GIT_SHA="$GIT_SHA")
  [ -z "$TRIALS" ] || envs+=(MMP_TRIALS="$TRIALS")
  [ -z "$WARMUP" ] || envs+=(MMP_WARMUP="$WARMUP")
  if [ -n "$CONTAINER" ]; then
    args=(-e MMP_ROOT=/app)
    [ -z "$OUT" ] || args+=(-e MMP_RESULTS_DIR="/app/$OUT")
    for kv in "${envs[@]}"; do args+=(-e "$kv"); done
    docker exec "${args[@]}" "$CONTAINER" mongosh "$URI" --quiet --file "/app/$rel" || status=1
  else
    [ -z "$OUT" ] || envs+=(MMP_RESULTS_DIR="$ROOT/$OUT")
    env MMP_ROOT="$ROOT" "${envs[@]}" mongosh "$URI" --quiet --file "$spec" || status=1
  fi
done
exit $status

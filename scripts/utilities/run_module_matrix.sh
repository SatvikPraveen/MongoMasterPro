#!/usr/bin/env bash
# run_module_matrix.sh — execute every learning-module script against a MongoDB
# deployment and produce a machine-readable pass/fail matrix.
#
# This is the repository's primary correctness gate: a script passes only if it
# exits 0 AND prints no failure markers (✗ / ❌) AND raises no uncaught
# exception. Environment-dependent modules (sharding, multi-node replication,
# authentication) are expected to self-skip or downgrade to warnings.
#
# Usage:
#   scripts/utilities/run_module_matrix.sh [-c CONTAINER] [-u URI] [-o OUTDIR] [-s]
#     -c  run mongosh inside this docker container (scripts mounted at /app)
#     -u  connection URI for a local mongosh (default mongodb://localhost:27017)
#     -o  output directory for logs and matrix.tsv (default results/module-matrix)
#     -s  skip bootstraps (reference + lab) when the databases are already set up
#
# Exit status: 0 if every script passes, 1 otherwise.
set -u

CONTAINER=""; URI="mongodb://localhost:27017"; OUT="results/module-matrix"; SKIP_BOOTSTRAP=0
while getopts "c:u:o:s" opt; do
  case $opt in
    c) CONTAINER=$OPTARG ;; u) URI=$OPTARG ;; o) OUT=$OPTARG ;; s) SKIP_BOOTSTRAP=1 ;;
    *) echo "usage: $0 [-c container] [-u uri] [-o outdir] [-s]" >&2; exit 2 ;;
  esac
done

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
mkdir -p "$OUT/logs"

run_file() { # $1 = repo-relative path
  if [ -n "$CONTAINER" ]; then
    docker exec "$CONTAINER" timeout 300 mongosh --quiet --file "/app/$1"
  else
    timeout 300 mongosh "$URI" --quiet --file "$ROOT/$1"
  fi
}

if [ "$SKIP_BOOTSTRAP" -eq 0 ]; then
  echo "== bootstrap: reference dataset schema (learning_platform)"
  run_file docker/init/00_bootstrap.js > "$OUT/logs/bootstrap_reference.log" 2>&1 || { echo "reference bootstrap failed"; tail -5 "$OUT/logs/bootstrap_reference.log"; exit 1; }
  echo "== bootstrap: lab database (mongomasterpro)"
  run_file scripts/00_setup/bootstrap.js > "$OUT/logs/bootstrap_lab.log" 2>&1 || { echo "lab bootstrap failed"; tail -5 "$OUT/logs/bootstrap_lab.log"; exit 1; }
fi

MATRIX="$OUT/matrix.tsv"
printf "exit\tfail_marks\texceptions\tscript\n" > "$MATRIX"
total=0; passed=0
for f in scripts/[0-9][0-9]_*/*.js scripts/advanced/*.js; do
  [ -e "$f" ] || continue
  total=$((total+1))
  log="$OUT/logs/$(echo "$f" | tr '/' '_').log"
  run_file "$f" > "$log" 2>&1; rc=$?
  fails=$(grep -cE '^\s*(✗|❌)' "$log")
  exc=$(grep -cE '(Mongo[A-Za-z]*Error|TypeError|ReferenceError|SyntaxError|RangeError)(:| \[)' "$log")
  printf "%s\t%s\t%s\t%s\n" "$rc" "$fails" "$exc" "$f" >> "$MATRIX"
  if [ "$rc" -eq 0 ] && [ "$fails" -eq 0 ] && [ "$exc" -eq 0 ]; then
    passed=$((passed+1)); echo "PASS  $f"
  else
    echo "FAIL  $f  (exit=$rc fail_marks=$fails exceptions=$exc)"
    grep -nE '^\s*(✗|❌)|(Mongo[A-Za-z]*Error|TypeError|ReferenceError|SyntaxError|RangeError)(:| \[)' "$log" | head -5 | sed 's/^/        /'
  fi
done

echo
echo "module matrix: $passed/$total scripts passed  (details: $MATRIX)"
[ "$passed" -eq "$total" ]

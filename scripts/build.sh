#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist"

npm --prefix "$ROOT/interference" run build
npm --prefix "$ROOT/quantum_jumps" run build

rm -rf "$OUT"
mkdir -p "$OUT/interference" "$OUT/quantum_jumps"
cp "$ROOT/hub/index.html" "$ROOT/hub/styles.css" "$ROOT/hub/app.js" "$OUT/"
cp -R "$ROOT/interference/dist/." "$OUT/interference/"
cp -R "$ROOT/quantum_jumps/dist/." "$OUT/quantum_jumps/"

echo "Built PHYS 137T demo hub in $OUT"

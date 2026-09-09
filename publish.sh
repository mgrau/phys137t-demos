#!/usr/bin/env bash
set -euo pipefail

REPO=mgrau/phys137t-demos
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "cloning $REPO"
git clone -q "https://github.com/$REPO.git" "$WORK/repo"

cd "$WORK/repo"
find . -mindepth 1 -maxdepth 1 -not -name .git -exec rm -rf {} +

rsync -a \
  --exclude .DS_Store \
  --exclude .git \
  --exclude dist \
  --exclude node_modules \
  "$HERE/" "$WORK/repo/"

if [ -z "$(git status --porcelain)" ]; then
  echo "no changes to publish"
  exit 0
fi

git add -A
git commit -q -m "${1:-Sync demo collection}"
git push -q origin HEAD:main
echo "pushed. Pages will rebuild:"
echo "  https://mgrau.github.io/phys137t-demos/"
echo "  https://github.com/$REPO/actions"

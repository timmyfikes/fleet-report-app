#!/usr/bin/env bash
set -euo pipefail

message="${*:-checkpoint: $(date '+%Y-%m-%d %H:%M')}"

git add -A

if git diff --cached --quiet; then
  echo "No changes to checkpoint."
  exit 0
fi

git commit -m "$message"

if git push; then
  echo "Checkpoint complete and pushed to origin."
else
  echo "Checkpoint committed locally, but push failed."
  echo "Run 'git push' after authenticating to GitHub."
fi

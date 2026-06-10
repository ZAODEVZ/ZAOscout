#!/usr/bin/env bash
# ZAOscout setup - chmod the scripts, check deps, offer to add bin/ to PATH.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "$DIR"/bin/*
echo "[scout] scripts are executable."
for dep in curl python3; do
  command -v "$dep" >/dev/null 2>&1 && echo "[scout] $dep: ok" || { echo "[scout] MISSING: $dep" >&2; exit 1; }
done
echo
echo "[scout] try it:  $DIR/bin/scout https://www.reddit.com/r/ClaudeCode/comments/1typ8fb/"
echo "[scout] add to PATH (optional):  export PATH=\"$DIR/bin:\$PATH\""
echo "[scout] verify all fetchers:     $DIR/bin/scout health"

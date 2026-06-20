#!/usr/bin/env bash
# secret-scan.sh - fail the build if a likely API key / token / private key is
# committed. Zero-dep (grep), runs in CI on every push/PR. ZAOscout is keyless +
# BYOK-via-env, so NOTHING secret should ever land in the tree; this enforces it.
# Skips docs, .example files, and lockfiles (which legitimately contain hashes).
set -uo pipefail

PATTERNS='sk-ant-[A-Za-z0-9_-]{20}|sk-or-v1-[A-Za-z0-9]{20}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{30}|AKIA[0-9A-Z]{16}|xox[bap]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35}'

mapfile_compat() { while IFS= read -r l; do printf '%s\n' "$l"; done; }
FILES=$(git ls-files | grep -vE '\.(md|lock)$|\.example|package-lock\.json|(^|/)docs/|(^|/)scripts/secret-scan\.sh$')

HITS=""
while IFS= read -r f; do
  [[ -z "$f" || ! -f "$f" ]] && continue
  m=$(grep -nIE "$PATTERNS" "$f" 2>/dev/null | grep -viE 'example|placeholder|your[_-]?key|REDACTED|<[a-z]|test')
  [[ -n "$m" ]] && HITS+="$f: $m"$'\n'
done <<< "$FILES"

if [[ -n "$HITS" ]]; then
  echo "SECRET SCAN FAILED - possible committed secret:" >&2
  printf '%s' "$HITS" >&2
  exit 1
fi
echo "secret-scan: clean ($(printf '%s\n' "$FILES" | grep -c . ) files scanned)"

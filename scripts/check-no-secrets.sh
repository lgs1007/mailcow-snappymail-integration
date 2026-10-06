#!/bin/sh
set -eu

root="${1:-.}"

found_files="$(find "$root" -type f \( \
  -name 'sieve.creds' -o \
  -name 'plugin-proxy-auth.json' -o \
  -name 'application.ini' -o \
  -name '.env' -o \
  -name '*.pem' -o \
  -name '*.key' \
\) -print)"

if [ -n "$found_files" ]; then
  printf '%s\n' "$found_files" | sed 's/^/ERROR: secret\/config file should not be distributed: /' >&2
  exit 1
fi

tmp="${TMPDIR:-/tmp}/mailcow-snappymail-secret-scan.$$"
trap 'rm -f "$tmp"' EXIT HUP INT TERM

# Common accidental credential assignments. Documentation placeholders and
# variable references do not match this expression.
if grep -RInE --exclude-dir=.git \
  '(MASTER_PASSWORD|POSTGRES_PASSWORD|API[_-]?KEY|AUTHORIZATION)[[:space:]]*[:=][[:space:]]*[^${<[:space:]]' \
  "$root" >"$tmp" 2>/dev/null; then
  cat "$tmp" >&2
  echo 'ERROR: possible hard-coded credential found.' >&2
  exit 1
fi

exit 0

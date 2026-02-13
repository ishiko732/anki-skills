#!/usr/bin/env bash
# anki-connect.sh — Thin curl wrapper for AnkiConnect API
# Usage: anki-connect.sh <action> [params_json]
# Example: anki-connect.sh deckNames
# Example: anki-connect.sh addNote '{"note":{"deckName":"Default","modelName":"Basic","fields":{"Front":"Q","Back":"A"}}}'

set -euo pipefail

ANKI_CONNECT_URL="${ANKI_CONNECT_URL:-http://127.0.0.1:8765}"
ACTION="${1:?Usage: anki-connect.sh <action> [params_json]}"
PARAMS="${2:-}"

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

if [ -n "$PARAMS" ]; then
  printf '{"action":"%s","version":6,"params":%s}' "$ACTION" "$PARAMS" > "$TMPFILE"
else
  printf '{"action":"%s","version":6}' "$ACTION" > "$TMPFILE"
fi

RESPONSE=$(curl -sf --max-time 10 -X POST "$ANKI_CONNECT_URL" \
  -H "Content-Type: application/json" \
  -d @"$TMPFILE") || {
  echo "Error: Cannot connect to AnkiConnect at $ANKI_CONNECT_URL" >&2
  echo "Make sure Anki is running and AnkiConnect plugin (2055492159) is installed." >&2
  exit 1
}

printf '%s\n' "$RESPONSE"

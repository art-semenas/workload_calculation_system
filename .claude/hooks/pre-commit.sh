#!/bin/bash
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Only validate git commit commands
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

# Extract commit message from -m flag (supports HEREDOC cat form and quoted forms)
MSG=""
MSG=$(echo "$COMMAND" | sed -n 's/.*-m[[:space:]]*"\([^"]*\)".*/\1/p')
if [ -z "$MSG" ]; then
  MSG=$(echo "$COMMAND" | sed -n "s/.*-m[[:space:]]*'\([^']*\)'.*/\1/p")
fi
if [ -z "$MSG" ]; then
  # HEREDOC form: extract content between EOF markers
  MSG=$(echo "$COMMAND" | sed -n "/<<.*EOF/,/^EOF/{/<<.*EOF/d;/^EOF/d;p}" | tr '\n' ' ')
fi

FORBIDDEN="Claude|Haiku|Opus|Sonnet|Gemini|GPT|Co-Authored-By:|Generated with|noreply@anthropic|https://|http://"
if [ -n "$MSG" ] && echo "$MSG" | grep -qE "$FORBIDDEN"; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Commit message contains forbidden content (AI attribution, model names, or external links). Rewrite using only technical information about the change.\"}}"
  exit 0
fi

# Auto-format staged files based on what changed, then re-stage them
STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")

BACKEND_STAGED=$(echo "$STAGED" | grep "^backend/" || true)
FRONTEND_STAGED=$(echo "$STAGED" | grep "^frontend/" || true)

if [ -n "$BACKEND_STAGED" ]; then
  cd backend && mvn spotless:apply -q 2>/dev/null || true && cd ..
  echo "$BACKEND_STAGED" | xargs -r git add
fi

if [ -n "$FRONTEND_STAGED" ]; then
  cd frontend && npm run format --silent 2>/dev/null || true && cd ..
  echo "$FRONTEND_STAGED" | xargs -r git add
fi

exit 0

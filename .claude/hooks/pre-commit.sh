#!/bin/bash
set -euo pipefail

# Read stdin JSON and extract git command
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Only intercept git commit — let other commands pass through
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

# Extract commit message from -m flag (supports both double and single quotes)
MSG=""
MSG=$(echo "$COMMAND" | sed -n 's/.*-m[[:space:]]*"\([^"]*\)".*/\1/p')
if [ -z "$MSG" ]; then
  MSG=$(echo "$COMMAND" | sed -n "s/.*-m[[:space:]]*'\([^']*\)'.*/\1/p")
fi

# Validate commit message — reject AI attribution, model references, external links
FORBIDDEN="Claude|Haiku|Opus|Sonnet|Gemini|GPT|Co-Authored-By:|Generated with|noreply@anthropic|https://|http://"
if [ -n "$MSG" ] && echo "$MSG" | grep -qE "$FORBIDDEN"; then
  echo "❌ BLOCKED: Commit message contains forbidden content (AI attribution, model names, or external links)."
  echo "   Rewrite the message to contain ONLY technical information about the change."
  echo "   Forbidden patterns: AI model names, generator signatures, external links"
  exit 2
fi

# Auto-format staged files based on what changed
STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")

if echo "$STAGED" | grep -q "^backend/"; then
  echo "🔨 Formatting backend files (spotless)..."
  cd backend
  mvn spotless:apply -q 2>/dev/null || true
  cd ..
fi

if echo "$STAGED" | grep -q "^frontend/"; then
  echo "🔨 Formatting frontend files (Prettier)..."
  cd frontend
  npm run format --silent 2>/dev/null || true
  cd ..
fi

echo "✅ Pre-commit checks passed."
exit 0

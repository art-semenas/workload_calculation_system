#!/bin/bash
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Only check commands that contain git add
if ! echo "$COMMAND" | grep -q "git add"; then
  exit 0
fi

# Block broad staging: git add . / git add -A / git add --all
if echo "$COMMAND" | grep -qE "git add[[:space:]]+(\.|--all|-A)([[:space:]]|$|&&|;)"; then
  WOULD_STAGE=$(git status --porcelain 2>/dev/null | grep -E "^( M|M |MM|\?\?| D|D )" | awk '{print $NF}' | head -30 | tr '\n' '|' | sed 's/|$//')
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Broad git add blocked. Would have staged: ${WOULD_STAGE}. Stage only files relevant to the current change by listing them explicitly (e.g. git add src/foo.ts backend/Bar.java).\"}}"
  exit 0
fi

exit 0

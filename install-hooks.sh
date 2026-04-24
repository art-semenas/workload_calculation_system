#!/bin/bash

# Install Git hooks for this repository.
# Run this once after cloning: ./install-hooks.sh

set -e

HOOKS_DIR="docs/hooks"
GIT_HOOKS_DIR=".git/hooks"

echo "📦 Installing Git hooks..."
echo ""

# Check if we're in the right directory
if [ ! -d "$HOOKS_DIR" ] || [ ! -d "$GIT_HOOKS_DIR" ]; then
  echo "❌ Error: run this script from the repository root"
  exit 1
fi

# Install pre-push hook
if [ -f "$HOOKS_DIR/pre-push" ]; then
  cp "$HOOKS_DIR/pre-push" "$GIT_HOOKS_DIR/pre-push"
  chmod +x "$GIT_HOOKS_DIR/pre-push"
  echo "✅ Installed pre-push hook"
else
  echo "❌ Error: hook script not found at $HOOKS_DIR/pre-push"
  exit 1
fi

echo ""
echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-push hook will now run quality checks before each push."
echo "For details, see: docs/hooks.md"
echo ""
echo "To bypass hooks in an emergency: git push --no-verify"

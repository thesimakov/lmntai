#!/usr/bin/env bash
# PostToolUse hook: runs tsc --noEmit after TypeScript file edits.
# Input: JSON via stdin with tool_input.file_path

set -euo pipefail

input=$(cat)
file=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)

# Only run for .ts/.tsx files
[[ "$file" == *.ts || "$file" == *.tsx ]] || exit 0

# Run from project root
cd "$CLAUDE_PROJECT_DIR"

output=$(npx tsc --noEmit --skipLibCheck 2>&1 | head -40) || true

if [[ -n "$output" ]]; then
  echo "TypeScript errors detected after editing $file:"
  echo "$output"
fi

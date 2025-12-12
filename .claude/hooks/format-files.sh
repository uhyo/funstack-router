#!/bin/bash
# Format files with Prettier after write/edit

file_path=$(jq -r '.tool_input.file_path' 2>/dev/null)

if [ -z "$file_path" ] || [ "$file_path" = "null" ]; then
  exit 0
fi

# Run Prettier, suppress errors, always exit 0
npx prettier --write "$file_path" 2>/dev/null || true

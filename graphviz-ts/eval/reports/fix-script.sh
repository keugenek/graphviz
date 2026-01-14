#!/bin/bash
# Auto-generated fix script for graphviz-ts
# Run this with: bash fix-script.sh

set -e

cd "/home/user/graphviz/graphviz-ts"

echo "Starting Claude Code fix session..."
echo "Prompt file: /home/user/graphviz/graphviz-ts/eval/reports/fix-batch.md"
echo ""

# Run Claude Code with the fix prompt
# The user should run: claude code --prompt-file "/home/user/graphviz/graphviz-ts/eval/reports/fix-batch.md"

cat << 'INSTRUCTIONS'
To run the automated fix:

1. Open Claude Code in this directory:
   cd /home/user/graphviz/graphviz-ts

2. Run with the fix prompt:
   claude --print "/home/user/graphviz/graphviz-ts/eval/reports/fix-batch.md"

   Or paste the contents of /home/user/graphviz/graphviz-ts/eval/reports/fix-batch.md into Claude Code

3. After fixes are applied, verify with:
   npm run eval

INSTRUCTIONS

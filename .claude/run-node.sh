#!/bin/sh
# Wrapper so Claude Code slash commands (extract-excerpts, comment-on-script)
# can run the backend/scripts/*.ts helpers without needing Node on the system
# PATH. A fresh Bash call in this environment has no `node` on PATH at all —
# same problem run-dev.sh already solves for the dev-server launcher, needed
# again here because a slash command's Bash step starts just as fresh.
# Also includes the pip --user bin dir, since some helper scripts shell out
# to yt-dlp.
export PATH="$HOME/.local/nodejs-v24.19.0/bin:$HOME/Library/Python/3.9/bin:$PATH"
cd "$(dirname "$0")/.."
exec node "$@"

#!/bin/sh
# Wrapper so preview_start (and anyone else) can launch the dev server without
# needing Node on the system PATH. This machine has no system-wide Node install —
# see README.md "Running it" — so PATH is set here and inherited by every child
# process (npm, vite, tsx), fixing their `#!/usr/bin/env node` shebangs too.
export PATH="$HOME/.local/nodejs-v24.19.0/bin:$PATH"
cd "$(dirname "$0")/.."
exec npm run dev

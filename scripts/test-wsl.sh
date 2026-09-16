#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -x "$PWD/.tools/node-v24.21.0-linux-x64/bin/node" ]; then
  export PATH="$PWD/.tools/node-v24.21.0-linux-x64/bin:/usr/local/bin:/usr/bin:/bin"
fi
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/browsers"
if [ -d "$PWD/.tools/linux-libs/usr/lib/x86_64-linux-gnu" ]; then
  export LD_LIBRARY_PATH="$PWD/.tools/linux-libs/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi
node --version
npm --version
npm run test:e2e -- "$@"

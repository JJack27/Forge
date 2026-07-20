#!/usr/bin/env bash
# Start a static HTTP server for the book project and open it in the browser.
# The project must be served over HTTP — the browser blocks fetch() of local
# JSON files under file://, which would break locale + chapter loading.
set -e
cd "$(dirname "$0")"
PORT="${1:-8000}"
URL="http://localhost:${PORT}/"
echo "Serving book on ${URL}  (Ctrl-C to stop)"
# Open the browser after a short delay so the server is ready.
( sleep 1 && (command -v open    >/dev/null && open    "$URL" \
            || command -v xdg-open >/dev/null && xdg-open "$URL" \
            || true) ) &
python3 -m http.server "$PORT"

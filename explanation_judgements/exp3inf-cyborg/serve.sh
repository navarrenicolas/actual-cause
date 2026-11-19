#!/bin/sh
# Runs the ordinary PHP application; ?mock=1 is the only mock-mode switch.
set -eu
cd "$(dirname "$0")"
command -v php >/dev/null 2>&1 || { echo 'PHP is required to serve this experiment.' >&2; exit 1; }
export STUDY3_DATA_DIR="${STUDY3_DATA_DIR:-$PWD/participant_output}"
mkdir -p "$STUDY3_DATA_DIR"
printf '\nNon-mock: http://127.0.0.1:8000/main.html\nMock:     http://127.0.0.1:8000/main.html?mock=1\nResponses and assignment log: %s\nQueue: %s/data_harness\nPHP errors appear in this terminal. Stop with Ctrl+C.\n\n' "$STUDY3_DATA_DIR" "$PWD"
exec php -d log_errors=1 -d display_errors=0 -d error_reporting=E_ALL -S 127.0.0.1:8000 -t .

#!/bin/bash
set -e
echo "[Tests] Running GENESIS test suite..."
cd "$(dirname "$0")/.."
python -m pytest tests/ -v --tb=short "$@"

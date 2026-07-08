#!/usr/bin/env bash
set -euo pipefail
npm run start --workspace packages/cli -- generate-and-send "$@"

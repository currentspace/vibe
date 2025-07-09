#!/bin/bash

# Local development script
set -e

echo "🔧 Vibe Signaling Server - Development Mode"
echo "==========================================="

MODE=${1:-nodejs}

case $MODE in
    "worker")
        echo "🌩️  Starting Cloudflare Worker locally..."
        wrangler dev --config wrangler-simple.toml --local
        ;;
    "durable")
        echo "🌩️  Starting Durable Objects locally..."
        wrangler dev --config wrangler.toml --local
        ;;
    "nodejs")
        echo "🚀 Starting Node.js server..."
        pnpm dev:node
        ;;
    *)
        echo "❌ Invalid mode: $MODE"
        echo "Usage: ./dev.sh [worker|durable|nodejs]"
        exit 1
        ;;
esac
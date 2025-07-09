#!/bin/bash

# Cloudflare deployment script
set -e

echo "🚀 Vibe Signaling Server Deployment"
echo "===================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "   pnpm add -g wrangler"
    exit 1
fi

# Parse arguments
DEPLOYMENT_TYPE=${1:-durable}
ENVIRONMENT=${2:-dev}

case $DEPLOYMENT_TYPE in
    "durable")
        CONFIG_FILE="wrangler.toml"
        echo "📦 Deploying with Durable Objects (persistent rooms)"
        ;;
    "simple")
        CONFIG_FILE="wrangler-simple.toml"
        echo "📦 Deploying simple worker (in-memory only)"
        ;;
    "nodejs")
        echo "📦 Building Node.js server..."
        pnpm build
        echo "✅ Node.js build complete. Deploy to your hosting provider."
        exit 0
        ;;
    *)
        echo "❌ Invalid deployment type: $DEPLOYMENT_TYPE"
        echo "Usage: ./deploy.sh [durable|simple|nodejs] [dev|production]"
        exit 1
        ;;
esac

# Check authentication
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "📝 Please login to Cloudflare:"
    wrangler login
fi

# Deploy based on environment
if [ "$ENVIRONMENT" == "production" ]; then
    echo "🚀 Deploying to PRODUCTION..."
    read -p "Are you sure you want to deploy to production? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
    wrangler deploy --config $CONFIG_FILE --env production
else
    echo "🚀 Deploying to development..."
    wrangler deploy --config $CONFIG_FILE --env dev
fi

echo ""
echo "✅ Deployment complete!"
echo ""

# Show deployment info
if [ "$DEPLOYMENT_TYPE" == "durable" ]; then
    echo "📝 Your signaling server is deployed with:"
    echo "   - Persistent room state (Durable Objects)"
    echo "   - Automatic scaling"
    echo "   - Global distribution"
elif [ "$DEPLOYMENT_TYPE" == "simple" ]; then
    echo "⚠️  Note: Simple worker limitations:"
    echo "   - Room state lost on worker restart"
    echo "   - Limited to single region"
    echo "   - Best for development/testing"
fi

echo ""
echo "🔗 Test your deployment:"
echo "   curl https://your-worker.workers.dev/health"
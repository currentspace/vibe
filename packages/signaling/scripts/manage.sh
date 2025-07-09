#!/bin/bash

# Cloudflare management script
set -e

echo "🛠️  Vibe Signaling Server - Management"
echo "======================================"

ACTION=${1:-help}

case $ACTION in
    "logs")
        echo "📜 Fetching logs..."
        ENVIRONMENT=${2:-dev}
        if [ "$ENVIRONMENT" == "production" ]; then
            wrangler tail --env production
        else
            wrangler tail --env dev
        fi
        ;;
        
    "metrics")
        echo "📊 Worker metrics:"
        # This would typically use Cloudflare Analytics API
        echo "Visit: https://dash.cloudflare.com/workers-and-pages"
        ;;
        
    "secrets")
        echo "🔐 Managing secrets..."
        SECRET_NAME=${2}
        if [ -z "$SECRET_NAME" ]; then
            echo "Usage: ./manage.sh secrets <SECRET_NAME>"
            echo "Example: ./manage.sh secrets TURN_SECRET"
            exit 1
        fi
        wrangler secret put $SECRET_NAME
        ;;
        
    "rooms")
        echo "🏠 Room management:"
        WORKER_URL=${2:-"https://your-worker.workers.dev"}
        echo "Fetching room info from: $WORKER_URL"
        curl -s "$WORKER_URL/health" | jq .
        ;;
        
    "test")
        echo "🧪 Running tests..."
        WORKER_URL=${2:-"http://localhost:8787"}
        
        echo "1. Health check:"
        curl -s "$WORKER_URL/health" | jq .
        
        echo -e "\n2. Creating room:"
        ROOM_RESPONSE=$(curl -s -X POST "$WORKER_URL/api/rooms")
        echo $ROOM_RESPONSE | jq .
        
        ROOM_ID=$(echo $ROOM_RESPONSE | jq -r .roomId)
        if [ "$ROOM_ID" != "null" ]; then
            echo -e "\n3. Getting room info:"
            curl -s "$WORKER_URL/api/rooms/$ROOM_ID" | jq .
        fi
        ;;
        
    "rollback")
        echo "⏪ Rolling back deployment..."
        ENVIRONMENT=${2:-dev}
        echo "Visit: https://dash.cloudflare.com/workers-and-pages"
        echo "Select your worker and use the 'Rollback' feature"
        ;;
        
    "help"|*)
        echo "Available commands:"
        echo "  ./manage.sh logs [dev|production]    - Stream live logs"
        echo "  ./manage.sh metrics                  - View worker metrics"
        echo "  ./manage.sh secrets <name>           - Set secret value"
        echo "  ./manage.sh rooms [worker-url]       - List active rooms"
        echo "  ./manage.sh test [worker-url]        - Run API tests"
        echo "  ./manage.sh rollback [environment]   - Rollback deployment"
        ;;
esac
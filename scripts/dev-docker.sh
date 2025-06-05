#!/bin/bash

# Script to run development environment with Caddy HTTP/3 proxy

echo "🚀 Starting Vibe development environment with HTTP/3 support..."

# Check if certificates exist
if [ ! -f "certs/localhost.pem" ] || [ ! -f "certs/localhost-key.pem" ]; then
    echo "❌ HTTPS certificates not found!"
    echo "Please run: pnpm check:https"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker Desktop"
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start services
echo "🏗️  Starting services..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Cleanup on exit
trap "docker-compose down" EXIT
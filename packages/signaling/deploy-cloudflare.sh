#!/bin/bash

echo "🚀 Deploying WebRTC signaling server to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Login to Cloudflare (if not already logged in)
echo "📝 Logging in to Cloudflare..."
wrangler login

# Deploy the worker
echo "🏗️  Deploying worker..."
wrangler deploy

# Get the deployment URL
echo "✅ Deployment complete!"
echo ""
echo "Your signaling server is now available at:"
echo "https://vibe-signaling.<your-subdomain>.workers.dev"
echo ""
echo "To use a custom domain:"
echo "1. Go to your Cloudflare dashboard"
echo "2. Navigate to Workers & Pages"
echo "3. Select your worker"
echo "4. Go to 'Custom Domains' tab"
echo "5. Add your domain (e.g., signaling.yourdomain.com)"
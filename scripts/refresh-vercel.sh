#!/bin/bash

# Script to refresh Vercel OIDC token and redeploy
# Usage: ./scripts/refresh-vercel.sh

echo "🔄 Starting Vercel refresh process..."

# Pull latest environment variables (refreshes OIDC token)
echo "📥 Pulling environment variables..."
vercel env pull --yes

if [ $? -ne 0 ]; then
    echo "❌ Failed to pull environment variables"
    exit 1
fi

echo "✅ Environment variables pulled successfully"

# Optional: Deploy to production
read -p "🚀 Do you want to deploy to production? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying to production..."
    vercel --prod --yes

    if [ $? -ne 0 ]; then
        echo "❌ Deployment failed"
        exit 1
    fi

    echo "✅ Deployment successful"
else
    echo "⏭️  Skipping deployment"
fi

echo "✨ Refresh complete!"

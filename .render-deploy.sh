#!/bin/bash

# Deploy to Render using Blueprint
# Make sure you have the Render CLI installed: npm install -g @renderinc/cli

echo "🚀 Deploying Panboo to Render..."

# Check if render CLI is installed
if ! command -v render &> /dev/null; then
    echo "❌ Render CLI not found. Installing..."
    npm install -g @renderinc/cli
fi

# Login to Render
echo "🔐 Logging in to Render..."
render login

# Deploy using render.yaml
echo "📦 Deploying services..."
render blueprint launch

echo "✅ Deployment initiated!"
echo ""
echo "📝 Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Set environment variables for panboo-api service"
echo "3. Wait for deployment to complete"
echo ""
echo "🔗 Your services will be available at:"
echo "   Backend: https://panboo-api.onrender.com"
echo "   Frontend: https://panboo-frontend.onrender.com"

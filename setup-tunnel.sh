#!/bin/bash
# Cloudflare Tunnel HTTPS Setup Script
# This script sets up HTTPS for your local server using Cloudflare Tunnel

echo "🌐 Cloudflare Tunnel - HTTPS Setup"
echo "=================================="
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "📥 Installing cloudflared..."
    # For macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install cloudflare/wrangler/cloudflared
    # For Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -L --output cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.tgz
        tar -xzf cloudflared.tgz
        sudo mv cloudflared /usr/local/bin
        rm cloudflared.tgz
    fi
fi

TUNNEL_NAME="leaf-disease-detector"
LOCAL_SERVER="http://localhost:8765"

echo "🔐 Login to Cloudflare..."
cloudflared tunnel login

echo ""
echo "📍 Creating tunnel: $TUNNEL_NAME"
cloudflared tunnel create $TUNNEL_NAME

echo ""
echo "🔍 Getting tunnel credentials..."
TUNNEL_ID=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')
echo "✅ Tunnel ID: $TUNNEL_ID"

echo ""
echo "📝 Creating configuration..."

CONFIG_DIR="$HOME/.cloudflared"
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_DIR/config.yml" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: leaf-disease-detector.pages.dev
    service: $LOCAL_SERVER
  - service: http_status:404
EOF

echo "✅ Config saved to: $CONFIG_DIR/config.yml"

echo ""
echo "🎉 Setup Complete!"
echo "=================================="
echo "📍 Your public HTTPS URL:"
echo "   https://leaf-disease-detector.pages.dev"
echo ""
echo "🚀 To start the tunnel, run:"
echo "   cloudflared tunnel run $TUNNEL_NAME"
echo ""

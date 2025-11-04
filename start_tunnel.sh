#!/bin/bash
# Leaf Disease Detector - Start with HTTPS Tunnel
# This script starts ngrok tunnel for HTTPS access

echo ""
echo "🌐 ======================================="
echo "🌐 HTTPS Tunnel Setup with ngrok"
echo "🌐 ======================================="
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo "Run: npm install -g ngrok"
    exit 1
fi

echo "🚀 Starting HTTPS tunnel..."
echo ""
echo "📍 Local server: http://localhost:8765"
echo "🌐 Public HTTPS will be shown below:"
echo ""

ngrok http 8765

echo ""
echo "✅ Tunnel is active!"
echo "Share the HTTPS URL above with others"
echo ""

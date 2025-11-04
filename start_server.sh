#!/bin/bash

# AI Plant Disease Detection - Professional Startup Script
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo -e "${GREEN}=====================================
   🌿 AI PLANT DISEASE DETECTOR 🌿
        Professional Edition
=====================================${NC}"
echo

# Function to check if port is in use
check_port() {
    if lsof -Pi :8765 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}[CLEANUP] Port 8765 is in use, stopping existing processes...${NC}"
        lsof -ti:8765 | xargs kill -9 2>/dev/null
        sleep 2
    fi
}

# Function to get local IP
get_local_ip() {
    if command -v ip >/dev/null 2>&1; then
        LOCAL_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}')
    elif command -v ifconfig >/dev/null 2>&1; then
        LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    else
        LOCAL_IP="localhost"
    fi
}

# Cleanup existing processes
echo -e "${CYAN}[1/5] 🧹 Cleaning up existing processes...${NC}"
check_port

# Navigate to server directory
echo -e "${CYAN}[2/5] 📂 Setting up environment...${NC}"
cd "$(dirname "$0")/server"

if [ ! -d "dist" ]; then
    echo "Creating dist directory..."
    mkdir -p dist
fi

# Build TypeScript
echo -e "${CYAN}[3/5] 🔨 Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Check your TypeScript code.${NC}"
    read -p "Press enter to exit..."
    exit 1
fi

# Start the server in background
echo -e "${CYAN}[4/5] 🚀 Starting server...${NC}"
nohup node dist/index.js > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo -e "${CYAN}[5/5] ⏳ Waiting for server initialization...${NC}"
sleep 5

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Server started successfully (PID: $SERVER_PID)${NC}"
else
    echo -e "${RED}❌ Server failed to start${NC}"
    exit 1
fi

# Get local IP
get_local_ip

# Start HTTPS tunnel in background
echo -e "${CYAN}🌐 Creating secure HTTPS tunnel...${NC}"
nohup npx localtunnel --port 8765 > tunnel.log 2>&1 &
TUNNEL_PID=$!
sleep 3

# Get tunnel URL
if [ -f "tunnel.log" ]; then
    TUNNEL_URL=$(grep -o 'https://[^[:space:]]*' tunnel.log | head -1)
fi

echo
echo -e "${GREEN}=====================================
        ✅ SERVER READY! ✅
=====================================${NC}"
echo
echo -e "${PURPLE}📱 LOCAL ACCESS (Same WiFi):${NC}"
echo -e "    http://$LOCAL_IP:8765/test-upload"
echo -e "    http://localhost:8765/test-upload"
echo
echo -e "${PURPLE}🌍 HTTPS PUBLIC ACCESS:${NC}"
if [ ! -z "$TUNNEL_URL" ]; then
    echo -e "    ${TUNNEL_URL}/test-upload"
else
    echo -e "    Check tunnel.log for HTTPS URL"
fi
echo
echo -e "${PURPLE}🔧 MANAGEMENT:${NC}"
echo -e "    Health Check: http://$LOCAL_IP:8765/health"
echo -e "    Server Log: tail -f server.log"
echo -e "    Tunnel Log: tail -f tunnel.log"
echo
echo -e "${PURPLE}💡 FEATURES:${NC}"
echo -e "    ✅ Camera capture (HTTPS required)"
echo -e "    ✅ File upload support"
echo -e "    ✅ 80+ plant diseases database"
echo -e "    ✅ AI chatbot assistance"
echo -e "    ✅ Real-time analysis"
echo
echo -e "${GREEN}=====================================
Process IDs:
Server: $SERVER_PID
Tunnel: $TUNNEL_PID
=====================================${NC}"
echo

# Save PIDs for cleanup script
echo "$SERVER_PID" > server.pid
echo "$TUNNEL_PID" > tunnel.pid

# Open browser if available
if command -v xdg-open > /dev/null; then
    echo "Opening web interface..."
    xdg-open "http://localhost:8765/test-upload"
elif command -v open > /dev/null; then
    echo "Opening web interface..."
    open "http://localhost:8765/test-upload"
fi

echo -e "${YELLOW}🎉 Server is running in background!${NC}"
echo -e "${YELLOW}Use './stop_server.sh' to stop all services${NC}"
echo -e "${YELLOW}Logs: 'tail -f server.log' and 'tail -f tunnel.log'${NC}"
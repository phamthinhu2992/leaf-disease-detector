#!/bin/bash

# Stop AI Plant Disease Detection Server
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

clear
echo -e "${RED}=====================================
   🛑 STOPPING AI PLANT DETECTOR 🛑
=====================================${NC}"
echo

cd "$(dirname "$0")/server"

# Stop processes using saved PIDs
if [ -f "server.pid" ]; then
    SERVER_PID=$(cat server.pid)
    echo -e "${YELLOW}[1/3] 🔌 Stopping server process (PID: $SERVER_PID)...${NC}"
    kill -TERM $SERVER_PID 2>/dev/null
    sleep 2
    kill -KILL $SERVER_PID 2>/dev/null
    rm -f server.pid
else
    echo -e "${YELLOW}[1/3] 🔌 Stopping server processes on port 8765...${NC}"
    lsof -ti:8765 | xargs kill -9 2>/dev/null
fi

if [ -f "tunnel.pid" ]; then
    TUNNEL_PID=$(cat tunnel.pid)
    echo -e "${YELLOW}[2/3] 🌐 Stopping tunnel process (PID: $TUNNEL_PID)...${NC}"
    kill -TERM $TUNNEL_PID 2>/dev/null
    sleep 2
    kill -KILL $TUNNEL_PID 2>/dev/null
    rm -f tunnel.pid
else
    echo -e "${YELLOW}[2/3] 🌐 Stopping tunnel processes...${NC}"
    pkill -f "localtunnel" 2>/dev/null
fi

echo -e "${YELLOW}[3/3] 🧹 Cleaning up log files...${NC}"
rm -f server.log tunnel.log nohup.out

echo
echo -e "${GREEN}✅ All services stopped successfully!${NC}"
echo
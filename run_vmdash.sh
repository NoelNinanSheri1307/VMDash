#!/bin/bash
# VMDash Service Launcher for Linux (RHEL/Ubuntu)
echo "=============================================="
echo "STARTING VMDASH CORE WEB SERVICES (LINUX)"
echo "=============================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CODE_DIR="$SCRIPT_DIR/code/infra-code"

# Kill any existing instances
kill -9 $(lsof -ti :5000) 2>/dev/null
kill -9 $(lsof -ti :5001) 2>/dev/null
sleep 1

# 1. Start Web Backend (Flask - Port 5000)
echo "[1/3] Starting Core Web Backend..."
cd "$CODE_DIR/web_backend"
source venv/bin/activate
nohup python app.py > /tmp/web_backend.log 2>&1 &
WEB_PID=$!
deactivate
echo "  PID: $WEB_PID"

sleep 2

# 2. Start Proxmox Backend (Flask - Port 5001)
echo "[2/3] Starting Proxmox Sync Backend..."
cd "$CODE_DIR/proxmox_backend"
source venv/bin/activate
nohup python app.py > /tmp/proxmox_backend.log 2>&1 &
PROX_PID=$!
deactivate
echo "  PID: $PROX_PID"

sleep 2

# 3. Start Frontend (React - Port 3000)
echo "[3/3] Starting Frontend React Server..."
cd "$CODE_DIR/frontend"
npm start > /tmp/frontend.log 2>&1 &
FRONT_PID=$!
echo "  PID: $FRONT_PID"

echo "=============================================="
echo "All services started!"
echo "  Web Backend:   http://localhost:5000"
echo "  Proxmox Back:  http://localhost:5001"
echo "  Frontend:      http://localhost:3000"
echo "=============================================="
echo ""
echo "Logs:"
echo "  tail -f /tmp/web_backend.log"
echo "  tail -f /tmp/proxmox_backend.log"
echo "  tail -f /tmp/frontend.log"
echo ""
echo "To stop: kill $WEB_PID $PROX_PID $FRONT_PID"

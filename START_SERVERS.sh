#!/bin/bash
# This script starts both servers with the correct ports

echo "╔════════════════════════════════════════╗"
echo "║     Starting Vinyl Marketplace Demo    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Kill any existing processes
pkill -9 -f "npm run dev"
pkill -9 -f "next dev"
pkill -9 node
sleep 2

cd /Users/invision/site-oul

# Start backend on 3000
echo "Starting Backend on port 3000..."
npm run dev &
BACKEND_PID=$!
sleep 5

# Check backend is running
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✓ Backend started successfully (PID: $BACKEND_PID)"
else
    echo "✗ Backend failed to start"
    exit 1
fi

# Start frontend on 3001
echo ""
echo "Starting Frontend on port 3001..."
cd /Users/invision/site-oul/frontend
PORT=3001 npm run dev &
FRONTEND_PID=$!
sleep 5

# Check frontend is running
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✓ Frontend started successfully (PID: $FRONTEND_PID)"
else
    echo "✗ Frontend failed to start"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║           DEMO IS READY!              ║"
echo "╠════════════════════════════════════════╣"
echo "║ Backend:  http://localhost:3000       ║"
echo "║ Frontend: http://localhost:3001       ║"
echo "╠════════════════════════════════════════╣"
echo "║ Open browser to:                      ║"
echo "║ http://localhost:3001                 ║"
echo "╠════════════════════════════════════════╣"
echo "║ Login with:                           ║"
echo "║ admin@demo.com (any password)         ║"
echo "║ seller@demo.com (any password)        ║"
echo "║ buyer@demo.com (any password)         ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Servers running:"
echo "  Backend PID: $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop: pkill -9 node"
echo ""

# Keep script alive
wait

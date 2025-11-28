#!/bin/bash

# Vinyl Marketplace Demo - One-Click Launcher
# Run this script to start the entire demo

echo "╔════════════════════════════════════════╗"
echo "║   Vinyl Marketplace Demo Launcher      ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Kill any existing processes
echo "Cleaning up any old processes..."
pkill -f "npm run dev" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 1

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found"
    exit 1
fi

echo ""
echo "Starting Backend API on port 3000..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 4

# Check if backend is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Backend failed to start. Check /tmp/backend.log"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✓ Backend is running on http://localhost:3000"
echo ""

echo "Starting Frontend on port 3001..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start frontend
cd frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 5

# Check if frontend is running
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "❌ Frontend failed to start. Check /tmp/frontend.log"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 1
fi

cd ..

echo "✓ Frontend is running on http://localhost:3001"
echo ""

echo "╔════════════════════════════════════════╗"
echo "║       Demo Ready to Use! 🎉            ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Open your browser:"
echo "  👉 http://localhost:3001"
echo ""
echo "Demo Accounts (any password):"
echo "  • admin@demo.com   → Admin Dashboard"
echo "  • seller@demo.com  → Seller Portal"
echo "  • buyer@demo.com   → Buyer Storefront"
echo ""
echo "Process IDs:"
echo "  Backend:  $BACKEND_PID (log: /tmp/backend.log)"
echo "  Frontend: $FRONTEND_PID (log: /tmp/frontend.log)"
echo ""
echo "To stop:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  Or press Ctrl+C in each terminal"
echo ""
echo "For help:"
echo "  • RUN_DEMO.md - Quick demo guide"
echo "  • DEMO_GUIDE.md - Comprehensive guide"
echo "  • LOGIN_TROUBLESHOOTING.md - If login fails"
echo ""

# Keep script alive
wait $BACKEND_PID $FRONTEND_PID

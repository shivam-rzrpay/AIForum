#!/bin/bash

# Start Python backend server in the background
echo "Starting Python backend server..."
python python_flask_app.py > python_server.log 2>&1 &
PYTHON_PID=$!

# Wait a moment for Python server to initialize
sleep 2

# Start the main Node.js application
echo "Starting Node.js application..."
npm run dev

# If Node.js application exits, kill the Python server
echo "Main application exited, stopping Python backend..."
kill $PYTHON_PID
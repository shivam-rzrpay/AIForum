"""
Simple runner script for Python Flask backend.
This keeps the server running as a separate workflow.
"""

import os
import subprocess
import signal
import sys

def run_python_backend():
    """Run the Python Flask backend server."""
    print("Starting Python Flask backend")
    # Run the Python Flask app and wait for it to complete
    process = subprocess.Popen(
        ["python", "python_flask_app.py"],
        env=os.environ.copy()
    )
    
    # Define signal handler to gracefully shutdown
    def signal_handler(sig, frame):
        print("Shutting down Python Flask backend...")
        process.terminate()
        sys.exit(0)
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Wait for process to complete
    process.wait()
    
    # If we get here, the process has terminated, so we should exit
    print("Python Flask backend has exited")

if __name__ == "__main__":
    run_python_backend()
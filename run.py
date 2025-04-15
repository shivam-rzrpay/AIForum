"""
Main entry point for running the Python Flask backend.
To keep the server running on Replit, ensure this is executed as its own workflow.
"""
import os
import sys
import time
import logging
import subprocess

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger('python-backend-runner')

def main():
    """Start the Python Flask backend and keep it running."""
    logger.info("Starting Python Flask backend...")
    
    process = None
    try:
        # Run the Python Flask application
        process = subprocess.Popen(
            ["python", "python_flask_app.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        logger.info(f"Python Flask backend started with PID: {process.pid}")
        
        # Stream output from the process
        for line in iter(process.stdout.readline, ''):
            print(line, end='')
            sys.stdout.flush()
        
        # If we get here, the process has ended
        exit_code = process.wait()
        logger.error(f"Python Flask backend exited with code: {exit_code}")
        
        # Restart the process if it crashes
        logger.info("Restarting Python Flask backend...")
        time.sleep(2)  # Wait a bit before restarting
        main()  # Recursive call to restart
        
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
        if process and process.poll() is None:
            process.terminate()
    except Exception as e:
        logger.error(f"Error running Python Flask backend: {e}")
        if process and process.poll() is None:
            process.terminate()
        time.sleep(5)  # Wait before trying again
        main()  # Recursive call to restart

if __name__ == "__main__":
    main()
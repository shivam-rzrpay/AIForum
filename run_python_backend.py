"""
Script to run the Python backend service for X-AI Forum.
"""
import sys
import logging
import subprocess
import os
import signal
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger('python-backend-runner')

def run_python_backend():
    """Run the Python Flask backend server."""
    logger.info("Starting Python Flask backend")
    
    # Make sure we have the required packages
    try:
        # Set up environment
        env_vars = os.environ.copy()
        
        # Check for required environment variables
        required_vars = [
            'AWS_ACCESS_KEY_ID', 
            'AWS_SECRET_ACCESS_KEY', 
            'AWS_SESSION_TOKEN',
            'SLACK_BOT_TOKEN',
            'SLACK_CHANNEL_ID'
        ]
        
        missing_vars = [var for var in required_vars if not env_vars.get(var)]
        if missing_vars:
            logger.warning(f"Missing environment variables: {', '.join(missing_vars)}")
            logger.warning("Some functionality may be limited")
        
        # Run the Python Flask app
        cmd = ["python", "python_backend_app.py"]
        process = subprocess.Popen(
            cmd,
            env=env_vars,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        logger.info(f"Python backend process started with PID: {process.pid}")
        
        # Define signal handler
        def signal_handler(sig, frame):
            logger.info("Shutting down Python backend...")
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)  # Wait up to 5 seconds for clean termination
                except subprocess.TimeoutExpired:
                    process.kill()  # Force kill if it doesn't terminate in time
            sys.exit(0)
        
        # Register signal handlers
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Stream and log output
        for line in iter(process.stdout.readline, ''):
            print(line, end='')
            sys.stdout.flush()
        
        # If we exit the loop, the process has ended
        exit_code = process.wait()
        logger.warning(f"Python backend process exited with code {exit_code}")
        
        # If process failed, wait and try to restart
        if exit_code != 0:
            logger.info("Attempting to restart in 5 seconds...")
            time.sleep(5)
            run_python_backend()  # Recursive call to restart
        
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received, shutting down...")
        if 'process' in locals() and process.poll() is None:
            process.terminate()
    except Exception as e:
        logger.error(f"Error running Python backend: {str(e)}")
        if 'process' in locals() and process.poll() is None:
            process.terminate()

if __name__ == "__main__":
    run_python_backend()
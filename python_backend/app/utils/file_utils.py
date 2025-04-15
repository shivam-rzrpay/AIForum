import os
import time
import random
from werkzeug.utils import secure_filename

# Configure upload directory
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# File extensions
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.md', '.xlsx', '.xls', '.pptx', '.ppt'}

def allowed_file(filename):
    """Check if file has an allowed extension"""
    return os.path.splitext(filename.lower())[1] in ALLOWED_EXTENSIONS

def save_uploaded_file(file):
    """Save uploaded file to disk and return metadata"""
    filename = secure_filename(file.filename)
    extension = os.path.splitext(filename)[1].lower()[1:]  # Remove leading dot
    
    # Generate unique filename
    unique_filename = f"{int(time.time())}-{random.randint(1, 1000000000)}{os.path.splitext(filename)[1]}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    
    # Save file
    file.save(file_path)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    return {
        'path': file_path,
        'original_name': filename,
        'extension': extension,
        'size': file_size
    }

def delete_file(file_path):
    """Delete file from disk"""
    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False
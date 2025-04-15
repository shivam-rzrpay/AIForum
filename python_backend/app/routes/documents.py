from flask import Blueprint, request, jsonify, session, send_file
import os
from ..models.storage import storage
from ..services.chromadb_service import process_document, delete_document as delete_vector_doc
from ..utils.file_utils import save_uploaded_file, delete_file, allowed_file

documents_bp = Blueprint('documents', __name__)

# Authentication middleware
def is_authenticated():
    return 'user_id' in session

@documents_bp.route('', methods=['POST'])
def upload_document():
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get user ID from session
        user_id = session['user_id']
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'message': 'File is required'}), 400
        
        file = request.files['file']
        
        # Check if filename is valid
        if file.filename == '':
            return jsonify({'message': 'No file selected'}), 400
        
        # Check if file type is allowed
        if not allowed_file(file.filename):
            return jsonify({'message': 'Invalid file type. Only document files are allowed.'}), 400
        
        # Get form data
        name = request.form.get('name')
        description = request.form.get('description')
        category = request.form.get('category')
        document_type = request.form.get('documentType')
        
        # Validate required fields
        if not name or not category or not document_type:
            return jsonify({'message': 'Name, category, and document type are required'}), 400
        
        # Save file
        file_info = save_uploaded_file(file)
        
        # Create document record
        document_data = {
            'name': name,
            'description': description,
            'fileType': file_info['extension'],
            'fileSize': file_info['size'],
            'category': category,
            'documentType': document_type,
            'filePath': file_info['path'],
            'uploadedById': user_id
        }
        
        document = storage.create_document(document_data)
        
        # Process document in background (add to vector store)
        try:
            embedding_id = process_document(
                file_info['path'],
                {
                    'id': document['id'],
                    'name': document['name'],
                    'description': document['description'],
                    'category': document['category'],
                    'documentType': document['documentType']
                },
                document['category']
            )
            
            # Update document with embedding ID
            storage.update_document(document['id'], {
                'status': 'processed',
                'embeddingId': embedding_id
            })
        except Exception as e:
            print(f"Error processing document embedding: {str(e)}")
            storage.update_document(document['id'], {'status': 'failed'})
        
        return jsonify(document), 201
        
    except Exception as e:
        print(f"Error in upload_document: {str(e)}")
        return jsonify({'message': str(e)}), 500

@documents_bp.route('', methods=['GET'])
def get_documents():
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get query parameters
        category = request.args.get('category')
        
        # Get documents
        if category:
            documents = storage.get_documents_by_category(category)
        else:
            documents = storage.get_all_documents()
        
        return jsonify(documents), 200
        
    except Exception as e:
        print(f"Error in get_documents: {str(e)}")
        return jsonify({'message': str(e)}), 500

@documents_bp.route('/<int:document_id>', methods=['GET'])
def get_document(document_id):
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get document
        document = storage.get_document(document_id)
        if not document:
            return jsonify({'message': 'Document not found'}), 404
        
        return jsonify(document), 200
        
    except Exception as e:
        print(f"Error in get_document: {str(e)}")
        return jsonify({'message': str(e)}), 500

@documents_bp.route('/<int:document_id>/download', methods=['GET'])
def download_document(document_id):
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get document
        document = storage.get_document(document_id)
        if not document:
            return jsonify({'message': 'Document not found'}), 404
        
        # Check if file exists
        if not os.path.exists(document['filePath']):
            return jsonify({'message': 'File not found'}), 404
        
        # Generate download name
        filename = f"{document['name']}.{document['fileType']}"
        
        # Send file
        return send_file(
            document['filePath'],
            as_attachment=True,
            download_name=filename,
            mimetype=f"application/{document['fileType']}"
        )
        
    except Exception as e:
        print(f"Error in download_document: {str(e)}")
        return jsonify({'message': str(e)}), 500

@documents_bp.route('/<int:document_id>', methods=['DELETE'])
def delete_document(document_id):
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get document
        document = storage.get_document(document_id)
        if not document:
            return jsonify({'message': 'Document not found'}), 404
        
        # Delete file
        if document['filePath'] and os.path.exists(document['filePath']):
            delete_file(document['filePath'])
        
        # Delete from vector store if it has an embedding ID
        if document.get('embeddingId'):
            try:
                delete_vector_doc(document['embeddingId'], document['category'])
            except Exception as e:
                print(f"Error deleting document from vector store: {str(e)}")
        
        # Delete document record
        storage.delete_document(document_id)
        
        return jsonify({'message': 'Document deleted successfully'}), 200
        
    except Exception as e:
        print(f"Error in delete_document: {str(e)}")
        return jsonify({'message': str(e)}), 500
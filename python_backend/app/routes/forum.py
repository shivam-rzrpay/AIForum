from flask import Blueprint, request, jsonify, session
import math
from ..models.storage import storage
from ..services.bedrock import generate_forum_ai_response
from ..services.chromadb_service import get_context_for_query

forum_bp = Blueprint('forum', __name__)

# Authentication middleware
def is_authenticated():
    return 'user_id' in session

@forum_bp.route('/<category>', methods=['GET'])
def get_forum_posts(category):
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        sort_by = request.args.get('sortBy', 'recent')
        
        # Get posts
        posts = storage.get_posts_by_category(category, page, limit, sort_by)
        
        # Get total count
        total = storage.count_posts_by_category(category)
        
        # Calculate pages
        pages = math.ceil(total / limit) if total > 0 else 0
        
        # Build response
        response = {
            'posts': posts,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': pages
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in get_forum_posts: {str(e)}")
        return jsonify({'message': str(e)}), 500

@forum_bp.route('/<category>/posts', methods=['POST'])
def create_forum_post(category):
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get user ID from session
        user_id = session['user_id']
        
        # Get request data
        data = request.get_json()
        
        # Validate required fields
        if 'title' not in data or not data['title']:
            return jsonify({'message': 'Title is required'}), 400
        
        if 'content' not in data or not data['content']:
            return jsonify({'message': 'Content is required'}), 400
        
        # Create post
        post_data = {
            'title': data['title'],
            'content': data['content'],
            'userId': user_id,
            'category': category
        }
        
        # Add tags if present
        if 'tags' in data:
            post_data['tags'] = data['tags']
        
        # Save post
        post = storage.create_post(post_data)
        
        # Generate AI answer
        try:
            # Get context from document embeddings
            contextual_data = get_context_for_query(post['title'] + " " + post['content'], category)
            
            # Generate AI response
            ai_response = generate_forum_ai_response(
                post['content'],
                [{'role': 'user', 'content': post['title'] + "\n" + post['content']}],
                category,
                contextual_data
            )
            
            # Create AI comment
            ai_comment = storage.create_comment({
                'content': ai_response,
                'postId': post['id'],
                'userId': 1,  # System user ID (AI Assistant)
                'isAiGenerated': True
            })
            
            # Mark post as having AI answer
            storage.update_post(post['id'], {'hasAiAnswer': True})
            
        except Exception as ai_error:
            print(f"Error generating AI response: {str(ai_error)}")
            # Continue anyway, the post is still created
        
        return jsonify(post), 201
        
    except Exception as e:
        print(f"Error in create_forum_post: {str(e)}")
        return jsonify({'message': str(e)}), 500

@forum_bp.route('/search', methods=['GET'])
def search_posts():
    try:
        # Get query parameters
        query = request.args.get('q')
        category = request.args.get('category')
        
        if not query:
            return jsonify({'message': 'Search query is required'}), 400
        
        # Search posts
        if category:
            results = storage.search_posts_by_category(query, category)
        else:
            results = storage.search_posts(query)
        
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Error in search_posts: {str(e)}")
        return jsonify({'message': str(e)}), 500

@forum_bp.route('/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    try:
        # Get post
        post = storage.get_post(post_id)
        if not post:
            return jsonify({'message': 'Post not found'}), 404
        
        # Increment view count
        storage.update_post(post_id, {'views': post['views'] + 1})
        
        # Get comments
        comments = storage.get_comments_by_post_id(post_id)
        
        # Build response
        response = {
            'post': {
                **post,
                'views': post['views'] + 1  # Include updated view count
            },
            'comments': comments
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in get_post: {str(e)}")
        return jsonify({'message': str(e)}), 500

@forum_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
def create_comment(post_id):
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get user ID from session
        user_id = session['user_id']
        
        # Get post
        post = storage.get_post(post_id)
        if not post:
            return jsonify({'message': 'Post not found'}), 404
        
        # Get request data
        data = request.get_json()
        
        # Validate content
        if 'content' not in data or not data['content']:
            return jsonify({'message': 'Content is required'}), 400
        
        # Create comment
        comment_data = {
            'content': data['content'],
            'postId': post_id,
            'userId': user_id,
            'isAiGenerated': False
        }
        
        # Save comment
        comment = storage.create_comment(comment_data)
        
        # Mark post as answered if this is the first answer
        if not post['isAnswered']:
            storage.update_post(post_id, {'isAnswered': True})
        
        return jsonify(comment), 201
        
    except Exception as e:
        print(f"Error in create_comment: {str(e)}")
        return jsonify({'message': str(e)}), 500

@forum_bp.route('/posts/<int:post_id>/votes', methods=['POST'])
def vote_post(post_id):
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get user ID from session
        user_id = session['user_id']
        
        # Get request data
        data = request.get_json()
        
        # Validate vote type
        if 'voteType' not in data or data['voteType'] not in ['upvote', 'downvote']:
            return jsonify({'message': 'Invalid vote type'}), 400
        
        # Get post
        post = storage.get_post(post_id)
        if not post:
            return jsonify({'message': 'Post not found'}), 404
        
        # Check for existing vote
        existing_vote = storage.get_vote_by_user_and_post(user_id, post_id)
        
        if existing_vote:
            if existing_vote['voteType'] == data['voteType']:
                # Remove vote if same type
                storage.delete_vote(existing_vote['id'])
                return jsonify({'message': f"{data['voteType']} removed"}), 200
            else:
                # Update vote if different type
                storage.update_vote(existing_vote['id'], {'voteType': data['voteType']})
                return jsonify({'message': f"Changed to {data['voteType']}"}), 200
        else:
            # Create new vote
            vote_data = {
                'postId': post_id,
                'userId': user_id,
                'voteType': data['voteType']
            }
            
            # Save vote
            vote = storage.create_vote(vote_data)
            
            return jsonify({'message': f"{data['voteType']} added"}), 201
        
    except Exception as e:
        print(f"Error in vote_post: {str(e)}")
        return jsonify({'message': str(e)}), 500

@forum_bp.route('/comments/<int:comment_id>/votes', methods=['POST'])
def vote_comment(comment_id):
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get user ID from session
        user_id = session['user_id']
        
        # Get request data
        data = request.get_json()
        
        # Validate vote type
        if 'voteType' not in data or data['voteType'] not in ['upvote', 'downvote']:
            return jsonify({'message': 'Invalid vote type'}), 400
        
        # Get comment
        comment = storage.get_comment(comment_id)
        if not comment:
            return jsonify({'message': 'Comment not found'}), 404
        
        # Check for existing vote
        existing_vote = storage.get_vote_by_user_and_comment(user_id, comment_id)
        
        if existing_vote:
            if existing_vote['voteType'] == data['voteType']:
                # Remove vote if same type
                storage.delete_vote(existing_vote['id'])
                
                # Update comment vote counts
                storage.update_comment_vote_counts(comment_id)
                
                return jsonify({'message': f"{data['voteType']} removed"}), 200
            else:
                # Update vote if different type
                storage.update_vote(existing_vote['id'], {'voteType': data['voteType']})
                
                # Update comment vote counts
                storage.update_comment_vote_counts(comment_id)
                
                return jsonify({'message': f"Changed to {data['voteType']}"}), 200
        else:
            # Create new vote
            vote_data = {
                'commentId': comment_id,
                'userId': user_id,
                'voteType': data['voteType']
            }
            
            # Save vote
            vote = storage.create_vote(vote_data)
            
            # Update comment vote counts
            storage.update_comment_vote_counts(comment_id)
            
            return jsonify({'message': f"{data['voteType']} added"}), 201
        
    except Exception as e:
        print(f"Error in vote_comment: {str(e)}")
        return jsonify({'message': str(e)}), 500
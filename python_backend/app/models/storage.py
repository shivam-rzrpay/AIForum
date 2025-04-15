import bcrypt
import datetime
from typing import Dict, List, Optional, Any, Union

class MemStorage:
    def __init__(self):
        # In-memory storage using dictionaries
        self.users = {}
        self.posts = {}
        self.comments = {}
        self.ai_chats = {}
        self.ai_chat_messages = {}
        self.documents = {}
        self.votes = {}
        
        # ID counters
        self.user_id_counter = 1
        self.post_id_counter = 1
        self.comment_id_counter = 1
        self.ai_chat_id_counter = 1
        self.ai_chat_message_id_counter = 1
        self.document_id_counter = 1
        self.vote_id_counter = 1
        
        # Create system user for AI responses
        self._create_system_user()
    
    def _create_system_user(self):
        """Create a system user for AI-generated content"""
        system_user = {
            "id": 1,
            "username": "ai-assistant",
            "email": "ai@x-ai-forum.com",
            "name": "AI Assistant",
            "password": bcrypt.hashpw("unguessable-password".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "createdAt": datetime.datetime.now().isoformat()
        }
        self.users[1] = system_user
        self.user_id_counter = 2  # Start regular users at ID 2
    
    # User operations
    def get_user(self, id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return self.users.get(id)
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        for user in self.users.values():
            if user["username"] == username:
                return user
        return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        for user in self.users.values():
            if user["email"] == email:
                return user
        return None
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        user_id = self.user_id_counter
        self.user_id_counter += 1
        
        created_at = datetime.datetime.now().isoformat()
        
        user = {**user_data, "id": user_id, "createdAt": created_at}
        self.users[user_id] = user
        
        return user
    
    # Post operations
    def create_post(self, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new forum post"""
        post_id = self.post_id_counter
        self.post_id_counter += 1
        
        created_at = datetime.datetime.now().isoformat()
        
        post = {
            **post_data,
            "id": post_id,
            "createdAt": created_at,
            "views": 0,
            "isAnswered": False,
            "hasAiAnswer": False
        }
        
        self.posts[post_id] = post
        
        # Add user info if needed
        user = self.get_user(post_data["userId"])
        if user:
            post["user"] = {
                "id": user["id"],
                "username": user["username"],
                "name": user["name"],
                "avatar": user.get("avatar"),
                "jobTitle": user.get("jobTitle")
            }
        
        return post
    
    def get_post(self, id: int) -> Optional[Dict[str, Any]]:
        """Get post by ID"""
        post = self.posts.get(id)
        if not post:
            return None
        
        # Add user info if needed
        if "user" not in post and "userId" in post:
            user = self.get_user(post["userId"])
            if user:
                post["user"] = {
                    "id": user["id"],
                    "username": user["username"],
                    "name": user["name"],
                    "avatar": user.get("avatar"),
                    "jobTitle": user.get("jobTitle")
                }
        
        # Add comment count
        post["_count"] = {
            "comments": len([c for c in self.comments.values() if c.get("postId") == id])
        }
        
        return post
    
    def update_post(self, id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a post"""
        post = self.posts.get(id)
        if not post:
            return None
        
        for key, value in data.items():
            post[key] = value
        
        post["updatedAt"] = datetime.datetime.now().isoformat()
        return post
    
    def get_posts_by_category(self, category: str, page: int, limit: int, sort_by: str) -> List[Dict[str, Any]]:
        """Get posts by category with pagination and sorting"""
        # Filter by category
        filtered_posts = [p for p in self.posts.values() if p.get("category") == category]
        
        # Apply sorting
        if sort_by == "recent":
            filtered_posts.sort(key=lambda p: p.get("createdAt", ""), reverse=True)
        elif sort_by == "popular":
            filtered_posts.sort(key=lambda p: p.get("views", 0), reverse=True)
        elif sort_by == "unanswered":
            filtered_posts = [p for p in filtered_posts if not p.get("isAnswered", False)]
            filtered_posts.sort(key=lambda p: p.get("createdAt", ""), reverse=True)
        
        # Calculate pagination
        start = (page - 1) * limit
        end = start + limit
        paginated_posts = filtered_posts[start:end]
        
        # Add user info and comment counts to each post
        for post in paginated_posts:
            if "user" not in post and "userId" in post:
                user = self.get_user(post["userId"])
                if user:
                    post["user"] = {
                        "id": user["id"],
                        "username": user["username"],
                        "name": user["name"],
                        "avatar": user.get("avatar"),
                        "jobTitle": user.get("jobTitle")
                    }
            
            # Add comment count
            post["_count"] = {
                "comments": len([c for c in self.comments.values() if c.get("postId") == post["id"]])
            }
        
        return paginated_posts
    
    def count_posts_by_category(self, category: str) -> int:
        """Count posts in a category"""
        return len([p for p in self.posts.values() if p.get("category") == category])
    
    def search_posts(self, query: str) -> List[Dict[str, Any]]:
        """Search posts by title and content"""
        query_lower = query.lower()
        matched_posts = []
        
        for post in self.posts.values():
            title = post.get("title", "").lower()
            content = post.get("content", "").lower()
            
            if query_lower in title or query_lower in content:
                matched_posts.append(post)
        
        return matched_posts
    
    def search_posts_by_category(self, query: str, category: str) -> List[Dict[str, Any]]:
        """Search posts by title and content within a category"""
        query_lower = query.lower()
        matched_posts = []
        
        for post in self.posts.values():
            if post.get("category") != category:
                continue
                
            title = post.get("title", "").lower()
            content = post.get("content", "").lower()
            
            if query_lower in title or query_lower in content:
                matched_posts.append(post)
        
        return matched_posts
    
    # Comment operations
    def create_comment(self, comment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new comment"""
        comment_id = self.comment_id_counter
        self.comment_id_counter += 1
        
        created_at = datetime.datetime.now().isoformat()
        
        comment = {
            **comment_data,
            "id": comment_id,
            "createdAt": created_at,
            "upvotes": 0,
            "downvotes": 0
        }
        
        self.comments[comment_id] = comment
        
        # Add user info
        user = self.get_user(comment_data["userId"])
        if user:
            comment["user"] = {
                "id": user["id"],
                "username": user["username"],
                "name": user["name"],
                "avatar": user.get("avatar"),
                "jobTitle": user.get("jobTitle")
            }
        
        return comment
    
    def get_comment(self, id: int) -> Optional[Dict[str, Any]]:
        """Get comment by ID"""
        comment = self.comments.get(id)
        if not comment:
            return None
            
        # Add user info if needed
        if "user" not in comment and "userId" in comment:
            user = self.get_user(comment["userId"])
            if user:
                comment["user"] = {
                    "id": user["id"],
                    "username": user["username"],
                    "name": user["name"],
                    "avatar": user.get("avatar"),
                    "jobTitle": user.get("jobTitle")
                }
        
        return comment
    
    def get_comments_by_post_id(self, post_id: int) -> List[Dict[str, Any]]:
        """Get all comments for a post"""
        filtered_comments = [c for c in self.comments.values() if c.get("postId") == post_id]
        
        # Sort by creation date
        filtered_comments.sort(key=lambda c: c.get("createdAt", ""))
        
        # Add user info to each comment
        for comment in filtered_comments:
            if "user" not in comment and "userId" in comment:
                user = self.get_user(comment["userId"])
                if user:
                    comment["user"] = {
                        "id": user["id"],
                        "username": user["username"],
                        "name": user["name"],
                        "avatar": user.get("avatar"),
                        "jobTitle": user.get("jobTitle")
                    }
        
        return filtered_comments
    
    def update_comment_vote_counts(self, id: int) -> None:
        """Update upvote and downvote counts for a comment"""
        comment = self.comments.get(id)
        if not comment:
            return
        
        # Count votes for this comment
        upvotes = 0
        downvotes = 0
        
        for vote in self.votes.values():
            if vote.get("commentId") == id:
                if vote.get("voteType") == "upvote":
                    upvotes += 1
                elif vote.get("voteType") == "downvote":
                    downvotes += 1
        
        # Update comment
        comment["upvotes"] = upvotes
        comment["downvotes"] = downvotes
    
    # AI Chat operations
    def create_ai_chat(self, chat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new AI chat"""
        chat_id = self.ai_chat_id_counter
        self.ai_chat_id_counter += 1
        
        created_at = datetime.datetime.now().isoformat()
        
        chat = {**chat_data, "id": chat_id, "createdAt": created_at}
        self.ai_chats[chat_id] = chat
        
        return chat
    
    def get_ai_chat(self, id: int) -> Optional[Dict[str, Any]]:
        """Get AI chat by ID"""
        return self.ai_chats.get(id)
    
    def get_ai_chats_by_user_id(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all AI chats for a user"""
        filtered_chats = [c for c in self.ai_chats.values() if c.get("userId") == user_id]
        filtered_chats.sort(key=lambda c: c.get("createdAt", ""), reverse=True)
        
        # Add last message preview
        for chat in filtered_chats:
            # Get last message
            chat_messages = [m for m in self.ai_chat_messages.values() if m.get("chatId") == chat["id"]]
            if chat_messages:
                chat_messages.sort(key=lambda m: m.get("createdAt", ""), reverse=True)
                last_message = chat_messages[0]
                
                # Truncate content
                content = last_message.get("content", "")
                if len(content) > 50:
                    content = content[:50] + "..."
                
                chat["lastMessage"] = {
                    "content": content,
                    "createdAt": last_message.get("createdAt"),
                    "isUserMessage": last_message.get("isUserMessage", False)
                }
        
        return filtered_chats
    
    # AI Chat Message operations
    def create_ai_chat_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new AI chat message"""
        message_id = self.ai_chat_message_id_counter
        self.ai_chat_message_id_counter += 1
        
        created_at = datetime.datetime.now().isoformat()
        
        message = {**message_data, "id": message_id, "createdAt": created_at}
        self.ai_chat_messages[message_id] = message
        
        return message
    
    def get_ai_chat_messages(self, chat_id: int) -> List[Dict[str, Any]]:
        """Get all messages for an AI chat"""
        filtered_messages = [m for m in self.ai_chat_messages.values() if m.get("chatId") == chat_id]
        filtered_messages.sort(key=lambda m: m.get("createdAt", ""))
        return filtered_messages
    
    # Document operations
    def create_document(self, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new document"""
        document_id = self.document_id_counter
        self.document_id_counter += 1
        
        created_at = datetime.datetime.now().isoformat()
        
        document = {
            **document_data,
            "id": document_id,
            "createdAt": created_at,
            "status": "pending"
        }
        
        self.documents[document_id] = document
        
        # Add uploaded by user info
        user = self.get_user(document_data["uploadedById"])
        if user:
            document["uploadedBy"] = {
                "id": user["id"],
                "username": user["username"],
                "name": user["name"]
            }
        
        return document
    
    def get_document(self, id: int) -> Optional[Dict[str, Any]]:
        """Get document by ID"""
        document = self.documents.get(id)
        if not document:
            return None
            
        # Add user info if needed
        if "uploadedBy" not in document and "uploadedById" in document:
            user = self.get_user(document["uploadedById"])
            if user:
                document["uploadedBy"] = {
                    "id": user["id"],
                    "username": user["username"],
                    "name": user["name"]
                }
        
        return document
    
    def update_document(self, id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a document"""
        document = self.documents.get(id)
        if not document:
            return None
        
        for key, value in data.items():
            document[key] = value
        
        document["updatedAt"] = datetime.datetime.now().isoformat()
        return document
    
    def get_documents_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get documents by category"""
        filtered_documents = [d for d in self.documents.values() if d.get("category") == category]
        filtered_documents.sort(key=lambda d: d.get("createdAt", ""), reverse=True)
        
        # Add user info to each document
        for document in filtered_documents:
            if "uploadedBy" not in document and "uploadedById" in document:
                user = self.get_user(document["uploadedById"])
                if user:
                    document["uploadedBy"] = {
                        "id": user["id"],
                        "username": user["username"],
                        "name": user["name"]
                    }
        
        return filtered_documents
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all documents"""
        documents = list(self.documents.values())
        documents.sort(key=lambda d: d.get("createdAt", ""), reverse=True)
        
        # Add user info to each document
        for document in documents:
            if "uploadedBy" not in document and "uploadedById" in document:
                user = self.get_user(document["uploadedById"])
                if user:
                    document["uploadedBy"] = {
                        "id": user["id"],
                        "username": user["username"],
                        "name": user["name"]
                    }
        
        return documents
    
    def delete_document(self, id: int) -> None:
        """Delete a document"""
        if id in self.documents:
            del self.documents[id]
    
    # Vote operations
    def create_vote(self, vote_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new vote"""
        vote_id = self.vote_id_counter
        self.vote_id_counter += 1
        
        created_at = datetime.datetime.now().isoformat()
        
        vote = {**vote_data, "id": vote_id, "createdAt": created_at}
        self.votes[vote_id] = vote
        
        return vote
    
    def get_vote_by_user_and_post(self, user_id: int, post_id: int) -> Optional[Dict[str, Any]]:
        """Get a vote by user and post"""
        for vote in self.votes.values():
            if vote.get("userId") == user_id and vote.get("postId") == post_id:
                return vote
        return None
    
    def get_vote_by_user_and_comment(self, user_id: int, comment_id: int) -> Optional[Dict[str, Any]]:
        """Get a vote by user and comment"""
        for vote in self.votes.values():
            if vote.get("userId") == user_id and vote.get("commentId") == comment_id:
                return vote
        return None
    
    def update_vote(self, id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a vote"""
        vote = self.votes.get(id)
        if not vote:
            return None
        
        for key, value in data.items():
            vote[key] = value
        
        vote["updatedAt"] = datetime.datetime.now().isoformat()
        return vote
    
    def delete_vote(self, id: int) -> None:
        """Delete a vote"""
        if id in self.votes:
            del self.votes[id]

# Create a single instance of the storage
storage = MemStorage()
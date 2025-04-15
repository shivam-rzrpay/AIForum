import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatMessage from '@/components/ChatMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  id: number;
  chatId: number;
  content: string;
  isUserMessage: boolean;
  createdAt: string;
}

export default function AiAssistant() {
  const { category } = useParams<{ category: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [message, setMessage] = useState('');
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // WebSocket setup
  useEffect(() => {
    if (!isAuthenticated || !chatId) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ai_response' && data.chatId === chatId) {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    setSocket(ws);
    
    return () => {
      ws.close();
    };
  }, [isAuthenticated, chatId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Create a new chat if needed
  const createChat = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai-chats', { category });
      return response.json();
    },
    onSuccess: (data) => {
      setChatId(data.id);
      
      // Add initial system message
      const initialMessage = {
        id: 0,
        chatId: data.id,
        content: getChatWelcomeMessage(),
        isUserMessage: false,
        createdAt: new Date().toISOString(),
      };
      
      setMessages([initialMessage]);
    },
  });
  
  // Get chat messages
  const { isLoading, error } = useQuery({
    queryKey: ['/api/ai-chats', chatId, 'messages'],
    queryFn: async () => {
      if (!chatId) return null;
      const response = await fetch(`/api/ai-chats/${chatId}/messages`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load chat messages');
      }
      return response.json();
    },
    enabled: !!chatId,
    onSuccess: (data) => {
      if (data && data.length > 0) {
        setMessages(data);
      } else if (data && data.length === 0) {
        // Add initial system message if chat is empty
        const initialMessage = {
          id: 0,
          chatId: chatId!,
          content: getChatWelcomeMessage(),
          isUserMessage: false,
          createdAt: new Date().toISOString(),
        };
        
        setMessages([initialMessage]);
      }
    },
  });
  
  // Get or create chat
  const { isLoading: isLoadingChats } = useQuery({
    queryKey: ['/api/ai-chats'],
    queryFn: async () => {
      const response = await fetch('/api/ai-chats', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load chats');
      }
      return response.json();
    },
    enabled: isAuthenticated,
    onSuccess: (data) => {
      // Try to find a chat for the current category
      const existingChat = data.find((chat: any) => chat.category === category);
      if (existingChat) {
        setChatId(existingChat.id);
      } else {
        // Create a new chat if none exists
        createChat.mutate();
      }
    },
  });
  
  // Handle sending message
  const handleSendMessage = async () => {
    if (!message.trim() || !chatId || !socket) return;
    
    // Add message to UI first
    const userMessage = {
      id: Date.now(), // Temporary ID
      chatId,
      content: message,
      isUserMessage: true,
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send to WebSocket
    socket.send(JSON.stringify({
      type: 'chat_message',
      userId: user?.id,
      chatId,
      content: message,
    }));
    
    // Clear input
    setMessage('');
  };
  
  // Get category title
  const getCategoryTitle = () => {
    switch (category) {
      case 'technical': return 'Technical';
      case 'ideas': return 'Ideas';
      case 'general': return 'General';
      case 'hr': return 'HR';
      default: return '';
    }
  };
  
  // Get welcome message based on category
  const getChatWelcomeMessage = () => {
    const categoryTitle = getCategoryTitle();
    
    let welcomeMessage = `Hi there! I'm your ${categoryTitle} Assistant. I'm here to help answer your questions about `;
    
    switch (category) {
      case 'technical':
        welcomeMessage += 'technical product details, APIs, and implementation.';
        break;
      case 'ideas':
        welcomeMessage += 'product ideas and provide feedback on your suggestions.';
        break;
      case 'general':
        welcomeMessage += 'the organization, processes, and other general queries.';
        break;
      case 'hr':
        welcomeMessage += 'HR policies, benefits, and the onboarding process.';
        break;
      default:
        welcomeMessage += 'your questions.';
    }
    
    welcomeMessage += '\n\nHow can I assist you today?';
    
    return welcomeMessage;
  };
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, authLoading, setLocation]);
  
  // Show loading state
  if (authLoading || isLoadingChats) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If not authenticated, don't render the page (will redirect)
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="flex flex-col h-full">
          {/* Chat header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900">
                  <i className="fas fa-robot text-primary-600 dark:text-primary-400"></i>
                </div>
                <div className="ml-3">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    {getCategoryTitle()} Assistant
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getCategoryTitle() === 'Technical' && 'Ask about technical product details, APIs, and implementation'}
                    {getCategoryTitle() === 'Ideas' && 'Discuss product ideas and get feedback'}
                    {getCategoryTitle() === 'General' && 'Ask general questions about the organization'}
                    {getCategoryTitle() === 'HR' && 'Get help with HR policies, benefits, and onboarding'}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLocation(`/forums/${category}`)}
                  title="Back to forum"
                >
                  <i className="fas fa-arrow-left"></i>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setChatId(null);
                    setMessages([]);
                    createChat.mutate();
                  }}
                  title="Clear chat"
                >
                  <i className="fas fa-trash"></i>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4 bg-gray-50 dark:bg-gray-900">
            <div className="space-y-6 max-w-3xl mx-auto">
              {isLoading ? (
                <div className="flex justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                  <p className="text-red-500 dark:text-red-400">
                    {error instanceof Error ? error.message : 'An error occurred while loading messages'}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/ai-chats', chatId, 'messages'] })}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage 
                    key={msg.id} 
                    message={msg} 
                    user={user}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {/* Chat input */}
          <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <form 
              className="flex space-x-3" 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <div className="flex-1 min-w-0">
                <Textarea
                  placeholder="Ask a question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={1}
                  className="min-h-[42px] resize-none py-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              <Button type="submit" disabled={!message.trim() || !socket}>
                <i className="fas fa-paper-plane mr-2"></i>
                Send
              </Button>
            </form>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <i className="fas fa-shield-alt mr-1"></i>
              <span>Your conversations are not stored permanently and are only used to improve the AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

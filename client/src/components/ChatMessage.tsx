import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { User } from '@/context/AuthContext';
import { useState } from 'react';

interface ChatMessageProps {
  message: {
    id: number;
    content: string;
    isUserMessage: boolean;
    createdAt: string;
  };
  user: User | null;
}

export default function ChatMessage({ message, user }: ChatMessageProps) {
  const [isCopied, setIsCopied] = useState(false);
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };
  
  // Format message content with newlines
  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <p key={i} className={i > 0 ? 'mt-2' : ''}>
        {line}
      </p>
    ));
  };
  
  // Format code blocks
  const formatWithCodeBlocks = (content: string) => {
    // Split the content at each code block
    const parts = content.split(/```([\s\S]*?)```/);
    
    return parts.map((part, i) => {
      // Even indices are regular text, odd indices are code blocks
      if (i % 2 === 0) {
        return formatContent(part);
      } else {
        return (
          <pre key={i} className="p-3 mt-2 mb-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
            <code>{part}</code>
          </pre>
        );
      }
    });
  };
  
  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };
  
  if (message.isUserMessage) {
    return (
      <div className="flex items-start justify-end">
        <div className="mr-3 bg-primary-100 dark:bg-primary-900 rounded-lg p-4 shadow-sm max-w-3xl">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {formatWithCodeBlocks(message.content)}
          </div>
        </div>
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.avatar} alt={user?.name} />
          <AvatarFallback>
            {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }
  
  return (
    <div className="flex items-start">
      <Avatar className="h-10 w-10 bg-primary-100 dark:bg-primary-900">
        <AvatarFallback className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400">
          <i className="fas fa-robot"></i>
        </AvatarFallback>
      </Avatar>
      <div className="ml-3 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm max-w-3xl">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {formatWithCodeBlocks(message.content)}
        </div>
        
        {message.id !== 0 && (
          <div className="mt-2 flex justify-between text-xs">
            <div className="text-gray-500 dark:text-gray-400">
              Claude Sonnet 3.5 v2
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={handleCopy}
                title={isCopied ? "Copied!" : "Copy to clipboard"}
              >
                <i className={`${isCopied ? 'fas fa-check' : 'far fa-copy'} text-xs`}></i>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                title="Thumbs up"
              >
                <i className="far fa-thumbs-up text-xs"></i>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                title="Thumbs down"
              >
                <i className="far fa-thumbs-down text-xs"></i>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

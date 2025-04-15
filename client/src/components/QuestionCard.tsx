import { Link } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: number;
  title: string;
  content: string;
  userId: number;
  category: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  views: number;
  isAnswered: boolean;
  hasAiAnswer: boolean;
  user?: {
    id: number;
    username: string;
    name: string;
    avatar?: string;
    jobTitle?: string;
  };
  _count?: {
    comments: number;
  };
}

interface QuestionCardProps {
  post: Post;
  category: string;
}

export default function QuestionCard({ post, category }: QuestionCardProps) {
  // Format post date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'unknown time ago';
    }
  };
  
  // Generate a tag badge based on post title/content
  const generateTagBadge = () => {
    if (post.tags && post.tags.length > 0) {
      return post.tags[0];
    }
    
    // Fallbacks based on category if no tags
    switch (category) {
      case 'technical':
        return post.title.toLowerCase().includes('api') ? 'API' 
          : post.title.toLowerCase().includes('bug') ? 'Bug'
          : post.title.toLowerCase().includes('sdk') ? 'SDK'
          : 'Question';
      case 'ideas':
        return post.title.toLowerCase().includes('feature') ? 'Feature Request' 
          : post.title.toLowerCase().includes('ui') ? 'UI/UX'
          : post.title.toLowerCase().includes('performance') ? 'Performance'
          : 'Idea';
      case 'general':
        return post.title.toLowerCase().includes('process') ? 'Process' 
          : post.title.toLowerCase().includes('team') ? 'Team'
          : post.title.toLowerCase().includes('policy') ? 'Policy'
          : 'Question';
      case 'hr':
        return post.title.toLowerCase().includes('benefit') ? 'Benefits' 
          : post.title.toLowerCase().includes('onboarding') ? 'Onboarding'
          : post.title.toLowerCase().includes('compensation') ? 'Compensation'
          : 'Question';
      default:
        return 'Question';
    }
  };
  
  // Truncate content for preview
  const truncateContent = (content: string, maxLength = 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start">
          {/* Vote section */}
          <div className="flex-shrink-0 flex flex-row md:flex-col items-center justify-start md:space-y-2 md:mr-6 space-x-4 md:space-x-0 mb-4 md:mb-0">
            <Button variant="ghost" size="icon" className="rounded-md">
              <i className="fas fa-chevron-up"></i>
            </Button>
            <span className="text-lg font-medium text-gray-900 dark:text-white">
              {post._count?.comments || 0}
            </span>
            <Button variant="ghost" size="icon" className="rounded-md">
              <i className="fas fa-chevron-down"></i>
            </Button>
          </div>
          
          {/* Content section */}
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <Badge variant={post.isAnswered ? "success" : "secondary"}>
                {post.isAnswered ? 'Answered' : 'Open'}
              </Badge>
              <Badge variant="outline">{generateTagBadge()}</Badge>
            </div>
            
            <Link href={`/posts/${post.id}`}>
              <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer">
                {post.title}
              </h2>
            </Link>
            
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <p>{truncateContent(post.content)}</p>
            </div>
            
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <i className="fas fa-comment-alt mr-1"></i>
                <span>{post._count?.comments || 0} answer{post._count?.comments !== 1 ? 's' : ''}</span>
              </div>
              
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <i className="fas fa-eye mr-1"></i>
                <span>{post.views} view{post.views !== 1 ? 's' : ''}</span>
              </div>
              
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <i className="fas fa-clock mr-1"></i>
                <span>Posted {formatDate(post.createdAt)}</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.user?.avatar} />
                <AvatarFallback>
                  {post.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {post.user?.name || 'Anonymous'}
                </p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>{post.user?.jobTitle || 'User'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* AI answered badge */}
          {post.hasAiAnswer && (
            <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0 flex items-start">
              <div className="flex-shrink-0 flex flex-col text-right">
                <Badge className="flex items-center gap-1" variant="outline">
                  <i className="fas fa-robot mr-1"></i> AI Answered
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

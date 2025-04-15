import { useQuery } from '@tanstack/react-query';

export interface Post {
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

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ForumData {
  posts: Post[];
  pagination: Pagination;
}

export function useForumData(category: string, page: number, limit: number, sortBy: string = 'recent') {
  return useQuery({
    queryKey: [`/api/forums/${category}`, page, limit, sortBy],
    queryFn: async () => {
      const response = await fetch(`/api/forums/${category}?page=${page}&limit=${limit}&sortBy=${sortBy}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to load forum data';
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // Use default error message
        }
        
        throw new Error(errorMessage);
      }
      
      return response.json() as Promise<ForumData>;
    },
  });
}

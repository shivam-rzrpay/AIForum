import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import QuestionCard from '@/components/QuestionCard';
import PostQuestion from '@/components/PostQuestion';
import { useForumData } from '@/hooks/useForumData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function Forum() {
  const { category } = useParams<{ category: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('recent');
  const [filterType, setFilterType] = useState('all');
  const [filterTime, setFilterTime] = useState('allTime');
  const [showPostDialog, setShowPostDialog] = useState(false);
  
  // Get forum data
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useForumData(category, page, limit, sortBy);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, authLoading, setLocation]);
  
  // Refetch when filters change
  useEffect(() => {
    refetch();
  }, [page, sortBy, refetch]);
  
  // Get category details
  const getCategoryTitle = () => {
    switch (category) {
      case 'technical': return 'Technical Product Support Forum';
      case 'ideas': return 'Product Ideas Forum';
      case 'general': return 'General Queries Forum';
      case 'hr': return 'HR and Onboarding Forum';
      default: return 'Forum';
    }
  };
  
  const getCategoryDescription = () => {
    switch (category) {
      case 'technical': return 'Get help with technical issues and product support';
      case 'ideas': return 'Share and discuss product improvement ideas';
      case 'general': return 'Ask general questions about the organization';
      case 'hr': return 'Questions about HR policies, benefits, and onboarding';
      default: return 'Forum discussions';
    }
  };
  
  const getCategoryIcon = () => {
    switch (category) {
      case 'technical': return 'laptop-code';
      case 'ideas': return 'lightbulb';
      case 'general': return 'comments';
      case 'hr': return 'user-tie';
      default: return 'comments';
    }
  };
  
  // Show loading state
  if (authLoading) {
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
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getCategoryTitle()}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {getCategoryDescription()}
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 flex space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/ai-assistant/${category}`)}
                >
                  <i className="fas fa-robot mr-2"></i>
                  Ask AI Assistant
                </Button>
                
                <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <i className="fas fa-plus mr-2"></i>
                      New Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <PostQuestion 
                      category={category} 
                      onSuccess={() => {
                        setShowPostDialog(false);
                        refetch();
                      }} 
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Forum filters */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg mb-6">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Filter by:</span>
                    
                    <Select 
                      value={filterType} 
                      onValueChange={setFilterType}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="All Topics" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Topics</SelectItem>
                        <SelectItem value="questions">Questions</SelectItem>
                        <SelectItem value="discussions">Discussions</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={filterTime} 
                      onValueChange={setFilterTime}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allTime">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="thisWeek">This Week</SelectItem>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mt-3 md:mt-0">
                    <Select 
                      value={sortBy} 
                      onValueChange={setSortBy}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="popular">Most Votes</SelectItem>
                        <SelectItem value="answered">Most Answers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Forum content */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 text-center">
                  <p className="text-red-500 dark:text-red-400">
                    {error.message || 'An error occurred while loading posts'}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => refetch()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : data?.posts?.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <i className={`fas fa-${getCategoryIcon()} text-4xl text-gray-400 dark:text-gray-500`}></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No questions yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Be the first to ask a question in this forum
                  </p>
                  <Button onClick={() => setShowPostDialog(true)}>
                    <i className="fas fa-plus mr-2"></i>
                    Ask a Question
                  </Button>
                </div>
              ) : (
                data?.posts?.map((post) => (
                  <QuestionCard 
                    key={post.id} 
                    post={post} 
                    category={category} 
                  />
                ))
              )}
            </div>
            
            {/* Pagination */}
            {data?.pagination && data.pagination.total > 0 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (page > 1) setPage(page - 1);
                        }}
                        className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
                      const pageNumber = i + 1;
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(pageNumber);
                            }}
                            isActive={page === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {data.pagination.pages > 5 && (
                      <>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(data.pagination.pages);
                            }}
                            isActive={page === data.pagination.pages}
                          >
                            {data.pagination.pages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (page < data.pagination.pages) setPage(page + 1);
                        }}
                        className={page >= data.pagination.pages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

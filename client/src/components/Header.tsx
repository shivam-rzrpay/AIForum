import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/components/ui/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  // Get current page title based on route
  const getPageTitle = () => {
    const path = location.split('/');
    
    if (path[1] === 'forums' && path[2]) {
      const category = path[2];
      return {
        title: `${getCategoryTitle(category)} Forum`,
        subtitle: getCategoryDescription(category)
      };
    } else if (path[1] === 'ai-assistant' && path[2]) {
      const category = path[2];
      return {
        title: `${getCategoryTitle(category)} AI Assistant`,
        subtitle: `Ask questions about ${getCategoryDescription(category).toLowerCase()}`
      };
    } else if (path[1] === 'documents') {
      return {
        title: 'Document Management',
        subtitle: 'Upload and manage documents to improve AI responses'
      };
    } else if (path[1] === 'search') {
      return {
        title: 'Search Results',
        subtitle: 'Search results for your query'
      };
    } else {
      return {
        title: 'X-AI-Forum',
        subtitle: 'AI-powered social Q&A platform'
      };
    }
  };
  
  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'technical': return 'Technical Product Support';
      case 'ideas': return 'Product Ideas';
      case 'general': return 'General Queries';
      case 'hr': return 'HR and Onboarding';
      default: return 'Forum';
    }
  };
  
  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'technical': return 'Get help with technical issues and product support';
      case 'ideas': return 'Share and discuss product improvement ideas';
      case 'general': return 'Ask general questions about the organization';
      case 'hr': return 'Questions about HR policies, benefits, and onboarding';
      default: return 'Forum discussions';
    }
  };
  
  const pageInfo = getPageTitle();
  
  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex flex-1 justify-between px-4 sm:px-6">
        <div className="flex flex-1 items-center">
          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex lg:hidden items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 focus:outline-none"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <span className="sr-only">Open sidebar</span>
            <i className="fas fa-bars text-xl"></i>
          </button>
          
          {/* Page title - desktop */}
          <div className="hidden md:block ml-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pageInfo.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{pageInfo.subtitle}</p>
          </div>
          
          {/* Page title - mobile */}
          <div className="md:hidden ml-4">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{pageInfo.title}</h1>
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:block w-full max-w-xs">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <Input
                type="search"
                placeholder="Search forums..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
          
          {/* Theme toggle */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleThemeToggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <i className="fas fa-sun text-gray-400"></i>
            ) : (
              <i className="fas fa-moon text-gray-600"></i>
            )}
          </Button>
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback>
                      {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation('/profile')}>
                  <i className="fas fa-user mr-2"></i>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/settings')}>
                  <i className="fas fa-cog mr-2"></i>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => setLocation('/login')}>
              <i className="fas fa-sign-in-alt mr-2"></i>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

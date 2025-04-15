import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Close sidebar when navigating on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [location]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Determine which forum category is active based on current path
  const getForumCategory = () => {
    const path = location.split('/')[2];
    return path || '';
  };
  
  // Determine which view is active (forum or assistant)
  const getViewType = () => {
    return location.includes('/ai-assistant') ? 'assistant' : 'forum';
  };
  
  const currentCategory = getForumCategory();
  const currentView = getViewType();
  
  // Create navigation items
  const forumNavItems = [
    { 
      name: 'Technical Product Support', 
      icon: 'laptop-code', 
      category: 'technical',
      path: '/forums/technical',
    },
    { 
      name: 'Product Ideas', 
      icon: 'lightbulb', 
      category: 'ideas',
      path: '/forums/ideas',
    },
    { 
      name: 'General Queries', 
      icon: 'comments', 
      category: 'general',
      path: '/forums/general',
    },
    { 
      name: 'HR and Onboarding', 
      icon: 'user-tie', 
      category: 'hr',
      path: '/forums/hr',
    },
  ];
  
  const assistantNavItems = [
    { 
      name: 'Technical Assistant', 
      icon: 'robot', 
      category: 'technical',
      path: '/ai-assistant/technical',
    },
    { 
      name: 'Ideas Assistant', 
      icon: 'robot', 
      category: 'ideas',
      path: '/ai-assistant/ideas',
    },
    { 
      name: 'General Assistant', 
      icon: 'robot', 
      category: 'general',
      path: '/ai-assistant/general',
    },
    { 
      name: 'HR Assistant', 
      icon: 'robot', 
      category: 'hr',
      path: '/ai-assistant/hr',
    },
  ];
  
  const managementNavItems = [
    { 
      name: 'Document Upload', 
      icon: 'file-upload', 
      path: '/documents',
    },
    { 
      name: 'Settings', 
      icon: 'cog', 
      path: '/settings',
    },
  ];
  
  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center cursor-pointer" onClick={() => setLocation('/')}>
              <i className="fas fa-robot text-primary-600 text-2xl mr-2"></i>
              <span className="text-lg font-bold text-gray-900 dark:text-white">X-AI-Forum</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="lg:hidden text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
            >
              <span className="sr-only">Close sidebar</span>
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Sidebar content */}
          <ScrollArea className="flex-1">
            <div className="px-2 py-4 space-y-6">
              {/* Forum categories */}
              <div className="space-y-2">
                <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Forums
                </h3>
                
                {forumNavItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={currentCategory === item.category && currentView === 'forum' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setLocation(item.path)}
                  >
                    <i className={`fas fa-${item.icon} mr-3 text-gray-500 dark:text-gray-400 ${
                      currentCategory === item.category && currentView === 'forum' ? 'text-primary-600 dark:text-primary-400' : ''
                    }`}></i>
                    {item.name}
                  </Button>
                ))}
              </div>
              
              {/* AI Assistants */}
              <div className="space-y-2">
                <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  AI Assistants
                </h3>
                
                {assistantNavItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={currentCategory === item.category && currentView === 'assistant' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setLocation(item.path)}
                  >
                    <i className={`fas fa-${item.icon} mr-3 text-gray-500 dark:text-gray-400 ${
                      currentCategory === item.category && currentView === 'assistant' ? 'text-primary-600 dark:text-primary-400' : ''
                    }`}></i>
                    {item.name}
                  </Button>
                ))}
              </div>
              
              {/* Admin tools */}
              <div className="space-y-2">
                <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Management
                </h3>
                
                {managementNavItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={location === item.path ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setLocation(item.path)}
                  >
                    <i className={`fas fa-${item.icon} mr-3 text-gray-500 dark:text-gray-400 ${
                      location === item.path ? 'text-primary-600 dark:text-primary-400' : ''
                    }`}></i>
                    {item.name}
                  </Button>
                ))}
              </div>
            </div>
          </ScrollArea>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {isAuthenticated ? (
              <div className="flex items-center">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback>
                    {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 flex-1 truncate">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.jobTitle || user?.email}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={logout}
                  title="Sign out"
                >
                  <i className="fas fa-sign-out-alt text-gray-500 dark:text-gray-400"></i>
                </Button>
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={() => setLocation('/login')}
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile toggle button - shown in Header.tsx */}
    </>
  );
}

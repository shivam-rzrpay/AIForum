import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DocumentList from '@/components/documents/DocumentList';
import UploadForm from '@/components/documents/UploadForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocumentManagement() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeCategory, setActiveCategory] = useState('technical');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const queryClient = useQueryClient();
  
  // Fetch document statistics
  const { data: documentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/documents/stats'],
    queryFn: async () => {
      try {
        // This endpoint doesn't exist yet, so we'll simulate it with the regular documents endpoint
        const response = await fetch('/api/documents', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch document statistics');
        }
        
        const documents = await response.json();
        
        // Calculate stats
        const stats = {
          total: documents.length,
          byCategory: {
            technical: documents.filter((doc: any) => doc.category === 'technical').length,
            ideas: documents.filter((doc: any) => doc.category === 'ideas').length,
            general: documents.filter((doc: any) => doc.category === 'general').length,
            hr: documents.filter((doc: any) => doc.category === 'hr').length,
          },
          byStatus: {
            processed: documents.filter((doc: any) => doc.status === 'processed').length,
            processing: documents.filter((doc: any) => doc.status === 'processing').length,
            failed: documents.filter((doc: any) => doc.status === 'failed').length,
          }
        };
        
        return stats;
      } catch (error) {
        console.error('Error fetching document stats:', error);
        throw error;
      }
    },
    enabled: isAuthenticated,
  });
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, authLoading, setLocation]);
  
  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return 'laptop-code';
      case 'ideas': return 'lightbulb';
      case 'general': return 'comments';
      case 'hr': return 'user-tie';
      default: return 'folder';
    }
  };
  
  // Get category status
  const getCategoryStatus = (category: string) => {
    if (statsLoading || !documentStats) {
      return 'loading';
    }
    
    const categoryCount = documentStats.byCategory[category] || 0;
    return categoryCount > 0 ? 'complete' : 'empty';
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
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Management</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Upload documents to train the AI assistants and improve responses for each forum category.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left sidebar */}
              <div className="lg:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Categories</CardTitle>
                    <CardDescription>Select a category to upload or manage documents.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button
                        variant={activeCategory === 'technical' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setActiveCategory('technical')}
                      >
                        <i className={`fas fa-laptop-code mr-3 ${
                          activeCategory === 'technical' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                        }`}></i>
                        <div className="flex flex-col items-start">
                          <span>Technical Product Support</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tech Specs, PRDs, Runbooks</span>
                        </div>
                      </Button>
                      
                      <Button
                        variant={activeCategory === 'ideas' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setActiveCategory('ideas')}
                      >
                        <i className={`fas fa-lightbulb mr-3 ${
                          activeCategory === 'ideas' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                        }`}></i>
                        <div className="flex flex-col items-start">
                          <span>Product Ideas</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Research, Roadmaps, Feature Ideas</span>
                        </div>
                      </Button>
                      
                      <Button
                        variant={activeCategory === 'general' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setActiveCategory('general')}
                      >
                        <i className={`fas fa-comments mr-3 ${
                          activeCategory === 'general' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                        }`}></i>
                        <div className="flex flex-col items-start">
                          <span>General Queries</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Org Docs, Structures, Contacts</span>
                        </div>
                      </Button>
                      
                      <Button
                        variant={activeCategory === 'hr' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setActiveCategory('hr')}
                      >
                        <i className={`fas fa-user-tie mr-3 ${
                          activeCategory === 'hr' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                        }`}></i>
                        <div className="flex flex-col items-start">
                          <span>HR and Onboarding</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">HR Policies, Benefits, Onboarding</span>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Embedding Status</CardTitle>
                    <CardDescription>Current status of document embeddings.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center justify-between">
                        <div className="flex items-center">
                          <i className="fas fa-laptop-code mr-3 text-gray-500 dark:text-gray-400"></i>
                          <span className="text-sm text-gray-700 dark:text-gray-200">Technical</span>
                        </div>
                        {statsLoading ? (
                          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getCategoryStatus('technical') === 'complete'
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          }`}>
                            {getCategoryStatus('technical') === 'complete' ? 'Complete' : 'Empty'}
                          </span>
                        )}
                      </li>
                      
                      <li className="flex items-center justify-between">
                        <div className="flex items-center">
                          <i className="fas fa-lightbulb mr-3 text-gray-500 dark:text-gray-400"></i>
                          <span className="text-sm text-gray-700 dark:text-gray-200">Ideas</span>
                        </div>
                        {statsLoading ? (
                          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getCategoryStatus('ideas') === 'complete'
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          }`}>
                            {getCategoryStatus('ideas') === 'complete' ? 'Complete' : 'Empty'}
                          </span>
                        )}
                      </li>
                      
                      <li className="flex items-center justify-between">
                        <div className="flex items-center">
                          <i className="fas fa-comments mr-3 text-gray-500 dark:text-gray-400"></i>
                          <span className="text-sm text-gray-700 dark:text-gray-200">General</span>
                        </div>
                        {statsLoading ? (
                          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getCategoryStatus('general') === 'complete'
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          }`}>
                            {getCategoryStatus('general') === 'complete' ? 'Complete' : 'Empty'}
                          </span>
                        )}
                      </li>
                      
                      <li className="flex items-center justify-between">
                        <div className="flex items-center">
                          <i className="fas fa-user-tie mr-3 text-gray-500 dark:text-gray-400"></i>
                          <span className="text-sm text-gray-700 dark:text-gray-200">HR</span>
                        </div>
                        {statsLoading ? (
                          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getCategoryStatus('hr') === 'complete'
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          }`}>
                            {getCategoryStatus('hr') === 'complete' ? 'Complete' : 'Empty'}
                          </span>
                        )}
                      </li>
                    </ul>
                    
                    <div className="mt-4">
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/documents'] })}
                      >
                        <i className="fas fa-sync-alt mr-2"></i>
                        Refresh Status
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Main content */}
              <div className="lg:col-span-8">
                <Tabs value={showUploadForm ? 'upload' : 'documents'} onValueChange={(value) => setShowUploadForm(value === 'upload')}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {showUploadForm ? 'Upload Document' : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Documents`}
                    </h2>
                    <TabsList>
                      <TabsTrigger value="documents">Documents</TabsTrigger>
                      <TabsTrigger value="upload">Upload</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="documents" className="mt-0">
                    <DocumentList 
                      category={activeCategory} 
                      onUpload={() => setShowUploadForm(true)} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="upload" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle>Upload New Document</CardTitle>
                        <CardDescription>
                          Add new documents to enhance AI knowledge for the {activeCategory} category.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <UploadForm 
                          category={activeCategory} 
                          onSuccess={() => {
                            setShowUploadForm(false);
                            queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
                          }} 
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

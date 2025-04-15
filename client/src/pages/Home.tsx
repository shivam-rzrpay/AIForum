import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Show loading state
  if (isLoading) {
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
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Welcome to X-AI-Forum
            </h1>
            
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              An AI-powered social Q&A platform to instantly answer internal questions about projects, policies, and more.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <ForumCard 
                title="Technical Product Support"
                description="Get help with technical issues and product support."
                icon="laptop-code"
                category="technical"
              />
              
              <ForumCard 
                title="Product Ideas"
                description="Share and discuss product improvement ideas."
                icon="lightbulb"
                category="ideas"
              />
              
              <ForumCard 
                title="General Queries"
                description="Ask general questions about the organization."
                icon="comments"
                category="general"
              />
              
              <ForumCard 
                title="HR and Onboarding"
                description="Questions about HR policies, benefits, and onboarding."
                icon="user-tie"
                category="hr"
              />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              AI-Powered Assistants
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <Card>
                <CardHeader>
                  <div className="flex items-center mb-2">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900 mr-3">
                      <i className="fas fa-robot text-primary-600 dark:text-primary-400"></i>
                    </div>
                    <CardTitle>AI Assistants</CardTitle>
                  </div>
                  <CardDescription>
                    Get instant answers from our AI assistants trained on internal documents.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Our AI assistants are powered by Claude Sonnet 3.5 v2 and trained on specific categories of internal documents
                    to provide accurate and helpful responses to your questions.
                  </p>
                </CardContent>
                <CardFooter>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setLocation('/ai-assistant/technical')} variant="outline" size="sm">
                      <i className="fas fa-robot mr-2"></i>
                      Technical
                    </Button>
                    <Button onClick={() => setLocation('/ai-assistant/ideas')} variant="outline" size="sm">
                      <i className="fas fa-robot mr-2"></i>
                      Ideas
                    </Button>
                    <Button onClick={() => setLocation('/ai-assistant/general')} variant="outline" size="sm">
                      <i className="fas fa-robot mr-2"></i>
                      General
                    </Button>
                    <Button onClick={() => setLocation('/ai-assistant/hr')} variant="outline" size="sm">
                      <i className="fas fa-robot mr-2"></i>
                      HR
                    </Button>
                  </div>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center mb-2">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900 mr-3">
                      <i className="fab fa-slack text-primary-600 dark:text-primary-400"></i>
                    </div>
                    <CardTitle>Slack Integration</CardTitle>
                  </div>
                  <CardDescription>
                    Get answers directly in Slack by mentioning @X-AI-Forum
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Our Slack integration allows you to get AI-powered answers without leaving your workflow.
                    Simply mention @X-AI-Forum in any channel or direct message to ask a question.
                  </p>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <i className="fas fa-info-circle mr-1"></i>
                    Available in all workspace channels
                  </p>
                </CardFooter>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <div className="flex items-center mb-2">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900 mr-3">
                    <i className="fas fa-file-upload text-primary-600 dark:text-primary-400"></i>
                  </div>
                  <CardTitle>Document Management</CardTitle>
                </div>
                <CardDescription>
                  Upload and manage documents to improve AI responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Upload documents to each category to improve the AI's knowledge and provide more accurate answers.
                  Documents are processed using Amazon Titan embedding models and stored securely.
                </p>
                <Button onClick={() => setLocation('/documents')}>
                  <i className="fas fa-file-upload mr-2"></i>
                  Manage Documents
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

interface ForumCardProps {
  title: string;
  description: string;
  icon: string;
  category: string;
}

function ForumCard({ title, description, icon, category }: ForumCardProps) {
  const [, setLocation] = useLocation();
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center mb-2">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900 mr-3">
            <i className={`fas fa-${icon} text-primary-600 dark:text-primary-400`}></i>
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between">
        <Button onClick={() => setLocation(`/forums/${category}`)} variant="default">
          <i className="fas fa-comments mr-2"></i>
          View Forum
        </Button>
        <Button onClick={() => setLocation(`/ai-assistant/${category}`)} variant="outline">
          <i className="fas fa-robot mr-2"></i>
          Ask AI
        </Button>
      </CardFooter>
    </Card>
  );
}

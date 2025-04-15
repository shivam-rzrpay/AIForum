import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/button';

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Don't render the login page if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center mb-8">
            <i className="fas fa-robot text-primary-600 text-3xl mr-3"></i>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">X-AI-Forum</h1>
          </div>
          
          <div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Access the AI-powered Q&A platform for your organization
            </p>
          </div>
          
          <div className="mt-8">
            <div className="mt-6">
              <LoginForm />
              
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-gray-50 dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">
                      Don't have an account?
                    </span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setLocation('/register')}
                  >
                    Create an account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-800">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="flex h-full items-center justify-center p-12">
            <div className="max-w-xl text-white">
              <h2 className="text-4xl font-bold mb-6">
                AI-Powered Knowledge Sharing
              </h2>
              <p className="text-xl mb-8">
                Get instant answers to your questions about projects, policies, and more. Tap into collective knowledge and AI assistance.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <i className="fas fa-check-circle text-green-400 mr-3 text-xl"></i>
                  <span className="text-lg">Technical support and documentation</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check-circle text-green-400 mr-3 text-xl"></i>
                  <span className="text-lg">Product ideas and feedback</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check-circle text-green-400 mr-3 text-xl"></i>
                  <span className="text-lg">HR policies and onboarding</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check-circle text-green-400 mr-3 text-xl"></i>
                  <span className="text-lg">General organizational knowledge</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

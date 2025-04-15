import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Create schema for post
const postSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150, 'Title must be less than 150 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  tags: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

interface PostQuestionProps {
  category: string;
  onSuccess?: () => void;
}

export default function PostQuestion({ category, onSuccess }: PostQuestionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Setup form
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      tags: '',
    },
  });
  
  // Create mutation
  const mutation = useMutation({
    mutationFn: async (values: PostFormValues) => {
      // Process tags if provided
      const tags = values.tags ? values.tags.split(',').map(tag => tag.trim()) : [];
      
      // Create post
      const response = await apiRequest('POST', `/api/forums/${category}/posts`, {
        title: values.title,
        content: values.content,
        tags: tags.length > 0 ? tags : undefined,
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Show success message
      toast({
        title: 'Question posted',
        description: 'Your question has been posted successfully.',
      });
      
      // Reset form
      form.reset();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: [`/api/forums/${category}`] });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post question',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    mutation.mutate(values);
  };
  
  // Get category-specific placeholder
  const getContentPlaceholder = () => {
    switch (category) {
      case 'technical':
        return 'Describe your technical issue or question in detail. Include any relevant code snippets, error messages, or steps to reproduce.';
      case 'ideas':
        return 'Describe your product idea or feature request. What problem does it solve? Who would benefit from it?';
      case 'general':
        return 'Describe your question about the organization, processes, or other general topics.';
      case 'hr':
        return 'Describe your question about HR policies, benefits, onboarding, or other HR-related topics.';
      default:
        return 'Describe your question in detail...';
    }
  };
  
  return (
    <div className="p-1">
      <DialogTitle>Post a New Question</DialogTitle>
      <DialogDescription>
        Get answers from AI and colleagues in the {category} forum
      </DialogDescription>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="What's your question about?" 
                    {...field} 
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={getContentPlaceholder()} 
                    {...field} 
                    rows={8}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags (optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Separate tags with commas" 
                    {...field} 
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Posting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Post Question
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
}

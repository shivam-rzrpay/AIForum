import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Document types by category
const documentTypes = {
  technical: [
    'Technical Specification',
    'API Documentation',
    'User Guide',
    'Product Requirement Document',
    'Implementation Guide',
    'Runbook',
    'Architecture Document',
    'Other',
  ],
  ideas: [
    'Product Roadmap',
    'Feature Request',
    'UX Research',
    'Market Analysis',
    'Competitive Analysis',
    'User Feedback',
    'Brainstorming Document',
    'Other',
  ],
  general: [
    'Organization Structure',
    'Process Documentation',
    'Contact Information',
    'Team Overview',
    'Policies',
    'Guidelines',
    'FAQ Document',
    'Other',
  ],
  hr: [
    'HR Policy',
    'Benefits Information',
    'Onboarding Guide',
    'Employee Handbook',
    'Compensation Guidelines',
    'Training Material',
    'Employee Resources',
    'Other',
  ],
};

// Max file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ACCEPTED_FILE_TYPES = [
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
];

// Form schema
const uploadSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  documentType: z.string().min(1, 'Document type is required'),
  file: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, 'File is required')
    .refine(
      (files) => files[0]?.size <= MAX_FILE_SIZE,
      'File size must be less than 10MB'
    )
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files[0]?.type) || 
                 // Check for common file extensions if MIME type isn't recognized
                 /\.(pdf|docx?|xlsx?|pptx?|txt|md)$/i.test(files[0]?.name || ''),
      'Only document files are allowed (PDF, Word, Excel, PowerPoint, Text, Markdown)'
    ),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface UploadFormProps {
  category: string;
  onSuccess?: () => void;
}

export default function UploadForm({ category, onSuccess }: UploadFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Setup form
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      name: '',
      description: '',
      documentType: '',
    },
  });
  
  // Handle file upload
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: data,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload document');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Document uploaded',
        description: 'Your document has been uploaded and is being processed.',
      });
      
      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: UploadFormValues) => {
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('category', category);
    formData.append('documentType', values.documentType);
    
    if (values.description) {
      formData.append('description', values.description);
    }
    
    if (values.file[0]) {
      formData.append('file', values.file[0]);
    }
    
    uploadMutation.mutate(formData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter document name" 
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
          name="documentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {documentTypes[category as keyof typeof documentTypes]?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Briefly describe the document content" 
                  {...field} 
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                This helps the AI better understand the document content.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>Upload Document</FormLabel>
              <FormControl>
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                      <i className="fas fa-file-upload text-3xl"></i>
                    </div>
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                        <span>Upload a file</span>
                        <Input
                          id="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              onChange(files);
                            }
                          }}
                          disabled={isSubmitting}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
                          {...rest}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF, Word, Excel, PowerPoint, Text up to 10MB
                    </p>
                    {value instanceof FileList && value.length > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        Selected: {value[0].name} ({(value[0].size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              if (onSuccess) onSuccess();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-upload mr-2"></i>
                Upload and Process
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

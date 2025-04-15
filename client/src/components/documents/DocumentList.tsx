import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface Document {
  id: number;
  name: string;
  description: string | null;
  fileType: string;
  fileSize: number;
  category: string;
  documentType: string;
  filePath: string;
  uploadedById: number;
  status: string;
  createdAt: string;
  embeddingId: string | null;
}

interface DocumentListProps {
  category: string;
  onUpload: () => void;
}

export default function DocumentList({ category, onUpload }: DocumentListProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  
  // Fetch documents
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/documents', category],
    queryFn: async () => {
      const response = await fetch(`/api/documents?category=${category}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      return response.json();
    },
  });
  
  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/documents/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: 'Document deleted',
        description: 'The document has been deleted successfully.',
      });
      setDocumentToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: 'destructive',
      });
    },
  });
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };
  
  // Get file icon
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'file-pdf';
      case 'doc':
      case 'docx':
        return 'file-word';
      case 'xls':
      case 'xlsx':
        return 'file-excel';
      case 'ppt':
      case 'pptx':
        return 'file-powerpoint';
      case 'txt':
        return 'file-alt';
      case 'md':
        return 'file-code';
      default:
        return 'file';
    }
  };
  
  // Get file icon color
  const getFileIconColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'text-red-600 dark:text-red-300';
      case 'doc':
      case 'docx':
        return 'text-blue-600 dark:text-blue-300';
      case 'xls':
      case 'xlsx':
        return 'text-green-600 dark:text-green-300';
      case 'ppt':
      case 'pptx':
        return 'text-orange-600 dark:text-orange-300';
      default:
        return 'text-gray-600 dark:text-gray-300';
    }
  };
  
  // Filter documents by search term
  const filteredDocuments = data?.filter((doc: Document) => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    doc.documentType.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button onClick={onUpload}>
            <i className="fas fa-upload mr-2"></i>
            Upload New
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 dark:text-red-400">
              {error instanceof Error ? error.message : 'An error occurred while loading documents'}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/documents', category] })}
            >
              Try Again
            </Button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <i className="fas fa-file-upload text-gray-400 text-4xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No documents yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Upload documents to improve AI responses for the {category} category
            </p>
            <Button onClick={onUpload}>
              <i className="fas fa-upload mr-2"></i>
              Upload Document
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments?.map((doc: Document) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                        <i className={`fas fa-${getFileIcon(doc.fileType)} ${getFileIconColor(doc.fileType)}`}></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(doc.fileSize)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900 dark:text-white uppercase">{doc.fileType}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{doc.documentType}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(doc.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    {doc.status === 'processed' ? (
                      <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                        Processed
                      </span>
                    ) : doc.status === 'processing' ? (
                      <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                        Processing
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                        Failed
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <i className="fas fa-ellipsis-v"></i>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => console.log('Download not implemented')}
                        >
                          <i className="fas fa-download mr-2"></i>
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDocumentToDelete(doc)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <i className="fas fa-trash mr-2"></i>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document "{documentToDelete?.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (documentToDelete) {
                  deleteMutation.mutate(documentToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

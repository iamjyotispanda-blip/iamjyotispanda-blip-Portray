import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Database, FileText, Calendar, Clock, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DatabaseBackup {
  id: string;
  filename: string;
  description?: string;
  size: number;
  createdAt: string;
  createdBy: string;
  status: 'completed' | 'in_progress' | 'failed';
}

export default function DatabaseBackupPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [backupDescription, setBackupDescription] = useState("");

  // Fetch backup history
  const { data: backups = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/database/backups"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/database/backups");
      return response.json();
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async (description: string) => {
      return apiRequest("POST", "/api/database/backup", { description });
    },
    onSuccess: () => {
      refetch();
      setIsCreateDialogOpen(false);
      setBackupDescription("");
      toast({
        title: "Backup Started",
        description: "Database backup creation has been initiated. You'll see progress updates below.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create database backup",
        variant: "destructive",
      });
    },
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      return apiRequest("DELETE", `/api/database/backups/${backupId}`);
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Backup deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete backup",
        variant: "destructive",
      });
    },
  });

  const handleCreateBackup = () => {
    createBackupMutation.mutate(backupDescription);
  };

  // Poll for backup status updates every 3 seconds when there are in-progress backups
  const hasInProgressBackups = backups.some((backup: DatabaseBackup) => backup.status === 'in_progress');
  
  // Refetch backups every 3 seconds if there are in-progress backups
  useQuery({
    queryKey: ["/api/database/backups", "polling"],
    queryFn: async () => {
      if (hasInProgressBackups) {
        refetch();
      }
      return null;
    },
    refetchInterval: hasInProgressBackups ? 3000 : false,
    enabled: hasInProgressBackups,
  });

  const handleDownloadBackup = (backupId: string, filename: string) => {
    window.open(`/api/database/backups/${backupId}/download`, '_blank');
  };

  const handleDeleteBackup = (backupId: string) => {
    if (confirm("Are you sure you want to delete this backup? This action cannot be undone.")) {
      deleteBackupMutation.mutate(backupId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AppLayout title="Database Backup" activeSection="database-backup">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <main className="px-2 sm:px-4 lg:px-6 py-2 flex-1">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Database Backup</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Create and manage database backups for data protection
                </p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="h-8"
                    disabled={hasInProgressBackups}
                  >
                    {hasInProgressBackups ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Backup In Progress...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Create Backup
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Database Backup</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter backup description..."
                        value={backupDescription}
                        onChange={(e) => setBackupDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateBackup}
                      disabled={createBackupMutation.isPending || hasInProgressBackups}
                    >
                      {createBackupMutation.isPending ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </div>
                      ) : hasInProgressBackups ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        "Create Backup"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Backup Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Backups</p>
                      <p className="text-xl font-semibold">{backups.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                      <p className="text-xl font-semibold">
                        {backups.filter((b: DatabaseBackup) => b.status === 'completed').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Size</p>
                      <p className="text-xl font-semibold">
                        {formatFileSize(backups.reduce((total: number, backup: DatabaseBackup) => total + backup.size, 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Backup History */}
            <Card>
              <CardHeader>
                <CardTitle>Backup History</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading backups...</div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No backups found. Create your first backup to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {backups.map((backup: DatabaseBackup) => (
                      <div key={backup.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">{backup.filename}</h3>
                                {backup.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{backup.description}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  variant={backup.status === 'completed' ? 'default' : backup.status === 'in_progress' ? 'secondary' : 'destructive'}
                                  className={
                                    backup.status === 'completed' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : backup.status === 'failed'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  }
                                >
                                  {backup.status === 'completed' ? 'Completed' : 
                                   backup.status === 'in_progress' ? 'In Progress' : 'Failed'}
                                </Badge>
                                {backup.status === 'in_progress' && (
                                  <div className="flex items-center space-x-1">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                    <span className="text-xs text-blue-600 dark:text-blue-400">Processing...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(backup.createdAt), "MMM dd, yyyy")}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{format(new Date(backup.createdAt), "hh:mm a")}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <FileText className="w-4 h-4" />
                                <span>{formatFileSize(backup.size)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {backup.status === 'completed' && (
                            <div className="flex space-x-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadBackup(backup.id, backup.filename)}
                                className="h-8"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBackup(backup.id)}
                                disabled={deleteBackupMutation.isPending}
                                className="h-8 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
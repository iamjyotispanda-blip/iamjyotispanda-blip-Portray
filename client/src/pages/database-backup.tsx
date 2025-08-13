import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Database, FileText, Calendar, Clock, CheckCircle, AlertCircle, Trash2, RotateCcw, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string>("");
  const [selectedBackupName, setSelectedBackupName] = useState<string>("");
  const [createIfNotExists, setCreateIfNotExists] = useState(false);
  const [backupDescription, setBackupDescription] = useState("");
  const [downloadingBackupId, setDownloadingBackupId] = useState<string>("");

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

  // Cancel backup mutation
  const cancelBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await apiRequest("POST", `/api/database/backup/${backupId}/cancel`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to cancel backup');
      }
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Backup Cancelled",
        description: data.message || "Database backup has been cancelled successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Cancel Failed",
        description: error?.message || "Failed to cancel database backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async ({ backupId, createIfNotExists }: { backupId: string; createIfNotExists: boolean }) => {
      const response = await apiRequest("POST", `/api/database/restore/${backupId}`, { createIfNotExists });
      return response.json();
    },
    onSuccess: (data) => {
      setIsRestoreDialogOpen(false);
      setSelectedBackupId("");
      setSelectedBackupName("");
      setCreateIfNotExists(false);
      if (data.success) {
        toast({
          title: "Restore Successful",
          description: data.message,
        });
      } else {
        toast({
          title: "Restore Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Restore Error",
        description: error.message || "Failed to restore database",
        variant: "destructive",
      });
    },
  });

  const handleCreateBackup = () => {
    createBackupMutation.mutate(backupDescription);
  };

  // Poll for backup status updates every 2 seconds when there are in-progress backups
  const hasInProgressBackups = backups.some((backup: DatabaseBackup) => backup.status === 'in_progress');
  
  // Refetch backups every 2 seconds if there are in-progress backups (faster polling for better UX)
  useQuery({
    queryKey: ["/api/database/backups", "polling"],
    queryFn: async () => {
      if (hasInProgressBackups) {
        refetch();
      }
      return null;
    },
    refetchInterval: hasInProgressBackups ? 2000 : false,
    enabled: hasInProgressBackups,
  });

  const handleDownloadBackup = async (backupId: string, filename: string) => {
    setDownloadingBackupId(backupId);
    try {
      const response = await apiRequest("GET", `/api/database/backups/${backupId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }
      
      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: `Backup "${filename}" downloaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download backup file",
        variant: "destructive",
      });
    } finally {
      setDownloadingBackupId("");
    }
  };

  const handleDeleteBackup = (backupId: string) => {
    if (confirm("Are you sure you want to delete this backup? This action cannot be undone.")) {
      deleteBackupMutation.mutate(backupId);
    }
  };

  const handleCancelBackup = (backupId: string) => {
    if (confirm("Are you sure you want to cancel this backup?")) {
      cancelBackupMutation.mutate(backupId);
    }
  };

  const handleRestoreBackup = (backupId: string, filename: string) => {
    setSelectedBackupId(backupId);
    setSelectedBackupName(filename);
    setIsRestoreDialogOpen(true);
  };

  const handleConfirmRestore = () => {
    if (selectedBackupId) {
      restoreBackupMutation.mutate({ 
        backupId: selectedBackupId, 
        createIfNotExists 
      });
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
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="h-8"
                    disabled={hasInProgressBackups || createBackupMutation.isPending}
                  >
                    {hasInProgressBackups || createBackupMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {createBackupMutation.isPending ? "Initiating..." : "Backup In Progress..."}
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
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Backup...</span>
                        </div>
                      ) : hasInProgressBackups ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
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
              <Card className={hasInProgressBackups ? 'ring-2 ring-blue-200 dark:ring-blue-800 shadow-lg' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center ${hasInProgressBackups ? 'animate-pulse' : ''}`}>
                      {hasInProgressBackups ? (
                        <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                      ) : (
                        <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {hasInProgressBackups ? 'Creating Backup...' : 'Total Backups'}
                      </p>
                      <p className="text-xl font-semibold">{backups.length}</p>
                    </div>
                  </div>
                  {hasInProgressBackups && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full animate-pulse transition-all duration-300" style={{width: '60%'}}></div>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                        <div className="flex space-x-1 mr-2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        Processing database backup...
                      </p>
                    </div>
                  )}
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
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-gray-500">Loading backup history...</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {/* Skeleton loading animation */}
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                              </div>
                              <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                                  className={`${
                                    backup.status === 'completed' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : backup.status === 'failed'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  } ${backup.status === 'in_progress' ? 'animate-pulse' : ''}`}
                                >
                                  {backup.status === 'in_progress' && (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  )}
                                  {backup.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {backup.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                                  {backup.status === 'completed' ? 'Completed' : 
                                   backup.status === 'in_progress' ? 'Creating...' : 'Failed'}
                                </Badge>
                                {backup.status === 'in_progress' && (
                                  <div className="flex items-center space-x-1">
                                    <div className="flex space-x-1">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                    <span className="text-xs text-blue-600 dark:text-blue-400">Processing backup...</span>
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
                          
                          <div className="flex space-x-2 ml-4">
                            {backup.status === 'in_progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelBackup(backup.id)}
                                disabled={cancelBackupMutation.isPending}
                                className="h-8 text-red-600 hover:text-red-700"
                              >
                                {cancelBackupMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Cancelling...
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4 mr-1" />
                                    Cancel
                                  </>
                                )}
                              </Button>
                            )}
                            
                            {backup.status === 'completed' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadBackup(backup.id, backup.filename)}
                                  disabled={downloadingBackupId === backup.id}
                                  className="h-8"
                                >
                                  {downloadingBackupId === backup.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Downloading...
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-4 h-4 mr-1" />
                                      Download
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestoreBackup(backup.id, backup.filename)}
                                  disabled={restoreBackupMutation.isPending}
                                  className="h-8 text-blue-600 hover:text-blue-700"
                                >
                                  {restoreBackupMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Restoring...
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw className="w-4 h-4 mr-1" />
                                      Restore
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                            
                            {(backup.status === 'completed' || backup.status === 'failed') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBackup(backup.id)}
                                disabled={deleteBackupMutation.isPending}
                                className="h-8 text-red-600 hover:text-red-700"
                              >
                                {deleteBackupMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Restore Database Dialog */}
          <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
            <DialogContent className="w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-600">Restore Database</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-semibold mb-1">Warning: This action will replace your current database!</p>
                      <p>All existing data will be overwritten with the backup data from:</p>
                      <p className="font-mono text-xs mt-1 bg-yellow-100 dark:bg-yellow-800/30 p-1 rounded">{selectedBackupName}</p>
                      <p className="text-xs mt-2 text-yellow-700 dark:text-yellow-300">
                        <strong>Note:</strong> Only backups created with the new system contain real data. 
                        Older mock backups will simulate restore but won't change actual data.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="createIfNotExists"
                    checked={createIfNotExists}
                    onCheckedChange={(checked) => setCreateIfNotExists(!!checked)}
                  />
                  <div className="space-y-1">
                    <Label 
                      htmlFor="createIfNotExists" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Create database if it doesn't exist
                    </Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Check this option if you want to create a new database structure if it doesn't already exist.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsRestoreDialogOpen(false)}
                  disabled={restoreBackupMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmRestore}
                  disabled={restoreBackupMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {restoreBackupMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Restoring Database...</span>
                    </div>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore Database
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </AppLayout>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import type { EmailLog } from "@shared/schema";

interface EmailLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configurationId: number;
  portName?: string;
}

export function EmailLogDialog({ open, onOpenChange, configurationId, portName }: EmailLogDialogProps) {
  // Get email logs for this configuration
  const { data: emailLogs = [], isLoading, error } = useQuery<EmailLog[]>({
    queryKey: ["/api/email-logs", configurationId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/email-logs?configId=${configurationId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch email logs: ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: open && !!configurationId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default" className="bg-green-100 text-green-800">Sent</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEmailTypeLabel = (type: string) => {
    switch (type) {
      case "verification":
        return "Email Verification";
      case "password_setup":
        return "Password Setup";
      case "test":
        return "Test Email";
      case "notification":
        return "Notification";
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5" />
            Email Logs
            {portName && <span className="text-sm font-normal text-muted-foreground">for {portName}</span>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading email logs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-medium">Failed to load email logs</h3>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "An unexpected error occurred"}
                </p>
              </div>
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium">No emails sent yet</h3>
                <p className="text-sm text-muted-foreground">
                  Email logs will appear here once emails are sent using this configuration.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>To Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getEmailTypeLabel(log.emailType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.toEmail}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={log.subject}>
                      {log.subject}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.sentAt), "MMM d, yyyy 'at' h:mm a")}
                    </TableCell>
                    <TableCell>
                      {log.errorMessage && (
                        <div className="max-w-xs">
                          <p className="text-xs text-red-600 truncate" title={log.errorMessage}>
                            {log.errorMessage}
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {emailLogs.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {emailLogs.length} email{emailLogs.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>{emailLogs.filter(log => log.status === 'sent').length} sent</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span>{emailLogs.filter(log => log.status === 'failed').length} failed</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-500" />
                <span>{emailLogs.filter(log => log.status === 'pending').length} pending</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
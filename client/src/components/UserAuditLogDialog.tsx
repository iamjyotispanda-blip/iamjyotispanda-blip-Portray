import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, Clock, CheckCircle, AlertCircle, Edit, Shield, Key, X } from "lucide-react";
import { format } from "date-fns";
import type { UserAuditLog } from "@shared/schema";

interface UserAuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
}

export function UserAuditLogDialog({ open, onOpenChange, userId, userName }: UserAuditLogDialogProps) {
  // Get audit logs for this user
  const { data: auditLogs = [], isLoading, error } = useQuery<UserAuditLog[]>({
    queryKey: ["/api/user-audit-logs", userId],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/user-audit-logs?userId=${userId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: open && !!userId,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <User className="h-4 w-4 text-blue-500" />;
      case "updated":
        return <Edit className="h-4 w-4 text-orange-500" />;
      case "status_changed":
        return <Shield className="h-4 w-4 text-purple-500" />;
      case "role_changed":
        return <Shield className="h-4 w-4 text-indigo-500" />;
      case "verified":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "password_setup":
        return <Key className="h-4 w-4 text-yellow-500" />;
      case "login":
        return <Clock className="h-4 w-4 text-gray-500" />;
      case "deleted":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "created":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Created</Badge>;
      case "updated":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Updated</Badge>;
      case "status_changed":
        return <Badge variant="outline" className="border-purple-200 text-purple-800">Status Changed</Badge>;
      case "role_changed":
        return <Badge variant="outline" className="border-indigo-200 text-indigo-800">Role Changed</Badge>;
      case "verified":
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>;
      case "password_setup":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Password Setup</Badge>;
      case "login":
        return <Badge variant="outline">Login</Badge>;
      case "deleted":
        return <Badge variant="destructive">Deleted</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatChanges = (oldValues: string | null, newValues: string | null) => {
    if (!oldValues && !newValues) return null;
    
    try {
      const oldData = oldValues ? JSON.parse(oldValues) : {};
      const newData = newValues ? JSON.parse(newValues) : {};
      
      const changes = [];
      
      // Compare key fields
      if (oldData.email !== newData.email && (oldData.email || newData.email)) {
        changes.push(`Email: ${oldData.email || 'none'} → ${newData.email || 'none'}`);
      }
      if (oldData.firstName !== newData.firstName && (oldData.firstName || newData.firstName)) {
        changes.push(`First Name: ${oldData.firstName || 'none'} → ${newData.firstName || 'none'}`);
      }
      if (oldData.lastName !== newData.lastName && (oldData.lastName || newData.lastName)) {
        changes.push(`Last Name: ${oldData.lastName || 'none'} → ${newData.lastName || 'none'}`);
      }
      if (oldData.role !== newData.role && (oldData.role || newData.role)) {
        changes.push(`Role: ${oldData.role || 'none'} → ${newData.role || 'none'}`);
      }
      if (oldData.isActive !== newData.isActive && (oldData.isActive !== undefined || newData.isActive !== undefined)) {
        changes.push(`Status: ${oldData.isActive ? 'Active' : 'Inactive'} → ${newData.isActive ? 'Active' : 'Inactive'}`);
      }
      
      return changes.length > 0 ? changes.join(', ') : null;
    } catch (error) {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              User Activity Log
              {userName && <span className="text-sm text-muted-foreground">• {userName}</span>}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-audit-logs"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading activity logs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-medium">Failed to load activity logs</h3>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "An unexpected error occurred"}
                </p>
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <History className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium">No activity logs</h3>
                <p className="text-sm text-muted-foreground">
                  User activity logs will appear here once actions are performed.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm">{log.description}</p>
                    </TableCell>
                    <TableCell className="max-w-md">
                      {formatChanges(log.oldValues, log.newValues) && (
                        <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          {formatChanges(log.oldValues, log.newValues)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {log.performedBy === log.targetUserId ? 'Self' : 'Admin'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>
                        <div>{format(new Date(log.createdAt), "MMM d, yyyy")}</div>
                        <div className="text-xs">{format(new Date(log.createdAt), "h:mm:ss a")}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {log.ipAddress || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {auditLogs.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {auditLogs.length} activity log{auditLogs.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-blue-500" />
                <span>{auditLogs.filter(log => log.action === 'created').length} created</span>
              </div>
              <div className="flex items-center gap-1">
                <Edit className="h-3 w-3 text-orange-500" />
                <span>{auditLogs.filter(log => log.action === 'updated').length} updated</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>{auditLogs.filter(log => log.action === 'verified').length} verified</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Check, Trash2, ArrowLeft, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

import type { Notification } from "@shared/schema";

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  }) as { data: any };

  // Get all notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: user?.role === "SystemAdmin",
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Success",
        description: "Notification deleted successfully",
      });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Check if it's a terminal activation notification
    if (notification.type === 'terminal_activation' || notification.title.toLowerCase().includes('terminal activation')) {
      // Mark as read if not already read
      if (!notification.isRead) {
        markAsReadMutation.mutate(notification.id);
      }
      
      // Navigate to terminal activation page with terminal ID
      // Parse terminal ID from notification data or message
      let terminalId = null;
      if (notification.data) {
        try {
          const data = JSON.parse(notification.data);
          terminalId = data.terminalId || data.id;
        } catch (e) {
          // If data is not JSON, try to extract ID from message
          const match = notification.message.match(/terminal\\s+(\\d+)/i);
          if (match) terminalId = match[1];
        }
      }
      
      if (terminalId) {
        setLocation(`/terminal-activation?autoActivate=${terminalId}`);
      } else {
        setLocation('/terminal-activation');
      }
    }
  };

  // Filter notifications based on search term
  const filteredNotifications = notifications.filter((notification: Notification) =>
    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user is System Admin
  if (user?.role !== "SystemAdmin") {
    return (
      <AppLayout title="Access Denied" activeSection="notifications">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">Access denied. System Admin role required.</p>
              <Button onClick={() => setLocation("/dashboard")} className="h-8">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Notifications" activeSection="notifications">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">All Notifications</span>
        </div>
        
        <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/dashboard")}
                  className="h-8"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {notifications.length > 0 && (
                <Button
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="h-8"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark All Read
                </Button>
              )}
            </div>

            {/* Notifications List */}
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">Loading notifications...</div>
                </CardContent>
              </Card>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    {searchTerm ? "No notifications found matching your search." : "No notifications found."}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification: Notification) => (
                  <Card 
                    key={notification.id} 
                    className={`hover:shadow-md transition-shadow cursor-pointer ${!notification.isRead ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!notification.isRead ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <Bell className={`w-5 h-5 ${!notification.isRead ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className={`text-base font-semibold ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                {notification.title}
                              </h3>
                              {!notification.isRead && (
                                <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className={`text-sm ${!notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {format(new Date(notification.createdAt), "MMM dd, yyyy")} at {format(new Date(notification.createdAt), "hh:mm a")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                              className="h-8 w-8 p-0"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
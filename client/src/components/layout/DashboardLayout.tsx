import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  LogOut, Menu as MenuIcon, PanelLeftClose, Bell, Check, Trash2, CheckCircle, Settings, User, Mail, ChevronDown, Menu, Shield, Users, Home, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PortrayLogo } from "@/components/portray-logo";
import { TreeNavigation } from "@/components/navigation/TreeNavigation";
import { AuthService } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { Notification, Menu as MenuType } from "@shared/schema";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  activeSection?: string;
}

export function DashboardLayout({ children, title, activeSection }: DashboardLayoutProps) {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get notifications for authenticated users
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const { data: unreadCount = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30 seconds
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
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleLogout = async () => {
    await AuthService.logout();
    setLocation("/login");
  };

  const handleNavigation = (route: string) => {
    setLocation(route);
    setSidebarOpen(false); // Close mobile sidebar after navigation
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Dashboard Style with gradient */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed && !sidebarHovered ? 'w-16' : 'w-72'} bg-gradient-to-b from-white via-blue-50 to-indigo-100 dark:from-gray-800 dark:via-gray-750 dark:to-gray-700 shadow-2xl border-r border-blue-200 dark:border-gray-600 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-all duration-300 ease-in-out lg:static lg:inset-0 flex flex-col`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Sidebar Header - Enhanced for Dashboard */}
        <div className={`flex items-center h-16 ${sidebarCollapsed && !sidebarHovered ? 'px-2 justify-center' : 'px-4 justify-between'} border-b border-blue-200 dark:border-gray-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative`}>
          {sidebarCollapsed && !sidebarHovered ? (
            <div className="flex justify-center w-full">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-white" />
                <span className="text-lg font-bold">Dashboard</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:flex h-9 w-9 p-0 items-center justify-center rounded-lg transition-all duration-300 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSidebarCollapsed(!sidebarCollapsed);
                  }}
                  title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {sidebarCollapsed ? (
                    <MenuIcon className="h-5 w-5" />
                  ) : (
                    <PanelLeftClose className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <TreeNavigation 
              activeSection={activeSection}
              onNavigate={handleNavigation}
              collapsed={sidebarCollapsed && !sidebarHovered}
            />
          </ScrollArea>
        </div>

        {/* Sidebar Footer - Enhanced */}
        {user && (
          <div className={`${sidebarCollapsed && !sidebarHovered ? 'p-2' : 'p-4'} border-t border-blue-200 dark:border-gray-600 bg-gradient-to-r from-blue-500 to-indigo-500 text-white`}>
            {sidebarCollapsed && !sidebarHovered ? (
              <div className="flex justify-center">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-medium">
                  {user.firstName && user.lastName ? 
                    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : 
                    user.firstName ? 
                    `${user.firstName.charAt(0)}${user.firstName.charAt(1) || ''}` : 
                    user.email ? 
                    `${user.email.charAt(0)}${user.email.charAt(1) || ''}` : 'US'
                  }
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-medium">
                  {user.firstName && user.lastName ? 
                    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : 
                    user.firstName ? 
                    `${user.firstName.charAt(0)}${user.firstName.charAt(1) || ''}` : 
                    user.email ? 
                    `${user.email.charAt(0)}${user.email.charAt(1) || ''}` : 'US'
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                  </p>
                  <p className="text-xs text-blue-100 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header for Dashboard */}
        <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border-b border-blue-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-mobile-menu"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <Home className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">{title}</span>
            </div>
          </div>

          {/* Right Side - Enhanced Icons */}
          <div className="flex items-center space-x-3">
            {/* Settings */}
            {user && (
              <Button variant="ghost" size="sm" className="relative" data-testid="button-settings">
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
            )}
            
            {/* Notifications */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
                    <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    {unreadCount.count > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                        {unreadCount.count > 9 ? '9+' : unreadCount.count}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between p-2">
                    <span className="font-medium">Notifications</span>
                    {unreadCount.count > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllAsReadMutation.mutate()}
                        className="text-xs"
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <ScrollArea className="max-h-64">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No notifications</div>
                    ) : (
                      notifications.slice(0, 5).map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="p-3 cursor-pointer border-b"
                          onClick={() => {
                            if (!notification.isRead) {
                              markAsReadMutation.mutate(notification.id);
                            }
                          }}
                        >
                          <div className="flex items-start space-x-2 w-full">
                            <div className={`w-2 h-2 rounded-full mt-2 ${notification.isRead ? 'bg-gray-300' : 'bg-blue-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{notification.title}</p>
                              <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(notification.id);
                              }}
                              className="opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2" data-testid="button-user-menu">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                      {user.firstName && user.lastName ? 
                        `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : 
                        user.firstName ? 
                        `${user.firstName.charAt(0)}${user.firstName.charAt(1) || ''}` : 
                        user.email ? 
                        `${user.email.charAt(0)}${user.email.charAt(1) || ''}` : 'US'
                      }
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-3 py-2 text-sm">
                    <p className="font-medium">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Content Area - Enhanced */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
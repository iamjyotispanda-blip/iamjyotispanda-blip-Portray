import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  LogOut, Menu as MenuIcon, PanelLeftClose, Bell, Check, Trash2, CheckCircle, Settings, User, Mail, ChevronDown, Menu, Shield, Users, Ship, Anchor
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

interface PortsLayoutProps {
  children: React.ReactNode;
  title: string;
  activeSection?: string;
}

export function PortsLayout({ children, title, activeSection }: PortsLayoutProps) {
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
    refetchInterval: 30000,
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

  const handleLogout = async () => {
    await AuthService.logout();
    setLocation("/login");
  };

  const handleNavigation = (route: string) => {
    setLocation(route);
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-teal-900 dark:to-cyan-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Port Management Style */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed && !sidebarHovered ? 'w-16' : 'w-72'} bg-gradient-to-b from-white via-teal-50 to-cyan-100 dark:from-gray-800 dark:via-teal-800 dark:to-cyan-800 shadow-2xl border-r border-teal-200 dark:border-teal-600 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-all duration-300 ease-in-out lg:static lg:inset-0 flex flex-col`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Sidebar Header - Port Management Theme */}
        <div className={`flex items-center h-16 ${sidebarCollapsed && !sidebarHovered ? 'px-2 justify-center' : 'px-4 justify-between'} border-b border-teal-200 dark:border-teal-600 bg-gradient-to-r from-teal-600 to-cyan-600 text-white relative`}>
          {sidebarCollapsed && !sidebarHovered ? (
            <div className="flex justify-center w-full">
              <Ship className="h-8 w-8 text-white" />
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <Anchor className="h-8 w-8 text-white" />
                <span className="text-lg font-bold">Port Management</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:flex h-9 w-9 p-0 items-center justify-center rounded-lg transition-all duration-300 text-white hover:bg-white/20"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {sidebarCollapsed ? <MenuIcon className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
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

        {/* Sidebar Footer - Port Theme */}
        {user && (
          <div className={`${sidebarCollapsed && !sidebarHovered ? 'p-2' : 'p-4'} border-t border-teal-200 dark:border-teal-600 bg-gradient-to-r from-teal-500 to-cyan-500 text-white`}>
            {sidebarCollapsed && !sidebarHovered ? (
              <div className="flex justify-center">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-teal-600 font-medium">
                  {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-teal-600 font-medium">
                  {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                  </p>
                  <p className="text-xs text-teal-100 truncate">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header for Port Management */}
        <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border-b border-teal-200 dark:border-teal-700 h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center space-x-4">
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
              <Ship className="h-5 w-5 text-teal-600" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">{title}</span>
            </div>
          </div>

          {/* Right Side - Enhanced Icons */}
          <div className="flex items-center space-x-3">
            {user && (
              <>
                <Button variant="ghost" size="sm" className="relative" data-testid="button-settings">
                  <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </Button>
                
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
                    <div className="p-4 text-center text-gray-500">
                      {notifications.length === 0 ? 'No notifications' : `${unreadCount.count} unread notifications`}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2" data-testid="button-user-menu">
                      <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-medium">
                        {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
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
                      <User className="h-4 w-4 mr-2" />Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </header>

        {/* Content Area - Port Management Theme */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-white via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-teal-900 dark:to-cyan-900">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
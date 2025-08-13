import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  LogOut, Menu as MenuIcon, PanelLeftClose, Bell, Check, Trash2, CheckCircle, Settings, User, Mail, ChevronDown, Menu, Shield, Users, AlertCircle
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
import type { Notification, Menu as MenuType, Role } from "@shared/schema";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  activeSection?: string;
}

export function AppLayout({ children, title, activeSection }: AppLayoutProps) {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // System Configuration Dropdown Component
  const SystemConfigDropdown = () => {
    const { data: allMenus = [], isLoading, error } = useQuery<MenuType[]>({
      queryKey: ["/api/menus"],
    });

    // Get user role for permission checking
    const { data: userRole } = useQuery<Role>({
      queryKey: ["/api/roles", user?.roleId],
      queryFn: async () => {
        if (!user?.roleId) return null;
        const response = await apiRequest("GET", `/api/roles/${user.roleId}`);
        return await response.json();
      },
      enabled: !!user?.roleId,
    });

    console.log('SystemConfigDropdown rendering - allMenus:', allMenus.length, 'isLoading:', isLoading, 'error:', error);
    console.log('SystemConfigDropdown - user:', user);
    console.log('SystemConfigDropdown - userRole:', userRole);

    // Helper function to check if user has permission for a menu item
    const hasSystemConfigPermission = (menuName: string): boolean => {
      if (!userRole?.permissions || !Array.isArray(userRole.permissions)) {
        return false;
      }

      return userRole.permissions.some((permission: string) => {
        const parts = permission.split(':');
        if (parts.length >= 2) {
          return parts[0] === 'system-config' && parts[1] === menuName;
        }
        return false;
      });
    };

    // Get system configuration menus
    const systemConfigParent = allMenus.find(menu => menu.name === 'system-config');
    console.log('System config parent found:', systemConfigParent);
    
    // For SystemAdmin users, show all system config menus regardless of permissions
    const isSystemAdmin = user?.isSystemAdmin || user?.role === 'SystemAdmin';
    const systemConfigMenus = allMenus.filter(menu => 
      menu.parentId === systemConfigParent?.id &&
      menu.isActive &&
      (isSystemAdmin || hasSystemConfigPermission(menu.name))
    ).sort((a, b) => a.sortOrder - b.sortOrder);
    
    console.log('System config menus found:', systemConfigMenus.length, systemConfigMenus);
    console.log('SystemConfigDropdown - isSystemAdmin:', isSystemAdmin, 'systemConfigMenus:', systemConfigMenus.length);
    console.log('SystemConfigDropdown - Return condition check:', {
      isSystemAdmin,
      systemConfigMenusLength: systemConfigMenus.length,
      isLoading,
      shouldReturn: !isSystemAdmin && !systemConfigMenus.length && !isLoading
    });
    
    // Show dropdown if user is system admin or has config menus
    if (!isSystemAdmin && !systemConfigMenus.length && !isLoading) {
      console.log('SystemConfigDropdown - Returning null (no permissions)');
      return null;
    }
    
    console.log('SystemConfigDropdown - Rendering dropdown with menus:', systemConfigMenus.length);

    const getIconComponent = (iconName: string | null) => {
      switch (iconName) {
        case 'Mail': return Mail;
        case 'Menu': return Menu;
        case 'Shield': return Shield;
        case 'Users': return Users;
        case 'Bell': return Bell;
        case 'Zap': return () => React.createElement('svg', { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" }));
        case 'FileText': return () => React.createElement('svg', { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }));
        case 'Cog': return () => React.createElement('svg', { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }), React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" }));
        default: return Settings;
      }
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative" data-testid="system-config-dropdown">
            <Settings className="h-5 w-5" />
            {isLoading && <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b">
            System Configuration {isLoading && '(Loading...)'}
          </div>
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-gray-500">Loading menu items...</div>
          ) : error ? (
            <div className="px-3 py-2 text-xs text-red-500">Error loading menu items</div>
          ) : systemConfigMenus.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">No menu items found (Total menus: {allMenus.length})</div>
          ) : (
            systemConfigMenus.map((menu) => {
              const IconComponent = getIconComponent(menu.icon);
              return (
                <DropdownMenuItem 
                  key={menu.id}
                  onClick={() => setLocation(menu.route || '#')}
                  className="cursor-pointer"
                >
                  <IconComponent className="w-4 h-4 mr-2" />
                  {menu.label}
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Debug state changes
  React.useEffect(() => {
    console.log('Sidebar state changed - collapsed:', sidebarCollapsed, 'hovered:', sidebarHovered);
  }, [sidebarCollapsed, sidebarHovered]);

  // Get current user
  const { data: userResponse, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Extract user from nested response structure
  const user = userResponse?.user || userResponse;

  // Debug user data
  console.log('AppLayout - User data:', userResponse);
  console.log('AppLayout - Extracted user:', user);
  console.log('AppLayout - User loading:', userLoading, 'error:', userError);
  console.log('AppLayout - User condition check:', !!user);

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

  const handleNotificationClick = (notification: Notification) => {
    // Check if it's a terminal activation notification
    if (notification.type === 'terminal_activation' || notification.title.toLowerCase().includes('terminal activation')) {
      // Mark as read if not already read
      if (!notification.isRead) {
        markAsReadMutation.mutate(notification.id);
      }
      
      // Navigate to terminal activation page with terminal ID
      let terminalId = null;
      if (notification.data) {
        try {
          const data = JSON.parse(notification.data);
          terminalId = data.terminalId || data.id;
        } catch (e) {
          const match = notification.message.match(/terminal\s+(\d+)/i);
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

  const handleNavigation = (route: string) => {
    setLocation(route);
    setSidebarOpen(false); // Close mobile sidebar after navigation
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Always visible on desktop */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed && !sidebarHovered ? 'w-16' : 'w-72'} bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-all duration-300 ease-in-out lg:static lg:inset-0 flex flex-col`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center h-16 ${sidebarCollapsed && !sidebarHovered ? 'px-2 justify-center' : 'px-4 justify-between'} border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750 relative`}>
          {sidebarCollapsed && !sidebarHovered ? (
            <div className="flex justify-center w-full">
              <PortrayLogo size="xs" />
            </div>
          ) : (
            <>
              <div className="flex items-center">
                <PortrayLogo size="sm" />
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <MenuIcon className="h-5 w-5" />
                </Button>
                
                {/* Unified Desktop Toggle Button - Vuexy Style */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:flex h-9 w-9 p-0 items-center justify-center rounded-lg transition-all duration-300 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newState = !sidebarCollapsed;
                    console.log('Toggle button clicked, changing collapsed state from', sidebarCollapsed, 'to', newState);
                    setSidebarCollapsed(newState);
                  }}
                  title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {sidebarCollapsed ? (
                    <MenuIcon className="h-5 w-5 transition-transform duration-300" />
                  ) : (
                    <PanelLeftClose className="h-5 w-5 transition-transform duration-300" />
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

        {/* Sidebar Footer */}
        {user && (
          <div className={`${sidebarCollapsed && !sidebarHovered ? 'p-2' : 'p-4'} border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750`}>
            {sidebarCollapsed && !sidebarHovered ? (
              <div className="flex justify-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
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
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                  {user.firstName && user.lastName ? 
                    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : 
                    user.firstName ? 
                    `${user.firstName.charAt(0)}${user.firstName.charAt(1) || ''}` : 
                    user.email ? 
                    `${user.email.charAt(0)}${user.email.charAt(1) || ''}` : 'US'
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'}`}>
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 lg:px-6">
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
            

          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* System Configuration Dropdown */}
            {user && (
              <SystemConfigDropdown />
            )}
            
            {/* Notifications */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount.count > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                        {unreadCount.count > 9 ? '9+' : unreadCount.count}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-96 p-0 shadow-xl border-0">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">Notifications</span>
                        {unreadCount.count > 0 && (
                          <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                            {unreadCount.count} new
                          </Badge>
                        )}
                      </div>
                      {unreadCount.count > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAllAsReadMutation.mutate()}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark all read
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications yet</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">You'll see updates and alerts here</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {notifications.slice(0, 5).map((notification, index) => (
                          <div
                            key={notification.id}
                            className={`group relative p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                              !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-500' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start space-x-3">
                              {/* Notification Icon */}
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                notification.type === 'terminal_activation' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                                notification.type === 'port_contact_verified' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                                notification.type === 'system_alert' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {notification.type === 'terminal_activation' ? <CheckCircle className="h-5 w-5" /> :
                                 notification.type === 'port_contact_verified' ? <User className="h-5 w-5" /> :
                                 notification.type === 'system_alert' ? <AlertCircle className="h-5 w-5" /> :
                                 <Bell className="h-5 w-5" />}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                      {notification.title}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                      {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2">
                                    {!notification.isRead && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsReadMutation.mutate(notification.id);
                                        }}
                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
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
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      title="Delete notification"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Unread indicator */}
                                {!notification.isRead && (
                                  <div className="absolute top-4 left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 5 && (
                    <div className="border-t border-gray-100 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                      <Button
                        variant="ghost"
                        onClick={() => setLocation('/notifications')}
                        className="w-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                      >
                        View all {notifications.length} notifications
                      </Button>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Profile Section */}
            {user && (
              <div className="flex items-center space-x-3">
                {/* User Info Display */}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>

                {/* User Avatar Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-10 w-10 rounded-full p-0"
                      data-testid="button-user-menu"
                    >
                      <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
                        {user.firstName && user.lastName ? 
                          `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : 
                          user.firstName ? 
                          `${user.firstName.charAt(0)}${user.firstName.charAt(1) || ''}` : 
                          user.email ? 
                          `${user.email.charAt(0)}${user.email.charAt(1) || ''}` : 'AU'
                        }
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {/* User Header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                        {user.firstName && user.lastName ? 
                          `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : 
                          user.firstName ? 
                          `${user.firstName.charAt(0)}${user.firstName.charAt(1) || ''}` : 
                          user.email ? 
                          `${user.email.charAt(0)}${user.email.charAt(1) || ''}` : 'AU'
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="py-2">
                    <DropdownMenuItem 
                      onClick={() => setLocation('/profile')}
                      className="cursor-pointer px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                      data-testid="menu-item-profile"
                    >
                      <User className="w-4 h-4 mr-3 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Profile</span>
                    </DropdownMenuItem>
                  </div>
                  
                  {/* Logout Button */}
                  <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                      data-testid="menu-item-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            )}

          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {/* Page Title Section */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white" data-testid="page-title">
              {title}
            </h1>
          </div>
          
          {/* Content Container */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
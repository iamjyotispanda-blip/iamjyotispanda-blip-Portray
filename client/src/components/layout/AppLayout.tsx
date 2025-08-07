import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Ship, LogOut, Menu as MenuIcon, Settings, Building2, Home, PanelLeftClose, PanelLeftOpen, Mail, Bell, Check, Trash2, CheckCircle, Users, Link, Shield, UserCheck, ChevronDown, ChevronRight, Folder, FolderOpen
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
import { AuthService } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { Notification, Menu } from "@shared/schema";
import * as LucideIcons from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route?: string | null;
  children?: NavigationItem[];
}

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
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Helper function to check if any child of an item is active
  const isParentActive = (item: NavigationItem) => {
    if (!item.children) return false;
    return item.children.some((child: NavigationItem) => activeSection === child.id);
  };

  // Helper function to get the parent of the active section
  const getActiveParent = () => {
    for (const item of navigationItems) {
      if (item.children?.some((child: NavigationItem) => child.id === activeSection)) {
        return item.id;
      }
    }
    return null;
  };

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get dynamic GLink menus from API for System Admin
  const { data: glinkMenus = [] } = useQuery<Menu[]>({
    queryKey: ["/api/menus", "glink"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/menus?type=glink");
        const data = await response.json();
        console.log("GLink menus fetched:", data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Failed to fetch glink menus:", error);
        return [];
      }
    },
    enabled: user?.role === "SystemAdmin",
  });

  // Get ALL dynamic menus from API for System Admin
  const { data: allMenus = [] } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/menus");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Failed to fetch all menus:", error);
        return [];
      }
    },
    enabled: user?.role === "SystemAdmin",
  });

  // Get notifications only for system admins
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: user?.role === "SystemAdmin",
  });

  const { data: unreadCount = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: user?.role === "SystemAdmin",
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
      // Parse terminal ID from notification data or message
      let terminalId = null;
      if (notification.data) {
        try {
          const data = JSON.parse(notification.data);
          terminalId = data.terminalId || data.id;
        } catch (e) {
          // If data is not JSON, try to extract ID from message
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

  // Helper function to get Lucide icon component by name
  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return Home;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Home;
  };

  // Role-based navigation items
  const getNavigationItems = (): NavigationItem[] => {
    if (user?.role === "PortAdmin") {
      // Port Admin only sees Terminals
      return [
        { id: "terminals", label: "Terminals", icon: Ship, route: "/terminals" }
      ];
    } else {
      // System Admin sees navigation - always use database menus if available
      const hasMenuData = Array.isArray(allMenus) && allMenus.length > 0;
      console.log("Navigation check - hasMenuData:", hasMenuData, "allMenus length:", allMenus.length);
      
      if (hasMenuData) {
        // Separate GLink and PLink menus
        const parentMenus = allMenus.filter((menu: Menu) => menu.menuType === 'glink' && menu.isActive);
        const childMenus = allMenus.filter((menu: Menu) => menu.menuType === 'plink' && menu.isActive);
        
        console.log("Parent menus:", parentMenus.length, "Child menus:", childMenus.length);
        
        // Dynamic GLink menus with their PLink children
        const dynamicItems: NavigationItem[] = parentMenus
          .sort((a: Menu, b: Menu) => a.sortOrder - b.sortOrder)
          .map((menu: Menu): NavigationItem => {
            const children = childMenus
              .filter((plink: Menu) => plink.parentId === menu.id)
              .sort((a: Menu, b: Menu) => a.sortOrder - b.sortOrder)
              .map((plink: Menu): NavigationItem => ({
                id: plink.name,
                label: plink.label,
                icon: getIconComponent(plink.icon),
                route: plink.route
              }));
            
            console.log(`Menu ${menu.label} has ${children.length} children:`, children.map(c => c.label));
            
            return {
              id: menu.name,
              label: menu.label,
              icon: getIconComponent(menu.icon),
              route: menu.route,
              children: children.length > 0 ? children : undefined
            };
          });

        console.log("Final navigation items:", dynamicItems);
        return dynamicItems;
      } else {
        // Loading state or no menus available
        console.log("No menu data available, showing loading state");
        return [];
      }
    }
  };

  const navigationItems = getNavigationItems();

  const toggleExpandedItem = (itemId: string) => {
    console.log('Toggling item:', itemId, 'Current expanded:', expandedItems);
    setExpandedItems(prev => {
      // Tree structure behavior: each parent can be independently toggled
      if (prev.includes(itemId)) {
        // If clicking on expanded item, collapse it
        const newExpanded = prev.filter(id => id !== itemId);
        console.log('Collapsing item:', itemId, 'New expanded state:', newExpanded);
        return newExpanded;
      } else {
        // If clicking on collapsed item, expand it (keep others as they are)
        const newExpanded = [...prev, itemId];
        console.log('Expanding item:', itemId, 'New expanded state:', newExpanded);
        return newExpanded;
      }
    });
  };

  const expandItem = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) ? prev : [...prev, itemId]
    );
  };

  // Initialize parent menus based on active section for tree structure
  React.useEffect(() => {
    if (!initialized && navigationItems.length > 0) {
      const parentMenuIds = navigationItems
        .filter(item => item.children && item.children.length > 0)
        .map(item => item.id);
      
      // Auto-expand parent menu that contains the active child
      const activeParent = getActiveParent();
      let initialExpanded: string[] = [];
      
      if (activeParent && parentMenuIds.includes(activeParent)) {
        initialExpanded = [activeParent];
        console.log('Initializing with active parent expanded:', activeParent);
      }
      
      setExpandedItems(initialExpanded);
      setInitialized(true);
    }
  }, [navigationItems, initialized]);

  // Auto-expand parent menu when child is active
  React.useEffect(() => {
    if (initialized && activeSection) {
      const activeParent = getActiveParent();
      console.log('Active section:', activeSection, 'Active parent:', activeParent);
      if (activeParent && !expandedItems.includes(activeParent)) {
        console.log('Expanding parent for active child:', activeParent);
        expandItem(activeParent);
      }
    }
  }, [activeSection, initialized, expandedItems, navigationItems]);

  const handleNavigation = (item: NavigationItem) => {
    if (item.route) {
      setLocation(item.route);
    } else {
      // Fallback routes for items without explicit routes
      switch (item.id) {
        case "dashboard":
          setLocation("/dashboard");
          break;
        case "glink":
          setLocation("/users-access/glink");
          break;
        case "plink":
          setLocation("/users-access/plink");
          break;
        case "roles":
          setLocation("/users-access/roles");
          break;
        case "groups":
          setLocation("/users-access/groups");
          break;
        case "terminals":
          setLocation("/terminals");
          break;
        case "terminal-activation":
          setLocation("/terminal-activation");
          break;
        case "email":
          setLocation("/configuration/email");
          break;
        case "organization":
          setLocation("/organizations");
          break;
        case "ports":
          setLocation("/ports");
          break;
        case "menu-management":
          setLocation("/menu-management");
          break;
        default:
          console.warn(`No route defined for menu item: ${item.id}`);
          break;
      }
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed && !sidebarHovered ? 'w-16' : 'w-64'} bg-white dark:bg-slate-800 shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarCollapsed && !sidebarHovered ? (
            /* Small Logo when collapsed */
            <div className="hidden lg:flex items-center justify-center w-full">
              <PortrayLogo size="xs" />
            </div>
          ) : (
            /* Full layout when expanded */
            <div className="flex items-center justify-between w-full">
              <PortrayLogo size="sm" />
              <div className="flex items-center space-x-1">
                {/* Desktop Toggle Button - Right aligned within logo section */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden lg:flex items-center justify-center w-9 h-9 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm rounded-lg transition-all duration-200"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-2 flex-1">
          <div className="space-y-1">
            {navigationItems.length === 0 && user?.role === "SystemAdmin" ? (
              <div className="px-2 py-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-xs">Loading menus...</p>
              </div>
            ) : (
              navigationItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('Clicked item:', item.id, 'Has children:', !!(item.children && item.children.length > 0));
                    if (item.children && item.children.length > 0) {
                      toggleExpandedItem(item.id);
                    } else {
                      handleNavigation(item);
                    }
                  }}
                  className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-all duration-200 ${
                    activeSection === item.id || (isParentActive(item) && expandedItems.includes(item.id))
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 shadow-sm border-l-4 border-blue-500'
                      : expandedItems.includes(item.id) && item.children && item.children.length > 0
                      ? 'bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-200 border-l-2 border-gray-300 dark:border-gray-600'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white hover:shadow-sm'
                  }`}
                  title={sidebarCollapsed && !sidebarHovered ? item.label : ''}
                >
                  <div className="flex items-center">
                    <item.icon className={`${sidebarCollapsed && !sidebarHovered ? 'mx-auto' : 'mr-3'} h-5 w-5 transition-colors ${
                      activeSection === item.id || isParentActive(item) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                    }`} />
                    {(!sidebarCollapsed || sidebarHovered) && (
                      <span className={`${(activeSection === item.id || isParentActive(item)) ? 'font-semibold' : ''}`}>
                        {item.label}
                      </span>
                    )}
                  </div>
                  {item.children && item.children.length > 0 && (!sidebarCollapsed || sidebarHovered) && (
                    <div className="ml-2 flex items-center space-x-1">
                      <span className="text-xs text-gray-500 mr-1 font-medium">({item.children.length})</span>
                      
                      {/* Dynamic folder icon */}
                      {expandedItems.includes(item.id) ? (
                        <FolderOpen className="h-4 w-4 text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 transform" />
                      ) : (
                        <Folder className="h-4 w-4 text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-300 transform group-hover:scale-110" />
                      )}
                      
                      {/* Animated chevron */}
                      <div className={`transition-all duration-300 ease-in-out transform ${
                        expandedItems.includes(item.id) 
                          ? 'rotate-180 text-blue-500' 
                          : 'rotate-0 text-gray-500 group-hover:text-blue-500'
                      }`}>
                        <ChevronDown className="h-4 w-4 transition-colors duration-300" />
                      </div>
                    </div>
                  )}
                </button>
                
                {/* Expanded children with enhanced smooth animation */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out transform ${
                  item.children && item.children.length > 0 && (!sidebarCollapsed || sidebarHovered) && expandedItems.includes(item.id)
                    ? 'max-h-96 opacity-100 translate-y-0 scale-y-100'
                    : 'max-h-0 opacity-0 -translate-y-2 scale-y-95'
                }`}>
                  {item.children && item.children.length > 0 && expandedItems.includes(item.id) && (
                    <div className="ml-6 mt-2 space-y-1 border-l-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-900/20 rounded-r-lg">
                      {item.children.map((child: NavigationItem, index) => (
                        <div key={child.id} className={`relative transition-all duration-300 ease-out transform ${
                          expandedItems.includes(item.id) 
                            ? `opacity-100 translate-x-0 delay-[${index * 50}ms]` 
                            : 'opacity-0 -translate-x-4'
                        }`}>
                          {/* Enhanced animated tree line connector */}
                          <div className={`absolute left-0 top-0 h-6 w-px bg-blue-200 dark:bg-blue-700 transition-all duration-300 transform ${
                            expandedItems.includes(item.id) ? 'scale-y-100' : 'scale-y-0'
                          }`}></div>
                          <div className={`absolute left-0 top-3 w-4 h-px bg-blue-200 dark:bg-blue-700 transition-all duration-300 transform ${
                            expandedItems.includes(item.id) ? 'scale-x-100' : 'scale-x-0'
                          }`}></div>
                          
                          <button
                            onClick={() => handleNavigation(child)}
                            className={`group flex items-center px-3 py-2 ml-4 text-sm rounded-md w-full text-left transition-all duration-200 relative ${
                              activeSection === child.id
                                ? 'text-blue-800 dark:text-blue-200 shadow-md border-l-4 border-blue-600 font-medium transform scale-[1.02]'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 hover:shadow-sm hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600'
                            }`}
                          >
                            <child.icon className={`mr-3 h-4 w-4 transition-all duration-300 ease-in-out ${
                              activeSection === child.id 
                                ? 'text-blue-600 dark:text-blue-400 transform scale-110 rotate-3' 
                                : 'text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:scale-105'
                            }`} />
                            <span className={`transition-all duration-200 ${
                              activeSection === child.id ? 'font-semibold' : 'group-hover:font-medium'
                            }`}>
                              {child.label}
                            </span>
                            {activeSection === child.id && (
                              <div className="ml-auto flex items-center space-x-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <div className="text-xs text-blue-500 font-medium animate-fade-in">•</div>
                              </div>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              ))
            )}
          </div>
        </nav>

        {/* User Info */}
        <div className={`mt-auto p-4 border-t border-gray-200 dark:border-slate-700 ${sidebarCollapsed && !sidebarHovered ? 'hidden' : ''}`}>
          {user && (
            <div className="flex items-center">
              {(!sidebarCollapsed || sidebarHovered) && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role}
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className={sidebarCollapsed && !sidebarHovered ? '' : 'ml-2'}
                title={sidebarCollapsed && !sidebarHovered ? 'Logout' : ''}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 shadow-md border-b border-gray-200 dark:border-slate-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden mr-3"
                  onClick={() => setSidebarOpen(true)}
                >
                  <MenuIcon className="h-5 w-5" />
                </Button>
                <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'}`}>
                  {/* Clean header without page configuration details */}
                </div>
              </div>
              
              {/* User Profile Section */}
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex sm:items-center sm:space-x-3">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role} | {user?.email}
                    </span>
                  </div>
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Notifications - Only for System Admin */}
                  {user?.role === "SystemAdmin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="relative h-8 w-8 p-0">
                          <Bell className="h-4 w-4" />
                          {unreadCount.count > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                            >
                              {unreadCount.count}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-80">
                        <div className="flex items-center justify-between px-4 py-2">
                          <h4 className="text-sm font-medium">Notifications</h4>
                          {notifications.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAllAsReadMutation.mutate()}
                              className="h-6 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark all read
                            </Button>
                          )}
                        </div>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-64">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                              No notifications
                            </div>
                          ) : (
                            notifications.slice(0, 5).map((notification) => (
                              <DropdownMenuItem key={notification.id} className="block p-0">
                                <div 
                                  className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                  onClick={() => handleNotificationClick(notification)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                        {notification.title}
                                      </h5>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        {notification.message}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-2">
                                        {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString()}
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-1 ml-2">
                                      {!notification.isRead && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            markAsReadMutation.mutate(notification.id);
                                          }}
                                          className="h-6 w-6 p-0"
                                          title="Mark as read"
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteNotificationMutation.mutate(notification.id);
                                        }}
                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                        title="Delete notification"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            ))
                          )}
                          {notifications.length > 5 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                              <button
                                onClick={() => setLocation('/notifications')}
                                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 py-2 px-4 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              >
                                View All Notifications ({notifications.length})
                              </button>
                            </div>
                          )}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {/* Email Configuration - Only for System Admin */}
                  {user?.role === "SystemAdmin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Email Configuration">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setLocation('/configuration/email')} className="cursor-pointer">
                          <Mail className="h-4 w-4 mr-2" />
                          Email Configuration
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-2 h-8"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 sm:px-6 lg:px-2 py-2">
          {children}
        </main>
      </div>
    </div>
  );
}
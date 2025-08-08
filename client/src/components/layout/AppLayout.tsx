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
    const isActive = item.children.some((child: NavigationItem) => activeSection === child.id);
    console.log('🔎 Parent active check for', item.id, ':', isActive, 'activeSection:', activeSection, 'children:', item.children.map(c => c.id));
    return isActive;
  };

  // Helper function to get the parent of the active section
  const getActiveParent = () => {
    for (const item of navigationItems) {
      if (item.children?.some((child: NavigationItem) => child.id === activeSection)) {
        console.log('📡 Found active parent:', item.id, 'for activeSection:', activeSection);
        return item.id;
      }
    }
    console.log('🙅‍♂️ No parent found for activeSection:', activeSection);
    return null;
  };

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get user's role with permissions
  const { data: userRole } = useQuery({
    queryKey: ["/api/roles", user?.roleId],
    queryFn: async () => {
      if (!user?.roleId) return null;
      try {
        const response = await apiRequest("GET", `/api/roles/${user.roleId}`);
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch user role:", error);
        return null;
      }
    },
    enabled: !!user?.roleId,
  });

  // Helper function to check if user has permission for a menu item
  const hasMenuPermission = (menuName: string, parentMenuName?: string) => {
    if (!userRole?.permissions || !Array.isArray(userRole.permissions)) {
      return false;
    }
    
    // For SystemAdmin, allow all access (backward compatibility)
    if (user?.role === "SystemAdmin") {
      return true;
    }
    
    // Check if user has permission for this menu
    return userRole.permissions.some((permission: string) => {
      const parts = permission.split(':');
      if (parts.length >= 2) {
        const [gLink, pLink] = parts;
        if (parentMenuName) {
          // For child menu items, check both parent and child
          return gLink === parentMenuName && pLink === menuName;
        } else {
          // For parent menu items, check if any child is accessible
          return gLink === menuName;
        }
      }
      return false;
    });
  };

  // Get dynamic GLink menus from API for all authenticated users
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
    enabled: !!user,
  });

  // Get ALL dynamic menus from API for all authenticated users
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
    enabled: !!user,
  });

  // Get system configuration menus (Plink items with isSystemConfig flag)
  const systemConfigMenus = allMenus.filter((menu: Menu) => 
    menu.menuType === 'plink' && (menu as any).isSystemConfig && menu.isActive
  ).sort((a: Menu, b: Menu) => a.sortOrder - b.sortOrder);

  // Get notifications for authenticated users (can be controlled by permissions later)
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
      // Port Admin sees menus based on their role permissions
      const hasMenuData = Array.isArray(allMenus) && allMenus.length > 0;
      
      if (!hasMenuData) {
        // Fallback for Port Admin if no menu data
        return [
          { id: "terminals", label: "Terminals", icon: Ship, route: "/terminals" }
        ];
      }
      
      // Filter menus based on PortAdmin permissions
      const parentMenus = allMenus.filter((menu: Menu) => 
        menu.menuType === 'glink' && 
        menu.isActive && 
        hasMenuPermission(menu.name)
      );
      
      const childMenus = allMenus.filter((menu: Menu) => 
        menu.menuType === 'plink' && 
        menu.isActive && 
        !(menu as any).isSystemConfig
      );
      
      const filteredItems: NavigationItem[] = parentMenus
        .sort((a: Menu, b: Menu) => a.sortOrder - b.sortOrder)
        .map((menu: Menu): NavigationItem | null => {
          const children = childMenus
            .filter((plink: Menu) => 
              plink.parentId === menu.id && 
              hasMenuPermission(plink.name, menu.name)
            )
            .sort((a: Menu, b: Menu) => a.sortOrder - b.sortOrder)
            .map((plink: Menu): NavigationItem => ({
              id: plink.name,
              label: plink.label,
              icon: getIconComponent(plink.icon),
              route: plink.route
            }));
          
          // Only include parent if it has accessible children or direct route
          if (children.length > 0 || menu.route) {
            return {
              id: menu.name,
              label: menu.label,
              icon: getIconComponent(menu.icon),
              route: menu.route,
              children: children.length > 0 ? children : undefined
            };
          }
          return null;
        })
        .filter((item): item is NavigationItem => item !== null);
      
      return filteredItems;
      
    } else {
      // System Admin sees all navigation (backward compatibility)
      const hasMenuData = Array.isArray(allMenus) && allMenus.length > 0;
      console.log("Navigation check - hasMenuData:", hasMenuData, "allMenus length:", allMenus.length);
      
      if (hasMenuData) {
        // For SystemAdmin, show all menus (existing behavior)
        const parentMenus = allMenus.filter((menu: Menu) => menu.menuType === 'glink' && menu.isActive);
        const childMenus = allMenus.filter((menu: Menu) => menu.menuType === 'plink' && menu.isActive);
        
        console.log("Parent menus:", parentMenus.length, "Child menus:", childMenus.length);
        
        // Dynamic GLink menus with their PLink children (excluding system config items)
        const dynamicItems: NavigationItem[] = parentMenus
          .sort((a: Menu, b: Menu) => a.sortOrder - b.sortOrder)
          .map((menu: Menu): NavigationItem => {
            const children = childMenus
              .filter((plink: Menu) => plink.parentId === menu.id && !(plink as any).isSystemConfig)
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
    try {
      setExpandedItems(prev => {
        // Accordion behavior: only one parent can be expanded at a time
        if (prev.includes(itemId)) {
          // If clicking on expanded item, collapse it
          return [];
        } else {
          // If clicking on collapsed item, expand it and collapse others
          return [itemId];
        }
      });
    } catch (error) {
      console.error('Error toggling expanded item:', error);
    }
  };

  const expandItem = (itemId: string) => {
    try {
      setExpandedItems(prev => 
        prev.includes(itemId) ? prev : [...prev, itemId]
      );
    } catch (error) {
      console.error('Error expanding item:', error);
    }
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
        // Initializing with active parent expanded
      }
      
      setExpandedItems(initialExpanded);
      setInitialized(true);
    }
  }, [navigationItems, initialized]);

  // Auto-expand parent menu when child is active
  React.useEffect(() => {
    console.log('🎆 Auto-expand effect:', { initialized, activeSection, navItemsLength: navigationItems.length, expandedItems });
    if (initialized && activeSection && navigationItems.length > 0) {
      const activeParent = getActiveParent();
      console.log('🎆 Active parent found:', activeParent);
      if (activeParent && !expandedItems.includes(activeParent)) {
        console.log('🎆 Setting expanded items to:', [activeParent]);
        setExpandedItems([activeParent]);
      }
    }
  }, [activeSection, initialized, navigationItems]);

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
        case "roles-groups":
          setLocation("/users-access/roles");
          break;
        case "terminals":
          setLocation("/terminals");
          break;
        case "terminal-activation":
          setLocation("/terminal-activation");
          break;
        case "email-config":
          setLocation("/configuration/email");
          break;
        case "organisations":
          setLocation("/organizations");
          break;
        case "ports":
          setLocation("/ports");
          break;
        case "menu-management":
          setLocation("/menu-management");
          break;
        case "permission-assignment":
          setLocation("/permission-assignment");
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
            {navigationItems.length === 0 && !!user ? (
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
                    try {
                      if (item.children && item.children.length > 0) {
                        toggleExpandedItem(item.id);
                      } else {
                        handleNavigation(item);
                      }
                    } catch (error) {
                      console.error('Navigation error:', error);
                    }
                  }}
                  className={`group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg w-full text-left transition-all duration-300 ease-in-out transform hover:bg-opacity-80 ${
                    activeSection === item.id || isParentActive(item)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 font-medium'
                      : expandedItems.includes(item.id) && item.children && item.children.length > 0
                      ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={sidebarCollapsed && !sidebarHovered ? item.label : ''}
                >
                  <div className="flex items-center">
                    <item.icon className={`${sidebarCollapsed && !sidebarHovered ? 'mx-auto' : 'mr-3'} h-5 w-5 transition-all duration-200 ease-in-out ${
                      activeSection === item.id || isParentActive(item) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }`} />
                    {(!sidebarCollapsed || sidebarHovered) && (
                      <span className={`transition-all duration-200 ease-in-out ${
                        (activeSection === item.id || isParentActive(item)) ? 'font-medium text-blue-700 dark:text-blue-200' : 'group-hover:text-gray-900 dark:group-hover:text-white'
                      }`}>
                        {item.label}
                      </span>
                    )}
                  </div>
                  {item.children && item.children.length > 0 && (!sidebarCollapsed || sidebarHovered) && (
                    <div className="ml-2 flex items-center space-x-1">
                      {/* Smooth rotating chevron */}
                      <div className={`transition-all duration-200 ease-in-out transform ${
                        expandedItems.includes(item.id) 
                          ? 'rotate-90 text-blue-600 dark:text-blue-400' 
                          : 'rotate-0 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                      }`}>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </button>
                
                {/* Accordion-style smooth expansion */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  item.children && item.children.length > 0 && (!sidebarCollapsed || sidebarHovered) && expandedItems.includes(item.id)
                    ? 'max-h-[800px] opacity-100'
                    : 'max-h-0 opacity-0'
                }`}>
                  {item.children && item.children.length > 0 && expandedItems.includes(item.id) && (
                    <div className={`ml-6 mt-1 space-y-1 transition-all duration-300 ease-in-out ${
                      expandedItems.includes(item.id) ? 'pl-4 py-2' : 'pl-0 py-0'
                    }`}>
                      {item.children.map((child: NavigationItem, index) => (
                        <div key={child.id} className={`transition-all duration-200 ease-in-out ${
                          expandedItems.includes(item.id) 
                            ? 'opacity-100' 
                            : 'opacity-0'
                        }`} style={{ transitionDelay: expandedItems.includes(item.id) ? `${index * 50}ms` : '0ms' }}>
                          
                          <button
                            onClick={() => handleNavigation(child)}
                            className={`group flex items-center px-4 py-2 text-sm rounded-md w-full text-left transition-all duration-200 ease-in-out ${
                              activeSection === child.id
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <child.icon className={`mr-3 h-4 w-4 transition-all duration-200 ease-in-out ${
                              activeSection === child.id 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                            }`} />
                            <span className={`transition-all duration-200 ease-in-out ${
                              activeSection === child.id ? 'font-medium' : ''
                            }`}>
                              {child.label}
                            </span>
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
                  
                  {/* Configuration - Only for System Admin */}
                  {user?.role === "SystemAdmin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Configuration">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setLocation('/configuration/email')} className="cursor-pointer">
                          <Mail className="h-4 w-4 mr-2" />
                          Email Configuration
                        </DropdownMenuItem>
                        {systemConfigMenus.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            {systemConfigMenus.map((menu: Menu) => {
                              const IconComponent = getIconComponent(menu.icon);
                              return (
                                <DropdownMenuItem 
                                  key={menu.id}
                                  onClick={() => menu.route && setLocation(menu.route)} 
                                  className="cursor-pointer"
                                >
                                  <IconComponent className="h-4 w-4 mr-2" />
                                  {menu.label}
                                </DropdownMenuItem>
                              );
                            })}
                          </>
                        )}
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
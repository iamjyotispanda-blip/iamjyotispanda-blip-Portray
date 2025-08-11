import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Search, Plus, Edit, Trash2, Eye, EyeOff, ExternalLink, Settings,
  Home, Building2, MapPin, Users, Ship, CheckCircle, Mail, Menu,
  Shield, FileText, Calendar, Clock, Database, BarChart3, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PageInfo {
  id: string;
  name: string;
  title: string;
  route: string;
  category: string;
  icon: string;
  description: string;
  isActive: boolean;
  isSystem: boolean;
  lastAccessed?: string;
  accessCount?: number;
  menuId?: number; // Reference to menu item if exists
  hasMenu?: boolean; // Whether page has corresponding menu
  menuName?: string; // Name of the corresponding menu
}

// Dynamic page discovery from actual routes
const getAllSystemPages = (): PageInfo[] => {
  return [
    // Authentication Pages
    { id: "login", name: "login", title: "Login", route: "/login", category: "Authentication", icon: "Home", description: "User authentication and login", isActive: true, isSystem: true },
    { id: "verify", name: "verify", title: "Email Verification", route: "/verify", category: "Authentication", icon: "Shield", description: "Email verification for new users", isActive: true, isSystem: true },
    { id: "verify-email", name: "verify-email", title: "Verify Email", route: "/verify-email", category: "Authentication", icon: "Shield", description: "Email verification page", isActive: true, isSystem: true },
    { id: "setup-password", name: "setup-password", title: "Setup Password", route: "/setup-password", category: "Authentication", icon: "Shield", description: "Password setup for new users", isActive: true, isSystem: true },
    { id: "port-admin-verification", name: "port-admin-verification", title: "Port Admin Verification", route: "/port-admin-verification", category: "Authentication", icon: "Shield", description: "Port admin verification page", isActive: true, isSystem: true },
    
    // Dashboard Pages
    { id: "dashboard", name: "dashboard", title: "Dashboard", route: "/dashboard", category: "Dashboard", icon: "Home", description: "Main dashboard overview", isActive: true, isSystem: false },
    { id: "port-admin-dashboard", name: "port-admin-dashboard", title: "Port Admin Dashboard", route: "/port-admin-dashboard", category: "Dashboard", icon: "Ship", description: "Port administrator dashboard", isActive: true, isSystem: false },
    { id: "portal-welcome", name: "portal-welcome", title: "Portal Welcome", route: "/portal/welcome", category: "Dashboard", icon: "Home", description: "Welcome portal page", isActive: true, isSystem: false },
    
    // Organization Management
    { id: "organizations", name: "organizations", title: "Organizations", route: "/organizations", category: "Organization Management", icon: "Building2", description: "Organization management and listing", isActive: true, isSystem: false },
    
    // Port Management
    { id: "ports", name: "ports", title: "Ports", route: "/ports", category: "Port Management", icon: "MapPin", description: "Port management and listing", isActive: true, isSystem: false },
    { id: "port-new", name: "port-new", title: "New Port", route: "/ports/new", category: "Port Management", icon: "Plus", description: "Create new port", isActive: true, isSystem: false },
    { id: "port-edit", name: "port-edit", title: "Edit Port", route: "/ports/edit/:id", category: "Port Management", icon: "Edit", description: "Edit port details", isActive: true, isSystem: false },
    { id: "port-contacts", name: "port-contacts", title: "Port Contacts", route: "/ports/:portId/contacts", category: "Port Management", icon: "Users", description: "Manage port administrator contacts", isActive: true, isSystem: false },
    
    // Terminal Management
    { id: "terminals", name: "terminals", title: "Terminals", route: "/terminals", category: "Terminal Management", icon: "CheckCircle", description: "Terminal management and listing", isActive: true, isSystem: false },
    { id: "terminal-new", name: "terminal-new", title: "New Terminal", route: "/terminals/new", category: "Terminal Management", icon: "Plus", description: "Create new terminal", isActive: true, isSystem: false },
    { id: "terminal-edit", name: "terminal-edit", title: "Edit Terminal", route: "/terminals/edit/:id", category: "Terminal Management", icon: "Edit", description: "Edit terminal details", isActive: true, isSystem: false },
    { id: "terminal-profile", name: "terminal-profile", title: "Terminal Profile", route: "/terminals/:id", category: "Terminal Management", icon: "Eye", description: "View terminal details", isActive: true, isSystem: false },
    { id: "terminal-activation", name: "terminal-activation", title: "Terminal Activation", route: "/terminal-activation", category: "Terminal Management", icon: "CheckCircle", description: "Terminal activation management", isActive: true, isSystem: false },
    
    // Customer & Contract Management
    { id: "customers", name: "customers", title: "Customers", route: "/customers", category: "Customer Management", icon: "Users", description: "Customer management and listing", isActive: true, isSystem: false },
    { id: "customer-contracts", name: "customer-contracts", title: "Customer Contracts", route: "/customers/:customerId/contracts/:contractId?", category: "Customer Management", icon: "FileText", description: "Customer contract details with tabs", isActive: true, isSystem: false },
    { id: "contracts", name: "contracts", title: "Contracts", route: "/contracts", category: "Contract Management", icon: "FileText", description: "Contract management and listing", isActive: true, isSystem: false },
    
    // System Configuration
    { id: "email-configuration", name: "email-configuration", title: "Email Configuration", route: "/configuration/email", category: "System Configuration", icon: "Mail", description: "SMTP email configuration management", isActive: true, isSystem: false },
    { id: "menu-management", name: "menu-management", title: "Menu Management", route: "/configuration/menu", category: "System Configuration", icon: "Menu", description: "Navigation menu structure management", isActive: true, isSystem: false },
    { id: "page-management", name: "page-management", title: "Page Management", route: "/configuration/pages", category: "System Configuration", icon: "FileText", description: "System page management and control", isActive: true, isSystem: false },
    
    // User & Role Management
    { id: "roles", name: "roles", title: "Role Management", route: "/roles", category: "User & Role Management", icon: "Shield", description: "User roles and permissions management", isActive: true, isSystem: false },
    { id: "users", name: "users", title: "User Management", route: "/users", category: "User & Role Management", icon: "Users", description: "User account administration", isActive: true, isSystem: false },
    { id: "permission-assignment", name: "permission-assignment", title: "Permission Assignment", route: "/permission-assignment", category: "User & Role Management", icon: "Shield", description: "Assign permissions to users and roles", isActive: true, isSystem: false },
    
    // Other System Pages
    { id: "notifications", name: "notifications", title: "Notifications", route: "/notifications", category: "System", icon: "Bell", description: "Notification center and management", isActive: true, isSystem: false },
    { id: "profile", name: "profile", title: "User Profile", route: "/profile", category: "User Management", icon: "Users", description: "User profile management", isActive: true, isSystem: false },
  ];
};

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    Home, Building2, MapPin, Users, Ship, CheckCircle, Mail, Menu,
    Shield, FileText, Calendar, Clock, Database, BarChart3, Plus, Edit,
    Eye, Trash2, Search, Settings, ExternalLink, Bell
  };
  return iconMap[iconName] || FileText;
};

export default function PageManagementPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [pages, setPages] = useState<PageInfo[]>([]);
  const { toast } = useToast();

  // Fetch menus from database
  const { data: menuData = [], isLoading: menusLoading } = useQuery({
    queryKey: ["/api/menus"],
  });

  // Initialize pages with database menu integration
  useEffect(() => {
    const SYSTEM_PAGES = getAllSystemPages();
    const updatedPages = SYSTEM_PAGES.map((page: PageInfo) => {
      // Find corresponding menu item by matching page name with menu name
      const correspondingMenu = Array.isArray(menuData) ? 
        menuData.find((menu: any) => 
          menu.name.toLowerCase() === page.name.toLowerCase() ||
          menu.label.toLowerCase() === page.title.toLowerCase() ||
          menu.route === page.route
        ) : null;

      return {
        ...page,
        menuId: correspondingMenu?.id,
        hasMenu: !!correspondingMenu,
        menuName: correspondingMenu?.label || correspondingMenu?.name,
        // Update status based on menu if exists
        isActive: correspondingMenu ? correspondingMenu.isActive : page.isActive,
        // Update icon based on menu if exists
        icon: correspondingMenu?.icon || page.icon,
      };
    });

    setPages(updatedPages);
  }, [menuData]);

  // Get unique categories
  const categories = ["All", ...Array.from(new Set(getAllSystemPages().map(page => page.category)))];

  // Filter pages based on search and category
  const filteredPages = pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.route.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || page.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Create menu mutation
  const createMenuMutation = useMutation({
    mutationFn: async (pageData: PageInfo) => {
      const menuData = {
        name: pageData.name,
        label: pageData.title,
        icon: pageData.icon,
        route: pageData.route,
        sortOrder: 99, // Default sort order for new menus
        menuType: 'glink', // Default to main menu
        parentId: null,
        isSystemConfig: pageData.category === 'System Configuration',
      };
      return apiRequest("POST", "/api/menus", menuData);
    },
    onSuccess: async (response, pageData) => {
      const data = await response.json();
      toast({
        title: "Menu Created",
        description: `Menu created for ${pageData.title}`,
      });
      // Update the page to reflect menu creation
      setPages(prev => prev.map(page => 
        page.id === pageData.id 
          ? { ...page, hasMenu: true, menuId: data.id, menuName: pageData.title }
          : page
      ));
      // Refresh menu data to get latest info
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create menu",
        variant: "destructive",
      });
    },
  });

  // Toggle page active status
  const togglePageStatus = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    if (page.hasMenu && page.menuId) {
      // Update menu status via API
      apiRequest("PATCH", `/api/menus/${page.menuId}/toggle-status`)
        .then(() => {
          setPages(prev => prev.map(p => 
            p.id === pageId 
              ? { ...p, isActive: !p.isActive }
              : p
          ));
          toast({
            title: "Page Status Updated",
            description: `${page.title} has been ${page.isActive ? 'deactivated' : 'activated'}`,
          });
        })
        .catch(() => {
          toast({
            title: "Error",
            description: "Failed to update menu status",
            variant: "destructive",
          });
        });
    } else {
      // Update local state only
      setPages(prev => prev.map(p => 
        p.id === pageId 
          ? { ...p, isActive: !p.isActive }
          : p
      ));
      toast({
        title: "Page Status Updated",
        description: `${page.title} has been ${page.isActive ? 'deactivated' : 'activated'}`,
      });
    }
  };

  // Delete page (only for non-system pages)
  const deletePage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page?.isSystem) {
      toast({
        title: "Cannot Delete",
        description: "System pages cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    setPages(prev => prev.filter(page => page.id !== pageId));
    toast({
      title: "Page Deleted",
      description: `${page?.title} has been deleted`,
    });
  };

  // Navigate to page
  const navigateToPage = (route: string) => {
    if (route.includes(':')) {
      toast({
        title: "Dynamic Route",
        description: "This page requires parameters to navigate",
        variant: "destructive",
      });
      return;
    }
    setLocation(route);
  };

  // Create menu for page
  const createMenuForPage = (page: PageInfo) => {
    if (page.hasMenu) {
      toast({
        title: "Menu Already Exists",
        description: `${page.title} already has a menu`,
        variant: "destructive",
      });
      return;
    }
    
    if (createMenuMutation.isPending) {
      return; // Prevent multiple simultaneous requests
    }
    
    createMenuMutation.mutate(page);
  };

  // Get status badge
  const getStatusBadge = (page: PageInfo) => {
    if (!page.isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (page.isSystem) {
      return <Badge variant="secondary">System</Badge>;
    }
    if (page.hasMenu) {
      return <Badge variant="default" className="bg-green-600">Active + Menu</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <AppLayout title="Page Management" activeSection="system-config">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Page Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage all system pages, routes, and access controls
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pages.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {pages.filter(p => p.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Inactive Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {pages.filter(p => !p.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pages with Menus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {pages.filter(p => p.hasMenu).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {categories.map((category: string) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Pages Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Menu Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPages.map((page) => {
                  const IconComponent = getIconComponent(page.icon);
                  return (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <IconComponent className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {page.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {page.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {page.route}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{page.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {page.hasMenu && page.menuName ? (
                          <div className="flex items-center space-x-2">
                            <Badge variant="default" className="bg-green-600">{page.menuName}</Badge>
                            {page.menuId && (
                              <span className="text-xs text-gray-500">ID: {page.menuId}</span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">No Menu</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(page)}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {page.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Create Menu Button */}
                          {!page.hasMenu && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => createMenuForPage(page)}
                              disabled={createMenuMutation.isPending}
                              title="Create menu for this page"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Navigate to Page */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateToPage(page.route)}
                            disabled={!page.isActive || page.route.includes(':')}
                            title={page.route.includes(':') ? "Dynamic route - requires parameters" : "Navigate to page"}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          
                          {/* Toggle Status */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePageStatus(page.id)}
                            disabled={page.isSystem}
                            title={page.isSystem ? "Cannot modify system pages" : "Toggle page status"}
                          >
                            {page.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          
                          {/* Delete Page */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={page.isSystem}
                                title={page.isSystem ? "Cannot delete system pages" : "Delete page"}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Page</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{page.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePage(page.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredPages.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No pages found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
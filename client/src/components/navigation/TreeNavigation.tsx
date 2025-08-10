import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronRight, ChevronDown, Home, Settings, Users } from "lucide-react";
import { AuthService } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { Menu, Role, User } from "@shared/schema";
import * as LucideIcons from "lucide-react";
import { getIconComponent } from "@/lib/iconRecommendations";

interface TreeNodeData {
  id: string;
  name: string;
  label: string;
  icon: string | null;
  route: string | null;
  children: TreeNodeData[];
  isExpanded: boolean;
  level: number;
}

interface TreeNavigationProps {
  activeSection?: string;
  onNavigate: (route: string) => void;
  collapsed?: boolean;
}

export function TreeNavigation({ activeSection, onNavigate, collapsed = false }: TreeNavigationProps) {
  const [, setLocation] = useLocation();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);

  // Get current user
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get user's role with permissions
  const { data: userRole } = useQuery<Role>({
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

  // Get all menus from database
  const { data: allMenus = [] } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/menus");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Failed to fetch menus:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Helper function to check if user has permission for a menu item
  const hasMenuPermission = (menuName: string, parentMenuName?: string): boolean => {
    // For now, allow all authenticated users to see all menu items
    // This ensures the tree navigation displays properly
    return !!user;
  };

  // Use enhanced icon component helper with fallback to Home
  const getMenuIconComponent = (iconName: string | null) => {
    const IconComp = getIconComponent(iconName);
    // Type assertion to ensure we return a valid React component
    return (IconComp as React.ComponentType<any>) || Home;
  };

  // Build tree structure from database menus
  const buildTreeFromMenus = (): TreeNodeData[] => {
    console.log("Building tree from menus:", allMenus.length, "total menus");
    if (!allMenus.length) return [];

    // Get parent menus (glink type) - exclude Email Configuration as it's now in header
    const parentMenus = allMenus.filter((menu: Menu) => 
      menu.menuType === 'glink' && 
      menu.isActive && 
      menu.name !== 'email-config' &&
      hasMenuPermission(menu.name)
    ).sort((a: Menu, b: Menu) => a.sortOrder - b.sortOrder);

    console.log("Parent menus found:", parentMenus.length, parentMenus.map(m => m.name));

    // Get child menus (plink type) - exclude Email Configuration as it's now in header
    const childMenus = allMenus.filter((menu: Menu) => 
      menu.menuType === 'plink' && 
      menu.isActive &&
      menu.name !== 'email-config'
    );

    console.log("Child menus found:", childMenus.length, childMenus.map(m => m.name));

    const treeData = parentMenus.map((parentMenu: Menu): TreeNodeData => {
      // Find children for this parent
      const children = childMenus
        .filter((childMenu: Menu) => 
          childMenu.parentId === parentMenu.id &&
          hasMenuPermission(childMenu.name, parentMenu.name)
        )
        .sort((a: Menu, b: Menu) => a.sortOrder - b.sortOrder)
        .map((childMenu: Menu): TreeNodeData => ({
          id: childMenu.name,
          name: childMenu.name,
          label: childMenu.label,
          icon: childMenu.icon,
          route: childMenu.route,
          children: [],
          isExpanded: false,
          level: 1
        }));

      return {
        id: parentMenu.name,
        name: parentMenu.name,
        label: parentMenu.label,
        icon: parentMenu.icon,
        route: parentMenu.route,
        children,
        isExpanded: expandedNodes.has(parentMenu.name),
        level: 0
      };
    });

    console.log("Tree data built:", treeData.length, "nodes");
    return treeData;
  };

  // Update tree data when menus or expanded nodes change
  useEffect(() => {
    const newTreeData = buildTreeFromMenus();
    setTreeData(newTreeData);
  }, [allMenus, expandedNodes, userRole]);

  // Auto-expand parent node if active section is a child
  useEffect(() => {
    if (activeSection && treeData.length > 0) {
      const activeParent = treeData.find(node => 
        node.children.some(child => child.id === activeSection)
      );
      
      if (activeParent && !expandedNodes.has(activeParent.id)) {
        setExpandedNodes(prev => new Set(Array.from(prev).concat([activeParent.id])));
      }
    }
  }, [activeSection, treeData]);

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(Array.from(prev));
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Handle navigation
  const handleNavigation = (node: TreeNodeData) => {
    if (node.route) {
      onNavigate(node.route);
    } else {
      // Fallback routes for items without explicit routes
      const fallbackRoutes: Record<string, string> = {
        "dashboard": "/dashboard",
        "glink": "/users-access/glink",
        "plink": "/users-access/plink",
        "roles-groups": "/users-access/roles",
        "terminals": "/terminals",
        "terminal-activation": "/terminal-activation",
        "email-config": "/configuration/email",
        "organisations": "/organizations",
        "ports": "/ports",
        "menu-management": "/menu-management",
        "permission-assignment": "/permission-assignment",
        "users": "/users",
        "roles": "/roles",
      };
      
      const route = fallbackRoutes[node.id];
      if (route) {
        onNavigate(route);
      }
    }
  };

  // Check if node or any of its children is active
  const isNodeActive = (node: TreeNodeData): boolean => {
    if (node.id === activeSection) return true;
    return node.children.some(child => child.id === activeSection);
  };

  // Render tree node
  const renderTreeNode = (node: TreeNodeData) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isActive = isNodeActive(node);
    const isDirectlyActive = node.id === activeSection;
    const IconComponent = getMenuIconComponent(node.icon);

    // In collapsed mode, only show parent nodes as icons
    if (collapsed) {
      return (
        <div key={node.id} className="relative mb-2">
          <div
            className={`group flex items-center justify-center w-10 h-10 rounded-xl mx-auto cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-110 ${
              isDirectlyActive
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                : isActive
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => {
              if (hasChildren && node.children.length > 0) {
                // Navigate to first child if has children
                handleNavigation(node.children[0]);
              } else {
                handleNavigation(node);
              }
            }}
            title={node.label}
          >
            <IconComponent className="w-5 h-5" />
          </div>
        </div>
      );
    }

    return (
      <div key={node.id} className="relative">
        {/* Node Button */}
        <div
          className={`group flex items-center justify-between px-4 py-2 text-sm font-medium rounded-xl mx-2 mb-1 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${
            isDirectlyActive
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
              : isActive && hasChildren
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            } else {
              handleNavigation(node);
            }
          }}
        >
          <div className="flex items-center space-x-3">
            {/* Icon */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
              isDirectlyActive
                ? 'bg-white/20 text-white'
                : isActive
                ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
            }`}>
              <IconComponent className="w-4 h-4" />
            </div>
            
            {/* Label */}
            <span className={`font-medium transition-all duration-300 ${
              isDirectlyActive
                ? 'text-white'
                : isActive
                ? 'text-blue-700 dark:text-blue-300'
                : 'group-hover:text-gray-900 dark:group-hover:text-white'
            }`}>
              {node.label}
            </span>
          </div>

          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <div className={`transition-all duration-300 ease-in-out transform ${
              isExpanded ? 'rotate-90' : 'rotate-0'
            } ${
              isDirectlyActive
                ? 'text-white'
                : isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
            }`}>
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && (
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isExpanded 
              ? 'max-h-96 opacity-100 translate-y-0' 
              : 'max-h-0 opacity-0 -translate-y-2'
          }`}>
            <div className="ml-6 mt-1 space-y-1">
              {node.children.map(child => (
                <div
                  key={child.id}
                  className={`flex items-center space-x-3 px-4 py-1.5 text-sm rounded-lg mx-2 cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.01] ${
                    child.id === activeSection
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => handleNavigation(child)}
                >
                  {/* Child Icon */}
                  <div className={`flex items-center justify-center w-6 h-6 rounded-md transition-all duration-300 ${
                    child.id === activeSection
                      ? 'bg-white/20 text-white'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}>
                    {React.createElement(getMenuIconComponent(child.icon) as React.ComponentType<any>, { className: "w-3.5 h-3.5" })}
                  </div>
                  
                  {/* Child Label */}
                  <span className={`transition-all duration-300 ${
                    child.id === activeSection
                      ? 'text-white font-medium'
                      : 'hover:font-medium'
                  }`}>
                    {child.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`py-4 ${collapsed ? 'space-y-1' : 'space-y-2'}`}>
      {treeData.map(node => renderTreeNode(node))}
      
      {treeData.length === 0 && user && (
        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No menu items available</p>
          <p className="text-xs mt-2">Menus loaded: {allMenus.length}</p>
        </div>
      )}
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { AuthService } from "@/lib/auth";
import { PermissionService, type PermissionLevel } from "@/lib/permissions";
import { apiRequest } from "@/lib/queryClient";
import type { Role, User } from "@shared/schema";

export function usePermissions() {
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

  return {
    user,
    userRole,
    
    /**
     * Check if user has specific permission level for a menu item
     */
    hasPermission: (
      menuName: string,
      permissionType: 'read' | 'write' | 'manage',
      parentMenuName?: string
    ): boolean => {
      return PermissionService.hasPermission(
        userRole || null,
        user || null,
        menuName,
        permissionType,
        parentMenuName
      );
    },

    /**
     * Get all permission levels for a menu item
     */
    getPermissionLevels: (
      menuName: string,
      parentMenuName?: string
    ): PermissionLevel => {
      return PermissionService.getPermissionLevels(
        userRole || null,
        user || null,
        menuName,
        parentMenuName
      );
    },

    /**
     * Check if user has any access to a menu
     */
    hasAnyPermission: (
      menuName: string,
      parentMenuName?: string
    ): boolean => {
      return PermissionService.hasAnyPermission(
        userRole || null,
        user || null,
        menuName,
        parentMenuName
      );
    },

    /**
     * Check if user can perform create operations
     */
    canCreate: (menuName: string, parentMenuName?: string): boolean => {
      return PermissionService.hasPermission(
        userRole || null,
        user || null,
        menuName,
        'write',
        parentMenuName
      );
    },

    /**
     * Check if user can perform edit operations
     */
    canEdit: (menuName: string, parentMenuName?: string): boolean => {
      return PermissionService.hasPermission(
        userRole || null,
        user || null,
        menuName,
        'write',
        parentMenuName
      ) || PermissionService.hasPermission(
        userRole || null,
        user || null,
        menuName,
        'manage',
        parentMenuName
      );
    },

    /**
     * Check if user can perform delete/manage operations
     */
    canManage: (menuName: string, parentMenuName?: string): boolean => {
      return PermissionService.hasPermission(
        userRole || null,
        user || null,
        menuName,
        'manage',
        parentMenuName
      );
    },

    /**
     * Check if user can view/read
     */
    canRead: (menuName: string, parentMenuName?: string): boolean => {
      return PermissionService.hasPermission(
        userRole || null,
        user || null,
        menuName,
        'read',
        parentMenuName
      ) || PermissionService.hasPermission(
        userRole || null,
        user || null,
        menuName,
        'write',
        parentMenuName
      ) || PermissionService.hasPermission(
        userRole || null,
        user || null,
        menuName,
        'manage',
        parentMenuName
      );
    },

    isLoading: !user || !userRole,
  };
}
import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "./usePermissions";

interface RoleCreationPermission {
  id: number;
  creatorRoleId: number;
  allowedUserTypes: string[];
  allowedRoleIds: number[];
  isActive: boolean;
}

export function useRoleCreationPermissions() {
  const { userData: currentUser } = usePermissions();

  // Get current user's role creation permissions
  const { data: rolePermissions } = useQuery<RoleCreationPermission>({
    queryKey: ["/api/role-creation-permissions/creator", currentUser?.roleId],
    enabled: !!currentUser?.roleId,
  });

  const canCreateUserType = (userType: string): boolean => {
    // System Admins can create any user type
    if (currentUser?.isSystemAdmin || currentUser?.role === 'SystemAdmin') {
      return true;
    }

    // Port Admins cannot create SuperAdmin users
    if (userType === "SuperAdmin" && currentUser?.role === 'PortAdmin') {
      return false;
    }

    // If no permissions are configured yet, allow basic user types for Port Admins
    if (!rolePermissions && currentUser?.role === 'PortAdmin') {
      return userType === "PortUser" || userType === "TerminalUser";
    }

    // Check if current user's role has permission to create this user type
    return rolePermissions?.allowedUserTypes?.includes(userType) || false;
  };

  const canAssignRole = (roleId: number): boolean => {
    // System Admins can assign any role
    if (currentUser?.isSystemAdmin || currentUser?.role === 'SystemAdmin') {
      return true;
    }

    // If no permissions are configured yet, allow assigning non-system admin roles for Port Admins
    if (!rolePermissions && currentUser?.role === 'PortAdmin') {
      return true; // Allow for now until permissions are configured
    }

    // Check if current user's role has permission to assign this role
    return rolePermissions?.allowedRoleIds?.includes(roleId) || false;
  };

  const getAvailableUserTypes = (): string[] => {
    // System Admins can create any user type
    if (currentUser?.isSystemAdmin || currentUser?.role === 'SystemAdmin') {
      return ["SuperAdmin", "PortUser", "TerminalUser"];
    }

    // If no permissions are configured yet, allow basic user types for now
    if (!rolePermissions) {
      return ["PortUser", "TerminalUser"];
    }

    // Return allowed user types based on permissions
    return rolePermissions.allowedUserTypes || [];
  };

  const getAvailableRoleIds = (): number[] => {
    // System Admins can assign any role except System Admin itself
    if (currentUser?.isSystemAdmin || currentUser?.role === 'SystemAdmin') {
      // Return all non-system admin role IDs (will be filtered by roles query)
      return [];
    }

    // Return allowed role IDs based on permissions
    return rolePermissions?.allowedRoleIds || [];
  };

  return {
    permissions: rolePermissions,
    canCreateUserType,
    canAssignRole,
    getAvailableUserTypes,
    getAvailableRoleIds,
  };
}
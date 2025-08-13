import { useQuery } from "@tanstack/react-query";
import { AuthService } from "@/lib/auth";
import type { Role } from "@shared/schema";

export interface Permission {
  section: string;
  subsection?: string;
  levels: ('read' | 'write' | 'manage')[];
}

export function usePermissions() {
  // Get current user data
  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get user role with permissions
  const { data: userRole } = useQuery<Role>({
    queryKey: ["/api/roles", (user as any)?.user?.roleId],
    enabled: !!(user as any)?.user?.roleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Parse permission string into structured format
  const parsePermissions = (permissions: string[]): Permission[] => {
    return permissions.map(permission => {
      const parts = permission.split(':');
      const levels = parts[parts.length - 1].split(',') as ('read' | 'write' | 'manage')[];
      
      if (parts.length === 2) {
        // Simple permission: "dashboard:read,write"
        return {
          section: parts[0],
          levels,
        };
      } else if (parts.length === 3) {
        // Nested permission: "users-access:users:read,write,manage"
        return {
          section: parts[0],
          subsection: parts[1],
          levels,
        };
      } else {
        // Fallback for malformed permissions
        return {
          section: parts[0] || permission,
          levels: ['read'],
        };
      }
    });
  };

  // Get user's permissions
  const getUserPermissions = (): Permission[] => {
    console.log('=== PERMISSION DEBUG START ===');
    console.log('getUserPermissions called - user:', user, 'userRole:', userRole);
    
    // Extract user data properly - try multiple extraction methods
    let userData = (user as any)?.user || user;
    console.log('userData extracted (first attempt):', userData);
    
    // If still undefined, try direct extraction
    if (!userData && user) {
      userData = user;
      console.log('userData extracted (direct):', userData);
    }
    
    console.log('userData.role:', userData?.role);
    console.log('userData.isSystemAdmin:', userData?.isSystemAdmin);
    console.log('userData.userType:', userData?.userType);
    console.log('userData.roleId:', userData?.roleId);
    
    if (!user || !userData?.role) {
      console.log('No user or role found, returning empty permissions');
      return [];
    }
    
    // System admin has all permissions - check multiple conditions
    const isSystemAdmin = userData.isSystemAdmin || 
                         userData.role === "SystemAdmin" || 
                         userData.role === "System Admin" ||
                         userData.userType === "SystemAdmin" ||
                         userData.userType === "SuperAdmin";
    
    console.log('isSystemAdmin check result:', isSystemAdmin);
    console.log('Individual checks:');
    console.log('  userData.isSystemAdmin:', userData.isSystemAdmin);
    console.log('  userData.role === "SystemAdmin":', userData.role === "SystemAdmin");
    console.log('  userData.role === "System Admin":', userData.role === "System Admin");
    console.log('  userData.userType === "SystemAdmin":', userData.userType === "SystemAdmin");
    console.log('  userData.userType === "SuperAdmin":', userData.userType === "SuperAdmin");
    
    if (isSystemAdmin) {
      console.log('User is SystemAdmin, granting all permissions');
      console.log('=== PERMISSION DEBUG END (SystemAdmin) ===');
      return [
        { section: "*", levels: ['read', 'write', 'manage'] }
      ];
    }

    // Get permissions from role data if available
    const rolePermissions = userRole?.permissions || [];
    console.log('Role permissions found:', rolePermissions);
    
    const parsedPermissions = parsePermissions(rolePermissions);
    console.log('Parsed permissions:', parsedPermissions);
    console.log('=== PERMISSION DEBUG END ===');
    return parsedPermissions;
  };

  // Check if user has specific permission level
  const hasPermission = (section: string, subsection?: string, level: 'read' | 'write' | 'manage' = 'read'): boolean => {
    const permissions = getUserPermissions();
    console.log(`hasPermission check for section: "${section}", subsection: "${subsection}", level: "${level}"`);
    console.log('Available permissions:', permissions);
    
    // System admin check
    const hasWildcard = permissions.some(p => p.section === "*");
    if (hasWildcard) {
      console.log('Found wildcard permission, granting access');
      return true;
    }

    // Level hierarchy: manage > write > read
    const levelHierarchy = { read: 0, write: 1, manage: 2 };
    const requiredLevel = levelHierarchy[level];

    // Check direct section match or nested permissions
    const hasDirectPermission = permissions.some(permission => {
      // Direct section match (e.g., "ports")
      if (permission.section === section) {
        console.log(`Direct section match found for "${section}"`);
        // Check subsection match if provided
        if (subsection && permission.subsection !== subsection) {
          return false;
        }
        // Check if user has required level or higher
        return permission.levels.some(userLevel => {
          return levelHierarchy[userLevel] >= requiredLevel;
        });
      }
      
      // Check nested permissions (e.g., "port-onboarding:ports" or "user-access:users")
      if (permission.subsection === section) {
        console.log(`Nested permission found: "${permission.section}:${permission.subsection}"`);
        return permission.levels.some(userLevel => {
          return levelHierarchy[userLevel] >= requiredLevel;
        });
      }
      
      // Special handling for port-onboarding:ports pattern when checking "ports"
      if (section === "ports" && permission.section === "port-onboarding" && permission.subsection === "ports") {
        console.log(`Special port-onboarding:ports permission found for "ports" check`);
        return permission.levels.some(userLevel => {
          return levelHierarchy[userLevel] >= requiredLevel;
        });
      }
      
      return false;
    });

    console.log(`Permission check result: ${hasDirectPermission}`);
    return hasDirectPermission;
  };

  // Convenience functions for common permission checks
  const canRead = (section: string, subsection?: string): boolean => {
    return hasPermission(section, subsection, 'read');
  };

  const canWrite = (section: string, subsection?: string): boolean => {
    return hasPermission(section, subsection, 'write');
  };

  const canManage = (section: string, subsection?: string): boolean => {
    return hasPermission(section, subsection, 'manage');
  };

  const canEdit = (section: string, subsection?: string): boolean => {
    return canWrite(section, subsection);
  };

  const canDelete = (section: string, subsection?: string): boolean => {
    return canManage(section, subsection);
  };

  const canCreate = (section: string, subsection?: string): boolean => {
    // Use the same user data extraction as getUserPermissions
    let userData = (user as any)?.user || user;
    if (!userData && user) {
      userData = user;
    }
    
    console.log('=== canCreate DEBUG ===');
    console.log('Full user data:', userData);
    console.log('userData.isSystemAdmin:', userData?.isSystemAdmin);
    console.log('userData.role:', userData?.role);
    console.log('userData.userType:', userData?.userType);
    console.log('userData.roleId:', userData?.roleId);
    
    // Check for System Admin users with multiple conditions
    const isSystemAdmin = userData?.isSystemAdmin === true || 
                         userData?.isSystemAdmin === 'true' ||
                         userData?.role === "SystemAdmin" || 
                         userData?.role === "System Admin" || 
                         userData?.userType === "SystemAdmin" || 
                         userData?.userType === "SuperAdmin" ||
                         userData?.roleId === 1;  // Role ID 1 is SystemAdmin
    
    // Check for Port Admin specifically for user management
    const isPortAdminForUsers = (userData?.role === "PortAdmin" || userData?.roleId === 3) && 
                               section === "users" && subsection === "user-access";
    
    if (isSystemAdmin || isPortAdminForUsers) {
      console.log(`canCreate("${section}", "${subsection}") = true (Admin override detected - SystemAdmin: ${isSystemAdmin}, PortAdmin: ${isPortAdminForUsers})`);
      return true;
    }
    
    const result = canWrite(section, subsection);
    console.log(`canCreate("${section}", "${subsection}") = ${result} (permission check)`);
    return result;
  };

  // Check multiple permissions at once
  const hasAnyPermission = (checks: Array<{ section: string; subsection?: string; level?: 'read' | 'write' | 'manage' }>): boolean => {
    return checks.some(check => hasPermission(check.section, check.subsection, check.level));
  };

  const hasAllPermissions = (checks: Array<{ section: string; subsection?: string; level?: 'read' | 'write' | 'manage' }>): boolean => {
    return checks.every(check => hasPermission(check.section, check.subsection, check.level));
  };

  // Get user's role information
  const getUserRole = () => {
    return {
      name: (user && user.user?.role) || '',
      isSystemAdmin: (user && user.user?.isSystemAdmin) || false,
      isAuthenticated: AuthService.isAuthenticated(),
    };
  };

  // Get permission summary for current user
  const getPermissionSummary = () => {
    const permissions = getUserPermissions();
    const summary = {
      totalPermissions: permissions.length,
      readCount: 0,
      writeCount: 0,
      manageCount: 0,
      sections: new Set<string>(),
    };

    permissions.forEach(permission => {
      summary.sections.add(permission.section);
      permission.levels.forEach(level => {
        summary[`${level}Count` as keyof typeof summary]++;
      });
    });

    return {
      ...summary,
      sections: Array.from(summary.sections),
    };
  };

  return {
    // Basic permission checks
    hasPermission,
    canRead,
    canWrite,
    canEdit,
    canManage,
    canDelete,
    canCreate,
    
    // Advanced permission checks
    hasAnyPermission,
    hasAllPermissions,
    
    // User information
    getUserRole,
    getUserPermissions,
    getPermissionSummary,
    
    // Computed values
    isSystemAdmin: getUserRole().isSystemAdmin,
    userRole: getUserRole().name,
    isAuthenticated: getUserRole().isAuthenticated,
    userData: (user as any)?.user || user,
  };
}

// Permission checking utility functions for conditional logic
export function checkPermissionCondition(
  userPermissions: Permission[],
  isSystemAdmin: boolean,
  section: string,
  subsection?: string,
  level: 'read' | 'write' | 'manage' = 'read'
): boolean {
  // System admin has all permissions
  if (isSystemAdmin) return true;

  // Check for wildcard permission
  const hasWildcard = userPermissions.some(p => p.section === "*");
  if (hasWildcard) return true;

  // Level hierarchy: manage > write > read
  const levelHierarchy = { read: 0, write: 1, manage: 2 };
  const requiredLevel = levelHierarchy[level];

  return userPermissions.some(permission => {
    // Check section match
    if (permission.section !== section && permission.section !== "*") {
      return false;
    }

    // Check subsection match if provided
    if (subsection && permission.subsection && permission.subsection !== subsection) {
      return false;
    }

    // Check if user has required level or higher
    return permission.levels.some(userLevel => {
      return levelHierarchy[userLevel] >= requiredLevel;
    });
  });
}
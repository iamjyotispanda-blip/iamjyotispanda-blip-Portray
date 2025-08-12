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
    console.log('getUserPermissions called - user:', user, 'userRole:', userRole);
    
    const userData = (user as any)?.user;
    if (!user || !userData?.role) {
      console.log('No user or role found');
      return [];
    }
    
    // System admin has all permissions
    if (userData.isSystemAdmin || userData.role === "SystemAdmin" || userData.role === "System Admin") {
      console.log('User is SystemAdmin, granting all permissions');
      return [
        { section: "*", levels: ['read', 'write', 'manage'] }
      ];
    }

    // Get permissions from role data if available
    const rolePermissions = userRole?.permissions || [];
    console.log('Role permissions found:', rolePermissions);
    
    // If no role permissions defined but user is System Admin, grant all permissions
    if (rolePermissions.length === 0 && (userData.isSystemAdmin || userData.role === "SystemAdmin" || userData.role === "System Admin")) {
      console.log('No role permissions but user is SystemAdmin, granting all permissions');
      return [
        { section: "*", levels: ['read', 'write', 'manage'] }
      ];
    }
    
    const parsedPermissions = parsePermissions(rolePermissions);
    console.log('Parsed permissions:', parsedPermissions);
    return parsedPermissions;
  };

  // Check if user has specific permission level
  const hasPermission = (section: string, subsection?: string, level: 'read' | 'write' | 'manage' = 'read'): boolean => {
    const permissions = getUserPermissions();
    
    // System admin check
    const hasWildcard = permissions.some(p => p.section === "*");
    if (hasWildcard) return true;

    // Level hierarchy: manage > write > read
    const levelHierarchy = { read: 0, write: 1, manage: 2 };
    const requiredLevel = levelHierarchy[level];

    return permissions.some(permission => {
      // Check section match
      const sectionMatch = permission.section === section;
      if (!sectionMatch) return false;

      // Check subsection match if provided
      if (subsection && permission.subsection !== subsection) {
        return false;
      }

      // Check if user has required level or higher
      return permission.levels.some(userLevel => {
        return levelHierarchy[userLevel] >= requiredLevel;
      });
    });
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
    return canWrite(section, subsection);
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
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  isSystemAdmin: boolean;
  rolePermissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Parse permission string into structured format
interface ParsedPermission {
  section: string;
  subsection?: string;
  levels: ('read' | 'write' | 'manage')[];
}

function parsePermissions(permissions: string[]): ParsedPermission[] {
  return permissions.map(permission => {
    const parts = permission.split(':');
    const levels = parts[parts.length - 1].split(',') as ('read' | 'write' | 'manage')[];
    
    if (parts.length === 2) {
      return {
        section: parts[0],
        levels,
      };
    } else if (parts.length === 3) {
      return {
        section: parts[0],
        subsection: parts[1],
        levels,
      };
    } else {
      return {
        section: parts[0] || permission,
        levels: ['read'],
      };
    }
  });
}

// Check if user has specific permission
function hasPermission(
  userPermissions: string[],
  isSystemAdmin: boolean,
  requiredSection: string,
  requiredSubsection?: string,
  requiredLevel: 'read' | 'write' | 'manage' = 'read'
): boolean {
  // System admin has all permissions
  if (isSystemAdmin) return true;

  const permissions = parsePermissions(userPermissions);
  const levelHierarchy = { read: 0, write: 1, manage: 2 };
  const requiredLevelValue = levelHierarchy[requiredLevel];

  return permissions.some(permission => {
    // Check section match
    if (permission.section !== requiredSection && permission.section !== "*") {
      return false;
    }

    // Check subsection match if provided
    if (requiredSubsection && permission.subsection && permission.subsection !== requiredSubsection) {
      return false;
    }

    // Check if user has required level or higher
    return permission.levels.some(userLevel => {
      return levelHierarchy[userLevel] >= requiredLevelValue;
    });
  });
}

// Middleware factory for permission checking
export function checkPermission(
  section: string,
  subsection?: string,
  level: 'read' | 'write' | 'manage' = 'read'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userPermissions = user.rolePermissions || [];
    const hasAccess = hasPermission(
      userPermissions,
      user.isSystemAdmin,
      section,
      subsection,
      level
    );

    if (!hasAccess) {
      return res.status(403).json({ 
        message: `Access denied. Required permission: ${section}${subsection ? `:${subsection}` : ''}:${level}` 
      });
    }

    next();
  };
}

// Check multiple permissions (user needs ALL)
export function checkAllPermissions(
  permissions: Array<{ section: string; subsection?: string; level?: 'read' | 'write' | 'manage' }>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userPermissions = user.rolePermissions || [];
    const hasAllAccess = permissions.every(perm => 
      hasPermission(
        userPermissions,
        user.isSystemAdmin,
        perm.section,
        perm.subsection,
        perm.level || 'read'
      )
    );

    if (!hasAllAccess) {
      const requiredPerms = permissions.map(p => 
        `${p.section}${p.subsection ? `:${p.subsection}` : ''}:${p.level || 'read'}`
      ).join(', ');
      
      return res.status(403).json({ 
        message: `Access denied. Required permissions: ${requiredPerms}` 
      });
    }

    next();
  };
}

// Check multiple permissions (user needs ANY)
export function checkAnyPermission(
  permissions: Array<{ section: string; subsection?: string; level?: 'read' | 'write' | 'manage' }>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userPermissions = user.rolePermissions || [];
    const hasAnyAccess = permissions.some(perm => 
      hasPermission(
        userPermissions,
        user.isSystemAdmin,
        perm.section,
        perm.subsection,
        perm.level || 'read'
      )
    );

    if (!hasAnyAccess) {
      const requiredPerms = permissions.map(p => 
        `${p.section}${p.subsection ? `:${p.subsection}` : ''}:${p.level || 'read'}`
      ).join(' OR ');
      
      return res.status(403).json({ 
        message: `Access denied. Required permissions (any): ${requiredPerms}` 
      });
    }

    next();
  };
}

// Utility function for manual permission checking in route handlers
export function userHasPermission(
  user: AuthenticatedUser,
  section: string,
  subsection?: string,
  level: 'read' | 'write' | 'manage' = 'read'
): boolean {
  const userPermissions = user.rolePermissions || [];
  return hasPermission(userPermissions, user.isSystemAdmin, section, subsection, level);
}

// System admin check middleware
export function requireSystemAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!user.isSystemAdmin && user.role !== "SystemAdmin" && user.role !== "System Admin") {
    return res.status(403).json({ message: 'System administrator access required' });
  }

  next();
}

// Role-based access middleware
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
}

// Export the permission checking function for use in other modules
export { hasPermission as checkUserPermission };
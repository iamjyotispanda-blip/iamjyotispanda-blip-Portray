import type { Role, User } from "@shared/schema";

export interface PermissionLevel {
  read: boolean;
  write: boolean;
  manage: boolean;
}

export class PermissionService {
  /**
   * Check if user has specific permission level for a menu item
   */
  static hasPermission(
    userRole: Role | null,
    user: User | null,
    menuName: string,
    permissionType: 'read' | 'write' | 'manage',
    parentMenuName?: string
  ): boolean {
    // SystemAdmin has all permissions
    if (user?.role === "SystemAdmin") {
      return true;
    }

    if (!userRole?.permissions || !Array.isArray(userRole.permissions)) {
      return false;
    }

    // Find the permission for this menu
    const targetPermission = userRole.permissions.find((permission: string) => {
      const parts = permission.split(':');
      if (parts.length >= 2) {
        const [gLink, pLink] = parts;
        if (parentMenuName) {
          // For child menu items (plink), check both parent and child
          return gLink === parentMenuName && pLink === menuName;
        } else {
          // For parent menu items (glink), check glink name
          return gLink === menuName;
        }
      }
      return false;
    });

    if (!targetPermission) {
      return false;
    }

    // Extract permission levels from the permission string
    const parts = targetPermission.split(':');
    if (parts.length < 3) {
      return false;
    }

    const permissionLevels = parts[2].split(',');
    return permissionLevels.includes(permissionType);
  }

  /**
   * Get all permission levels for a menu item
   */
  static getPermissionLevels(
    userRole: Role | null,
    user: User | null,
    menuName: string,
    parentMenuName?: string
  ): PermissionLevel {
    // SystemAdmin has all permissions
    if (user?.role === "SystemAdmin") {
      return { read: true, write: true, manage: true };
    }

    if (!userRole?.permissions || !Array.isArray(userRole.permissions)) {
      return { read: false, write: false, manage: false };
    }

    // Find the permission for this menu
    const targetPermission = userRole.permissions.find((permission: string) => {
      const parts = permission.split(':');
      if (parts.length >= 2) {
        const [gLink, pLink] = parts;
        if (parentMenuName) {
          return gLink === parentMenuName && pLink === menuName;
        } else {
          return gLink === menuName;
        }
      }
      return false;
    });

    if (!targetPermission) {
      return { read: false, write: false, manage: false };
    }

    const parts = targetPermission.split(':');
    if (parts.length < 3) {
      return { read: false, write: false, manage: false };
    }

    const permissionLevels = parts[2].split(',');
    return {
      read: permissionLevels.includes('read'),
      write: permissionLevels.includes('write'),
      manage: permissionLevels.includes('manage'),
    };
  }

  /**
   * Check if user has any access to a menu (used for navigation filtering)
   */
  static hasAnyPermission(
    userRole: Role | null,
    user: User | null,
    menuName: string,
    parentMenuName?: string
  ): boolean {
    // SystemAdmin has all permissions
    if (user?.role === "SystemAdmin") {
      return true;
    }

    if (!userRole?.permissions || !Array.isArray(userRole.permissions)) {
      return false;
    }

    return userRole.permissions.some((permission: string) => {
      const parts = permission.split(':');
      if (parts.length >= 2) {
        const [gLink, pLink] = parts;
        if (parentMenuName) {
          return gLink === parentMenuName && pLink === menuName;
        } else {
          return gLink === menuName;
        }
      }
      return false;
    });
  }
}
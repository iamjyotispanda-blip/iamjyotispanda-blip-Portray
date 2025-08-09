import { storage } from "./storage";
import type { InsertUserAuditLog, User } from "@shared/schema";

export class AuditService {
  static async logUserCreation(
    targetUserId: string,
    performedBy: string,
    newUserData: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await storage.createUserAuditLog({
        targetUserId,
        performedBy,
        action: "created",
        description: `User account created with email: ${newUserData.email}`,
        oldValues: null,
        newValues: JSON.stringify({
          email: newUserData.email,
          firstName: newUserData.firstName,
          lastName: newUserData.lastName,
          userType: newUserData.userType,
          role: newUserData.role,
          portId: newUserData.portId,
          terminalIds: newUserData.terminalIds,
          isActive: newUserData.isActive
        }),
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error("Failed to log user creation:", error);
    }
  }

  static async logUserUpdate(
    targetUserId: string,
    performedBy: string,
    oldValues: any,
    newValues: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      const changes = [];
      
      // Compare values and build description
      if (oldValues.email !== newValues.email) {
        changes.push(`email changed from ${oldValues.email} to ${newValues.email}`);
      }
      if (oldValues.firstName !== newValues.firstName) {
        changes.push(`first name changed from ${oldValues.firstName} to ${newValues.firstName}`);
      }
      if (oldValues.lastName !== newValues.lastName) {
        changes.push(`last name changed from ${oldValues.lastName} to ${newValues.lastName}`);
      }
      if (oldValues.userType !== newValues.userType) {
        changes.push(`user type changed from ${oldValues.userType} to ${newValues.userType}`);
      }
      if (oldValues.role !== newValues.role) {
        changes.push(`role changed from ${oldValues.role} to ${newValues.role}`);
      }
      if (oldValues.portId !== newValues.portId) {
        changes.push(`port assignment changed`);
      }
      if (JSON.stringify(oldValues.terminalIds) !== JSON.stringify(newValues.terminalIds)) {
        changes.push(`terminal assignments changed`);
      }

      if (changes.length > 0) {
        await storage.createUserAuditLog({
          targetUserId,
          performedBy,
          action: "updated",
          description: `User profile updated: ${changes.join(", ")}`,
          oldValues: JSON.stringify(oldValues),
          newValues: JSON.stringify(newValues),
          ipAddress,
          userAgent
        });
      }
    } catch (error) {
      console.error("Failed to log user update:", error);
    }
  }

  static async logUserStatusChange(
    targetUserId: string,
    performedBy: string,
    oldStatus: boolean,
    newStatus: boolean,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await storage.createUserAuditLog({
        targetUserId,
        performedBy,
        action: "status_changed",
        description: `User status changed from ${oldStatus ? 'active' : 'inactive'} to ${newStatus ? 'active' : 'inactive'}`,
        oldValues: JSON.stringify({ isActive: oldStatus }),
        newValues: JSON.stringify({ isActive: newStatus }),
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error("Failed to log user status change:", error);
    }
  }

  static async logUserRoleChange(
    targetUserId: string,
    performedBy: string,
    oldRole: string,
    newRole: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await storage.createUserAuditLog({
        targetUserId,
        performedBy,
        action: "role_changed",
        description: `User role changed from ${oldRole} to ${newRole}`,
        oldValues: JSON.stringify({ role: oldRole }),
        newValues: JSON.stringify({ role: newRole }),
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error("Failed to log role change:", error);
    }
  }

  static async logUserVerification(
    targetUserId: string,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await storage.createUserAuditLog({
        targetUserId,
        performedBy,
        action: "verified",
        description: "User email address verified successfully",
        oldValues: JSON.stringify({ isVerified: false }),
        newValues: JSON.stringify({ isVerified: true }),
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error("Failed to log user verification:", error);
    }
  }

  static async logPasswordSetup(
    targetUserId: string,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await storage.createUserAuditLog({
        targetUserId,
        performedBy,
        action: "password_setup",
        description: "User password set up successfully",
        oldValues: null,
        newValues: JSON.stringify({ passwordSetup: true }),
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error("Failed to log password setup:", error);
    }
  }

  static async logUserDeletion(
    targetUserId: string,
    performedBy: string,
    deletedUserData: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await storage.createUserAuditLog({
        targetUserId,
        performedBy,
        action: "deleted",
        description: `User account deleted: ${deletedUserData.email}`,
        oldValues: JSON.stringify({
          email: deletedUserData.email,
          firstName: deletedUserData.firstName,
          lastName: deletedUserData.lastName,
          userType: deletedUserData.userType,
          role: deletedUserData.role,
          isActive: deletedUserData.isActive
        }),
        newValues: null,
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error("Failed to log user deletion:", error);
    }
  }

  static async logLogin(
    targetUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await storage.createUserAuditLog({
        targetUserId,
        performedBy: targetUserId, // User logs in themselves
        action: "login",
        description: "User logged in successfully",
        oldValues: null,
        newValues: JSON.stringify({ loginTime: new Date().toISOString() }),
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error("Failed to log user login:", error);
    }
  }
}
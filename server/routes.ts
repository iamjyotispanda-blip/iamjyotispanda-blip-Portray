import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertOrganizationSchema, insertPortSchema, insertPortAdminContactSchema, updatePortAdminContactSchema, insertEmailConfigurationSchema, updateEmailConfigurationSchema, insertTerminalSchema, updateTerminalSchema, insertNotificationSchema, insertMenuSchema, updateMenuSchema, insertUserSchema, updateUserSchema, insertRoleSchema, updateRoleSchema, insertCustomerSchema, insertCustomerContactSchema, insertCustomerAddressSchema, insertContractSchema, insertContractTariffSchema, insertContractCargoDetailSchema, insertContractStorageChargeSchema, insertContractSpecialConditionSchema, type InsertUser, type Menu } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import multer from "multer";
// Object storage imports removed - using fallback system
import { EmailService } from "./emailService";
import { AuditService } from "./auditService";

// Extend Express Request to include user session
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Clean up any stuck backup processes on startup
  await storage.cleanupStuckBackups();
  
  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req: any, file: any, cb: any) => {
      if (file.mimetype === 'application/sql' || file.originalname.endsWith('.sql')) {
        cb(null, true);
      } else {
        cb(new Error('Only SQL files are allowed'), false);
      }
    }
  });
  
  // Validation schemas for new endpoints
  const verifyEmailSchema = z.object({
    token: z.string().min(1, "Token is required")
  });

  const setupPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters")
  });
  
  // Helper function to check if user is system admin
  const isSystemAdmin = (user: any): boolean => {
    return !!(
      user?.isSystemAdmin || 
      user?.role === "SystemAdmin" || 
      user?.role === "System Admin" ||
      user?.userType === "SuperAdmin" ||
      user?.userType === "SystemAdmin"
    );
  };

  // Authentication middleware
  const authenticateToken = async (req: Request, res: Response, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    try {
      const session = await storage.getSessionByToken(token);
      if (!session) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      // Add system admin flag for easy checking
      const userWithAdminFlag = { 
        ...user, 
        password: undefined,
        isSystemAdminUser: isSystemAdmin(user)
      };
      
      req.user = userWithAdminFlag;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      // Validate user credentials
      const user = await storage.validateUserCredentials(credentials.email, credentials.password);
      if (!user) {
        return res.status(401).json({ 
          message: "Invalid email or password" 
        });
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Create session
      const session = await storage.createSession(user.id, credentials.rememberMe);

      // Return user info and token (exclude password)
      const { password, ...userWithoutPassword } = user;
      
      // Determine redirect path based on system admin flag and role
      let redirectPath = "/dashboard";
      if (isSystemAdmin(user)) {
        redirectPath = "/dashboard";
      } else if (user.role === "PortAdmin") {
        redirectPath = "/port-admin-dashboard";
      }
      
      return res.json({
        user: userWithoutPassword,
        token: session.token,
        expiresAt: session.expiresAt,
        redirectPath
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", authenticateToken, async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token) {
        await storage.deleteSession(token);
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      let userWithPermissions = { ...user };

      // If user has a role, fetch the role permissions
      if (user.role) {
        const role = await storage.getRoleByName(user.role);
        if (role && role.permissions) {
          userWithPermissions.rolePermissions = role.permissions;
        }
      }

      res.json({ user: userWithPermissions });
    } catch (error) {
      console.error("Get user me error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Refresh token endpoint
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: "Token required" });
      }

      const session = await storage.getSessionByToken(token);
      if (!session) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      // Create new session
      const newSession = await storage.createSession(session.userId);
      
      // Delete old session
      await storage.deleteSession(token);

      res.json({
        token: newSession.token,
        expiresAt: newSession.expiresAt,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Organization endpoints
  app.get("/api/organizations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const organizations = await storage.getAllOrganizations();
      console.log("Organizations from database:", JSON.stringify(organizations, null, 2));
      res.json(organizations);
    } catch (error) {
      console.error("Get organizations error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/organizations/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const organization = await storage.getOrganizationById(id);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(organization);
    } catch (error) {
      console.error("Get organization error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/organizations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const organizationData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(organizationData);
      res.status(201).json(organization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Create organization error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/organizations/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertOrganizationSchema.partial().parse(req.body);
      
      const organization = await storage.updateOrganization(id, updates);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(organization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Update organization error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/organizations/:id/toggle-status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const organization = await storage.toggleOrganizationStatus(id);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(organization);
    } catch (error) {
      console.error("Toggle organization status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Port endpoints
  app.get("/api/organizations/:id/ports", authenticateToken, async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.id);
      const ports = await storage.getPortsByOrganizationId(organizationId);
      res.json(ports);
    } catch (error) {
      console.error("Get ports error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ports", authenticateToken, async (req: Request, res: Response) => {
    try {
      const portData = insertPortSchema.parse(req.body);
      const port = await storage.createPort(portData);
      res.status(201).json(port);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Create port error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Object storage endpoints - Fallback system
  app.get("/objects/:objectPath(*)", async (req: Request, res: Response) => {
    // For our fallback system, redirect to the file serving endpoint if it matches our pattern
    const objectPath = req.params.objectPath;
    
    // Check if this looks like our uploaded file pattern
    if (objectPath.startsWith('uploads/')) {
      const uploadId = objectPath.replace('uploads/', '');
      return res.redirect(`/api/objects/file/${uploadId}`);
    }
    
    // Otherwise return 404
    return res.status(404).json({ error: "File not found" });
  });

  app.post("/api/objects/upload", authenticateToken, async (req: Request, res: Response) => {
    try {
      // For now, return a simple success response - the actual upload will be handled differently
      const uploadId = randomUUID();
      res.json({ 
        uploadURL: `/api/objects/direct-upload/${uploadId}`,
        uploadId: uploadId
      });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Simple file storage in memory for demo
  const uploadedFiles = new Map<string, { data: string; filename: string; contentType: string }>();

  // Direct upload endpoint for file uploads
  app.put("/api/objects/direct-upload/:uploadId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const uploadId = req.params.uploadId;
      const { data, filename, contentType } = req.body;
      
      // Store the file data in memory
      uploadedFiles.set(uploadId, { data, filename, contentType });
      
      const objectPath = `/api/objects/file/${uploadId}`;
      
      res.status(200).json({ 
        success: true,
        objectPath: objectPath
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Serve uploaded files
  app.get("/api/objects/file/:uploadId", async (req: Request, res: Response) => {
    try {
      const uploadId = req.params.uploadId;
      const fileData = uploadedFiles.get(uploadId);
      
      if (!fileData) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Convert base64 back to binary and serve
      const base64Data = fileData.data.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.set({
        'Content-Type': fileData.contentType,
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=3600'
      });
      
      res.send(buffer);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ error: "Error serving file" });
    }
  });

  // Update organization logo endpoint - Completely rewritten to avoid any Google Cloud Storage
  app.put("/api/organizations/:id/logo", authenticateToken, async (req: Request, res: Response) => {
    console.log("Logo update endpoint called with:", req.body);
    
    if (!req.body.logoUrl) {
      return res.status(400).json({ error: "logoUrl is required" });
    }

    const organizationId = parseInt(req.params.id);

    try {
      console.log("Updating organization", organizationId, "with logo URL:", req.body.logoUrl);
      
      // Simple direct update - no Google Cloud Storage involved
      const logoUrl = req.body.logoUrl;

      // Get organization first
      const org = await storage.getOrganizationById(organizationId);
      if (!org) {
        console.log("Organization not found:", organizationId);
        return res.status(404).json({ error: "Organization not found" });
      }

      console.log("Found organization:", org.organizationName);

      // Simple direct database update - only update logoUrl field to avoid ID issues
      console.log("Directly updating only logoUrl field");
      const updated = await storage.updateOrganizationLogo(organizationId, logoUrl);

      console.log("Successfully updated organization logo");

      res.status(200).json({
        success: true,
        objectPath: logoUrl,
        organization: updated
      });
    } catch (error) {
      console.error("Logo update error (no Google Cloud Storage involved):", error);
      res.status(500).json({ error: "Failed to update organization logo" });
    }
  });

  app.get("/public-objects/:filePath(*)", async (req: Request, res: Response) => {
    // For our fallback system, we don't have public objects in the same way
    // Return 404 since we're using direct file serving now
    return res.status(404).json({ error: "File not found - use direct file URLs" });
  });

  // Port endpoints
  app.get("/api/ports", authenticateToken, async (req: Request, res: Response) => {
    try {
      const ports = await storage.getAllPorts();
      res.json(ports);
    } catch (error) {
      console.error("Get ports error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ports/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const port = await storage.getPortById(id);
      
      if (!port) {
        return res.status(404).json({ message: "Port not found" });
      }
      
      res.json(port);
    } catch (error) {
      console.error("Get port error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ports", authenticateToken, async (req: Request, res: Response) => {
    try {
      const result = insertPortSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: result.error.errors
        });
      }
      
      const port = await storage.createPort(result.data);
      res.status(201).json(port);
    } catch (error) {
      console.error("Create port error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/ports/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const port = await storage.updatePort(id, req.body);
      
      if (!port) {
        return res.status(404).json({ message: "Port not found" });
      }
      
      res.json(port);
    } catch (error) {
      console.error("Update port error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/ports/:id/toggle-status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const port = await storage.togglePortStatus(id);
      
      if (!port) {
        return res.status(404).json({ message: "Port not found" });
      }
      
      res.json(port);
    } catch (error) {
      console.error("Toggle port status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Port Admin Contact endpoints
  app.get("/api/ports/:portId/contacts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const portId = parseInt(req.params.portId);
      const contacts = await storage.getPortAdminContactsByPortId(portId);
      res.json(contacts);
    } catch (error) {
      console.error("Get port admin contacts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ports/:portId/contacts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const portId = parseInt(req.params.portId);
      const contactData = insertPortAdminContactSchema.parse({ ...req.body, portId });
      
      // Check if email already exists among active contacts
      const existingContact = await storage.getPortAdminContactByEmail(contactData.email);
      if (existingContact) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check if email exists among active users
      const existingUser = await storage.getUserByEmail(contactData.email);
      if (existingUser && existingUser.isActive) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const contact = await storage.createPortAdminContact(contactData);
      
      // Generate verification token and send email
      const verificationToken = randomUUID();
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.updatePortAdminContactVerification(contact.id, verificationToken, expiresAt);
      
      // Send welcome email using configured email service
      try {
        const emailConfigs = await storage.getAllEmailConfigurations();
        const activeConfig = emailConfigs.find(config => config.isActive);
        if (activeConfig) {
          const emailService = new EmailService();
          const emailSent = await emailService.sendWelcomeEmail(activeConfig, contact.email, verificationToken);
          if (emailSent) {
            console.log(`Welcome email sent to ${contact.email} with verification link`);
          } else {
            console.log(`Failed to send welcome email to ${contact.email}, using fallback notification`);
          }
        } else {
          console.log(`No active email configuration found, verification link: /verify?token=${verificationToken}`);
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
        console.log(`Fallback: Welcome email for ${contact.email} with verification link: /verify?token=${verificationToken}`);
      }
      
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Create port admin contact error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/contacts/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = updatePortAdminContactSchema.parse(req.body);
      
      const contact = await storage.updatePortAdminContact(id, updates);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Update port admin contact error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/contacts/:id/toggle-status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.togglePortAdminContactStatus(id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Toggle contact status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/contacts/:id/resend-verification", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.getPortAdminContactById(id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      if (contact.isVerified) {
        return res.status(400).json({ message: "Contact already verified" });
      }
      
      // Generate new verification token
      const verificationToken = randomUUID();
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.updatePortAdminContactVerification(contact.id, verificationToken, expiresAt);
      
      // Send verification email using configured email service
      try {
        const emailConfigs = await storage.getAllEmailConfigurations();
        const activeConfig = emailConfigs.find(config => config.isActive);
        if (activeConfig) {
          const emailService = new EmailService();
          const emailSent = await emailService.sendWelcomeEmail(activeConfig, contact.email, verificationToken);
          if (emailSent) {
            console.log(`Verification email resent to ${contact.email}`);
          } else {
            console.log(`Failed to resend verification email to ${contact.email}`);
          }
        } else {
          console.log(`No active email configuration found, verification link: /verify?token=${verificationToken}`);
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
        console.log(`Fallback: Verification email for ${contact.email} with link: /verify?token=${verificationToken}`);
      }
      
      res.json({ message: "Verification email sent successfully" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/contacts/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.getPortAdminContactById(id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      await storage.deletePortAdminContact(id);
      res.json({ message: "Contact deleted successfully" });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all port admin contacts (for validation purposes)
  app.get("/api/contacts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contacts = await storage.getAllPortAdminContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Get all contacts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user's contact details (for Port Admin users)
  app.get("/api/contacts/my-contact", authenticateToken, async (req: Request, res: Response) => {
    try {
      if (req.user.role !== "PortAdmin") {
        return res.status(403).json({ message: "Access denied. Only Port Admins can access their contact details." });
      }

      const contact = await storage.getPortAdminContactByUserId(req.user.id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found for this user" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Get my contact error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Port Admin verification and registration endpoints
  app.get("/api/verify", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token required" });
      }
      
      const contact = await storage.getPortAdminContactByToken(token);
      
      if (!contact) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // If contact is not yet verified, mark it as verified and create/update user
      if (!contact.isVerified) {
        // Check if user already exists for this email
        let user = await storage.getUserByEmail(contact.email);
        
        if (!user) {
          // Create user account only if it doesn't exist
          const [firstName, ...lastNameParts] = contact.contactName.split(' ');
          const lastName = lastNameParts.join(' ') || firstName;
          
          // Get Port Admin role ID
          const portAdminRole = await storage.getRoleByName("PortAdmin");
          
          const userData: InsertUser = {
            email: contact.email,
            password: "TEMP_PASSWORD_NEEDS_SETUP", // Temporary, user will set real password
            firstName,
            lastName,
            role: "PortAdmin",
            roleId: portAdminRole?.id,
          };
          
          user = await storage.createUser(userData);
        } else {
          // Update existing user details from contact information
          const [firstName, ...lastNameParts] = contact.contactName.split(' ');
          const lastName = lastNameParts.join(' ') || firstName;
          
          // Get Port Admin role ID
          const portAdminRole = await storage.getRoleByName("PortAdmin");
          
          const updatedUser = await storage.updateUser(user.id, {
            firstName,
            lastName,
            role: "PortAdmin",
            roleId: portAdminRole?.id,
            password: "TEMP_PASSWORD_NEEDS_SETUP" // Reset password for security
          });
          
          if (updatedUser) {
            user = updatedUser;
            console.log(`Updated existing user ${user.email} with new contact details`);
          }
        }
        
        // Now verify the contact and link to the user
        const verifiedContact = await storage.verifyPortAdminContact(token, user.id);
        if (verifiedContact) {
          console.log(`Contact ${contact.email} verified successfully - status updated to active`);
          console.log(`User account created for ${contact.email} - redirecting to password setup`);
          res.json({ 
            message: "Email verified successfully",
            action: "setup_password",
            contactId: verifiedContact.id, 
            email: verifiedContact.email,
            contactName: verifiedContact.contactName,
            status: verifiedContact.status,
            userId: user.id
          });
        } else {
          res.status(500).json({ message: "Failed to update verification status" });
        }
      } else {
        // Already verified, check if user needs password setup
        const existingUser = await storage.getUserByEmail(contact.email);
        if (existingUser && !existingUser.isActive) {
          res.json({ 
            message: "Email already verified",
            action: "setup_password",
            contactId: contact.id, 
            email: contact.email,
            contactName: contact.contactName,
            status: contact.status,
            userId: existingUser.id
          });
        } else {
          res.json({ 
            message: "Email already verified",
            action: "login_required",
            contactId: contact.id, 
            email: contact.email,
            contactName: contact.contactName,
            status: contact.status
          });
        }
      }
    } catch (error) {
      console.error("Verify token error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/setup-password", async (req: Request, res: Response) => {
    try {
      const { userId, password } = req.body;
      
      if (!userId || !password) {
        return res.status(400).json({ message: "User ID and password required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Update user with real password and activate account
      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser = await storage.updateUser(userId, {
        password: hashedPassword,
        isActive: true,
        lastLogin: new Date()
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      // Activate the port admin contact (change status from "in progress" to "active")
      if (updatedUser.role === "PortAdmin") {
        const activatedContact = await storage.activatePortAdminContact(userId);
        if (activatedContact) {
          console.log(`Port admin contact status updated to active for user ${user.email}`);
        }
      }
      
      // Create session for the user
      const session = await storage.createSession(user.id);
      
      console.log(`Password setup completed for user ${user.email}`);
      res.json({
        user: { ...updatedUser, password: undefined },
        token: session.token,
        message: "Password setup successful",
        redirectPath: updatedUser.role === "PortAdmin" ? "/port-admin-dashboard" : "/dashboard"
      });
    } catch (error) {
      console.error("Setup password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email Configuration endpoints
  app.get("/api/configuration/email", authenticateToken, async (req: Request, res: Response) => {
    try {
      const configs = await storage.getAllEmailConfigurations();
      
      // Don't send sensitive passwords in response
      const safeConfigs = configs.map(config => ({
        ...config,
        smtpPassword: config.smtpPassword ? '***masked***' : ''
      }));
      
      res.json(safeConfigs);
    } catch (error) {
      console.error("Get email configurations error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/configuration/email", authenticateToken, async (req: Request, res: Response) => {
    try {
      const configData = insertEmailConfigurationSchema.parse(req.body);
      const config = await storage.createEmailConfiguration(configData);
      
      // Don't send sensitive password in response
      const safeConfig = {
        ...config,
        smtpPassword: config.smtpPassword ? '***masked***' : ''
      };
      
      res.status(201).json(safeConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Create email configuration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/configuration/email/test", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { configId, testEmail } = req.body;
      
      if (!configId || !testEmail) {
        return res.status(400).json({ message: "Configuration ID and test email are required" });
      }

      const config = await storage.getEmailConfigurationById(configId);
      if (!config) {
        return res.status(404).json({ message: "Email configuration not found" });
      }

      const emailService = new EmailService();
      const emailConfig = {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUser: config.smtpUser,
        smtpPassword: config.smtpPassword,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        enableTLS: config.enableTLS
      };
      
      const success = await emailService.sendTestEmail(emailConfig, testEmail);
      
      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test email. Please check your SMTP configuration." });
      }
    } catch (error) {
      console.error("Send test email error:", error);
      res.status(500).json({ message: "Failed to send test email. Please verify your SMTP settings." });
    }
  });

  app.put("/api/configuration/email/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = updateEmailConfigurationSchema.parse(req.body);
      const config = await storage.updateEmailConfiguration(id, updates);
      
      if (!config) {
        return res.status(404).json({ message: "Email configuration not found" });
      }
      
      // Don't send sensitive password in response
      const safeConfig = {
        ...config,
        smtpPassword: config.smtpPassword ? '***masked***' : ''
      };
      
      res.json(safeConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Update email configuration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/configuration/email/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEmailConfiguration(id);
      res.json({ message: "Email configuration deleted successfully" });
    } catch (error) {
      console.error("Delete email configuration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email logs endpoints
  app.get("/api/email-logs", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { configId, portId } = req.query;
      
      let logs;
      if (configId) {
        logs = await storage.getEmailLogsByConfigurationId(parseInt(configId as string));
      } else if (portId) {
        logs = await storage.getEmailLogsByPortId(parseInt(portId as string));
      } else {
        logs = await storage.getAllEmailLogs();
      }
      
      res.json(logs);
    } catch (error) {
      console.error("Get email logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User Audit Log endpoints
  app.get("/api/user-audit-logs", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { userId, performedBy } = req.query;
      
      let logs;
      if (userId) {
        logs = await storage.getUserAuditLogsByUserId(userId as string);
      } else if (performedBy) {
        logs = await storage.getUserAuditLogsByPerformedBy(performedBy as string);
      } else {
        // Only system admins can view all audit logs
        if (!isSystemAdmin(req.user)) {
          return res.status(403).json({ message: "Access denied. Only System Administrators can view all audit logs." });
        }
        logs = await storage.getAllUserAuditLogs();
      }
      
      res.json(logs);
    } catch (error) {
      console.error("Get user audit logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Menu Management endpoints
  app.get("/api/menus", authenticateToken, async (req: Request, res: Response) => {
    try {
      const menuType = req.query.type as string;
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      
      // Get all menus first
      let menus: Menu[];
      if (menuType) {
        menus = await storage.getMenusByType(menuType as 'glink' | 'plink');
      } else if (parentId !== undefined) {
        menus = await storage.getMenusByParentId(parentId === 0 ? null : parentId);
      } else {
        menus = await storage.getAllMenus();
      }

      // Filter menus based on user role and system admin flag
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // If user is system admin, return all menus
      if (isSystemAdmin(user)) {
        return res.json(menus);
      }

      // Get user's role permissions
      const userRole = await storage.getRoleById(user.roleId);
      
      if (!userRole || !userRole.permissions) {
        return res.json([]); // No permissions, no menus
      }

      // Filter menus based on permissions from role
      const filteredMenus = menus.filter(menu => {
        if (!userRole.permissions || !Array.isArray(userRole.permissions)) {
          return false;
        }
        
        // Check permissions based on menu hierarchy
        return userRole.permissions.some((permission: string) => {
          // Direct menu name match
          if (permission === menu.name) {
            return true;
          }
          
          // For glink menus, check if they have permission for the section
          if (menu.menuType === "glink") {
            const parts = permission.split(':');
            if (parts[0] === menu.name) {
              return true;
            }
          }
          
          // For plink menus, check parent:child format
          if (menu.menuType === "plink" && menu.parentId) {
            const parentMenu = menus.find(m => m.id === menu.parentId);
            if (parentMenu) {
              const parts = permission.split(':');
              if (parts.length >= 2) {
                const [parentName, childName] = parts;
                if (parentMenu.name === parentName && menu.name === childName) {
                  return true;
                }
              }
            }
          }
          
          return false;
        });
      });

      res.json(filteredMenus);
    } catch (error) {
      console.error("Get menus error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/menus/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const menu = await storage.getMenuById(id);
      
      if (!menu) {
        return res.status(404).json({ message: "Menu not found" });
      }
      
      res.json(menu);
    } catch (error) {
      console.error("Get menu error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed default menus endpoint
  app.post("/api/menus/seed-defaults", authenticateToken, async (req: Request, res: Response) => {
    try {
      const defaultGlinkMenus = [
        { name: "dashboard", label: "Dashboard", icon: "Home", route: "/dashboard", sortOrder: 1, menuType: "glink", parentId: null, isActive: true },
        { name: "users-access", label: "Users & Access", icon: "Users", route: null, sortOrder: 2, menuType: "glink", parentId: null, isActive: true },
        { name: "configuration", label: "Configuration", icon: "Settings", route: null, sortOrder: 3, menuType: "glink", parentId: null, isActive: true },
        { name: "menu-management", label: "Menu Management", icon: "Menu", route: "/menu-management", sortOrder: 4, menuType: "glink", parentId: null, isActive: true },
      ];

      const createdMenus = [];
      for (const menuData of defaultGlinkMenus) {
        // Check if menu already exists
        const existingMenus = await storage.getAllMenus();
        const exists = existingMenus.some(menu => menu.name === menuData.name && menu.menuType === menuData.menuType);
        
        if (!exists) {
          const menu = await storage.createMenu(menuData);
          createdMenus.push(menu);
        }
      }

      // Create default PLink menus for Users & Access and Configuration
      const usersAccessMenu = await storage.getAllMenus().then(menus => 
        menus.find(menu => menu.name === "users-access" && menu.menuType === "glink")
      );
      const configurationMenu = await storage.getAllMenus().then(menus => 
        menus.find(menu => menu.name === "configuration" && menu.menuType === "glink")
      );

      const defaultPlinkMenus = [];
      
      if (usersAccessMenu) {
        defaultPlinkMenus.push(
          { name: "glink", label: "GLink", icon: "Link", route: "/users-access/glink", sortOrder: 1, menuType: "plink", parentId: usersAccessMenu.id, isActive: true },
          { name: "plink", label: "PLink", icon: "Link", route: "/users-access/plink", sortOrder: 2, menuType: "plink", parentId: usersAccessMenu.id, isActive: true },
          { name: "roles", label: "Roles", icon: "Shield", route: "/users-access/roles", sortOrder: 3, menuType: "plink", parentId: usersAccessMenu.id, isActive: true },
          { name: "groups", label: "Groups", icon: "UserCheck", route: "/users-access/groups", sortOrder: 4, menuType: "plink", parentId: usersAccessMenu.id, isActive: true }
        );
      }

      if (configurationMenu) {
        defaultPlinkMenus.push(
          { name: "organization", label: "Organizations", icon: "Building2", route: "/organizations", sortOrder: 1, menuType: "plink", parentId: configurationMenu.id, isActive: true },
          { name: "ports", label: "Ports", icon: "Ship", route: "/ports", sortOrder: 2, menuType: "plink", parentId: configurationMenu.id, isActive: true },
          { name: "terminal-activation", label: "Terminal Activation", icon: "CheckCircle", route: "/terminal-activation", sortOrder: 3, menuType: "plink", parentId: configurationMenu.id, isActive: true }
        );
      }

      for (const menuData of defaultPlinkMenus) {
        const existingMenus = await storage.getAllMenus();
        const exists = existingMenus.some(menu => menu.name === menuData.name && menu.menuType === menuData.menuType && menu.parentId === menuData.parentId);
        
        if (!exists) {
          const menu = await storage.createMenu(menuData);
          createdMenus.push(menu);
        }
      }

      res.json({
        message: `Successfully seeded ${createdMenus.length} default menus`,
        menus: createdMenus
      });
    } catch (error) {
      console.error("Seed default menus error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/menus", authenticateToken, async (req: Request, res: Response) => {
    try {
      const menuData = insertMenuSchema.parse(req.body);
      const menu = await storage.createMenu(menuData);
      res.status(201).json(menu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Create menu error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/menus/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = updateMenuSchema.parse(req.body);
      const menu = await storage.updateMenu(id, updates);
      
      if (!menu) {
        return res.status(404).json({ message: "Menu not found" });
      }
      
      res.json(menu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Update menu error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/menus/:id/toggle-status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const menu = await storage.toggleMenuStatus(id);
      
      if (!menu) {
        return res.status(404).json({ message: "Menu not found" });
      }
      
      res.json(menu);
    } catch (error) {
      console.error("Toggle menu status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bulk update menu order endpoint
  app.patch("/api/menus/bulk-update-order", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { updates } = req.body;
      
      console.log('Bulk update received:', { updates, type: typeof updates, isArray: Array.isArray(updates) });
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ message: "No updates provided" });
      }
      
      // Validate update structure
      for (const update of updates) {
        if (!update.id || typeof update.id !== 'number' || typeof update.sortOrder !== 'number') {
          console.error('Invalid update structure:', update);
          return res.status(400).json({ message: "Each update must have id and sortOrder" });
        }
      }
      
      console.log('Processing menu updates:', updates.map(u => `ID ${u.id} -> Sort ${u.sortOrder}`));
      
      // Update each menu's sort order
      const updatePromises = updates.map(async ({ id, sortOrder }: { id: number; sortOrder: number }) => {
        console.log(`Updating menu ${id} with sortOrder ${sortOrder}`);
        const result = await storage.updateMenu(id, { sortOrder });
        console.log(`Update result for menu ${id}:`, result ? 'success' : 'failed');
        return result;
      });
      
      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r !== undefined).length;
      
      console.log(`Bulk update completed: ${successCount}/${updates.length} successful`);
      
      res.json({ 
        message: "Menu order updated successfully", 
        updated: successCount,
        total: updates.length
      });
    } catch (error) {
      console.error("Bulk update menu order error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/menus/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMenu(id);
      res.json({ message: "Menu deleted successfully" });
    } catch (error) {
      console.error("Delete menu error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Role management endpoints
  app.get("/api/roles", authenticateToken, async (req: Request, res: Response) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/roles/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const role = await storage.getRoleById(id);
      
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      res.json(role);
    } catch (error) {
      console.error("Get role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/roles", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only system admins can create roles
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. Only System Administrators can create roles." });
      }

      const roleData = insertRoleSchema.parse(req.body);
      
      // Check if role name already exists
      const existingRole = await storage.getRoleByName(roleData.name);
      if (existingRole) {
        return res.status(400).json({ message: "Role name already exists" });
      }
      
      const role = await storage.createRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Create role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/roles/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only system admins can update roles
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. Only System Administrators can update roles." });
      }

      const id = parseInt(req.params.id);
      const updates = updateRoleSchema.parse(req.body);
      
      // Check if role name already exists (excluding current role)
      if (updates.name) {
        const existingRole = await storage.getRoleByName(updates.name);
        if (existingRole && existingRole.id !== id) {
          return res.status(400).json({ message: "Role name already exists" });
        }
      }
      
      const role = await storage.updateRole(id, updates);
      
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      res.json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Update role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/roles/:id/toggle-status", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only system admins can toggle role status
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. Only System Administrators can toggle role status." });
      }

      const id = parseInt(req.params.id);
      const role = await storage.toggleRoleStatus(id);
      
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      res.json(role);
    } catch (error) {
      console.error("Toggle role status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/roles/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only system admins can delete roles
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. Only System Administrators can delete roles." });
      }

      const id = parseInt(req.params.id);
      
      // Check if role exists
      const role = await storage.getRoleById(id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Prevent deletion of system roles
      if (role.isSystem) {
        return res.status(400).json({ message: "Cannot delete system roles. System roles are protected and cannot be removed." });
      }
      
      await storage.deleteRole(id);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Delete role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management endpoints
  app.get("/api/users", authenticateToken, async (req: Request, res: Response) => {
    try {
      // System admins and Port admins can view users
      const isPortAdmin = req.user?.role === "PortAdmin" || req.user?.userType === "PortUser";
      if (!isSystemAdmin(req.user) && !isPortAdmin) {
        return res.status(403).json({ message: "Access denied. Only System Administrators and Port Administrators can view users." });
      }

      const users = await storage.getAllUsers();
      // Remove password from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only system admins can view user details
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. Only System Administrators can view user details." });
      }

      const id = req.params.id;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", authenticateToken, async (req: Request, res: Response) => {
    try {
      // System admins and Port admins can create users
      const isPortAdmin = req.user?.role === "PortAdmin" || req.user?.userType === "PortUser";
      if (!isSystemAdmin(req.user) && !isPortAdmin) {
        return res.status(403).json({ message: "Access denied. Only System Administrators and Port Administrators can create users." });
      }

      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Generate verification token
      const verificationToken = randomUUID();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      const user = await storage.createUser({
        ...userData,
        id: randomUUID(),
        password: null,
        isActive: false,
        isVerified: false,
        verificationToken,
        verificationTokenExpires
      } as any);
      
      // Send verification email using port-specific configuration
      try {
        const { sendUserVerificationEmail } = await import("./emailService.js");
        await sendUserVerificationEmail(user.email, user.firstName, verificationToken, userData.portId || undefined);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Continue without failing - admin can resend manually
      }
      
      // Log user creation for audit trail
      await AuditService.logUserCreation(
        user.id,
        req.user?.id || "system",
        userData,
        req.ip,
        req.get('User-Agent')
      );
      
      // Remove sensitive fields from response
      const { password, verificationToken: token, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      // System admins and Port admins can update users
      const isPortAdmin = req.user?.role === "PortAdmin" || req.user?.userType === "PortUser";
      if (!isSystemAdmin(req.user) && !isPortAdmin) {
        return res.status(403).json({ message: "Access denied. Only System Administrators and Port Administrators can update users." });
      }

      const id = req.params.id;
      const updates = updateUserSchema.parse(req.body);
      
      // Check if email already exists (excluding current user)
      if (updates.email) {
        const existingUser = await storage.getUserByEmail(updates.email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }
      
      // Get current user data for audit logging
      const currentUser = await storage.getUser(id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log user update for audit trail
      await AuditService.logUserUpdate(
        user.id,
        req.user?.id || "system",
        {
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          userType: currentUser.userType,
          role: currentUser.role,
          portId: currentUser.portId,
          terminalIds: currentUser.terminalIds
        },
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          role: user.role,
          portId: user.portId,
          terminalIds: user.terminalIds
        },
        req.ip,
        req.get('User-Agent')
      );
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id/toggle-status", authenticateToken, async (req: Request, res: Response) => {
    try {
      // System admins and Port admins can toggle user status
      const isPortAdmin = req.user?.role === "PortAdmin" || req.user?.userType === "PortUser";
      if (!isSystemAdmin(req.user) && !isPortAdmin) {
        return res.status(403).json({ message: "Access denied. Only System Administrators and Port Administrators can toggle user status." });
      }

      const id = req.params.id;
      
      // Prevent deactivating the current user
      if (id === req.user?.id) {
        return res.status(400).json({ message: "Cannot toggle your own status" });
      }
      
      // Get current user data for audit logging
      const currentUser = await storage.getUser(id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = await storage.toggleUserStatus(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log status change for audit trail
      await AuditService.logUserStatusChange(
        user.id,
        req.user?.id || "system",
        currentUser.isActive,
        user.isActive,
        req.ip,
        req.get('User-Agent')
      );
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Toggle user status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only system admins can delete users
      if (req.user?.role !== "SystemAdmin") {
        return res.status(403).json({ message: "Access denied. Only System Administrators can delete users." });
      }

      const id = req.params.id;
      
      // Prevent deleting the current user
      if (id === req.user?.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent deletion of system admin
      if (user.role === "SystemAdmin") {
        return res.status(400).json({ message: "Cannot delete system administrator" });
      }
      
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Terminal routes
  app.get("/api/terminals", authenticateToken, async (req: Request, res: Response) => {
    try {
      const terminals = await storage.getAllTerminals();
      res.json(terminals);
    } catch (error) {
      console.error("Get all terminals error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/terminals/my-port", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Get port admin's assigned port
      const assignedPort = await storage.getPortAdminAssignedPort(req.user.id);
      if (!assignedPort) {
        return res.status(404).json({ message: "No port assigned to this user" });
      }
      res.json(assignedPort);
    } catch (error) {
      console.error("Get assigned port error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ports/:portId/terminals", authenticateToken, async (req: Request, res: Response) => {
    try {
      const portId = parseInt(req.params.portId);
      const terminals = await storage.getTerminalsByPortId(portId);
      res.json(terminals);
    } catch (error) {
      console.error("Get terminals error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Subscription Types routes
  app.get("/api/subscription-types", authenticateToken, async (req: Request, res: Response) => {
    try {
      const subscriptionTypes = await storage.getAllSubscriptionTypes();
      res.json(subscriptionTypes);
    } catch (error) {
      console.error("Get subscription types error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Terminal activation routes (must be before parameterized routes)
  app.get("/api/terminals/pending-activation", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (req.user.role !== "SystemAdmin") {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const terminals = await storage.getTerminalsPendingActivation();
      res.json(terminals);
    } catch (error) {
      console.error("Get pending terminals error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/terminals/:id/activate", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (req.user.role !== "SystemAdmin") {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid terminal ID" });
      }

      const { activationStartDate, subscriptionTypeId, workOrderNo, workOrderDate } = req.body;

      if (!activationStartDate || !subscriptionTypeId) {
        return res.status(400).json({ message: "Activation start date and subscription type are required" });
      }

      const terminal = await storage.activateTerminal(id, {
        activationStartDate: new Date(activationStartDate),
        subscriptionTypeId: parseInt(subscriptionTypeId),
        workOrderNo,
        workOrderDate: workOrderDate ? new Date(workOrderDate) : null,
      });

      if (!terminal) {
        return res.status(404).json({ message: "Terminal not found" });
      }

      // Create activation log entry
      await storage.createActivationLog({
        terminalId: id,
        action: "activated",
        description: `Terminal activated with ${subscriptionTypeId === 1 ? '1 month' : subscriptionTypeId === 12 ? '12 months' : subscriptionTypeId === 24 ? '24 months' : subscriptionTypeId === 48 ? '48 months' : 'unknown'} subscription${workOrderNo ? ` (Work Order: ${workOrderNo})` : ''}`,
        performedBy: req.user.id,
        data: JSON.stringify({
          subscriptionTypeId: parseInt(subscriptionTypeId),
          activationStartDate,
          workOrderNo,
          workOrderDate
        })
      });

      res.json(terminal);
    } catch (error) {
      console.error("Activate terminal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/terminals/:id/suspend", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (req.user.role !== "SystemAdmin") {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid terminal ID" });
      }

      const { suspensionRemarks } = req.body;

      if (!suspensionRemarks || suspensionRemarks.trim().length < 10) {
        return res.status(400).json({ message: "Suspension remarks must be at least 10 characters long" });
      }

      // Update terminal status to suspended
      const terminal = await storage.updateTerminalStatus(id, "Suspended");
      if (!terminal) {
        return res.status(404).json({ message: "Terminal not found" });
      }

      // Create activation log entry for suspension
      await storage.createActivationLog({
        terminalId: id,
        action: "suspended",
        description: `Terminal suspended. Reason: ${suspensionRemarks}`,
        performedBy: req.user.id,
        data: JSON.stringify({
          suspensionRemarks,
          suspendedAt: new Date().toISOString()
        })
      });

      res.json(terminal);
    } catch (error) {
      console.error("Suspend terminal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/terminals/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const terminal = await storage.getTerminalById(id);
      if (!terminal) {
        return res.status(404).json({ message: "Terminal not found" });
      }
      res.json(terminal);
    } catch (error) {
      console.error("Get terminal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get activation logs for a terminal
  app.get("/api/terminals/:id/activation-log", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid terminal ID" });
      }

      const logs = await storage.getActivationLogsByTerminalId(id);
      res.json(logs);
    } catch (error) {
      console.error("Get activation logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ports/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const port = await storage.getPortById(id);
      if (!port) {
        return res.status(404).json({ message: "Port not found" });
      }
      res.json(port);
    } catch (error) {
      console.error("Get port error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/organizations/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const organization = await storage.getOrganizationById(id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      console.error("Get organization error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ports/:portId/terminals", authenticateToken, async (req: Request, res: Response) => {
    try {
      const portId = parseInt(req.params.portId);
      const terminalData = insertTerminalSchema.parse({ 
        ...req.body, 
        portId,
        createdBy: req.user.id
      });

      // Check for duplicate terminal name
      const existingTerminalByName = await storage.getTerminalByName(terminalData.terminalName);
      if (existingTerminalByName) {
        return res.status(400).json({ message: "Duplicate Entry" });
      }

      // Check for duplicate short code
      const existingTerminalByCode = await storage.getTerminalByShortCode(terminalData.shortCode);
      if (existingTerminalByCode) {
        return res.status(400).json({ message: "Duplicate Entry" });
      }
      
      const terminal = await storage.createTerminal(terminalData);
      
      console.log("Terminal created with status:", terminal.status);
      console.log("Checking if status is 'Processing for activation':", terminal.status === "Processing for activation");
      
      // Create activation log entry for terminal creation
      await storage.createActivationLog({
        terminalId: terminal.id,
        action: "submitted",
        description: `Terminal "${terminal.terminalName}" (${terminal.shortCode}) was submitted for activation`,
        performedBy: req.user.id,
        data: JSON.stringify({
          terminalName: terminal.terminalName,
          shortCode: terminal.shortCode,
          currency: terminal.currency,
          timezone: terminal.timezone
        })
      });
      
      // Create notification for system admin only if status is "Processing for activation"
      if (terminal.status === "Processing for activation") {
        console.log("Creating notification for new terminal activation request");
        try {
          // Find all system admin users
          const systemAdminUsers = await storage.getUsersByRole("SystemAdmin");
          if (systemAdminUsers.length > 0) {
            // Create notifications for all SystemAdmin users
            const notificationPromises = systemAdminUsers.map((systemAdmin: any) => 
              storage.createNotification({
                userId: systemAdmin.id,
                type: "terminal_activation_request",
                title: "Terminal Activation Request",
                message: `New terminal "${terminal.terminalName}" (${terminal.shortCode}) has been submitted for activation review.`,
                data: JSON.stringify({
                  terminalId: terminal.id,
                  terminalName: terminal.terminalName,
                  shortCode: terminal.shortCode,
                  portId: terminal.portId,
                  createdBy: req.user.id,
                  action: "created"
                })
              })
            );
            
            await Promise.all(notificationPromises);
            console.log(`Notifications created successfully for ${systemAdminUsers.length} SystemAdmin users`);
          } else {
            console.log("No SystemAdmin users found for notification");
          }
        } catch (notificationError) {
          console.error("Failed to create notification:", notificationError);
          // Don't fail the terminal creation if notification fails
        }
      } else {
        console.log("No notification created for new terminal - status is:", terminal.status);
      }
      
      res.status(201).json(terminal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Create terminal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/terminals/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Terminal update request body:", JSON.stringify(req.body, null, 2));
      
      // Get existing terminal to check if it's activated
      const existingTerminal = await storage.getTerminalById(id);
      if (!existingTerminal) {
        return res.status(404).json({ message: "Terminal not found" });
      }
      
      // Check if terminal is activated
      const isActivated = existingTerminal.status === "Active";
      
      let updates;
      if (isActivated) {
        // For activated terminals, only allow basic field updates
        const allowedUpdates = {
          terminalName: req.body.terminalName,
          shortCode: req.body.shortCode,
          gst: req.body.gst,
          pan: req.body.pan,
          currency: req.body.currency,
          timezone: req.body.timezone,
          billingAddress: req.body.billingAddress,
          billingCity: req.body.billingCity,
          billingPinCode: req.body.billingPinCode,
          billingPhone: req.body.billingPhone,
          billingFax: req.body.billingFax,
          shippingAddress: req.body.shippingAddress,
          shippingCity: req.body.shippingCity,
          shippingPinCode: req.body.shippingPinCode,
          shippingPhone: req.body.shippingPhone,
          shippingFax: req.body.shippingFax,
          sameAsBilling: req.body.sameAsBilling,
        };
        // Remove undefined values
        updates = Object.fromEntries(Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined));
        console.log("Terminal is activated, only updating basic fields:", JSON.stringify(updates, null, 2));
      } else {
        // For non-activated terminals, allow all updates
        updates = updateTerminalSchema.parse(req.body);
        console.log("Terminal not activated, allowing all updates:", JSON.stringify(updates, null, 2));
      }
      
      const terminal = await storage.updateTerminal(id, updates);
      if (!terminal) {
        return res.status(404).json({ message: "Terminal not found" });
      }
      
      console.log("Terminal after update:", JSON.stringify(terminal, null, 2));
      console.log("Checking if status is 'Processing for activation':", updates.status === "Processing for activation");
      
      // Create activation log entry for terminal update
      const logDescription = isActivated 
        ? `Terminal "${terminal.terminalName}" (${terminal.shortCode}) basic details were updated (terminal already activated)`
        : `Terminal "${terminal.terminalName}" (${terminal.shortCode}) was updated${updates.status ? ` - Status: ${updates.status}` : ''}`;
      
      await storage.createActivationLog({
        terminalId: terminal.id,
        action: "updated",
        description: logDescription,
        performedBy: req.user.id,
        data: JSON.stringify(updates)
      });
      
      // Create notification for system admin only if status is "Processing for activation" and not already activated
      if (!isActivated && updates.status === "Processing for activation") {
        console.log("Creating notification for terminal activation request");
        try {
          // Find all system admin users
          const systemAdminUsers = await storage.getUsersByRole("SystemAdmin");
          if (systemAdminUsers.length > 0) {
            // Create notifications for all SystemAdmin users
            const notificationPromises = systemAdminUsers.map((systemAdmin: any) => 
              storage.createNotification({
                userId: systemAdmin.id,
                type: "terminal_activation_request",
                title: "Terminal Activation Request",
                message: `Terminal "${terminal.terminalName}" (${terminal.shortCode}) status has been updated to processing for activation review.`,
                data: JSON.stringify({
                  terminalId: terminal.id,
                  terminalName: terminal.terminalName,
                  shortCode: terminal.shortCode,
                  portId: terminal.portId,
                  updatedBy: req.user.id,
                  action: "updated"
                })
              })
            );
            
            await Promise.all(notificationPromises);
            console.log(`Notifications created successfully for ${systemAdminUsers.length} SystemAdmin users`);
          } else {
            console.log("No SystemAdmin users found for notification");
          }
        } catch (notificationError) {
          console.error("Failed to create notification:", notificationError);
          // Don't fail the terminal update if notification fails
        }
      } else {
        console.log("No notification created - status is:", updates.status);
      }
      
      res.json(terminal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Update terminal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/terminals/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTerminal(id);
      res.json({ message: "Terminal deleted successfully" });
    } catch (error) {
      console.error("Delete terminal error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notification routes
  app.get("/api/notifications", authenticateToken, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getNotificationsByUserId(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/notifications/unread-count", authenticateToken, async (req: Request, res: Response) => {
    try {
      const count = await storage.getUnreadNotificationsCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Get unread notifications count error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/notifications/:id/read", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/notifications/mark-all-read", authenticateToken, async (req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/notifications/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNotification(id);
      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/terminals/:id/status", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (req.user.role !== "SystemAdmin") {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const id = parseInt(req.params.id);
      const { status } = req.body;

      // Validate status
      if (!["Active", "Rejected", "Processing for activation", "Suspended"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const terminal = await storage.updateTerminalStatus(id, status);
      if (!terminal) {
        return res.status(404).json({ message: "Terminal not found" });
      }

      res.json(terminal);
    } catch (error) {
      console.error("Update terminal status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email verification endpoint for users (GET request like port admin)
  app.get("/api/auth/verify-user", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token required" });
      }
      
      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // Check if token is expired
      if (user.verificationTokenExpires && new Date() > user.verificationTokenExpires) {
        return res.status(400).json({ message: "Verification token has expired" });
      }
      
      // Check if already verified
      if (user.isVerified && user.isActive) {
        return res.json({ 
          message: "Email already verified and account is active. You can log in.",
          action: "login_required"
        });
      }
      
      // Generate password setup token
      const passwordSetupToken = randomUUID();
      const passwordSetupTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Update user - mark as verified and set password setup token
      await storage.updateUser(user.id, {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
        passwordSetupToken,
        passwordSetupTokenExpires
      } as any);
      
      // Log email verification for audit trail
      await AuditService.logUserVerification(
        user.id,
        user.id, // User verifies their own email
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({ 
        message: "Email verified successfully. Redirecting to password setup.",
        action: "setup_password",
        passwordSetupToken,
        userId: user.id,
        email: user.email,
        firstName: user.firstName
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Resend user verification email endpoint
  app.post("/api/users/:id/resend-verification", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only system admins can resend user verification emails
      if (req.user?.role !== "SystemAdmin") {
        return res.status(403).json({ message: "Access denied. Only System Administrators can resend verification emails." });
      }

      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.isActive) {
        return res.status(400).json({ message: "User is already active" });
      }
      
      // Generate new verification token
      const verificationToken = randomUUID();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.updateUser(user.id, {
        verificationToken,
        verificationTokenExpires
      } as any);
      
      // Log resend verification for audit trail
      await AuditService.logUserUpdate(
        user.id,
        req.user!.id, // Admin who resent the verification
        'Verification email resent',
        req.ip,
        req.get('User-Agent')
      );
      
      // Send verification email using port-specific configuration
      try {
        const { sendUserVerificationEmail } = await import("./emailService.js");
        await sendUserVerificationEmail(user.email, user.firstName, verificationToken, user.portId || undefined);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }
      
      res.json({ message: "Verification email sent successfully" });
    } catch (error) {
      console.error("Resend user verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Password setup endpoint
  app.post("/api/auth/setup-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = setupPasswordSchema.parse(req.body);
      
      // Find user by password setup token
      const user = await storage.getUserByPasswordSetupToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired password setup token" });
      }

      // Check if token is expired (with some grace period)
      if (user.passwordSetupTokenExpires && new Date() > new Date(user.passwordSetupTokenExpires.getTime() + 5 * 60 * 1000)) {
        return res.status(400).json({ message: "Password setup token has expired" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user - set password, activate account, clear setup token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        isActive: true,
        passwordSetupToken: null,
        passwordSetupTokenExpires: null
      } as any);

      // Log password setup for audit trail
      await AuditService.logPasswordSetup(
        user.id,
        user.id, // User sets up their own password
        req.ip,
        req.get('User-Agent')
      );

      res.json({ message: "Password set successfully. You can now log in to your account." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Password setup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Customer Management API Routes
  
  // Get all customers (for Marketing Manager)
  app.get("/api/customers", authenticateToken, async (req: Request, res: Response) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Get customer by ID
  app.get("/api/customers/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Get customer contracts
  app.get("/api/customers/:id/contracts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const contracts = await storage.getContractsByCustomerId(customerId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching customer contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Create new customer with validation
  app.post("/api/customers", authenticateToken, async (req: Request, res: Response) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const userId = req.user?.id;

      // Validation checks as per requirements
      const allCustomers = await storage.getAllCustomers();
      const existingCustomerName = allCustomers.find(c => c.customerName === validatedData.customerName);
      if (existingCustomerName) {
        return res.status(400).json({ message: "Customer name already exists" });
      }

      const existingPAN = await storage.getCustomerByPAN(validatedData.pan);
      if (existingPAN) {
        return res.status(400).json({ message: "PAN number already exists" });
      }

      const existingGST = await storage.getCustomerByGST(validatedData.gst);
      if (existingGST) {
        return res.status(400).json({ message: "GST number already exists" });
      }

      const existingCustomerEmail = await storage.getCustomerByEmail(validatedData.email);
      const existingUserEmail = await storage.getUserByEmail(validatedData.email);
      if (existingCustomerEmail || existingUserEmail) {
        return res.status(400).json({ 
          message: existingUserEmail ? "Email already exists as a registered user" : "Email already exists as a customer" 
        });
      }

      // Generate customer code
      const customerCode = await storage.generateCustomerCode(validatedData.terminalId);

      const customer = await storage.createCustomer({
        ...validatedData,
        customerCode,
        createdBy: userId,
      });

      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Update customer
  app.put("/api/customers/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      
      // Check if customer exists
      const existingCustomer = await storage.getCustomerById(id);
      if (!existingCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Validation checks - exclude current customer from uniqueness checks
      if (validatedData.customerName) {
        const allCustomers = await storage.getAllCustomers();
        const existingCustomerName = allCustomers.find(c => c.customerName === validatedData.customerName);
        if (existingCustomerName && existingCustomerName.id !== id) {
          return res.status(400).json({ message: "Customer name already exists" });
        }
      }

      if (validatedData.pan) {
        const existingPAN = await storage.getCustomerByPAN(validatedData.pan);
        if (existingPAN && existingPAN.id !== id) {
          return res.status(400).json({ message: "PAN number already exists" });
        }
      }

      if (validatedData.gst) {
        const existingGST = await storage.getCustomerByGST(validatedData.gst);
        if (existingGST && existingGST.id !== id) {
          return res.status(400).json({ message: "GST number already exists" });
        }
      }

      if (validatedData.email) {
        const existingCustomerEmail = await storage.getCustomerByEmail(validatedData.email);
        const existingUserEmail = await storage.getUserByEmail(validatedData.email);
        if ((existingCustomerEmail && existingCustomerEmail.id !== id) || existingUserEmail) {
          return res.status(400).json({ 
            message: existingUserEmail ? "Email already exists as a registered user" : "Email already exists as a customer" 
          });
        }
      }

      const customer = await storage.updateCustomer(id, validatedData);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // Update customer status (for contract creation workflow)
  app.patch("/api/customers/:id/status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const customer = await storage.updateCustomerStatus(id, status);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer status:", error);
      res.status(500).json({ message: "Failed to update customer status" });
    }
  });

  // Customer Contacts API
  app.get("/api/customers/:customerId/contacts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const contacts = await storage.getCustomerContactsByCustomerId(customerId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching customer contacts:", error);
      res.status(500).json({ message: "Failed to fetch customer contacts" });
    }
  });

  app.post("/api/customers/:customerId/contacts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const validatedData = insertCustomerContactSchema.parse({
        ...req.body,
        customerId
      });

      const contact = await storage.createCustomerContact(validatedData);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Error creating customer contact:", error);
      res.status(500).json({ message: "Failed to create customer contact" });
    }
  });

  // Customer Addresses API
  app.get("/api/customers/:customerId/addresses", authenticateToken, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const addresses = await storage.getCustomerAddressesByCustomerId(customerId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching customer addresses:", error);
      res.status(500).json({ message: "Failed to fetch customer addresses" });
    }
  });

  app.post("/api/customers/:customerId/addresses", authenticateToken, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const validatedData = insertCustomerAddressSchema.parse({
        ...req.body,
        customerId
      });

      const address = await storage.createCustomerAddress(validatedData);
      res.status(201).json(address);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Error creating customer address:", error);
      res.status(500).json({ message: "Failed to create customer address" });
    }
  });

  // Contract Management API
  app.get("/api/contracts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get("/api/customers/:customerId/contracts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const contracts = await storage.getContractsByCustomerId(customerId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching customer contracts:", error);
      res.status(500).json({ message: "Failed to fetch customer contracts" });
    }
  });

  app.post("/api/contracts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const validatedData = insertContractSchema.parse({
        ...req.body,
        createdBy: req.user?.id
      });

      const contract = await storage.createContract(validatedData);
      
      // Update customer status to "Customer TC" after contract creation
      await storage.updateCustomerStatus(validatedData.customerId, "Customer TC");

      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  // Contract details API endpoints (tariffs, cargo, storage, conditions)
  app.post("/api/contracts/:contractId/tariffs", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const validatedData = insertContractTariffSchema.parse({
        ...req.body,
        contractId
      });
      const tariff = await storage.createContractTariff(validatedData);
      res.status(201).json(tariff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating contract tariff:", error);
      res.status(500).json({ message: "Failed to create contract tariff" });
    }
  });

  app.post("/api/contracts/:contractId/cargo-details", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const validatedData = insertContractCargoDetailSchema.parse({
        ...req.body,
        contractId
      });
      const cargoDetail = await storage.createContractCargoDetail(validatedData);
      res.status(201).json(cargoDetail);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating contract cargo detail:", error);
      res.status(500).json({ message: "Failed to create contract cargo detail" });
    }
  });

  app.post("/api/contracts/:contractId/storage-charges", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const validatedData = insertContractStorageChargeSchema.parse({
        ...req.body,
        contractId
      });
      const storageCharge = await storage.createContractStorageCharge(validatedData);
      res.status(201).json(storageCharge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating contract storage charge:", error);
      res.status(500).json({ message: "Failed to create contract storage charge" });
    }
  });

  app.post("/api/contracts/:contractId/special-conditions", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const validatedData = insertContractSpecialConditionSchema.parse({
        ...req.body,
        contractId
      });
      const condition = await storage.createContractSpecialCondition(validatedData);
      res.status(201).json(condition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating contract special condition:", error);
      res.status(500).json({ message: "Failed to create contract special condition" });
    }
  });

  // Master Data API endpoints
  app.get("/api/countries", async (req: Request, res: Response) => {
    try {
      const countries = await storage.getAllCountries();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  app.get("/api/states", async (req: Request, res: Response) => {
    try {
      const states = await storage.getAllStates();
      res.json(states);
    } catch (error) {
      console.error("Error fetching states:", error);
      res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  app.get("/api/countries/:countryId/states", async (req: Request, res: Response) => {
    try {
      const countryId = parseInt(req.params.countryId);
      const states = await storage.getStatesByCountryId(countryId);
      res.json(states);
    } catch (error) {
      console.error("Error fetching states:", error);
      res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  app.get("/api/cargo-types", authenticateToken, async (req: Request, res: Response) => {
    try {
      const cargoTypes = await storage.getAllCargoTypes();
      res.json(cargoTypes);
    } catch (error) {
      console.error("Error fetching cargo types:", error);
      res.status(500).json({ message: "Failed to fetch cargo types" });
    }
  });

  app.get("/api/terminals/:terminalId/plots", authenticateToken, async (req: Request, res: Response) => {
    try {
      const terminalId = parseInt(req.params.terminalId);
      const plots = await storage.getPlotsByTerminalId(terminalId);
      res.json(plots);
    } catch (error) {
      console.error("Error fetching plots:", error);
      res.status(500).json({ message: "Failed to fetch plots" });
    }
  });

  // Contract management routes
  app.get("/api/contracts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get("/api/contracts/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContractById(id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.post("/api/contracts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const validatedData = insertContractSchema.parse(req.body);
      const userId = req.user?.id;

      const contractData = {
        ...validatedData,
        createdBy: userId || 'system',
        updatedBy: userId || 'system'
      };

      const contract = await storage.createContract(contractData);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.put("/api/contracts/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertContractSchema.partial().parse(req.body);
      const userId = req.user?.id;

      const updateData = {
        ...validatedData,
        updatedBy: userId || 'system'
      };

      const contract = await storage.updateContract(id, updateData);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContract(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Contract-specific data routes (linked by contract number)
  app.get("/api/contracts/:id/tariffs", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const tariffs = await storage.getContractTariffsByContractId(contractId);
      res.json(tariffs);
    } catch (error) {
      console.error("Error fetching contract tariffs:", error);
      res.status(500).json({ message: "Failed to fetch contract tariffs" });
    }
  });

  app.get("/api/contracts/:id/cargo", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const cargoDetails = await storage.getContractCargoDetailsByContractId(contractId);
      res.json(cargoDetails);
    } catch (error) {
      console.error("Error fetching contract cargo details:", error);
      res.status(500).json({ message: "Failed to fetch contract cargo details" });
    }
  });

  app.get("/api/contracts/:id/storage", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const storageCharges = await storage.getContractStorageChargesByContractId(contractId);
      res.json(storageCharges);
    } catch (error) {
      console.error("Error fetching contract storage charges:", error);
      res.status(500).json({ message: "Failed to fetch contract storage charges" });
    }
  });

  // Contract tariff management
  app.post("/api/contracts/:id/tariffs", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const validatedData = insertContractTariffSchema.parse({
        ...req.body,
        contractId
      });
      
      const tariff = await storage.createContractTariff(validatedData);
      res.status(201).json(tariff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating contract tariff:", error);
      res.status(500).json({ message: "Failed to create contract tariff" });
    }
  });

  // Contract cargo management
  app.post("/api/contracts/:id/cargo", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const validatedData = insertContractCargoDetailSchema.parse({
        ...req.body,
        contractId
      });
      
      const cargoDetail = await storage.createContractCargoDetail(validatedData);
      res.status(201).json(cargoDetail);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating contract cargo detail:", error);
      res.status(500).json({ message: "Failed to create contract cargo detail" });
    }
  });

  // Contract storage management
  app.post("/api/contracts/:id/storage", authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const validatedData = insertContractStorageChargeSchema.parse({
        ...req.body,
        contractId
      });
      
      const storageCharge = await storage.createContractStorageCharge(validatedData);
      res.status(201).json(storageCharge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating contract storage charge:", error);
      res.status(500).json({ message: "Failed to create contract storage charge" });
    }
  });

  // Dashboard Stats API
  app.get("/api/dashboard/stats", authenticateToken, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Database Backup API Routes
  app.get("/api/database/backups", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const backups = await storage.getDatabaseBackups();
      res.json(backups);
    } catch (error) {
      console.error("Error fetching database backups:", error);
      res.status(500).json({ message: "Failed to fetch database backups" });
    }
  });

  app.post("/api/database/backup", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const { description } = req.body;
      const backup = await storage.createDatabaseBackup(req.user.id, description);
      res.status(201).json(backup);
    } catch (error) {
      console.error("Error creating database backup:", error);
      res.status(500).json({ message: "Failed to create database backup" });
    }
  });

  // Cancel database backup
  app.post("/api/database/backup/:backupId/cancel", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const { backupId } = req.params;
      
      const result = await storage.cancelBackup(backupId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error cancelling backup:", error);
      res.status(500).json({ message: "Failed to cancel backup" });
    }
  });

  app.get("/api/database/backups/:id/download", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const backupId = req.params.id;
      const backupPath = await storage.getBackupPath(backupId);
      
      if (!backupPath) {
        return res.status(404).json({ message: "Backup file not found" });
      }

      res.download(backupPath);
    } catch (error) {
      console.error("Error downloading backup:", error);
      res.status(500).json({ message: "Failed to download backup" });
    }
  });

  app.delete("/api/database/backups/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const backupId = req.params.id;
      await storage.deleteDatabaseBackup(backupId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ message: "Failed to delete backup" });
    }
  });

  app.post("/api/database/restore/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      const backupId = req.params.id;
      const { createIfNotExists = false } = req.body;
      
      const result = await storage.restoreFromBackup(backupId, createIfNotExists);
      res.json(result);
    } catch (error) {
      console.error("Error restoring database:", error);
      res.status(500).json({ message: "Failed to restore database from backup" });
    }
  });

  // Upload and restore database backup
  app.post("/api/database/upload-restore", authenticateToken, upload.single('backupFile'), async (req: Request, res: Response) => {
    try {
      // Only allow System Admins
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ message: "Access denied. System Admin role required." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No backup file uploaded" });
      }

      const result = await storage.uploadAndRestoreBackup(
        req.file.buffer,
        req.file.originalname,
        req.user.id
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error uploading and restoring backup:", error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File too large. Maximum size is 100MB." });
        }
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to upload and restore backup" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

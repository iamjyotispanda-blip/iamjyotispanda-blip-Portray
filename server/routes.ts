import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertOrganizationSchema, insertPortSchema, insertPortAdminContactSchema, updatePortAdminContactSchema, insertEmailConfigurationSchema, updateEmailConfigurationSchema, insertTerminalSchema, updateTerminalSchema, insertNotificationSchema, insertMenuSchema, updateMenuSchema, type InsertUser } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
// Object storage imports removed - using fallback system
import { EmailService } from "./emailService";

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
  
  // Authentication middleware
  const authenticateToken = async (req: Request, res: Response, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    try {
      // Check for admin token first
      if (token.length > 30) { // Admin session tokens are longer
        const session = await storage.getSessionByToken(token);
        if (session && session.userId === "admin-001") {
          req.user = {
            id: "admin-001",
            email: "superadmin@Portray.com",
            firstName: "System",
            lastName: "Administrator",
            role: "SystemAdmin",
            isVerified: true,
            isActive: true
          };
          return next();
        }
      }

      const session = await storage.getSessionByToken(token);
      if (!session) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      req.user = { ...user, password: undefined }; // Remove password from user object
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      // Check for system admin credentials
      if (credentials.email === "superadmin@Portray.com" && credentials.password === "Csmpl@123") {
        const adminSession = await storage.createSession("admin-001", credentials.rememberMe || false);
        
        return res.json({
          user: {
            id: "admin-001",
            email: "superadmin@Portray.com",
            firstName: "System",
            lastName: "Administrator", 
            role: "SystemAdmin",
            isVerified: true,
            isActive: true
          },
          token: adminSession.token,
          expiresAt: adminSession.expiresAt,
          redirectPath: "/dashboard"
        });
      }
      
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
      const redirectPath = user.role === "PortAdmin" ? "/port-admin-dashboard" : 
                          user.role === "SystemAdmin" ? "/portal/welcome" : "/dashboard";
      
      res.json({
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
    res.json({ user: req.user });
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
      
      // Check if email already exists
      const existingContact = await storage.getPortAdminContactByEmail(contactData.email);
      if (existingContact) {
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
          
          const userData: InsertUser = {
            email: contact.email,
            password: "TEMP_PASSWORD_NEEDS_SETUP", // Temporary, user will set real password
            firstName,
            lastName,
            role: "PortAdmin",
          };
          
          user = await storage.createUser(userData);
        } else {
          // Update existing user details from contact information
          const [firstName, ...lastNameParts] = contact.contactName.split(' ');
          const lastName = lastNameParts.join(' ') || firstName;
          
          const updatedUser = await storage.updateUser(user.id, {
            firstName,
            lastName,
            role: "PortAdmin",
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

  // Menu Management endpoints
  app.get("/api/menus", authenticateToken, async (req: Request, res: Response) => {
    try {
      const menuType = req.query.type as string;
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      
      if (menuType) {
        const menus = await storage.getMenusByType(menuType as 'glink' | 'plink');
        res.json(menus);
      } else if (parentId !== undefined) {
        const menus = await storage.getMenusByParentId(parentId === 0 ? null : parentId);
        res.json(menus);
      } else {
        const menus = await storage.getAllMenus();
        res.json(menus);
      }
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
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }
      
      // Update each menu's sort order
      const updatePromises = updates.map(({ id, sortOrder }: { id: number; sortOrder: number }) => 
        storage.updateMenu(id, { sortOrder })
      );
      
      await Promise.all(updatePromises);
      
      res.json({ message: "Menu order updated successfully" });
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

  // Terminal routes
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
          await storage.createNotification({
            userId: "admin-001", // System admin user ID
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
          });
          console.log("Notification created successfully for new terminal");
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
          await storage.createNotification({
            userId: "admin-001", // System admin user ID
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
          });
          console.log("Notification created successfully");
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
      if (!["Active", "Rejected", "Processing for activation"].includes(status)) {
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

  const httpServer = createServer(app);
  return httpServer;
}

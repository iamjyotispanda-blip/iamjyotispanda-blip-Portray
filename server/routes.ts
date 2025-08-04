import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertOrganizationSchema, insertPortSchema, insertPortAdminContactSchema, updatePortAdminContactSchema, insertEmailConfigurationSchema, type InsertUser } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
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
      const redirectPath = user.role === "SystemAdmin" ? "/portal/welcome" : "/dashboard";
      
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

  // Object storage endpoints
  app.get("/objects/:objectPath(*)", async (req: Request, res: Response) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", authenticateToken, async (req: Request, res: Response) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.get("/public-objects/:filePath(*)", async (req: Request, res: Response) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
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
      
      // If contact is not yet verified, mark it as verified and create user
      if (!contact.isVerified) {
        const verifiedContact = await storage.markContactAsVerified(contact.id);
        if (verifiedContact) {
          console.log(`Contact ${contact.email} verified successfully - status updated to active`);
          
          // Check if user already exists for this contact
          const existingUser = await storage.getUserByEmail(contact.email);
          if (existingUser) {
            // User already exists, just link the contact
            await storage.linkContactToUser(contact.id, existingUser.id);
            res.json({ 
              message: "Email verified successfully",
              action: "login_required",
              contactId: verifiedContact.id, 
              email: verifiedContact.email,
              contactName: verifiedContact.contactName,
              status: verifiedContact.status
            });
          } else {
            // Create user account automatically
            const [firstName, ...lastNameParts] = contact.contactName.split(' ');
            const lastName = lastNameParts.join(' ') || firstName;
            
            const userData: InsertUser = {
              email: contact.email,
              password: "TEMP_PASSWORD_NEEDS_SETUP", // Temporary, user will set real password
              firstName,
              lastName,
              role: "PortAdmin",
              isActive: false, // Will be activated after password setup
            };
            
            const user = await storage.createUser(userData);
            await storage.linkContactToUser(contact.id, user.id);
            
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
          }
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
        message: "Password setup successful"
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

  const httpServer = createServer(app);
  return httpServer;
}

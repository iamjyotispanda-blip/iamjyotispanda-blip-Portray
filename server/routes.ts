import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertOrganizationSchema, insertPortSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

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

  const httpServer = createServer(app);
  return httpServer;
}

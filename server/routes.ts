import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema } from "@shared/schema";
import { z } from "zod";

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
      res.json({
        user: userWithoutPassword,
        token: session.token,
        expiresAt: session.expiresAt,
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

  const httpServer = createServer(app);
  return httpServer;
}

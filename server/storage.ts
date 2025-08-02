import { type User, type InsertUser, type Session, type LoginCredentials, type Organization, type InsertOrganization, type Port, type InsertPort } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  
  // Authentication operations
  validateUserCredentials(email: string, password: string): Promise<User | null>;
  
  // Session operations
  createSession(userId: string, rememberMe?: boolean): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;

  // Organization operations
  getAllOrganizations(): Promise<Organization[]>;
  getOrganizationById(id: number): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization | undefined>;
  toggleOrganizationStatus(id: number): Promise<Organization | undefined>;

  // Port operations
  getPortsByOrganizationId(organizationId: number): Promise<Port[]>;
  createPort(port: InsertPort): Promise<Port>;
  updatePort(id: number, updates: Partial<Port>): Promise<Port | undefined>;
  deletePort(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private organizations: Map<number, Organization>;
  private ports: Map<number, Port>;
  private nextOrgId: number = 1;
  private nextPortId: number = 1;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.organizations = new Map();
    this.ports = new Map();
    
    // Create a default admin user for testing
    this.initializeDefaultUser();
    this.initializeDefaultData();
  }

  private async initializeDefaultUser() {
    const hashedPassword = await bcrypt.hash("Csmpl@123", 10);
    const adminUser: User = {
      id: "admin-001",
      email: "superadmin@Portray.com",
      password: hashedPassword,
      firstName: "System",
      lastName: "Administrator",
      role: "SystemAdmin",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
  }

  private initializeDefaultData() {
    // Create JSW Infrastructure organization
    const jswOrg: Organization = {
      id: 1,
      organizationName: "JSW Infrastructure Limited",
      displayName: "JSW Infrastructure",
      organizationCode: "JSW-INFRA-001",
      registerOffice: "JSW Centre, Bandra Kurla Complex, Bandra (East), Mumbai - 400051",
      country: "India",
      telephone: "+91-22-4286-1000",
      fax: "+91-22-4286-3000",
      website: "https://www.jsw.in",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.set(1, jswOrg);

    // Create JSW Paradeep Port
    const paradeepPort: Port = {
      id: 1,
      portName: "JSW Paradeep Port",
      portCode: "JSW-PARADEEP",
      organizationId: 1,
      location: "Paradeep, Odisha",
      country: "India",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ports.set(1, paradeepPort);

    // Create JSW Dharamtar Port
    const dharamtarPort: Port = {
      id: 2,
      portName: "JSW Dharamtar Port",
      portCode: "JSW-DHARAMTAR",
      organizationId: 1,
      location: "Dharamtar, Maharashtra",
      country: "India",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ports.set(2, dharamtarPort);

    this.nextOrgId = 2;
    this.nextPortId = 3;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      this.users.set(id, user);
    }
  }

  async validateUserCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    return isPasswordValid ? user : null;
  }

  async createSession(userId: string, rememberMe = false): Promise<Session> {
    const id = randomUUID();
    const token = randomUUID();
    const expiresAt = new Date();
    
    // Set expiration: 24 hours for regular, 30 days for remember me
    expiresAt.setTime(expiresAt.getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000));

    const session: Session = {
      id,
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
    };

    this.sessions.set(token, session);
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const session = this.sessions.get(token);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    
    // Clean up expired session
    if (session) {
      this.sessions.delete(token);
    }
    
    return undefined;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
  }

  // Organization methods
  async getAllOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async createOrganization(insertOrganization: InsertOrganization): Promise<Organization> {
    const id = this.nextOrgId++;
    const organization: Organization = {
      ...insertOrganization,
      id,
      isActive: insertOrganization.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizations.set(id, organization);
    return organization;
  }

  async updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization | undefined> {
    const organization = this.organizations.get(id);
    if (!organization) return undefined;

    const updatedOrganization: Organization = {
      ...organization,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.organizations.set(id, updatedOrganization);
    return updatedOrganization;
  }

  async toggleOrganizationStatus(id: number): Promise<Organization | undefined> {
    const organization = this.organizations.get(id);
    if (!organization) return undefined;

    const updatedOrganization: Organization = {
      ...organization,
      isActive: !organization.isActive,
      updatedAt: new Date(),
    };
    this.organizations.set(id, updatedOrganization);
    return updatedOrganization;
  }

  // Port methods
  async getPortsByOrganizationId(organizationId: number): Promise<Port[]> {
    return Array.from(this.ports.values()).filter(
      (port) => port.organizationId === organizationId
    );
  }

  async createPort(insertPort: InsertPort): Promise<Port> {
    const id = this.nextPortId++;
    const port: Port = {
      ...insertPort,
      id,
      isActive: insertPort.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ports.set(id, port);
    return port;
  }

  async updatePort(id: number, updates: Partial<Port>): Promise<Port | undefined> {
    const port = this.ports.get(id);
    if (!port) return undefined;

    const updatedPort: Port = {
      ...port,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.ports.set(id, updatedPort);
    return updatedPort;
  }

  async deletePort(id: number): Promise<void> {
    this.ports.delete(id);
  }
}

export const storage = new MemStorage();

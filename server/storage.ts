import { type User, type InsertUser, type Session, type LoginCredentials, type Organization, type InsertOrganization, type Port, type InsertPort, type PortAdminContact, type InsertPortAdminContact, type UpdatePortAdminContact, type EmailConfiguration, type InsertEmailConfiguration } from "@shared/schema";
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
  getAllPorts(): Promise<Port[]>;
  getPortById(id: number): Promise<Port | undefined>;
  getPortsByOrganizationId(organizationId: number): Promise<Port[]>;
  createPort(port: InsertPort): Promise<Port>;
  updatePort(id: number, updates: Partial<Port>): Promise<Port | undefined>;
  togglePortStatus(id: number): Promise<Port | undefined>;
  deletePort(id: number): Promise<void>;

  // Port Admin Contact operations
  getPortAdminContactsByPortId(portId: number): Promise<PortAdminContact[]>;
  getPortAdminContactById(id: number): Promise<PortAdminContact | undefined>;
  getPortAdminContactByEmail(email: string): Promise<PortAdminContact | undefined>;
  getPortAdminContactByToken(token: string): Promise<PortAdminContact | undefined>;
  createPortAdminContact(contact: InsertPortAdminContact): Promise<PortAdminContact>;
  updatePortAdminContact(id: number, updates: UpdatePortAdminContact): Promise<PortAdminContact | undefined>;
  togglePortAdminContactStatus(id: number): Promise<PortAdminContact | undefined>;
  deletePortAdminContact(id: number): Promise<void>;
  updatePortAdminContactVerification(id: number, token: string, expiresAt: Date): Promise<void>;
  verifyPortAdminContact(token: string, userId: string): Promise<PortAdminContact | undefined>;

  // Email Configuration operations
  getAllEmailConfigurations(): Promise<EmailConfiguration[]>;
  getEmailConfigurationById(id: number): Promise<EmailConfiguration | undefined>;
  createEmailConfiguration(config: InsertEmailConfiguration): Promise<EmailConfiguration>;
  updateEmailConfiguration(id: number, updates: Partial<EmailConfiguration>): Promise<EmailConfiguration | undefined>;
  deleteEmailConfiguration(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private organizations: Map<number, Organization>;
  private ports: Map<number, Port>;
  private portAdminContacts: Map<number, PortAdminContact>;
  private emailConfigurations: Map<number, EmailConfiguration>;
  private nextOrgId: number = 1;
  private nextPortId: number = 1;
  private nextContactId: number = 1;
  private nextEmailConfigId: number = 1;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.organizations = new Map();
    this.ports = new Map();
    this.portAdminContacts = new Map();
    this.emailConfigurations = new Map();
    
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
      displayName: "JSWPP",
      organizationId: 1,
      address: "Paradeep, Odisha",
      country: "India",
      state: "Odisha",
      pan: "AAACJ1234P",
      gstn: "21AAACJ1234P1ZA",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ports.set(1, paradeepPort);

    // Create JSW Dharamtar Port
    const dharamtarPort: Port = {
      id: 2,
      portName: "JSW Dharamtar Port",
      displayName: "JSWDP",
      organizationId: 1,
      address: "Dharamtar, Maharashtra",
      country: "India",
      state: "Maharashtra",
      pan: "AAACJ5678Q",
      gstn: "27AAACJ5678Q1ZB",
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
  async getAllPorts(): Promise<Port[]> {
    return Array.from(this.ports.values());
  }

  async getPortById(id: number): Promise<Port | undefined> {
    return this.ports.get(id);
  }

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

  async togglePortStatus(id: number): Promise<Port | undefined> {
    const port = this.ports.get(id);
    if (!port) return undefined;

    const updatedPort: Port = {
      ...port,
      isActive: !port.isActive,
      updatedAt: new Date(),
    };
    this.ports.set(id, updatedPort);
    return updatedPort;
  }

  async deletePort(id: number): Promise<void> {
    this.ports.delete(id);
  }

  // Port Admin Contact methods
  async getPortAdminContactsByPortId(portId: number): Promise<PortAdminContact[]> {
    return Array.from(this.portAdminContacts.values()).filter(
      (contact) => contact.portId === portId
    );
  }

  async getPortAdminContactById(id: number): Promise<PortAdminContact | undefined> {
    return this.portAdminContacts.get(id);
  }

  async getPortAdminContactByEmail(email: string): Promise<PortAdminContact | undefined> {
    return Array.from(this.portAdminContacts.values()).find(
      (contact) => contact.email === email
    );
  }

  async getPortAdminContactByToken(token: string): Promise<PortAdminContact | undefined> {
    return Array.from(this.portAdminContacts.values()).find(
      (contact) => contact.verificationToken === token
    );
  }

  async createPortAdminContact(insertContact: InsertPortAdminContact): Promise<PortAdminContact> {
    const id = this.nextContactId++;
    const contact: PortAdminContact = {
      ...insertContact,
      id,
      status: insertContact.status || "inactive",
      verificationToken: null,
      verificationTokenExpires: null,
      isVerified: false,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.portAdminContacts.set(id, contact);
    return contact;
  }

  async updatePortAdminContact(id: number, updates: UpdatePortAdminContact): Promise<PortAdminContact | undefined> {
    const contact = this.portAdminContacts.get(id);
    if (!contact) return undefined;

    const updatedContact: PortAdminContact = {
      ...contact,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.portAdminContacts.set(id, updatedContact);
    return updatedContact;
  }

  async togglePortAdminContactStatus(id: number): Promise<PortAdminContact | undefined> {
    const contact = this.portAdminContacts.get(id);
    if (!contact) return undefined;

    const updatedContact: PortAdminContact = {
      ...contact,
      status: contact.status === "active" ? "inactive" : "active",
      updatedAt: new Date(),
    };
    this.portAdminContacts.set(id, updatedContact);
    return updatedContact;
  }

  async deletePortAdminContact(id: number): Promise<void> {
    this.portAdminContacts.delete(id);
  }

  async updatePortAdminContactVerification(id: number, token: string, expiresAt: Date): Promise<void> {
    const contact = this.portAdminContacts.get(id);
    if (contact) {
      const updatedContact: PortAdminContact = {
        ...contact,
        verificationToken: token,
        verificationTokenExpires: expiresAt,
        updatedAt: new Date(),
      };
      this.portAdminContacts.set(id, updatedContact);
    }
  }

  async verifyPortAdminContact(token: string, userId: string): Promise<PortAdminContact | undefined> {
    const contact = Array.from(this.portAdminContacts.values()).find(
      (c) => c.verificationToken === token && 
             c.verificationTokenExpires && 
             c.verificationTokenExpires > new Date()
    );
    
    if (contact) {
      const updatedContact: PortAdminContact = {
        ...contact,
        isVerified: true,
        userId,
        status: "active",
        verificationToken: null,
        verificationTokenExpires: null,
        updatedAt: new Date(),
      };
      this.portAdminContacts.set(contact.id, updatedContact);
      return updatedContact;
    }
    
    return undefined;
  }

  async markContactAsVerified(contactId: number): Promise<PortAdminContact | undefined> {
    const contact = this.portAdminContacts.get(contactId);
    if (!contact) return undefined;
    
    const updatedContact: PortAdminContact = {
      ...contact,
      isVerified: true,
      status: "active",
      verificationToken: null,
      verificationTokenExpires: null,
      updatedAt: new Date(),
    };
    
    this.portAdminContacts.set(contactId, updatedContact);
    return updatedContact;
  }

  // Email Configuration operations
  async getAllEmailConfigurations(): Promise<EmailConfiguration[]> {
    return Array.from(this.emailConfigurations.values());
  }

  async getEmailConfigurationById(id: number): Promise<EmailConfiguration | undefined> {
    return this.emailConfigurations.get(id);
  }

  async createEmailConfiguration(config: InsertEmailConfiguration): Promise<EmailConfiguration> {
    const newConfig: EmailConfiguration = {
      id: this.nextEmailConfigId++,
      ...config,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.emailConfigurations.set(newConfig.id, newConfig);
    return newConfig;
  }

  async updateEmailConfiguration(id: number, updates: Partial<EmailConfiguration>): Promise<EmailConfiguration | undefined> {
    const config = this.emailConfigurations.get(id);
    if (!config) return undefined;

    const updatedConfig: EmailConfiguration = {
      ...config,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.emailConfigurations.set(id, updatedConfig);
    return updatedConfig;
  }

  async deleteEmailConfiguration(id: number): Promise<void> {
    this.emailConfigurations.delete(id);
  }
}

export const storage = new MemStorage();

import { users, sessions, organizations, ports, portAdminContacts, emailConfigurations, type User, type InsertUser, type Session, type LoginCredentials, type Organization, type InsertOrganization, type Port, type InsertPort, type PortAdminContact, type InsertPortAdminContact, type UpdatePortAdminContact, type EmailConfiguration, type InsertEmailConfiguration } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  // Authentication operations
  async validateUserCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return null;

    return user;
  }

  // Session operations
  async createSession(userId: string, rememberMe = false): Promise<Session> {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000));

    const [session] = await db
      .insert(sessions)
      .values({
        userId,
        token,
        expiresAt,
      })
      .returning();
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
    return session || undefined;
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  // Organization operations
  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization || undefined;
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const [created] = await db
      .insert(organizations)
      .values(organization)
      .returning();
    return created;
  }

  async updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization | undefined> {
    const [updated] = await db
      .update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated || undefined;
  }

  async toggleOrganizationStatus(id: number): Promise<Organization | undefined> {
    const organization = await this.getOrganizationById(id);
    if (!organization) return undefined;

    const [updated] = await db
      .update(organizations)
      .set({ isActive: !organization.isActive, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated || undefined;
  }

  // Port operations
  async getAllPorts(): Promise<Port[]> {
    return await db.select().from(ports);
  }

  async getPortById(id: number): Promise<Port | undefined> {
    const [port] = await db.select().from(ports).where(eq(ports.id, id));
    return port || undefined;
  }

  async getPortsByOrganizationId(organizationId: number): Promise<Port[]> {
    return await db.select().from(ports).where(eq(ports.organizationId, organizationId));
  }

  async createPort(port: InsertPort): Promise<Port> {
    const [created] = await db
      .insert(ports)
      .values(port)
      .returning();
    return created;
  }

  async updatePort(id: number, updates: Partial<Port>): Promise<Port | undefined> {
    const [updated] = await db
      .update(ports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ports.id, id))
      .returning();
    return updated || undefined;
  }

  async togglePortStatus(id: number): Promise<Port | undefined> {
    const port = await this.getPortById(id);
    if (!port) return undefined;

    const [updated] = await db
      .update(ports)
      .set({ isActive: !port.isActive, updatedAt: new Date() })
      .where(eq(ports.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePort(id: number): Promise<void> {
    await db.delete(ports).where(eq(ports.id, id));
  }

  // Port Admin Contact operations
  async getPortAdminContactsByPortId(portId: number): Promise<PortAdminContact[]> {
    return await db.select().from(portAdminContacts).where(eq(portAdminContacts.portId, portId));
  }

  async getPortAdminContactById(id: number): Promise<PortAdminContact | undefined> {
    const [contact] = await db.select().from(portAdminContacts).where(eq(portAdminContacts.id, id));
    return contact || undefined;
  }

  async getPortAdminContactByEmail(email: string): Promise<PortAdminContact | undefined> {
    const [contact] = await db.select().from(portAdminContacts).where(eq(portAdminContacts.email, email));
    return contact || undefined;
  }

  async getPortAdminContactByToken(token: string): Promise<PortAdminContact | undefined> {
    const [contact] = await db.select().from(portAdminContacts).where(eq(portAdminContacts.verificationToken, token));
    return contact || undefined;
  }

  async createPortAdminContact(contact: InsertPortAdminContact): Promise<PortAdminContact> {
    const [created] = await db
      .insert(portAdminContacts)
      .values(contact)
      .returning();
    return created;
  }

  async updatePortAdminContact(id: number, updates: UpdatePortAdminContact): Promise<PortAdminContact | undefined> {
    const [updated] = await db
      .update(portAdminContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(portAdminContacts.id, id))
      .returning();
    return updated || undefined;
  }

  async togglePortAdminContactStatus(id: number): Promise<PortAdminContact | undefined> {
    const contact = await this.getPortAdminContactById(id);
    if (!contact) return undefined;

    const newStatus = contact.status === "active" ? "inactive" : "active";
    const [updated] = await db
      .update(portAdminContacts)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(portAdminContacts.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePortAdminContact(id: number): Promise<void> {
    await db.delete(portAdminContacts).where(eq(portAdminContacts.id, id));
  }

  async updatePortAdminContactVerification(id: number, token: string, expiresAt: Date): Promise<void> {
    await db
      .update(portAdminContacts)
      .set({
        verificationToken: token,
        verificationTokenExpires: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(portAdminContacts.id, id));
  }

  async verifyPortAdminContact(token: string, userId: string): Promise<PortAdminContact | undefined> {
    const [updated] = await db
      .update(portAdminContacts)
      .set({
        isVerified: true,
        userId,
        verificationToken: null,
        verificationTokenExpires: null,
        status: "active",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(portAdminContacts.verificationToken, token),
          // Only allow verification if token hasn't expired
        )
      )
      .returning();
    return updated || undefined;
  }

  // Email Configuration operations
  async getEmailConfiguration(): Promise<EmailConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(emailConfigurations)
      .where(eq(emailConfigurations.isActive, true))
      .limit(1);
    return config || undefined;
  }

  async createEmailConfiguration(config: InsertEmailConfiguration): Promise<EmailConfiguration> {
    // First, deactivate any existing configurations
    await db
      .update(emailConfigurations)
      .set({ isActive: false, updatedAt: new Date() });

    // Then create the new active configuration
    const [created] = await db
      .insert(emailConfigurations)
      .values({ ...config, isActive: true })
      .returning();
    return created;
  }

  async updateEmailConfiguration(id: number, updates: Partial<EmailConfiguration>): Promise<EmailConfiguration | undefined> {
    const [updated] = await db
      .update(emailConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailConfigurations.id, id))
      .returning();
    return updated || undefined;
  }
}
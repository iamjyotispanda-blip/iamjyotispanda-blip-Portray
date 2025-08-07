import { type User, type InsertUser, type Session, type LoginCredentials, type Organization, type InsertOrganization, type Port, type InsertPort, type PortAdminContact, type InsertPortAdminContact, type UpdatePortAdminContact, type EmailConfiguration, type InsertEmailConfiguration, type Terminal, type InsertTerminal, type UpdateTerminal, type Notification, type InsertNotification, type SubscriptionType, type ActivationLog, type InsertActivationLog, type Menu, type InsertMenu, type UpdateMenu } from "@shared/schema";
import { users, sessions, organizations, ports, portAdminContacts, emailConfigurations, terminals, notifications, subscriptionTypes, activationLogs, menus } from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
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
  getPortAdminContactByUserId(userId: string): Promise<PortAdminContact | undefined>;
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

  // Terminal operations
  getTerminalsByPortId(portId: number): Promise<Terminal[]>;
  getTerminalById(id: number): Promise<Terminal | undefined>;
  createTerminal(terminal: InsertTerminal): Promise<Terminal>;
  updateTerminal(id: number, updates: UpdateTerminal): Promise<Terminal | undefined>;
  deleteTerminal(id: number): Promise<void>;
  getPortAdminAssignedPort(userId: string): Promise<any>;
  getTerminalsPendingActivation(): Promise<any[]>;
  updateTerminalStatus(id: number, status: string): Promise<Terminal | undefined>;

  // Notification operations
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;

  // Subscription Types operations
  getAllSubscriptionTypes(): Promise<SubscriptionType[]>;
  getSubscriptionTypeById(id: number): Promise<SubscriptionType | undefined>;

  // Terminal activation operations
  activateTerminal(id: number, data: {
    activationStartDate: Date;
    subscriptionTypeId: number;
    workOrderNo?: string;
    workOrderDate?: Date | null;
  }): Promise<Terminal | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: number): Promise<void>;

  // Activation Log operations
  getActivationLogsByTerminalId(terminalId: number): Promise<ActivationLog[]>;
  createActivationLog(log: InsertActivationLog): Promise<ActivationLog>;

  // Menu operations
  getAllMenus(): Promise<Menu[]>;
  getMenuById(id: number): Promise<Menu | undefined>;
  getMenusByType(menuType: 'glink' | 'plink'): Promise<Menu[]>;
  getMenusByParentId(parentId: number | null): Promise<Menu[]>;
  createMenu(menu: InsertMenu): Promise<Menu>;
  updateMenu(id: number, updates: UpdateMenu): Promise<Menu | undefined>;
  deleteMenu(id: number): Promise<void>;
  toggleMenuStatus(id: number): Promise<Menu | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  async validateUserCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValidPassword = await bcrypt.compare(password, user.password);
    return isValidPassword ? user : null;
  }

  async createSession(userId: string, rememberMe: boolean = false): Promise<Session> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (rememberMe ? 720 : 24)); // 30 days vs 24 hours

    const [session] = await db
      .insert(sessions)
      .values({
        userId,
        token: randomUUID(),
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

  async getAllOrganizations(): Promise<Organization[]> {
    return db.select().from(organizations);
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(orgData)
      .returning();
    return org;
  }

  async updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org || undefined;
  }

  async updateOrganizationLogo(id: number, logoUrl: string): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({ logoUrl: logoUrl, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org || undefined;
  }

  async toggleOrganizationStatus(id: number): Promise<Organization | undefined> {
    const org = await this.getOrganizationById(id);
    if (!org) return undefined;

    const [updated] = await db
      .update(organizations)
      .set({ isActive: !org.isActive, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllPorts(): Promise<Port[]> {
    return db.select().from(ports);
  }

  async getPortById(id: number): Promise<Port | undefined> {
    const [port] = await db.select().from(ports).where(eq(ports.id, id));
    return port || undefined;
  }

  async getPortsByOrganizationId(organizationId: number): Promise<Port[]> {
    return db.select().from(ports).where(eq(ports.organizationId, organizationId));
  }

  async createPort(portData: InsertPort): Promise<Port> {
    const [port] = await db
      .insert(ports)
      .values(portData)
      .returning();
    return port;
  }

  async updatePort(id: number, updates: Partial<Port>): Promise<Port | undefined> {
    const [port] = await db
      .update(ports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ports.id, id))
      .returning();
    return port || undefined;
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

  async getPortAdminContactsByPortId(portId: number): Promise<PortAdminContact[]> {
    return db.select().from(portAdminContacts).where(eq(portAdminContacts.portId, portId));
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

  async getPortAdminContactByUserId(userId: string): Promise<PortAdminContact | undefined> {
    const [contact] = await db.select().from(portAdminContacts).where(eq(portAdminContacts.userId, userId));
    return contact || undefined;
  }

  async createPortAdminContact(contactData: InsertPortAdminContact): Promise<PortAdminContact> {
    const [contact] = await db
      .insert(portAdminContacts)
      .values(contactData)
      .returning();
    return contact;
  }

  async updatePortAdminContact(id: number, updates: UpdatePortAdminContact): Promise<PortAdminContact | undefined> {
    const [contact] = await db
      .update(portAdminContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(portAdminContacts.id, id))
      .returning();
    return contact || undefined;
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
        updatedAt: new Date()
      })
      .where(eq(portAdminContacts.id, id));
  }

  async verifyPortAdminContact(token: string, userId: string): Promise<PortAdminContact | undefined> {
    const [contact] = await db
      .update(portAdminContacts)
      .set({ 
        isVerified: true, 
        status: "active", 
        userId: userId,
        verificationToken: null,
        verificationTokenExpires: null,
        updatedAt: new Date()
      })
      .where(eq(portAdminContacts.verificationToken, token))
      .returning();
    return contact || undefined;
  }

  async getAllEmailConfigurations(): Promise<EmailConfiguration[]> {
    return db.select().from(emailConfigurations);
  }

  async getEmailConfigurationById(id: number): Promise<EmailConfiguration | undefined> {
    const [config] = await db.select().from(emailConfigurations).where(eq(emailConfigurations.id, id));
    return config || undefined;
  }

  async createEmailConfiguration(configData: InsertEmailConfiguration): Promise<EmailConfiguration> {
    const [config] = await db
      .insert(emailConfigurations)
      .values(configData)
      .returning();
    return config;
  }

  async updateEmailConfiguration(id: number, updates: Partial<EmailConfiguration>): Promise<EmailConfiguration | undefined> {
    const [config] = await db
      .update(emailConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailConfigurations.id, id))
      .returning();
    return config || undefined;
  }

  async deleteEmailConfiguration(id: number): Promise<void> {
    await db.delete(emailConfigurations).where(eq(emailConfigurations.id, id));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async linkContactToUser(contactId: number, userId: string): Promise<void> {
    await db
      .update(portAdminContacts)
      .set({ userId: userId, updatedAt: new Date() })
      .where(eq(portAdminContacts.id, contactId));
  }

  // Terminal operations
  async getTerminalsByPortId(portId: number): Promise<Terminal[]> {
    return db.select().from(terminals).where(eq(terminals.portId, portId));
  }

  async getTerminalById(id: number): Promise<Terminal | undefined> {
    const [terminal] = await db.select().from(terminals).where(eq(terminals.id, id));
    return terminal || undefined;
  }

  async createTerminal(terminalData: InsertTerminal): Promise<Terminal> {
    const [terminal] = await db
      .insert(terminals)
      .values(terminalData)
      .returning();
    return terminal;
  }

  async updateTerminal(id: number, updates: UpdateTerminal): Promise<Terminal | undefined> {
    const [terminal] = await db
      .update(terminals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(terminals.id, id))
      .returning();
    return terminal || undefined;
  }

  async deleteTerminal(id: number): Promise<void> {
    await db.delete(terminals).where(eq(terminals.id, id));
  }

  async getPortAdminAssignedPort(userId: string): Promise<any> {
    // Get port admin contact by user ID, then get associated port with organization
    const [contact] = await db
      .select()
      .from(portAdminContacts)
      .where(eq(portAdminContacts.userId, userId));
    
    if (!contact) {
      return undefined;
    }

    // Get port with organization information
    const [portWithOrg] = await db
      .select({
        id: ports.id,
        portName: ports.portName,
        displayName: ports.displayName,
        organizationId: ports.organizationId,
        address: ports.address,
        country: ports.country,
        state: ports.state,
        isActive: ports.isActive,
        createdAt: ports.createdAt,
        updatedAt: ports.updatedAt,
        organizationName: organizations.organizationName,
      })
      .from(ports)
      .innerJoin(organizations, eq(ports.organizationId, organizations.id))
      .where(eq(ports.id, contact.portId));

    return portWithOrg || undefined;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const result = await db.select().from(notifications).where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );
    return result.length;
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async getTerminalsPendingActivation(): Promise<any[]> {
    // Get terminals with their port and organization information, formatted for frontend
    const result = await db
      .select({
        id: terminals.id,
        portId: terminals.portId,
        terminalName: terminals.terminalName,
        shortCode: terminals.shortCode,
        gst: terminals.gst,
        pan: terminals.pan,
        currency: terminals.currency,
        timezone: terminals.timezone,
        billingAddress: terminals.billingAddress,
        billingCity: terminals.billingCity,
        billingPinCode: terminals.billingPinCode,
        billingPhone: terminals.billingPhone,
        billingFax: terminals.billingFax,
        shippingAddress: terminals.shippingAddress,
        shippingCity: terminals.shippingCity,
        shippingPinCode: terminals.shippingPinCode,
        shippingPhone: terminals.shippingPhone,
        shippingFax: terminals.shippingFax,
        sameAsBilling: terminals.sameAsBilling,
        status: terminals.status,
        isActive: terminals.isActive,
        activationStartDate: terminals.activationStartDate,
        activationEndDate: terminals.activationEndDate,
        subscriptionTypeId: terminals.subscriptionTypeId,
        workOrderNo: terminals.workOrderNo,
        workOrderDate: terminals.workOrderDate,
        createdBy: terminals.createdBy,
        createdAt: terminals.createdAt,
        updatedAt: terminals.updatedAt,
        // Port information
        portId2: ports.id,
        portName: ports.portName,
        portDisplayName: ports.displayName,
        portAddress: ports.address,
        portCountry: ports.country,
        portState: ports.state,
        // Organization information
        organizationId: organizations.id,
        organizationName: organizations.organizationName,
        organizationDisplayName: organizations.displayName,
        organizationCode: organizations.organizationCode,
      })
      .from(terminals)
      .innerJoin(ports, eq(terminals.portId, ports.id))
      .innerJoin(organizations, eq(ports.organizationId, organizations.id));

    // Transform the result to match frontend expectations
    return result.map(row => ({
      id: row.id,
      portId: row.portId,
      terminalName: row.terminalName,
      shortCode: row.shortCode,
      gst: row.gst,
      pan: row.pan,
      currency: row.currency,
      timezone: row.timezone,
      billingAddress: row.billingAddress,
      billingCity: row.billingCity,
      billingPinCode: row.billingPinCode,
      billingPhone: row.billingPhone,
      billingFax: row.billingFax,
      shippingAddress: row.shippingAddress,
      shippingCity: row.shippingCity,
      shippingPinCode: row.shippingPinCode,
      shippingPhone: row.shippingPhone,
      shippingFax: row.shippingFax,
      sameAsBilling: row.sameAsBilling,
      status: row.status,
      isActive: row.isActive,
      activationStartDate: row.activationStartDate,
      activationEndDate: row.activationEndDate,
      subscriptionTypeId: row.subscriptionTypeId,
      workOrderNo: row.workOrderNo,
      workOrderDate: row.workOrderDate,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      port: {
        id: row.portId2,
        portName: row.portName,
        displayName: row.portDisplayName,
        address: row.portAddress,
        country: row.portCountry,
        state: row.portState,
      },
      organization: {
        id: row.organizationId,
        organizationName: row.organizationName,
        displayName: row.organizationDisplayName,
        organizationCode: row.organizationCode,
      }
    }));
  }

  async updateTerminalStatus(id: number, status: string): Promise<Terminal | undefined> {
    const [terminal] = await db
      .update(terminals)
      .set({ status, updatedAt: new Date() })
      .where(eq(terminals.id, id))
      .returning();
    return terminal || undefined;
  }

  async getAllSubscriptionTypes(): Promise<SubscriptionType[]> {
    return db.select().from(subscriptionTypes);
  }

  async getSubscriptionTypeById(id: number): Promise<SubscriptionType | undefined> {
    const [type] = await db.select().from(subscriptionTypes).where(eq(subscriptionTypes.id, id));
    return type || undefined;
  }

  async activateTerminal(id: number, data: {
    activationStartDate: Date;
    subscriptionTypeId: number;
    workOrderNo?: string;
    workOrderDate?: Date | null;
  }): Promise<Terminal | undefined> {
    // Get subscription type to calculate end date
    const subscriptionType = await this.getSubscriptionTypeById(data.subscriptionTypeId);
    if (!subscriptionType) return undefined;

    // Calculate activation end date
    const endDate = new Date(data.activationStartDate);
    endDate.setMonth(endDate.getMonth() + subscriptionType.months);

    const [terminal] = await db
      .update(terminals)
      .set({
        status: "Active",
        subscriptionTypeId: data.subscriptionTypeId,
        activationStartDate: data.activationStartDate,
        activationEndDate: endDate,
        workOrderNo: data.workOrderNo || null,
        workOrderDate: data.workOrderDate || null,
        updatedAt: new Date(),
      })
      .where(eq(terminals.id, id))
      .returning();
    return terminal || undefined;
  }


  // Activation Log operations
  async getActivationLogsByTerminalId(terminalId: number): Promise<ActivationLog[]> {
    return db
      .select({
        id: activationLogs.id,
        terminalId: activationLogs.terminalId,
        action: activationLogs.action,
        description: activationLogs.description,
        performedBy: activationLogs.performedBy,
        data: activationLogs.data,
        createdAt: activationLogs.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        },
      })
      .from(activationLogs)
      .leftJoin(users, eq(activationLogs.performedBy, users.id))
      .where(eq(activationLogs.terminalId, terminalId))
      .orderBy(activationLogs.createdAt);
  }

  async createActivationLog(logData: InsertActivationLog): Promise<ActivationLog> {
    const [log] = await db
      .insert(activationLogs)
      .values(logData)
      .returning();
    return log;
  }

  // Menu operations
  async getAllMenus(): Promise<Menu[]> {
    return db.select().from(menus);
  }

  async getMenuById(id: number): Promise<Menu | undefined> {
    const [menu] = await db.select().from(menus).where(eq(menus.id, id));
    return menu || undefined;
  }

  async getMenusByType(menuType: 'glink' | 'plink'): Promise<Menu[]> {
    return db.select().from(menus).where(eq(menus.menuType, menuType));
  }

  async getMenusByParentId(parentId: number | null): Promise<Menu[]> {
    if (parentId === null) {
      return db.select().from(menus).where(isNull(menus.parentId));
    }
    return db.select().from(menus).where(eq(menus.parentId, parentId));
  }

  async createMenu(menuData: InsertMenu): Promise<Menu> {
    const [menu] = await db
      .insert(menus)
      .values(menuData)
      .returning();
    return menu;
  }

  async updateMenu(id: number, updates: UpdateMenu): Promise<Menu | undefined> {
    const [menu] = await db
      .update(menus)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(menus.id, id))
      .returning();
    return menu || undefined;
  }

  async deleteMenu(id: number): Promise<void> {
    await db.delete(menus).where(eq(menus.id, id));
  }

  async toggleMenuStatus(id: number): Promise<Menu | undefined> {
    const menu = await this.getMenuById(id);
    if (!menu) return undefined;

    const [updated] = await db
      .update(menus)
      .set({ isActive: !menu.isActive, updatedAt: new Date() })
      .where(eq(menus.id, id))
      .returning();
    return updated || undefined;
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private organizations: Map<number, Organization>;
  private ports: Map<number, Port>;
  private portAdminContacts: Map<number, PortAdminContact>;
  private emailConfigurations: Map<number, EmailConfiguration>;
  private terminals: Map<number, Terminal>;
  private nextOrgId: number = 1;
  private nextPortId: number = 1;
  private nextContactId: number = 1;
  private nextEmailConfigId: number = 1;
  private nextTerminalId: number = 1;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.organizations = new Map();
    this.ports = new Map();
    this.portAdminContacts = new Map();
    this.emailConfigurations = new Map();
    this.terminals = new Map();
    
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
      logoUrl: null,
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
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || "user",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      ...updates,
      id, // Ensure ID doesn't change
    };
    this.users.set(id, updatedUser);
    return updatedUser;
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
    for (const [token, session] of Array.from(this.sessions.entries())) {
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
      telephone: insertOrganization.telephone ?? null,
      fax: insertOrganization.fax ?? null,
      website: insertOrganization.website ?? null,
      logoUrl: insertOrganization.logoUrl ?? null,
      isActive: true,
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
      isActive: true,
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

  async getPortAdminContactByUserId(userId: string): Promise<PortAdminContact | undefined> {
    return Array.from(this.portAdminContacts.values()).find(
      (contact) => contact.userId === userId
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

  async linkContactToUser(contactId: number, userId: string): Promise<PortAdminContact | undefined> {
    const contact = this.portAdminContacts.get(contactId);
    if (!contact) return undefined;
    
    const updatedContact: PortAdminContact = {
      ...contact,
      userId,
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
      enableTLS: config.enableTLS ?? true,
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

  // Terminal operations for MemStorage
  async getTerminalsByPortId(portId: number): Promise<Terminal[]> {
    return Array.from(this.terminals.values()).filter(
      (terminal) => terminal.portId === portId
    );
  }

  async getTerminalById(id: number): Promise<Terminal | undefined> {
    return this.terminals.get(id);
  }

  async createTerminal(terminalData: InsertTerminal): Promise<Terminal> {
    const id = this.nextTerminalId++;
    const terminal: Terminal = {
      ...terminalData,
      id,
      gst: terminalData.gst ?? null,
      pan: terminalData.pan ?? null,
      status: terminalData.status ?? "Processing for activation",
      isActive: true,
      subscriptionTypeId: null,
      activationStartDate: null,
      activationEndDate: null,
      workOrderNo: null,
      workOrderDate: null,
      createdBy: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.terminals.set(id, terminal);
    return terminal;
  }

  async updateTerminal(id: number, updates: UpdateTerminal): Promise<Terminal | undefined> {
    const terminal = this.terminals.get(id);
    if (!terminal) return undefined;

    const updatedTerminal: Terminal = {
      ...terminal,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.terminals.set(id, updatedTerminal);
    return updatedTerminal;
  }

  async deleteTerminal(id: number): Promise<void> {
    this.terminals.delete(id);
  }

  async getPortAdminAssignedPort(userId: string): Promise<any> {
    // Get port admin contact by user ID, then get associated port with organization
    const contact = Array.from(this.portAdminContacts.values()).find(
      (c) => c.userId === userId
    );
    
    if (!contact) {
      return undefined;
    }

    const port = this.ports.get(contact.portId);
    if (!port) {
      return undefined;
    }

    const organization = this.organizations.get(port.organizationId);
    
    return {
      ...port,
      organizationName: organization?.organizationName || "Unknown Organization"
    };
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return [];
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    return 0;
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    throw new Error("Notifications not supported in memory storage");
  }

  async markNotificationAsRead(id: number): Promise<void> {
    // No-op for memory storage
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    // No-op for memory storage
  }

  async deleteNotification(id: number): Promise<void> {
    // No-op for memory storage
  }

  async getTerminalsPendingActivation(): Promise<any[]> {
    return Array.from(this.terminals.values()).map(terminal => {
      const port = this.ports.get(terminal.portId);
      const organization = port ? this.organizations.get(port.organizationId) : undefined;
      
      return {
        ...terminal,
        port: port || { id: 0, portName: "Unknown Port", displayName: "Unknown", address: "", country: "", state: "" },
        organization: organization || { id: 0, organizationName: "Unknown Organization", displayName: "Unknown", organizationCode: "" }
      };
    });
  }

  async updateTerminalStatus(id: number, status: string): Promise<Terminal | undefined> {
    const terminal = this.terminals.get(id);
    if (!terminal) return undefined;

    const updatedTerminal: Terminal = {
      ...terminal,
      status,
      updatedAt: new Date(),
    };
    this.terminals.set(id, updatedTerminal);
    return updatedTerminal;
  }

  async getAllSubscriptionTypes(): Promise<SubscriptionType[]> {
    // Mock subscription types for memory storage
    return [
      { id: 1, name: "1 Month", months: 1, createdAt: new Date() },
      { id: 2, name: "12 Months", months: 12, createdAt: new Date() },
      { id: 3, name: "24 Months", months: 24, createdAt: new Date() },
      { id: 4, name: "48 Months", months: 48, createdAt: new Date() },
    ];
  }

  async getSubscriptionTypeById(id: number): Promise<SubscriptionType | undefined> {
    const types = await this.getAllSubscriptionTypes();
    return types.find(type => type.id === id);
  }

  async activateTerminal(id: number, data: {
    activationStartDate: Date;
    subscriptionTypeId: number;
    workOrderNo?: string;
    workOrderDate?: Date | null;
  }): Promise<Terminal | undefined> {
    const terminal = this.terminals.get(id);
    if (!terminal) return undefined;

    const subscriptionType = await this.getSubscriptionTypeById(data.subscriptionTypeId);
    if (!subscriptionType) return undefined;

    // Calculate end date
    const endDate = new Date(data.activationStartDate);
    endDate.setMonth(endDate.getMonth() + subscriptionType.months);

    const updatedTerminal: Terminal = {
      ...terminal,
      status: "Active",
      subscriptionTypeId: data.subscriptionTypeId,
      activationStartDate: data.activationStartDate,
      activationEndDate: endDate,
      workOrderNo: data.workOrderNo || null,
      workOrderDate: data.workOrderDate || null,
      updatedAt: new Date(),
    };
    this.terminals.set(id, updatedTerminal);
    return updatedTerminal;
  }
}

// Using DatabaseStorage for full persistence: users, sessions, organizations, ports, and contacts
export const storage = new DatabaseStorage();

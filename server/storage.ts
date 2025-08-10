import { type User, type InsertUser, type UpdateUser, type Session, type LoginCredentials, type Organization, type InsertOrganization, type Port, type InsertPort, type PortAdminContact, type InsertPortAdminContact, type UpdatePortAdminContact, type EmailConfiguration, type InsertEmailConfiguration, type Terminal, type InsertTerminal, type UpdateTerminal, type Notification, type InsertNotification, type SubscriptionType, type ActivationLog, type InsertActivationLog, type Menu, type InsertMenu, type UpdateMenu, type Role, type InsertRole, type UpdateRole, type EmailLog, type InsertEmailLog, type UserAuditLog, type InsertUserAuditLog, type Customer, type InsertCustomer, type CustomerContact, type InsertCustomerContact, type CustomerAddress, type InsertCustomerAddress, type Contract, type InsertContract, type ContractTariff, type InsertContractTariff, type ContractCargoDetail, type InsertContractCargoDetail, type ContractStorageCharge, type InsertContractStorageCharge, type ContractSpecialCondition, type InsertContractSpecialCondition, type Country, type State, type CargoType, type Plot } from "@shared/schema";
import { users, sessions, organizations, ports, portAdminContacts, emailConfigurations, terminals, notifications, subscriptionTypes, activationLogs, menus, roles, emailLogs, userAuditLogs, customers, customerContacts, customerAddresses, contracts, contractTariffs, contractCargoDetails, contractStorageCharges, contractSpecialConditions, countries, states, cargoTypes, plots } from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByPasswordSetupToken(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: UpdateUser): Promise<User | undefined>;
  toggleUserStatus(id: string): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  
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
  getAllPortAdminContacts(): Promise<PortAdminContact[]>;
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

  // Email Log operations
  getAllEmailLogs(): Promise<EmailLog[]>;
  getEmailLogsByConfigurationId(configurationId: number): Promise<EmailLog[]>;
  getEmailLogsByPortId(portId: number): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;

  // User Audit Log operations
  getAllUserAuditLogs(): Promise<UserAuditLog[]>;
  getUserAuditLogsByUserId(userId: string): Promise<UserAuditLog[]>;
  getUserAuditLogsByPerformedBy(performedBy: string): Promise<UserAuditLog[]>;
  createUserAuditLog(log: InsertUserAuditLog): Promise<UserAuditLog>;

  // Terminal operations
  getAllTerminals(): Promise<Terminal[]>;
  getTerminalsByPortId(portId: number): Promise<Terminal[]>;
  getTerminalById(id: number): Promise<Terminal | undefined>;
  getTerminalByName(terminalName: string): Promise<Terminal | undefined>;
  getTerminalByShortCode(shortCode: string): Promise<Terminal | undefined>;
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
  
  // Role operations
  getAllRoles(): Promise<Role[]>;
  getRoleById(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, updates: UpdateRole): Promise<Role | undefined>;
  toggleRoleStatus(id: number): Promise<Role | undefined>;
  deleteRole(id: number): Promise<void>;

  // Customer management operations
  getAllCustomers(): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  getCustomerByCode(customerCode: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getCustomerByPAN(pan: string): Promise<Customer | undefined>;
  getCustomerByGST(gst: string): Promise<Customer | undefined>;
  getCustomersByTerminalId(terminalId: number): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer & { customerCode: string }): Promise<Customer>;
  updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined>;
  updateCustomerStatus(id: number, status: string): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<void>;
  generateCustomerCode(terminalId: number): Promise<string>;

  // Customer contacts
  getCustomerContactsByCustomerId(customerId: number): Promise<CustomerContact[]>;
  createCustomerContact(contact: InsertCustomerContact): Promise<CustomerContact>;
  updateCustomerContact(id: number, updates: Partial<CustomerContact>): Promise<CustomerContact | undefined>;
  deleteCustomerContact(id: number): Promise<void>;

  // Customer addresses
  getCustomerAddressesByCustomerId(customerId: number): Promise<CustomerAddress[]>;
  createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress>;
  updateCustomerAddress(id: number, updates: Partial<CustomerAddress>): Promise<CustomerAddress | undefined>;
  deleteCustomerAddress(id: number): Promise<void>;

  // Contract management
  getAllContracts(): Promise<Contract[]>;
  getContractById(id: number): Promise<Contract | undefined>;
  getContractsByCustomerId(customerId: number): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, updates: Partial<Contract>): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<void>;

  // Contract tariffs
  getContractTariffsByContractId(contractId: number): Promise<ContractTariff[]>;
  createContractTariff(tariff: InsertContractTariff): Promise<ContractTariff>;
  updateContractTariff(id: number, updates: Partial<ContractTariff>): Promise<ContractTariff | undefined>;
  deleteContractTariff(id: number): Promise<void>;

  // Contract cargo details
  getContractCargoDetailsByContractId(contractId: number): Promise<ContractCargoDetail[]>;
  createContractCargoDetail(cargoDetail: InsertContractCargoDetail): Promise<ContractCargoDetail>;
  updateContractCargoDetail(id: number, updates: Partial<ContractCargoDetail>): Promise<ContractCargoDetail | undefined>;
  deleteContractCargoDetail(id: number): Promise<void>;

  // Contract storage charges
  getContractStorageChargesByContractId(contractId: number): Promise<ContractStorageCharge[]>;
  createContractStorageCharge(storageCharge: InsertContractStorageCharge): Promise<ContractStorageCharge>;
  updateContractStorageCharge(id: number, updates: Partial<ContractStorageCharge>): Promise<ContractStorageCharge | undefined>;
  deleteContractStorageCharge(id: number): Promise<void>;

  // Contract special conditions
  getContractSpecialConditionsByContractId(contractId: number): Promise<ContractSpecialCondition[]>;
  createContractSpecialCondition(condition: InsertContractSpecialCondition): Promise<ContractSpecialCondition>;
  updateContractSpecialCondition(id: number, updates: Partial<ContractSpecialCondition>): Promise<ContractSpecialCondition | undefined>;
  deleteContractSpecialCondition(id: number): Promise<void>;

  // Master data operations
  getAllCountries(): Promise<Country[]>;
  getAllStates(): Promise<State[]>;
  getStatesByCountryId(countryId: number): Promise<State[]>;
  getAllCargoTypes(): Promise<CargoType[]>;
  getPlotsByTerminalId(terminalId: number): Promise<Plot[]>;
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

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user || undefined;
  }

  async getUserByPasswordSetupToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordSetupToken, token));
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
    if (!user || !user.password) return null;

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

  async getAllPortAdminContacts(): Promise<PortAdminContact[]> {
    return db.select().from(portAdminContacts);
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

  // Email Log operations
  async getAllEmailLogs(): Promise<EmailLog[]> {
    return db.select().from(emailLogs).orderBy(emailLogs.sentAt);
  }

  async getEmailLogsByConfigurationId(configurationId: number): Promise<EmailLog[]> {
    return db.select().from(emailLogs)
      .where(eq(emailLogs.emailConfigurationId, configurationId))
      .orderBy(emailLogs.sentAt);
  }

  async getEmailLogsByPortId(portId: number): Promise<EmailLog[]> {
    return db.select().from(emailLogs)
      .where(eq(emailLogs.portId, portId))
      .orderBy(emailLogs.sentAt);
  }

  async createEmailLog(logData: InsertEmailLog): Promise<EmailLog> {
    const [log] = await db
      .insert(emailLogs)
      .values(logData)
      .returning();
    return log;
  }

  // User Audit Log operations
  async getAllUserAuditLogs(): Promise<UserAuditLog[]> {
    return db.select().from(userAuditLogs).orderBy(userAuditLogs.createdAt);
  }

  async getUserAuditLogsByUserId(userId: string): Promise<UserAuditLog[]> {
    return db.select().from(userAuditLogs)
      .where(eq(userAuditLogs.targetUserId, userId))
      .orderBy(userAuditLogs.createdAt);
  }

  async getUserAuditLogsByPerformedBy(performedBy: string): Promise<UserAuditLog[]> {
    return db.select().from(userAuditLogs)
      .where(eq(userAuditLogs.performedBy, performedBy))
      .orderBy(userAuditLogs.createdAt);
  }

  async createUserAuditLog(logData: InsertUserAuditLog): Promise<UserAuditLog> {
    const [log] = await db
      .insert(userAuditLogs)
      .values(logData)
      .returning();
    return log;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  async updateUser(id: string, updates: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async toggleUserStatus(id: string): Promise<User | undefined> {
    const currentUser = await this.getUser(id);
    if (!currentUser) return undefined;
    
    const [user] = await db
      .update(users)
      .set({ 
        isActive: !currentUser.isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    // First delete all sessions for this user to avoid foreign key constraint violation
    await db.delete(sessions).where(eq(sessions.userId, id));
    
    // Then delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async linkContactToUser(contactId: number, userId: string): Promise<void> {
    await db
      .update(portAdminContacts)
      .set({ userId: userId, updatedAt: new Date() })
      .where(eq(portAdminContacts.id, contactId));
  }

  // Terminal operations
  async getAllTerminals(): Promise<Terminal[]> {
    return db.select().from(terminals);
  }

  async getTerminalsByPortId(portId: number): Promise<Terminal[]> {
    return db.select().from(terminals).where(eq(terminals.portId, portId));
  }

  async getTerminalById(id: number): Promise<Terminal | undefined> {
    const [terminal] = await db.select().from(terminals).where(eq(terminals.id, id));
    return terminal || undefined;
  }

  async getTerminalByName(terminalName: string): Promise<Terminal | undefined> {
    const [terminal] = await db.select().from(terminals).where(eq(terminals.terminalName, terminalName));
    return terminal || undefined;
  }

  async getTerminalByShortCode(shortCode: string): Promise<Terminal | undefined> {
    const [terminal] = await db.select().from(terminals).where(eq(terminals.shortCode, shortCode));
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

  // Role operations
  async getAllRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }

  async getRoleById(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role || undefined;
  }

  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values({
        ...roleData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return role;
  }

  async updateRole(id: number, updates: UpdateRole): Promise<Role | undefined> {
    const [role] = await db
      .update(roles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role || undefined;
  }

  async toggleRoleStatus(id: number): Promise<Role | undefined> {
    const currentRole = await this.getRoleById(id);
    if (!currentRole) return undefined;
    
    const [role] = await db
      .update(roles)
      .set({ 
        isActive: !currentRole.isActive,
        updatedAt: new Date()
      })
      .where(eq(roles.id, id))
      .returning();
    return role || undefined;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
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
  private menus: Map<number, Menu>;
  private activationLogs: Map<number, ActivationLog>;
  private nextOrgId: number = 1;
  private nextPortId: number = 1;
  private nextContactId: number = 1;
  private nextEmailConfigId: number = 1;
  private nextTerminalId: number = 1;
  private nextMenuId: number = 1;
  private nextActivationLogId: number = 1;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.organizations = new Map();
    this.ports = new Map();
    this.portAdminContacts = new Map();
    this.emailConfigurations = new Map();
    this.terminals = new Map();
    this.menus = new Map();
    this.activationLogs = new Map();
    
    // Create a default admin user for testing
    this.initializeDefaultUser();
    this.initializeDefaultData();
    this.initializeDefaultMenus();
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

  private initializeDefaultMenus() {
    // Create default GLink (Main Menu) items
    const dashboardMenu: Menu = {
      id: 1,
      name: "dashboard",
      label: "Dashboard",
      icon: "Home",
      route: "/dashboard",
      parentId: null,
      sortOrder: 1,
      menuType: "glink",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.menus.set(1, dashboardMenu);

    const organizationsMenu: Menu = {
      id: 2,
      name: "organizations",
      label: "Organizations",
      icon: "Building2",
      route: "/organizations",
      parentId: null,
      sortOrder: 2,
      menuType: "glink",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.menus.set(2, organizationsMenu);

    const portsMenu: Menu = {
      id: 3,
      name: "ports",
      label: "Ports",
      icon: "MapPin",
      route: "/ports",
      parentId: null,
      sortOrder: 3,
      menuType: "glink",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.menus.set(3, portsMenu);

    const menuManagementMenu: Menu = {
      id: 4,
      name: "menu-management",
      label: "Menu Management",
      icon: "Menu",
      route: "/menu-management",
      parentId: null,
      sortOrder: 4,
      menuType: "glink",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.menus.set(4, menuManagementMenu);

    this.nextMenuId = 5;
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
  async getAllPortAdminContacts(): Promise<PortAdminContact[]> {
    return Array.from(this.portAdminContacts.values());
  }

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
  async getAllTerminals(): Promise<Terminal[]> {
    return Array.from(this.terminals.values());
  }

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
      currency: terminalData.currency || "USD",
      billingFax: terminalData.billingFax ?? null,
      shippingFax: terminalData.shippingFax ?? null,
      sameAsBilling: terminalData.sameAsBilling ?? false,
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

  // Activation Log operations
  async getActivationLogsByTerminalId(terminalId: number): Promise<ActivationLog[]> {
    return Array.from(this.activationLogs.values()).filter(
      (log) => log.terminalId === terminalId
    );
  }

  async createActivationLog(logData: InsertActivationLog): Promise<ActivationLog> {
    const id = this.nextActivationLogId++;
    const log: ActivationLog = {
      ...logData,
      id,
      data: logData.data ?? null,
      createdAt: new Date(),
    };
    this.activationLogs.set(id, log);
    return log;
  }

  // Menu operations
  async getAllMenus(): Promise<Menu[]> {
    return Array.from(this.menus.values());
  }

  async getMenuById(id: number): Promise<Menu | undefined> {
    return this.menus.get(id);
  }

  async getMenusByType(menuType: 'glink' | 'plink'): Promise<Menu[]> {
    return Array.from(this.menus.values()).filter(
      (menu) => menu.menuType === menuType
    );
  }

  async getMenusByParentId(parentId: number | null): Promise<Menu[]> {
    return Array.from(this.menus.values()).filter(
      (menu) => menu.parentId === parentId
    );
  }

  async createMenu(menuData: InsertMenu): Promise<Menu> {
    const id = this.nextMenuId++;
    const menu: Menu = {
      ...menuData,
      id,
      icon: menuData.icon ?? null,
      route: menuData.route ?? null,
      parentId: menuData.parentId ?? null,
      sortOrder: menuData.sortOrder ?? 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.menus.set(id, menu);
    return menu;
  }

  async updateMenu(id: number, updates: UpdateMenu): Promise<Menu | undefined> {
    const menu = this.menus.get(id);
    if (!menu) return undefined;

    const updatedMenu: Menu = {
      ...menu,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.menus.set(id, updatedMenu);
    return updatedMenu;
  }

  async deleteMenu(id: number): Promise<void> {
    this.menus.delete(id);
  }

  async toggleMenuStatus(id: number): Promise<Menu | undefined> {
    const menu = this.menus.get(id);
    if (!menu) return undefined;

    const updatedMenu: Menu = {
      ...menu,
      isActive: !menu.isActive,
      updatedAt: new Date(),
    };
    this.menus.set(id, updatedMenu);
    return updatedMenu;
  }

  // Customer management operations
  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByCode(customerCode: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.customerCode, customerCode));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async getCustomerByPAN(pan: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.pan, pan));
    return customer || undefined;
  }

  async getCustomerByGST(gst: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.gst, gst));
    return customer || undefined;
  }

  async getCustomersByTerminalId(terminalId: number): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.terminalId, terminalId));
  }

  async createCustomer(customerData: InsertCustomer & { customerCode: string }): Promise<Customer> {
    const [customer] = await db.insert(customers).values({
      ...customerData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return customer;
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updated || undefined;
  }

  async updateCustomerStatus(id: number, status: string): Promise<Customer | undefined> {
    const [updated] = await db.update(customers)
      .set({ status, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async generateCustomerCode(terminalId: number): Promise<string> {
    // Get terminal short code
    const terminal = await this.getTerminalById(terminalId);
    if (!terminal) throw new Error('Terminal not found');

    // Get current year
    const year = new Date().getFullYear();

    // Get counter for this terminal and year
    const existingCustomers = await db.select()
      .from(customers)
      .where(eq(customers.terminalId, terminalId));

    // Filter by current year from customer codes
    const yearPrefix = `${year}_${terminal.shortCode}_`;
    const currentYearCustomers = existingCustomers.filter(c => 
      c.customerCode.startsWith(yearPrefix)
    );

    // Generate next counter
    const counter = currentYearCustomers.length + 1;
    const paddedCounter = counter.toString().padStart(3, '0');

    return `${year}_${terminal.shortCode}_${paddedCounter}`;
  }

  // Customer contacts
  async getCustomerContactsByCustomerId(customerId: number): Promise<CustomerContact[]> {
    return await db.select().from(customerContacts).where(eq(customerContacts.customerId, customerId));
  }

  async createCustomerContact(contact: InsertCustomerContact): Promise<CustomerContact> {
    const [created] = await db.insert(customerContacts).values({
      ...contact,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateCustomerContact(id: number, updates: Partial<CustomerContact>): Promise<CustomerContact | undefined> {
    const [updated] = await db.update(customerContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customerContacts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomerContact(id: number): Promise<void> {
    await db.delete(customerContacts).where(eq(customerContacts.id, id));
  }

  // Customer addresses
  async getCustomerAddressesByCustomerId(customerId: number): Promise<CustomerAddress[]> {
    return await db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId));
  }

  async createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress> {
    const [created] = await db.insert(customerAddresses).values({
      ...address,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateCustomerAddress(id: number, updates: Partial<CustomerAddress>): Promise<CustomerAddress | undefined> {
    const [updated] = await db.update(customerAddresses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customerAddresses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomerAddress(id: number): Promise<void> {
    await db.delete(customerAddresses).where(eq(customerAddresses.id, id));
  }

  // Contract management
  async getAllContracts(): Promise<Contract[]> {
    return await db.select().from(contracts);
  }

  async getContractById(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || undefined;
  }

  async getContractsByCustomerId(customerId: number): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.customerId, customerId));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [created] = await db.insert(contracts).values({
      ...contract,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateContract(id: number, updates: Partial<Contract>): Promise<Contract | undefined> {
    const [updated] = await db.update(contracts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteContract(id: number): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  // Contract tariffs
  async getContractTariffsByContractId(contractId: number): Promise<ContractTariff[]> {
    return await db.select().from(contractTariffs).where(eq(contractTariffs.contractId, contractId));
  }

  async createContractTariff(tariff: InsertContractTariff): Promise<ContractTariff> {
    const [created] = await db.insert(contractTariffs).values({
      ...tariff,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateContractTariff(id: number, updates: Partial<ContractTariff>): Promise<ContractTariff | undefined> {
    const [updated] = await db.update(contractTariffs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contractTariffs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteContractTariff(id: number): Promise<void> {
    await db.delete(contractTariffs).where(eq(contractTariffs.id, id));
  }

  // Contract cargo details
  async getContractCargoDetailsByContractId(contractId: number): Promise<ContractCargoDetail[]> {
    return await db.select().from(contractCargoDetails).where(eq(contractCargoDetails.contractId, contractId));
  }

  async createContractCargoDetail(cargoDetail: InsertContractCargoDetail): Promise<ContractCargoDetail> {
    const [created] = await db.insert(contractCargoDetails).values({
      ...cargoDetail,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateContractCargoDetail(id: number, updates: Partial<ContractCargoDetail>): Promise<ContractCargoDetail | undefined> {
    const [updated] = await db.update(contractCargoDetails)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contractCargoDetails.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteContractCargoDetail(id: number): Promise<void> {
    await db.delete(contractCargoDetails).where(eq(contractCargoDetails.id, id));
  }

  // Contract storage charges
  async getContractStorageChargesByContractId(contractId: number): Promise<ContractStorageCharge[]> {
    return await db.select().from(contractStorageCharges).where(eq(contractStorageCharges.contractId, contractId));
  }

  async createContractStorageCharge(storageCharge: InsertContractStorageCharge): Promise<ContractStorageCharge> {
    const [created] = await db.insert(contractStorageCharges).values({
      ...storageCharge,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateContractStorageCharge(id: number, updates: Partial<ContractStorageCharge>): Promise<ContractStorageCharge | undefined> {
    const [updated] = await db.update(contractStorageCharges)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contractStorageCharges.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteContractStorageCharge(id: number): Promise<void> {
    await db.delete(contractStorageCharges).where(eq(contractStorageCharges.id, id));
  }

  // Contract special conditions
  async getContractSpecialConditionsByContractId(contractId: number): Promise<ContractSpecialCondition[]> {
    return await db.select().from(contractSpecialConditions).where(eq(contractSpecialConditions.contractId, contractId));
  }

  async createContractSpecialCondition(condition: InsertContractSpecialCondition): Promise<ContractSpecialCondition> {
    const [created] = await db.insert(contractSpecialConditions).values({
      ...condition,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateContractSpecialCondition(id: number, updates: Partial<ContractSpecialCondition>): Promise<ContractSpecialCondition | undefined> {
    const [updated] = await db.update(contractSpecialConditions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contractSpecialConditions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteContractSpecialCondition(id: number): Promise<void> {
    await db.delete(contractSpecialConditions).where(eq(contractSpecialConditions.id, id));
  }

  // Master data operations
  async getAllCountries(): Promise<Country[]> {
    return await db.select().from(countries).where(eq(countries.isActive, true));
  }

  async getAllStates(): Promise<State[]> {
    return await db.select().from(states).where(eq(states.isActive, true));
  }

  async getStatesByCountryId(countryId: number): Promise<State[]> {
    return await db.select().from(states).where(and(eq(states.countryId, countryId), eq(states.isActive, true)));
  }

  async getAllCargoTypes(): Promise<CargoType[]> {
    return await db.select().from(cargoTypes).where(eq(cargoTypes.isActive, true));
  }

  async getPlotsByTerminalId(terminalId: number): Promise<Plot[]> {
    return await db.select().from(plots).where(and(eq(plots.terminalId, terminalId), eq(plots.isActive, true)));
  }
}

// Using DatabaseStorage for full persistence: users, sessions, organizations, ports, and contacts
export const storage = new DatabaseStorage();

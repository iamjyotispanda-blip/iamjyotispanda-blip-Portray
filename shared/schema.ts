import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userType: text("user_type").notNull().default("PortUser"), // "SuperAdmin", "PortUser", "TerminalUser"
  email: text("email").notNull().unique(),
  password: text("password"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("PortAdmin"), // Will reference roles.name
  roleId: integer("role_id").references(() => roles.id),
  portId: integer("port_id").references(() => ports.id), // Required for PortUser
  terminalIds: text("terminal_ids").array(), // Array of terminal IDs for TerminalUser
  isActive: boolean("is_active").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationToken: text("verification_token").unique(),
  verificationTokenExpires: timestamp("verification_token_expires"),
  passwordSetupToken: text("password_setup_token").unique(),
  passwordSetupTokenExpires: timestamp("password_setup_token_expires"),
  isSystemAdmin: boolean("is_system_admin").notNull().default(false),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationName: text("organization_name").notNull().unique(),
  displayName: text("display_name").notNull().unique(),
  organizationCode: text("organization_code").unique().notNull(),
  registerOffice: text("register_office").notNull(),
  country: text("country").notNull(),
  telephone: text("telephone"),
  fax: text("fax"),
  website: text("website"),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const ports = pgTable("ports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  portName: text("port_name").notNull(),
  displayName: varchar("display_name", { length: 6 }).notNull(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  address: text("address").notNull(),
  country: text("country").notNull(),
  state: text("state").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  ports: many(ports),
}));



// Port Admin Contacts table
export const portAdminContacts = pgTable("port_admin_contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  portId: integer("port_id").notNull().references(() => ports.id),
  contactName: text("contact_name").notNull(),
  designation: text("designation").notNull(),
  email: text("email").notNull().unique(),
  mobileNumber: text("mobile_number").notNull(),
  status: text("status").notNull().default("inactive"), // active, inactive
  verificationToken: text("verification_token").unique(),
  verificationTokenExpires: timestamp("verification_token_expires"),
  isVerified: boolean("is_verified").notNull().default(false),
  userId: varchar("user_id").references(() => users.id), // Link to actual user account after registration
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Email Configuration table  
export const emailConfigurations = pgTable("email_configurations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  portId: integer("port_id").notNull().references(() => ports.id),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  smtpUser: text("smtp_user").notNull(),
  smtpPassword: text("smtp_password").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  enableTLS: boolean("enable_tls").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Terminals table
export const terminals = pgTable("terminals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  portId: integer("port_id").notNull().references(() => ports.id),
  terminalName: text("terminal_name").notNull().unique(),
  shortCode: varchar("short_code", { length: 6 }).notNull().unique(),
  gst: text("gst"),
  pan: text("pan"),
  currency: text("currency").notNull().default("INR"),
  timezone: text("timezone").notNull(),
  
  // Billing Address
  billingAddress: text("billing_address").notNull(),
  billingCity: text("billing_city").notNull(),
  billingPinCode: text("billing_pin_code").notNull(),
  billingPhone: text("billing_phone").notNull(),
  billingFax: text("billing_fax"),
  
  // Shipping Address
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingPinCode: text("shipping_pin_code").notNull(),
  shippingPhone: text("shipping_phone").notNull(),
  shippingFax: text("shipping_fax"),
  
  sameAsBilling: boolean("same_as_billing").notNull().default(false),
  status: text("status").notNull().default("Processing for activation"), // "Processing for activation", "Active", "Inactive"
  isActive: boolean("is_active").notNull().default(false),
  
  // Activation details
  subscriptionTypeId: integer("subscription_type_id").references(() => subscriptionTypes.id),
  activationStartDate: timestamp("activation_start_date"),
  activationEndDate: timestamp("activation_end_date"),
  workOrderNo: text("work_order_no"),
  workOrderDate: timestamp("work_order_date"),
  
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // "terminal_activation_request", "terminal_approved", etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data"), // JSON string for additional data
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Email logs table - tracks all emails sent through the system
export const emailLogs = pgTable("email_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  emailConfigurationId: integer("email_configuration_id").references(() => emailConfigurations.id),
  portId: integer("port_id").references(() => ports.id),
  toEmail: text("to_email").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  subject: text("subject").notNull(),
  emailType: text("email_type").notNull(), // "verification", "password_setup", "test", "notification"
  status: text("status").notNull().default("sent"), // "sent", "failed", "pending"
  errorMessage: text("error_message"), // Store error details if failed
  sentAt: timestamp("sent_at").notNull().default(sql`now()`),
  userId: varchar("user_id").references(() => users.id), // For user-related emails
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Relations
export const portAdminContactsRelations = relations(portAdminContacts, ({ one }) => ({
  port: one(ports, {
    fields: [portAdminContacts.portId],
    references: [ports.id],
  }),
  user: one(users, {
    fields: [portAdminContacts.userId],
    references: [users.id],
  }),
}));

export const portsRelations = relations(ports, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [ports.organizationId],
    references: [organizations.id],
  }),
  portAdminContacts: many(portAdminContacts),
  terminals: many(terminals),
}));

export const terminalsRelations = relations(terminals, ({ one }) => ({
  port: one(ports, {
    fields: [terminals.portId],
    references: [ports.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  emailConfiguration: one(emailConfigurations, {
    fields: [emailLogs.emailConfigurationId],
    references: [emailConfigurations.id],
  }),
  port: one(ports, {
    fields: [emailLogs.portId],
    references: [ports.id],
  }),
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  userType: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  roleId: true,
  portId: true,
  terminalIds: true,
  isActive: true,
});

export const updateUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  roleId: true,
  isActive: true,
  isVerified: true,
  isSystemAdmin: true,
  lastLogin: true,
}).partial();

export type UpdateUser = z.infer<typeof updateUserSchema>;

export const insertPortAdminContactSchema = createInsertSchema(portAdminContacts).pick({
  portId: true,
  contactName: true,
  designation: true,
  email: true,
  mobileNumber: true,
  status: true,
});

export const updatePortAdminContactSchema = createInsertSchema(portAdminContacts).pick({
  contactName: true,
  designation: true,
  email: true,
  mobileNumber: true,
  status: true,
}).partial();

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  rememberMe: z.boolean().optional(),
});

export const setupPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  organizationName: true,
  displayName: true,
  organizationCode: true,
  registerOffice: true,
  country: true,
  telephone: true,
  fax: true,
  website: true,
  logoUrl: true,
});

export const insertPortSchema = createInsertSchema(ports).pick({
  portName: true,
  displayName: true,
  organizationId: true,
  address: true,
  country: true,
  state: true,
});

export const insertEmailConfigurationSchema = createInsertSchema(emailConfigurations).pick({
  portId: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPassword: true,
  fromEmail: true,
  fromName: true,
  enableTLS: true,
});

export const updateEmailConfigurationSchema = createInsertSchema(emailConfigurations).pick({
  portId: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPassword: true,
  fromEmail: true,
  fromName: true,
  enableTLS: true,
}).partial();

export const insertEmailLogSchema = createInsertSchema(emailLogs).pick({
  emailConfigurationId: true,
  portId: true,
  toEmail: true,
  fromEmail: true,
  fromName: true,
  subject: true,
  emailType: true,
  status: true,
  errorMessage: true,
  userId: true,
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

// Role Creation Permissions table
export const roleCreationPermissions = pgTable("role_creation_permissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  creatorRoleId: integer("creator_role_id").notNull().references(() => roles.id),
  allowedUserTypes: text("allowed_user_types").array().notNull(), // Array of user types this role can create
  allowedRoleIds: text("allowed_role_ids").array().notNull(), // Array of role IDs this role can assign
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Type definitions
export const insertRoleCreationPermissionSchema = createInsertSchema(roleCreationPermissions).pick({
  creatorRoleId: true,
  allowedUserTypes: true,
  allowedRoleIds: true,
  isActive: true,
});

export const updateRoleCreationPermissionSchema = insertRoleCreationPermissionSchema.partial();

export type RoleCreationPermission = typeof roleCreationPermissions.$inferSelect;
export type InsertRoleCreationPermission = z.infer<typeof insertRoleCreationPermissionSchema>;

export const insertTerminalSchema = createInsertSchema(terminals).pick({
  portId: true,
  terminalName: true,
  shortCode: true,
  gst: true,
  pan: true,
  currency: true,
  timezone: true,
  billingAddress: true,
  billingCity: true,
  billingPinCode: true,
  billingPhone: true,
  billingFax: true,
  shippingAddress: true,
  shippingCity: true,
  shippingPinCode: true,
  shippingPhone: true,
  shippingFax: true,
  sameAsBilling: true,
  status: true,
  createdBy: true,
});

export const updateTerminalSchema = createInsertSchema(terminals).pick({
  terminalName: true,
  shortCode: true,
  gst: true,
  pan: true,
  currency: true,
  timezone: true,
  billingAddress: true,
  billingCity: true,
  billingPinCode: true,
  billingPhone: true,
  billingFax: true,
  shippingAddress: true,
  shippingCity: true,
  shippingPinCode: true,
  shippingPhone: true,
  shippingFax: true,
  sameAsBilling: true,
  status: true,
}).partial();

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  data: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Port = typeof ports.$inferSelect;
export type PortAdminContact = typeof portAdminContacts.$inferSelect;
export type EmailConfiguration = typeof emailConfigurations.$inferSelect;
export type Terminal = typeof terminals.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertPort = z.infer<typeof insertPortSchema>;
export type InsertPortAdminContact = z.infer<typeof insertPortAdminContactSchema>;
export type InsertEmailConfiguration = z.infer<typeof insertEmailConfigurationSchema>;
export type UpdateEmailConfiguration = z.infer<typeof updateEmailConfigurationSchema>;
export type UpdatePortAdminContact = z.infer<typeof updatePortAdminContactSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type InsertTerminal = z.infer<typeof insertTerminalSchema>;
export type UpdateTerminal = z.infer<typeof updateTerminalSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Menu Management Tables
export const menus = pgTable("menus", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  icon: text("icon"),
  route: text("route"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  menuType: text("menu_type").notNull(), // 'glink' or 'plink'
  isSystemConfig: boolean("is_system_config").notNull().default(false), // Flag for header system configuration
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const menusRelations = relations(menus, ({ one, many }) => ({
  parent: one(menus, {
    fields: [menus.parentId],
    references: [menus.id],
    relationName: "MenuParent",
  }),
  children: many(menus, {
    relationName: "MenuParent",
  }),
}));

export const insertMenuSchema = createInsertSchema(menus).pick({
  name: true,
  label: true,
  icon: true,
  route: true,
  parentId: true,
  sortOrder: true,
  menuType: true,
  isSystemConfig: true,
  isActive: true,
});

export const updateMenuSchema = createInsertSchema(menus).pick({
  name: true,
  label: true,
  icon: true,
  route: true,
  parentId: true,
  sortOrder: true,
  menuType: true,
  isSystemConfig: true,
  isActive: true,
}).partial();

export type Menu = typeof menus.$inferSelect;
export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type UpdateMenu = z.infer<typeof updateMenuSchema>;

// Subscription Types Table
export const subscriptionTypes = pgTable("subscription_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(), // "1 Month", "12 Months", "24 Months", "48 Months"
  months: integer("months").notNull(), // 1, 12, 24, 48
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Add subscription type schemas
export const insertSubscriptionTypeSchema = createInsertSchema(subscriptionTypes).pick({
  name: true,
  months: true,
});

export type InsertSubscriptionType = z.infer<typeof insertSubscriptionTypeSchema>;
export type SubscriptionType = typeof subscriptionTypes.$inferSelect;

// Database Backups Table
export const databaseBackups = pgTable("database_backups", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  filename: text("filename").notNull(),
  description: text("description"),
  size: integer("size").notNull().default(0),
  filePath: text("file_path").notNull(),
  status: text("status").notNull().default("in_progress"), // 'in_progress', 'completed', 'failed'
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Add database backup schemas
export const insertDatabaseBackupSchema = createInsertSchema(databaseBackups).pick({
  filename: true,
  description: true,
  size: true,
  filePath: true,
  status: true,
  createdBy: true,
});

export type InsertDatabaseBackup = z.infer<typeof insertDatabaseBackupSchema>;
export type DatabaseBackup = typeof databaseBackups.$inferSelect;

// Roles table
export const roles = pgTable("roles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(), // "SystemAdmin", "PortAdmin"
  displayName: text("display_name").notNull(), // "System Administrator", "Port Administrator"
  description: text("description"),
  permissions: text("permissions").array(), // Array of permission strings
  isActive: boolean("is_active").notNull().default(true),
  isSystem: boolean("is_system").notNull().default(false), // System roles cannot be deleted
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});



// Roles schemas
export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  displayName: true,
  description: true,
  permissions: true,
  isActive: true,
});

export const updateRoleSchema = createInsertSchema(roles).pick({
  name: true,
  displayName: true,
  description: true,
  permissions: true,
  isActive: true,
}).partial();

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;

// Activation Logs Table
export const activationLogs = pgTable("activation_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  terminalId: integer("terminal_id").notNull().references(() => terminals.id),
  action: text("action").notNull(), // "submitted", "approved", "activated", "rejected"
  description: text("description").notNull(),
  performedBy: varchar("performed_by").notNull().references(() => users.id),
  data: text("data"), // JSON string for additional data
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const activationLogsRelations = relations(activationLogs, ({ one }) => ({
  terminal: one(terminals, {
    fields: [activationLogs.terminalId],
    references: [terminals.id],
  }),
  user: one(users, {
    fields: [activationLogs.performedBy],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
}));

export const insertActivationLogSchema = createInsertSchema(activationLogs).pick({
  terminalId: true,
  action: true,
  description: true,
  performedBy: true,
  data: true,
});

export type ActivationLog = typeof activationLogs.$inferSelect;
export type InsertActivationLog = z.infer<typeof insertActivationLogSchema>;

// User Audit Logs Table
export const userAuditLogs = pgTable("user_audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  targetUserId: varchar("target_user_id").notNull().references(() => users.id), // User being modified
  performedBy: varchar("performed_by").notNull().references(() => users.id), // User performing the action
  action: text("action").notNull(), // "created", "updated", "status_changed", "role_changed", "password_reset", "verified", "deleted"
  description: text("description").notNull(),
  oldValues: text("old_values"), // JSON string of previous values
  newValues: text("new_values"), // JSON string of new values
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const userAuditLogsRelations = relations(userAuditLogs, ({ one }) => ({
  targetUser: one(users, {
    fields: [userAuditLogs.targetUserId],
    references: [users.id],
    relationName: "AuditTargetUser",
  }),
  performedByUser: one(users, {
    fields: [userAuditLogs.performedBy],
    references: [users.id],
    relationName: "AuditPerformedBy",
  }),
}));

export const insertUserAuditLogSchema = createInsertSchema(userAuditLogs).pick({
  targetUserId: true,
  performedBy: true,
  action: true,
  description: true,
  oldValues: true,
  newValues: true,
  ipAddress: true,
  userAgent: true,
});

export type UserAuditLog = typeof userAuditLogs.$inferSelect;
export type InsertUserAuditLog = z.infer<typeof insertUserAuditLogSchema>;



// Customer Management Tables
export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerCode: text("customer_code").notNull().unique(), // Format: 2025_VPT_001
  customerName: text("customer_name").notNull().unique(),
  displayName: text("display_name").notNull(),
  country: text("country").notNull(),
  state: text("state").notNull(),
  pan: text("pan").notNull().unique(), // Indian PAN format validation
  gst: text("gst").notNull().unique(), // Indian GST format validation
  email: text("email").notNull().unique(), // Must be unique in both customers and users tables
  terminalId: integer("terminal_id").notNull().references(() => terminals.id),
  portId: integer("port_id").notNull().references(() => ports.id),
  status: text("status").notNull().default("Draft"), // "Draft", "Activation in Progress", "Customer TC"
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const customerContacts = pgTable("customer_contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  contactName: text("contact_name").notNull(),
  designation: text("designation").notNull(),
  email: text("email").notNull(),
  contactNumber: text("contact_number").notNull(),
  isPrimaryContact: boolean("is_primary_contact").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const customerAddresses = pgTable("customer_addresses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  addressType: text("address_type").notNull(), // "Billing", "Shipping", "Other"
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull(),
  pincode: text("pincode").notNull(),
  isDefaultAddress: boolean("is_default_address").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const contracts = pgTable("contracts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  contractNumber: text("contract_number").notNull().unique(),
  contractCopyUrl: text("contract_copy_url"), // PDF/Doc upload URL
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const contractTariffs = pgTable("contract_tariffs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  chcRateToCustomer: text("chc_rate_to_customer"), // CHC - Cargo Handling Charge
  chcRateToPort: text("chc_rate_to_port"),
  bhcRateToCustomer: text("bhc_rate_to_customer"), // BHC - Berth Handling Charge
  bhcRateToPort: text("bhc_rate_to_port"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const contractCargoDetails = pgTable("contract_cargo_details", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  cargoType: text("cargo_type").notNull(),
  expectedCargoPerYear: integer("expected_cargo_per_year"),
  assignedPlots: text("assigned_plots").array(), // Multi-select array
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const contractStorageCharges = pgTable("contract_storage_charges", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  storageFreeTime: integer("storage_free_time").notNull(), // in days
  chargePerDay: text("charge_per_day").notNull(), // after free time
  chargeApplicableDays: text("charge_applicable_days").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const contractSpecialConditions = pgTable("contract_special_conditions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  condition: text("condition").notNull(),
  responsibility: text("responsibility").notNull(),
  charge: text("charge").notNull(),
  chargeType: text("charge_type").notNull(), // "Including" or "Excluding"
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Master Data Tables for Dropdowns
export const countries = pgTable("countries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(), // ISO country code
  flagIcon: text("flag_icon"), // Unicode flag or icon path
  isActive: boolean("is_active").notNull().default(true),
});

export const states = pgTable("states", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  countryId: integer("country_id").notNull().references(() => countries.id),
  isActive: boolean("is_active").notNull().default(true),
});

export const cargoTypes = pgTable("cargo_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

export const plots = pgTable("plots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  plotNumber: text("plot_number").notNull().unique(),
  plotName: text("plot_name").notNull(),
  terminalId: integer("terminal_id").notNull().references(() => terminals.id),
  area: text("area"), // plot area
  isActive: boolean("is_active").notNull().default(true),
});

// Relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  terminal: one(terminals, {
    fields: [customers.terminalId],
    references: [terminals.id],
  }),
  port: one(ports, {
    fields: [customers.portId],
    references: [ports.id],
  }),
  createdByUser: one(users, {
    fields: [customers.createdBy],
    references: [users.id],
    relationName: "CustomerCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [customers.updatedBy],
    references: [users.id],
    relationName: "CustomerUpdatedBy",
  }),
  contacts: many(customerContacts),
  addresses: many(customerAddresses),
  contracts: many(contracts),
}));

export const customerContactsRelations = relations(customerContacts, ({ one }) => ({
  customer: one(customers, {
    fields: [customerContacts.customerId],
    references: [customers.id],
  }),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  customer: one(customers, {
    fields: [customerAddresses.customerId],
    references: [customers.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  customer: one(customers, {
    fields: [contracts.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {
    fields: [contracts.createdBy],
    references: [users.id],
    relationName: "ContractCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [contracts.updatedBy],
    references: [users.id],
    relationName: "ContractUpdatedBy",
  }),
  tariffs: many(contractTariffs),
  cargoDetails: many(contractCargoDetails),
  storageCharges: many(contractStorageCharges),
  specialConditions: many(contractSpecialConditions),
}));

export const contractTariffsRelations = relations(contractTariffs, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractTariffs.contractId],
    references: [contracts.id],
  }),
}));

export const contractCargoDetailsRelations = relations(contractCargoDetails, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractCargoDetails.contractId],
    references: [contracts.id],
  }),
}));

export const contractStorageChargesRelations = relations(contractStorageCharges, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractStorageCharges.contractId],
    references: [contracts.id],
  }),
}));

export const contractSpecialConditionsRelations = relations(contractSpecialConditions, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractSpecialConditions.contractId],
    references: [contracts.id],
  }),
}));

export const statesRelations = relations(states, ({ one }) => ({
  country: one(countries, {
    fields: [states.countryId],
    references: [countries.id],
  }),
}));

export const plotsRelations = relations(plots, ({ one }) => ({
  terminal: one(terminals, {
    fields: [plots.terminalId],
    references: [terminals.id],
  }),
}));

// Validation schemas with Indian format validation
const indianPANRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const indianGSTRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const indianMobileRegex = /^[6-9]\d{9}$/;
const indianPincodeRegex = /^[1-9][0-9]{5}$/;

export const insertCustomerSchema = createInsertSchema(customers).pick({
  customerName: true,
  displayName: true,
  country: true,
  state: true,
  pan: true,
  gst: true,
  email: true,
  terminalId: true,
  portId: true,
  createdBy: true,
}).extend({
  pan: z.string().regex(indianPANRegex, "Please enter a valid PAN number (e.g., ABCDE1234F)"),
  gst: z.string().regex(indianGSTRegex, "Please enter a valid GST number"),
  email: z.string().email("Please enter a valid email address"),
});

export const updateCustomerSchema = createInsertSchema(customers).pick({
  customerName: true,
  displayName: true,
  country: true,
  state: true,
  pan: true,
  gst: true,
  email: true,
  terminalId: true,
  status: true,
  updatedBy: true,
}).partial();

export const insertCustomerContactSchema = createInsertSchema(customerContacts).pick({
  customerId: true,
  contactName: true,
  designation: true,
  email: true,
  contactNumber: true,
  isPrimaryContact: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
  contactNumber: z.string().regex(indianMobileRegex, "Please enter a valid 10-digit mobile number"),
});

export const insertCustomerAddressSchema = createInsertSchema(customerAddresses).pick({
  customerId: true,
  addressType: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  country: true,
  pincode: true,
  isDefaultAddress: true,
}).extend({
  pincode: z.string().regex(indianPincodeRegex, "Please enter a valid 6-digit pincode"),
});

export const insertContractSchema = createInsertSchema(contracts).pick({
  customerId: true,
  contractNumber: true,
  contractCopyUrl: true,
  validFrom: true,
  validTo: true,
  createdBy: true,
});

export const insertContractTariffSchema = createInsertSchema(contractTariffs).pick({
  contractId: true,
  chcRateToCustomer: true,
  chcRateToPort: true,
  bhcRateToCustomer: true,
  bhcRateToPort: true,
});

export const insertContractCargoDetailSchema = createInsertSchema(contractCargoDetails).pick({
  contractId: true,
  cargoType: true,
  expectedCargoPerYear: true,
  assignedPlots: true,
});

export const insertContractStorageChargeSchema = createInsertSchema(contractStorageCharges).pick({
  contractId: true,
  storageFreeTime: true,
  chargePerDay: true,
  chargeApplicableDays: true,
});

export const insertContractSpecialConditionSchema = createInsertSchema(contractSpecialConditions).pick({
  contractId: true,
  condition: true,
  responsibility: true,
  charge: true,
  chargeType: true,
});

export const insertCountrySchema = createInsertSchema(countries).pick({
  name: true,
  code: true,
  flagIcon: true,
  isActive: true,
});

export const insertStateSchema = createInsertSchema(states).pick({
  name: true,
  code: true,
  countryId: true,
  isActive: true,
});

export const insertCargoTypeSchema = createInsertSchema(cargoTypes).pick({
  name: true,
  description: true,
  isActive: true,
});

export const insertPlotSchema = createInsertSchema(plots).pick({
  plotNumber: true,
  plotName: true,
  terminalId: true,
  area: true,
  isActive: true,
});

// Type definitions
export type Customer = typeof customers.$inferSelect;
export type CustomerContact = typeof customerContacts.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type ContractTariff = typeof contractTariffs.$inferSelect;
export type ContractCargoDetail = typeof contractCargoDetails.$inferSelect;
export type ContractStorageCharge = typeof contractStorageCharges.$inferSelect;
export type ContractSpecialCondition = typeof contractSpecialConditions.$inferSelect;
export type Country = typeof countries.$inferSelect;
export type State = typeof states.$inferSelect;
export type CargoType = typeof cargoTypes.$inferSelect;
export type Plot = typeof plots.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;
export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type InsertCustomerAddress = z.infer<typeof insertCustomerAddressSchema>;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type InsertContractTariff = z.infer<typeof insertContractTariffSchema>;
export type InsertContractCargoDetail = z.infer<typeof insertContractCargoDetailSchema>;
export type InsertContractStorageCharge = z.infer<typeof insertContractStorageChargeSchema>;
export type InsertContractSpecialCondition = z.infer<typeof insertContractSpecialConditionSchema>;
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type InsertState = z.infer<typeof insertStateSchema>;
export type InsertCargoType = z.infer<typeof insertCargoTypeSchema>;
export type InsertPlot = z.infer<typeof insertPlotSchema>;

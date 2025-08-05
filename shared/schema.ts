import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
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
  terminalName: text("terminal_name").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
});

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
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPassword: true,
  fromEmail: true,
  fromName: true,
  enableTLS: true,
});

// Type definitions
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
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertPort = z.infer<typeof insertPortSchema>;
export type InsertPortAdminContact = z.infer<typeof insertPortAdminContactSchema>;
export type InsertEmailConfiguration = z.infer<typeof insertEmailConfigurationSchema>;
export type UpdatePortAdminContact = z.infer<typeof updatePortAdminContactSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type InsertTerminal = z.infer<typeof insertTerminalSchema>;
export type UpdateTerminal = z.infer<typeof updateTerminalSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Subscription Types Table
export const subscriptionTypes = pgTable("subscription_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(), // "1 Month", "12 Months", "24 Months", "48 Months"
  months: integer("months").notNull(), // 1, 12, 24, 48
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertSubscriptionTypeSchema = createInsertSchema(subscriptionTypes);
export type InsertSubscriptionType = z.infer<typeof insertSubscriptionTypeSchema>;
export type SubscriptionType = typeof subscriptionTypes.$inferSelect;

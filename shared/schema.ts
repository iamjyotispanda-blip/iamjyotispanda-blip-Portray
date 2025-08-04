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

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPortSchema = createInsertSchema(ports).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Port = typeof ports.$inferSelect;
export type InsertPort = z.infer<typeof insertPortSchema>;

export type PortAdminContact = typeof portAdminContacts.$inferSelect;
export type InsertPortAdminContact = z.infer<typeof insertPortAdminContactSchema>;
export type UpdatePortAdminContact = z.infer<typeof updatePortAdminContactSchema>;

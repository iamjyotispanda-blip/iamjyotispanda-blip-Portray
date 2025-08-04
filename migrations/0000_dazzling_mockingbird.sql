CREATE TABLE "email_configurations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_configurations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"smtp_host" text NOT NULL,
	"smtp_port" integer NOT NULL,
	"smtp_user" text NOT NULL,
	"smtp_password" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text NOT NULL,
	"enable_tls" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organizations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_name" text NOT NULL,
	"display_name" text NOT NULL,
	"organization_code" text NOT NULL,
	"register_office" text NOT NULL,
	"country" text NOT NULL,
	"telephone" text,
	"fax" text,
	"website" text,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_organization_name_unique" UNIQUE("organization_name"),
	CONSTRAINT "organizations_display_name_unique" UNIQUE("display_name"),
	CONSTRAINT "organizations_organization_code_unique" UNIQUE("organization_code")
);
--> statement-breakpoint
CREATE TABLE "port_admin_contacts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "port_admin_contacts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"port_id" integer NOT NULL,
	"contact_name" text NOT NULL,
	"designation" text NOT NULL,
	"email" text NOT NULL,
	"mobile_number" text NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"verification_token" text,
	"verification_token_expires" timestamp,
	"is_verified" boolean DEFAULT false NOT NULL,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "port_admin_contacts_email_unique" UNIQUE("email"),
	CONSTRAINT "port_admin_contacts_verification_token_unique" UNIQUE("verification_token")
);
--> statement-breakpoint
CREATE TABLE "ports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"port_name" text NOT NULL,
	"display_name" varchar(6) NOT NULL,
	"organization_id" integer NOT NULL,
	"address" text NOT NULL,
	"country" text NOT NULL,
	"state" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "port_admin_contacts" ADD CONSTRAINT "port_admin_contacts_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "port_admin_contacts" ADD CONSTRAINT "port_admin_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ports" ADD CONSTRAINT "ports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
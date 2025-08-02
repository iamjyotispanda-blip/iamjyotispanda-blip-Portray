# Overview

This is a full-stack web application called "PortRay" - a Port Management System built with React frontend and .NET Core C# backend. The application provides user authentication with email verification and a dashboard interface for managing port operations. It uses modern web technologies including TypeScript, Tailwind CSS, shadcn/ui components on the frontend, and ASP.NET Core Identity with Entity Framework and PostgreSQL on the backend.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **Routing**: Uses Wouter for client-side routing with protected routes
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and dark/light theme support
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Framework**: ASP.NET Core 8.0 with C#
- **Database ORM**: Entity Framework Core with PostgreSQL (Npgsql provider)
- **Authentication**: ASP.NET Core Identity with JWT Bearer tokens
- **Email Service**: MailKit/MimeKit for email verification and password reset
- **API Structure**: RESTful API endpoints under `/api` prefix with controllers
- **Security**: BCrypt password hashing, JWT tokens, CORS configured for frontend
- **Database**: PostgreSQL with automatic migrations and connection string handling

## Database Design
- **Users Table**: Stores user credentials, profile information, roles, and account status
- **Sessions Table**: Manages authentication tokens with expiration tracking
- **Schema**: Shared TypeScript schema definitions using Drizzle and Zod for validation

## Authentication System
- **Strategy**: ASP.NET Core Identity with JWT Bearer tokens
- **Email Verification**: Required email confirmation before login with HTML email templates
- **Password Reset**: Secure token-based password reset via email
- **Session Management**: JWT tokens with 7-day expiration and claims-based authorization
- **Route Protection**: JWT Bearer authentication with [Authorize] attributes
- **Password Security**: ASP.NET Core Identity password hashing with configurable policies

## Development Setup
- **Build Process**: Vite for frontend bundling, .NET Core SDK for backend compilation
- **Type Safety**: Full TypeScript coverage on frontend, C# with nullable reference types on backend
- **Path Aliases**: Configured aliases for clean imports (@, @shared, @assets) on frontend
- **Environment**: Supports both development and production with separate configuration files
- **Dual Stack**: Frontend runs on port 5000, .NET Core API runs on port 5001

# External Dependencies

## Database
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Entity Framework Core**: Object-relational mapping with migrations and Identity integration
- **Npgsql**: PostgreSQL provider for .NET with SSL/TLS support
- **Connection**: Environment-based DATABASE_URL with automatic SSL configuration

## UI and Styling
- **Radix UI**: Headless UI primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library for rapid development

## Authentication and Security
- **ASP.NET Core Identity**: Complete authentication and user management system
- **JWT Bearer Tokens**: Secure token-based authentication with configurable expiration
- **MailKit/MimeKit**: Professional email services for verification and password reset
- **BCrypt.NET**: Secure password hashing compatible with ASP.NET Core Identity

## Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking across the entire codebase
- **React Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Wouter**: Lightweight client-side routing

## Hosting and Deployment
- **Replit**: Development environment with integrated deployment
- **.NET Core Runtime**: Cross-platform runtime for the ASP.NET Core backend
- **Static Assets**: Frontend built and served as static files in production
- **Environment Variables**: Secure configuration for database, JWT secrets, and email credentials
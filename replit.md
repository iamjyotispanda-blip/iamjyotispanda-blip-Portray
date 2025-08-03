# Overview

This is a full-stack web application called "PortRay" - a Port Management System built with React frontend and .NET Core C# backend. The application provides user authentication with email verification and a dashboard interface for managing port operations. It uses modern web technologies including TypeScript, Tailwind CSS, shadcn/ui components on the frontend, and ASP.NET Core Identity with Entity Framework and PostgreSQL on the backend.

# User Preferences

Preferred communication style: Simple, everyday language.
UI Header Styling: Remove navigation details in header sections, use smaller titles (text-xl instead of text-3xl) for page headers, remove descriptive subtitles like "Manage port operators and their facilities". Remove all page configuration details and breadcrumbs from the top header bar - keep headers completely clean without showing current page context. Remove card section headers and descriptions (like "Organizations (1)" and "Organization records and details") from all pages.
Form Handling: Port add and edit forms should be separate pages with navigation (not slider/sheet forms). Organization forms use slider/sheet forms.
Button Heights: Login page buttons use h-10 height, all other buttons use h-8 height consistently.
Search Functionality: Organization and port pages require search functionality with real-time filtering.
Layout Spacing: Minimal gaps between buttons and cards throughout application (space-y-2).

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **Routing**: Uses Wouter for client-side routing with protected routes including dedicated port form pages
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and dark/light theme support
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Navigation**: Port forms use dedicated pages (/ports/new, /ports/edit/:id) instead of modal forms

## Backend Architecture
- **Framework**: ASP.NET Core 8.0 with C#
- **Database ORM**: Entity Framework Core with PostgreSQL (Npgsql provider)
- **Authentication**: ASP.NET Core Identity with JWT Bearer tokens
- **Email Service**: MailKit/MimeKit for email verification and password reset
- **API Structure**: RESTful API endpoints under `/api` prefix with controllers
- **Security**: BCrypt password hashing, JWT tokens, CORS configured for frontend
- **Database**: PostgreSQL with automatic migrations and connection string handling

## Database Design
- **ApplicationUser Table**: Entity Framework Identity table with custom fields:
  - `Id`, `Name`, `Email`, `PasswordHash`, `Role`, `IsVerified`, `VerificationToken`
  - Includes predefined SystemAdmin user (superadmin@Portray.com / Csmpl@123)
- **Identity Tables**: Standard ASP.NET Core Identity tables for roles, claims, tokens
- **Schema**: C# models with Entity Framework annotations and data seeding

## Authentication System
- **Strategy**: Session-based authentication with JWT-like tokens
- **Admin Access**: Predefined system admin (superadmin@Portray.com / Csmpl@123)
- **Session Management**: Token-based sessions with proper authorization headers
- **Route Protection**: Middleware authentication for protected routes
- **User Profile**: Enhanced header displaying user info, role, email, and logout

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
# Overview

This is a full-stack web application called "PortRay" - a Customer Success Management (CSM) platform built with React frontend and Express.js backend. The application provides user authentication and a dashboard interface for managing customer success operations. It uses modern web technologies including TypeScript, Tailwind CSS, shadcn/ui components, and Drizzle ORM for database operations.

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
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Authentication**: JWT token-based authentication with session management
- **Password Security**: bcrypt for password hashing
- **API Structure**: RESTful API endpoints under `/api` prefix
- **Development**: Hot reloading with Vite integration in development mode

## Database Design
- **Users Table**: Stores user credentials, profile information, roles, and account status
- **Sessions Table**: Manages authentication tokens with expiration tracking
- **Schema**: Shared TypeScript schema definitions using Drizzle and Zod for validation

## Authentication System
- **Strategy**: JWT token-based authentication stored in localStorage
- **Session Management**: Server-side session tracking with token validation
- **Route Protection**: Client-side route guards that redirect unauthenticated users to login
- **Password Security**: Salted and hashed passwords using bcrypt

## Development Setup
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Type Safety**: Full TypeScript coverage across frontend, backend, and shared schemas
- **Path Aliases**: Configured aliases for clean imports (@, @shared, @assets)
- **Environment**: Supports both development and production environments

# External Dependencies

## Database
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Drizzle ORM**: Type-safe database operations and schema management
- **Connection**: Environment-based DATABASE_URL configuration

## UI and Styling
- **Radix UI**: Headless UI primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library for rapid development

## Authentication and Security
- **bcrypt**: Password hashing and verification
- **JWT**: JSON Web Tokens for session management (implementation in progress)
- **Zod**: Runtime type validation for forms and API requests

## Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking across the entire codebase
- **React Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Wouter**: Lightweight client-side routing

## Hosting and Deployment
- **Replit**: Development environment with integrated deployment
- **Node.js**: Runtime environment for the Express.js backend
- **Static Assets**: Frontend built and served as static files in production
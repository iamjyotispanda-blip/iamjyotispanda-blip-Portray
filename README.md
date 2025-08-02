# PortRay - Port Management System

A modern, professional Port Management System featuring a React frontend with .NET Core C# backend.

## Architecture

### Frontend (Port 5000)
- **React 18** with TypeScript and Vite
- **Tailwind CSS** with shadcn/ui components
- **Auto-scrolling feature carousel** showcasing port capabilities
- **Dark/Light theme support** with automatic logo switching
- **Glass morphism UI** with professional port management theme

### Backend (Port 5001)
- **ASP.NET Core 8.0** with C#
- **Entity Framework Core** with PostgreSQL
- **ASP.NET Core Identity** for user management
- **JWT Bearer Authentication** with email verification
- **MailKit/MimeKit** for professional email services

## Key Features

### Login Page
- **Professional hero section** with PortRay branding
- **Live Port Status panel** with real-time vessel tracking
- **Feature carousel** highlighting four core capabilities:
  - Vessel & Berth Management
  - Cargo & Yard Management  
  - Rail & Road Logistics
  - Auto-Invoice & Financial Analysis
- **Responsive design** with stretched panels and larger icons

### Authentication System
- **Email verification** required before login
- **Password reset** functionality via email
- **JWT token-based** authentication with 7-day expiration
- **Professional HTML email templates** with PortRay branding

### API Endpoints
- `POST /api/auth/register` - User registration with email verification
- `POST /api/auth/login` - User login with JWT token response
- `GET /api/auth/confirm-email` - Email confirmation endpoint
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation
- `GET /api/auth/me` - Get current user information
- `GET /api/test` - API health check endpoint

## Environment Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# JWT Authentication
JWT_SECRET_KEY=YourSecretKeyHereMustBe32CharactersLong!

# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=PortRay Support

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5000
```

## Running the Application

### Development Mode
1. **Frontend**: Runs automatically on port 5000 via existing workflow
2. **Backend**: Run `./start-backend.sh` or manually:
   ```bash
   cd backend
   dotnet run --urls http://0.0.0.0:5001
   ```

### Database Setup
- PostgreSQL database is automatically configured via DATABASE_URL
- Entity Framework handles schema creation and migrations
- ASP.NET Core Identity tables are created automatically

## Project Structure

```
├── backend/                 # .NET Core API
│   ├── Controllers/         # API controllers
│   ├── Models/             # Data models and DTOs
│   ├── Services/           # Business logic services
│   ├── Data/               # Entity Framework context
│   └── Program.cs          # Application startup
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components
│       ├── pages/         # Page components
│       └── lib/           # Utilities and configuration
├── attached_assets/        # PortRay logo assets
└── shared/                # Shared TypeScript schemas
```

## Next Steps

1. **Email Configuration**: Set up SMTP credentials for email verification
2. **Frontend Integration**: Update React app to use .NET Core API endpoints
3. **Dashboard Development**: Build port management dashboard interface
4. **Testing**: Implement comprehensive API and frontend testing
5. **Deployment**: Configure production deployment with environment secrets
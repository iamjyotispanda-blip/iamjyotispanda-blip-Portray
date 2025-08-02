# System Administrator Login Guide

## Predefined Admin Credentials

**Email**: `superadmin@Portray.com`  
**Password**: `Csmpl@123`  
**Role**: `SystemAdmin`

## How to Test Login

### 1. Frontend Login (Recommended)
1. Open the application at http://localhost:5000
2. Click on the login form
3. Enter the admin credentials:
   - Email: `superadmin@Portray.com`
   - Password: `Csmpl@123`
4. Click "Sign In"
5. You should be redirected to `/portal/welcome` (Admin Portal)

### 2. Direct API Test
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@Portray.com","password":"Csmpl@123"}'
```

Expected Response:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "redirectPath": "/portal/welcome",
  "user": {
    "id": "user_id",
    "email": "superadmin@Portray.com",
    "role": "SystemAdmin"
  }
}
```

## Expected Behavior

1. **Authentication**: User is authenticated via ASP.NET Core Identity
2. **Role Check**: System verifies the user has `SystemAdmin` role  
3. **JWT Token**: Backend generates and returns JWT token
4. **Redirect**: Frontend redirects to `/portal/welcome`
5. **Admin Portal**: User sees the comprehensive admin dashboard

## Admin Portal Features

- **User Management**: Manage system users and roles
- **Security & Access**: Configure security settings
- **System Configuration**: System-wide settings
- **Analytics & Reports**: View system analytics
- **Live Port Operations**: Real-time port statistics
- **System Status**: Monitor system health

## Troubleshooting

If login fails:
1. Ensure .NET backend is running on port 5001
2. Check that database connection is working
3. Verify the admin user was created properly
4. Check backend logs for authentication errors

The system automatically creates the admin user if it doesn't exist when the admin email is used for login.
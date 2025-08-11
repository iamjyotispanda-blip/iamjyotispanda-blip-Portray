# Dynamic Role & Permission Management Guide

## Overview

This system allows you to dynamically create and manage roles with flexible permissions, providing a scalable approach to access control in your port management system.

## Key Features

### 1. Role Templates
Pre-defined role templates with common permission sets:

- **System Administrator**: Full system access
- **Port Administrator**: Port-level management
- **Terminal Operator**: Operations-focused access
- **Customer User**: Read-only customer portal access
- **Supervisor**: Management with reporting capabilities

### 2. Permission Structure

Permissions follow this format: `section:subsection:levels`

**Examples:**
- `dashboard:read,write,manage`
- `users-access:users:read,write`
- `port-management:terminals:manage`

**Permission Levels:**
- **Read**: View data and reports
- **Write**: Create and edit records  
- **Manage**: Full control including delete and configuration

### 3. Dynamic Role Creation

#### Using Templates:
1. Go to Dynamic Permissions page
2. Click "Create Role"
3. Select a template from the dropdown
4. Customize permissions as needed
5. Save the role

#### Custom Roles:
1. Create role from scratch
2. Define role name and display name
3. Manually assign specific permissions
4. Save and assign to users

## Permission Categories

### System Management
- `dashboard:read,write,manage`
- `users-access:users:read,write,manage`
- `users-access:roles:read,write,manage`
- `configuration:system:read,write,manage`

### Port Operations
- `port-management:ports:read,write,manage`
- `port-management:terminals:read,write,manage`
- `vessel-management:read,write,manage`
- `cargo-handling:read,write,manage`

### Customer Management
- `customers:read,write,manage`
- `contracts:read,write,manage`
- `invoices:read,write,manage`

### Reporting & Analytics
- `reports:read,write,manage`
- `analytics:read,write`
- `audit-logs:read`

## Best Practices

### 1. Role Design
- Keep roles focused on specific job functions
- Use descriptive names (e.g., "Terminal Operator" not "TO")
- Start with templates and customize as needed
- Regular review and cleanup of unused roles

### 2. Permission Assignment
- Follow principle of least privilege
- Grant minimum permissions needed for the job
- Use hierarchical permissions (read < write < manage)
- Document role purposes and permission rationale

### 3. User Management
- Assign users to appropriate roles based on responsibilities
- Regular audit of user role assignments
- Deactivate roles for terminated employees
- Use role-based access for consistency

## Implementation Examples

### Example 1: Create Port Supervisor Role
```typescript
const portSupervisorRole = {
  name: "PortSupervisor",
  displayName: "Port Supervisor",
  description: "Supervises port operations with reporting access",
  permissions: [
    "dashboard:read,write",
    "port-management:ports:read,write",
    "port-management:terminals:read,write",
    "reports:read,write",
    "users:read"
  ]
}
```

### Example 2: Create Customer Service Role
```typescript
const customerServiceRole = {
  name: "CustomerService",
  displayName: "Customer Service Representative", 
  description: "Handles customer inquiries and basic contract management",
  permissions: [
    "dashboard:read",
    "customers:read,write",
    "contracts:read",
    "invoices:read",
    "reports:read"
  ]
}
```

## Checking Permissions in Code

### Frontend Permission Checks
```typescript
// In components, use the permission checking hook
const { canRead, canWrite, canManage } = usePermissions();

// Check specific permissions
if (canManage("users-access", "roles")) {
  // Show role management UI
}

if (canWrite("port-management", "terminals")) {
  // Show terminal edit form
}
```

### Backend Permission Validation
```typescript
// In API routes, validate permissions
app.get("/api/sensitive-data", authenticateToken, checkPermission("reports", "read"), (req, res) => {
  // Handle request
});

app.post("/api/create-port", authenticateToken, checkPermission("port-management", "manage"), (req, res) => {
  // Handle port creation
});
```

## Permission Inheritance

### Hierarchical Access
- **Manage** implies **Write** and **Read**
- **Write** implies **Read**
- Parent permissions can include child permissions

### Section-Level Permissions
- `users-access:read,write,manage` grants access to all sub-sections
- More granular: `users-access:users:read` + `users-access:roles:write`

## Monitoring & Auditing

### Role Usage Analytics
- Track which roles are most/least used
- Monitor permission utilization
- Identify over-privileged accounts

### Audit Logging
- Log role assignments and changes
- Track permission usage
- Monitor access patterns

### Regular Reviews
- Quarterly role permission reviews
- Annual access certification
- Remove unused roles and permissions

## Migration Strategy

### From Static to Dynamic Roles
1. **Assessment**: Document current roles and permissions
2. **Mapping**: Map existing roles to new permission structure
3. **Templates**: Create templates for common roles
4. **Testing**: Test role functionality in development
5. **Migration**: Gradually migrate users to new roles
6. **Cleanup**: Remove old static roles

### User Communication
- Notify users of role changes
- Provide training on new permission system
- Maintain documentation and help resources

## Troubleshooting

### Common Issues
1. **Permission Denied Errors**: Check role assignments and permission levels
2. **Missing Features**: Verify user has required read/write/manage permissions
3. **Role Conflicts**: Ensure single role per user or proper role hierarchy

### Debug Tools
- Use browser dev tools to check user permissions
- Review API responses for permission validation
- Check server logs for access denied messages

## Future Enhancements

### Planned Features
- **Conditional Permissions**: Time-based and location-based access
- **Permission Templates**: Reusable permission sets
- **Bulk Role Management**: Import/export role configurations
- **Advanced Auditing**: Detailed permission usage analytics
- **Role Approval Workflow**: Multi-step approval for sensitive roles

This dynamic permission system provides the flexibility to grow with your organization while maintaining security and proper access control.
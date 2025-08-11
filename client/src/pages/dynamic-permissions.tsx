import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Edit, Trash2, Users, Shield, Settings, Eye, Pencil, Wrench } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Role } from "@shared/schema";

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: string[];
}

// Dynamic permission templates for different roles
const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: "system-admin",
    name: "System Administrator",
    description: "Full system access with all permissions",
    category: "System",
    permissions: [
      "dashboard:read,write,manage",
      "users-access:users:read,write,manage",
      "users-access:roles:read,write,manage",
      "users-access:permissions:read,write,manage",
      "configuration:system:read,write,manage",
      "configuration:email:read,write,manage",
      "configuration:pages:read,write,manage",
      "menu-management:read,write,manage"
    ]
  },
  {
    id: "port-admin",
    name: "Port Administrator",
    description: "Port-level administration with limited system access",
    category: "Port Management",
    permissions: [
      "dashboard:read,write",
      "port-management:ports:read,write,manage",
      "port-management:terminals:read,write,manage",
      "customers:read,write,manage",
      "contracts:read,write,manage"
    ]
  },
  {
    id: "terminal-operator",
    name: "Terminal Operator",
    description: "Terminal operations with limited access",
    category: "Operations",
    permissions: [
      "dashboard:read",
      "terminals:operations:read,write",
      "vessel-management:read,write",
      "cargo-handling:read,write"
    ]
  },
  {
    id: "customer-user",
    name: "Customer User",
    description: "Customer portal access with read-only permissions",
    category: "Customer",
    permissions: [
      "dashboard:read",
      "contracts:read",
      "invoices:read",
      "reports:read"
    ]
  },
  {
    id: "supervisor",
    name: "Supervisor",
    description: "Supervisory access with reporting capabilities",
    category: "Management",
    permissions: [
      "dashboard:read,write",
      "reports:read,write",
      "users:read",
      "operations:read,write"
    ]
  }
];

const PERMISSION_LEVELS = [
  { value: "read", label: "Read", icon: Eye, color: "bg-blue-100 text-blue-800" },
  { value: "write", label: "Write", icon: Pencil, color: "bg-green-100 text-green-800" },
  { value: "manage", label: "Manage", icon: Wrench, color: "bg-purple-100 text-purple-800" }
];

export default function DynamicPermissionsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleData, setNewRoleData] = useState({
    name: "",
    displayName: "",
    description: "",
    permissions: [] as string[]
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  // Get user count (placeholder for now)
  const userCount = 0;

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: typeof newRoleData) => {
      return apiRequest("POST", "/api/roles", roleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      setShowCreateRole(false);
      setNewRoleData({ name: "", displayName: "", description: "", permissions: [] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    }
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = PERMISSION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setNewRoleData({
        name: template.name.replace(/\s+/g, ""),
        displayName: template.name,
        description: template.description,
        permissions: template.permissions
      });
      setSelectedTemplate(templateId);
    }
  };

  const parsePermission = (permission: string) => {
    const parts = permission.split(":");
    const levels = parts[parts.length - 1].split(",");
    const path = parts.slice(0, -1).join(":");
    
    return {
      path,
      levels,
      display: `${path} (${levels.join(", ")})`
    };
  };

  const getPermissionStats = (rolePermissions: string[]) => {
    const stats = { read: 0, write: 0, manage: 0 };
    rolePermissions.forEach(permission => {
      const levels = permission.split(":").pop()?.split(",") || [];
      levels.forEach(level => {
        if (level in stats) {
          stats[level as keyof typeof stats]++;
        }
      });
    });
    return stats;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dynamic Role & Permission Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create and manage roles with flexible permissions
            </p>
          </div>
          <Button
            onClick={() => setShowCreateRole(true)}
            className="h-8"
            data-testid="button-create-role"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-xs text-gray-500">Total Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{userCount}</p>
                  <p className="text-xs text-gray-500">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{PERMISSION_TEMPLATES.length}</p>
                  <p className="text-xs text-gray-500">Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {roles.reduce((total, role) => total + (role.permissions?.length || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-500">Permissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Permission Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {PERMISSION_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => handleTemplateSelect(template.id)}
                  data-testid={`template-${template.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{template.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {template.permissions.length} permissions
                    </span>
                    <Button variant="outline" size="sm" className="h-6 text-xs">
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Existing Roles with Dynamic Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roles.map((role) => {
                const stats = getPermissionStats(role.permissions || []);
                
                return (
                  <div
                    key={role.id}
                    className="border rounded-lg p-4"
                    data-testid={`role-card-${role.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{role.displayName}</h3>
                          <p className="text-sm text-gray-600">@{role.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {role.isSystem && (
                          <Badge variant="secondary" className="text-xs">
                            System Role
                          </Badge>
                        )}
                        <Badge
                          variant={role.isActive ? "default" : "secondary"}
                          className={role.isActive ? "bg-green-100 text-green-800" : ""}
                        >
                          {role.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    {/* Permission Statistics */}
                    <div className="flex items-center space-x-4 mb-3">
                      {PERMISSION_LEVELS.map((level) => {
                        const count = stats[level.value as keyof typeof stats];
                        const Icon = level.icon;
                        
                        return (
                          <div key={level.value} className="flex items-center space-x-1">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{count}</span>
                            <span className="text-xs text-gray-500">{level.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Permission Details */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Permissions:</Label>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {(role.permissions || []).slice(0, 4).map((permission, index) => {
                          const parsed = parsePermission(permission);
                          return (
                            <div
                              key={index}
                              className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded"
                            >
                              {parsed.display}
                            </div>
                          );
                        })}
                        {(role.permissions || []).length > 4 && (
                          <div className="text-xs text-gray-500 p-2">
                            +{(role.permissions || []).length - 4} more...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Create Role Dialog */}
        {showCreateRole && (
          <Card className="fixed inset-0 z-50 bg-white dark:bg-gray-900 m-4 overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Role</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateRole(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label>Start with Template (Optional)</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template or start from scratch" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} - {template.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name (Key)</Label>
                  <Input
                    id="role-name"
                    value={newRoleData.name}
                    onChange={(e) => setNewRoleData({...newRoleData, name: e.target.value})}
                    placeholder="e.g., PortManager"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-display-name">Display Name</Label>
                  <Input
                    id="role-display-name"
                    value={newRoleData.displayName}
                    onChange={(e) => setNewRoleData({...newRoleData, displayName: e.target.value})}
                    placeholder="e.g., Port Manager"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData({...newRoleData, description: e.target.value})}
                  placeholder="Describe the role and its responsibilities..."
                  rows={3}
                />
              </div>

              {/* Permissions Preview */}
              <div className="space-y-2">
                <Label>Permissions ({newRoleData.permissions.length})</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {newRoleData.permissions.length === 0 ? (
                    <p className="text-sm text-gray-500">No permissions assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {newRoleData.permissions.map((permission, index) => (
                        <div key={index} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          {parsePermission(permission).display}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateRole(false)}
                  className="h-8"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createRoleMutation.mutate(newRoleData)}
                  disabled={createRoleMutation.isPending || !newRoleData.name || !newRoleData.displayName}
                  className="h-8"
                  data-testid="button-save-role"
                >
                  {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
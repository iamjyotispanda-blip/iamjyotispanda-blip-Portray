import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, Edit, ToggleLeft, ToggleRight, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { Role } from "@shared/schema";

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

// Default role templates
const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "system-admin",
    name: "System Administrator",
    description: "Full system access with all administrative privileges",
    permissions: [
      "dashboard:read,write,manage",
      "users-access:users:read,write,manage",
      "users-access:roles:read,write,manage",
      "configuration:system:read,write,manage",
      "configuration:email:read,write,manage",
      "configuration:pages:read,write,manage",
      "configuration:menu:read,write,manage",
      "port-management:ports:read,write,manage",
      "port-management:terminals:read,write,manage",
      "customers:read,write,manage",
      "contracts:read,write,manage",
      "reports:read,write,manage"
    ]
  },
  {
    id: "port-admin",
    name: "Port Administrator",
    description: "Port-level administrative access",
    permissions: [
      "dashboard:read",
      "port-management:terminals:read,write,manage",
      "customers:read,write",
      "contracts:read,write",
      "reports:read"
    ]
  },
  {
    id: "terminal-operator",
    name: "Terminal Operator",
    description: "Terminal operations and basic access",
    permissions: [
      "dashboard:read",
      "port-management:terminals:read,write",
      "customers:read",
      "contracts:read"
    ]
  },
  {
    id: "customer-user",
    name: "Customer User",
    description: "Customer portal access with limited permissions",
    permissions: [
      "dashboard:read",
      "customers:read",
      "contracts:read"
    ]
  },
  {
    id: "supervisor",
    name: "Supervisor",
    description: "Supervisory access with monitoring capabilities",
    permissions: [
      "dashboard:read,write",
      "port-management:terminals:read",
      "customers:read",
      "contracts:read",
      "reports:read"
    ]
  }
];

export default function RolesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    displayName: "",
    description: "",
    permissions: [],
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canRead, canWrite, canManage } = usePermissions();

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
    enabled: canRead("roles", "user-access")
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (data: Omit<RoleFormData, 'isActive'> & { isActive?: boolean }) => 
      apiRequest("/api/roles", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setShowCreateForm(false);
      resetForm();
      toast({
        title: "Success",
        description: "Role created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create role",
        variant: "destructive"
      });
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<RoleFormData> }) =>
      apiRequest(`/api/roles/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setShowEditForm(false);
      setEditingRole(null);
      resetForm();
      toast({
        title: "Success",
        description: "Role updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update role",
        variant: "destructive"
      });
    }
  });

  // Toggle role status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/roles/${id}/toggle-status`, "PATCH", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Success",
        description: "Role status updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update role status",
        variant: "destructive"
      });
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/roles/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Success",
        description: "Role deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete role",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      permissions: [],
      isActive: true
    });
    setSelectedTemplate("");
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = DEFAULT_ROLE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name.replace(/\s+/g, ''),
        displayName: template.name,
        description: template.description,
        permissions: [...template.permissions]
      }));
    }
  };

  const handleCreateRole = () => {
    if (!formData.name.trim() || !formData.displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "Role name and display name are required",
        variant: "destructive"
      });
      return;
    }

    createRoleMutation.mutate(formData);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      permissions: role.permissions || [],
      isActive: role.isActive
    });
    setShowEditForm(true);
  };

  const handleUpdateRole = () => {
    if (!editingRole || !formData.name.trim() || !formData.displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "Role name and display name are required",
        variant: "destructive"
      });
      return;
    }

    updateRoleMutation.mutate({ 
      id: editingRole.id, 
      data: formData 
    });
  };

  const handleToggleStatus = (roleId: number) => {
    toggleStatusMutation.mutate(roleId);
  };

  const handleDeleteRole = (roleId: number) => {
    deleteRoleMutation.mutate(roleId);
  };

  const filteredRoles = (roles as Role[]).filter((role: Role) =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canRead("roles", "user-access")) {
    return (
      <AppLayout title="Roles">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to view roles.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Roles">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Roles</span>
        </div>
        
        <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
          <div className="space-y-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-roles"
                />
              </div>
              {canWrite("roles", "user-access") && (
                <Sheet open={showCreateForm} onOpenChange={(open) => {
                  setShowCreateForm(open);
                  if (!open) resetForm();
                }}>
                  <SheetTrigger asChild>
                    <Button className="h-8" data-testid="button-add-role">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Role
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[95vw] sm:w-[500px] md:w-[600px] lg:w-[700px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Create New Role</SheetTitle>
                      <SheetDescription>
                        Create a new role with specific permissions and access levels
                      </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-4 mt-6 pb-6">
                  {/* Template Selection */}
                  <div className="space-y-2">
                    <Label>Role Template (Optional)</Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                      <SelectTrigger data-testid="select-role-template">
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_ROLE_TEMPLATES.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Role Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Manager"
                      data-testid="input-role-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="e.g., Department Manager"
                      data-testid="input-role-display-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the role responsibilities..."
                      data-testid="textarea-role-description"
                    />
                  </div>

                  {/* Permissions Display */}
                  {formData.permissions.length > 0 && (
                    <div className="space-y-2">
                      <Label>Permissions ({formData.permissions.length})</Label>
                      <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
                        {formData.permissions.map((permission, index) => (
                          <Badge key={index} variant="secondary" className="mr-1 mb-1">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      data-testid="switch-role-status"
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateForm(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateRole}
                      disabled={createRoleMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                    </Button>
                  </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>

            {/* Roles Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {rolesLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredRoles.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Roles Found</h3>
              <p className="text-gray-600">
                {searchTerm ? "No roles match your search criteria." : "No roles have been created yet."}
              </p>
            </div>
          ) : (
            filteredRoles.map((role: Role) => (
              <Card key={role.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1" data-testid={`text-role-name-${role.id}`}>
                        {role.displayName}
                      </h3>
                      <p className="text-sm text-gray-600" data-testid={`text-role-description-${role.id}`}>
                        {role.description || "No description"}
                      </p>
                    </div>
                    <Badge 
                      variant={role.isActive ? "default" : "secondary"} 
                      data-testid={`badge-role-status-${role.id}`}
                    >
                      {role.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Permissions Count */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">
                      Permissions: {role.permissions?.length || 0}
                    </p>
                    {role.permissions && role.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission.split(':')[0]}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t gap-2">
                    <div className="text-xs text-gray-500 order-2 sm:order-1">
                      Created: {format(new Date(role.createdAt), "MMM dd, yyyy")}
                    </div>
                    <div className="flex items-center space-x-2 order-1 sm:order-2">
                      {canWrite("roles", "user-access") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                          className="h-9 px-3"
                          data-testid={`button-edit-role-${role.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {canManage("roles", "user-access") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(role.id)}
                          className="h-9 px-3"
                          data-testid={`button-toggle-role-${role.id}`}
                        >
                          {role.isActive ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      
                      {canManage("roles", "user-access") && !role.isSystem && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="h-9 px-3" data-testid={`button-delete-role-${role.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Role</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the "{role.displayName}" role? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRole(role.id)}
                                className="bg-red-600 hover:bg-red-700"
                                data-testid="button-confirm-delete"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          </div>
        </div>
      </main>

      {/* Edit Form Sheet */}
        <Sheet open={showEditForm} onOpenChange={(open) => {
          setShowEditForm(open);
          if (!open) {
            setEditingRole(null);
            resetForm();
          }
        }}>
          <SheetContent className="w-[95vw] sm:w-[500px] md:w-[600px] lg:w-[700px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit Role</SheetTitle>
              <SheetDescription>
                Modify role details and permissions
              </SheetDescription>
            </SheetHeader>
            
            <div className="space-y-4 mt-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="editName">Role Name *</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Manager"
                  disabled={editingRole?.name === "SystemAdmin"}
                  data-testid="input-edit-role-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDisplayName">Display Name *</Label>
                <Input
                  id="editDisplayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g., Department Manager"
                  data-testid="input-edit-role-display-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role responsibilities..."
                  data-testid="textarea-edit-role-description"
                />
              </div>

              {/* Permissions Display */}
              {formData.permissions.length > 0 && (
                <div className="space-y-2">
                  <Label>Permissions ({formData.permissions.length})</Label>
                  <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
                    {formData.permissions.map((permission, index) => (
                      <Badge key={index} variant="secondary" className="mr-1 mb-1">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="editIsActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  disabled={editingRole?.isSystem}
                  data-testid="switch-edit-role-status"
                />
                <Label htmlFor="editIsActive">Active</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditForm(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateRole}
                  disabled={updateRoleMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
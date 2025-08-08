import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, Edit, ToggleLeft, ToggleRight, Trash2, Search, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import type { Role, Menu } from "@shared/schema";

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

export function RolesContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [selectedGLink, setSelectedGLink] = useState<string>("");
  const [selectedPLink, setSelectedPLink] = useState<string>("");
  const [permissionLevels, setPermissionLevels] = useState({
    read: false,
    write: false,
    manage: false,
  });
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    displayName: "",
    description: "",
    permissions: [],
    isActive: true,
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canCreate, canEdit, canManage, canRead, isLoading: permissionsLoading } = usePermissions();

  // Get all roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
  });

  // Get all menus for permission selection
  const { data: menus = [] } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
  });

  // Get already assigned menu combinations
  const getAssignedMenuCombinations = () => {
    return formData.permissions.map(permission => {
      const parts = permission.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`; // GLink:PLink combination
      }
      return '';
    }).filter(combo => combo !== '');
  };

  const assignedCombinations = getAssignedMenuCombinations();

  // Filter GLinks (parent menus) - only show GLinks that have available PLinks
  const availableGLinks = (menus as Menu[]).filter(menu => {
    if (menu.menuType !== 'glink' || !menu.isActive) return false;
    
    // Check if this GLink has any available PLinks (not already assigned)
    const childPLinks = (menus as Menu[]).filter(childMenu => 
      childMenu.menuType === 'plink' && 
      childMenu.isActive && 
      childMenu.parentId === menu.id
    );
    
    // Check if any child PLink is not already assigned
    return childPLinks.some(plink => {
      const combination = `${menu.name}:${plink.name}`;
      return !assignedCombinations.includes(combination);
    });
  });

  // Filter PLinks (child menus) based on selected GLink - exclude already assigned
  const availablePLinks = selectedGLink ? (menus as Menu[]).filter(menu => {
    // First check basic criteria
    if (menu.menuType !== 'plink' || 
        !menu.isActive || 
        menu.parentId?.toString() !== selectedGLink) {
      return false;
    }
    
    // Get the selected GLink name from all menus
    const selectedGLinkMenu = (menus as Menu[]).find(g => g.id.toString() === selectedGLink);
    if (!selectedGLinkMenu) {
      return false;
    }
    
    // Check if this PLink is already assigned to the selected GLink
    const combination = `${selectedGLinkMenu.name}:${menu.name}`;
    const isAlreadyAssigned = assignedCombinations.includes(combination);
    
    return !isAlreadyAssigned;
  }) : [];

  // Filter roles based on search term
  const filteredRoles = (roles as Role[]).filter((role: Role) =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Save role mutation
  const saveRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      if (editingRole) {
        return apiRequest("PUT", `/api/roles/${editingRole.id}`, data);
      } else {
        return apiRequest("POST", "/api/roles", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Role ${editingRole ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setShowAddForm(false);
      setShowEditForm(false);
      setEditingRole(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingRole ? 'update' : 'create'} role`,
        variant: "destructive",
      });
    },
  });

  // Toggle role status mutation
  const toggleRoleStatusMutation = useMutation({
    mutationFn: async (roleId: number) => {
      return apiRequest("PATCH", `/api/roles/${roleId}/toggle-status`);
    },
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
        description: error.message || "Failed to update role status",
        variant: "destructive"
      });
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      return apiRequest("DELETE", `/api/roles/${roleId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      permissions: [],
      isActive: true,
    });
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      permissions: role.permissions || [],
      isActive: role.isActive,
    });
    setShowEditForm(true);
  };

  const handleSaveRole = () => {
    if (!formData.name.trim() || !formData.displayName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    saveRoleMutation.mutate(formData);
  };

  const handleToggleRoleStatus = (roleId: number) => {
    toggleRoleStatusMutation.mutate(roleId);
  };

  const handleDeleteRole = (roleId: number) => {
    deleteRoleMutation.mutate(roleId);
  };

  const handleAddPermission = () => {
    setShowPermissionDialog(true);
  };

  const handleSavePermission = () => {
    if (!selectedGLink || !selectedPLink || (!permissionLevels.read && !permissionLevels.write && !permissionLevels.manage)) {
      toast({
        title: "Error",
        description: "Please select GLink, PLink, and at least one permission level",
        variant: "destructive",
      });
      return;
    }

    const gLinkMenu = availableGLinks.find(g => g.id.toString() === selectedGLink);
    const pLinkMenu = availablePLinks.find(p => p.id.toString() === selectedPLink);
    
    if (!gLinkMenu || !pLinkMenu) {
      toast({
        title: "Error",
        description: "Invalid menu selection",
        variant: "destructive",
      });
      return;
    }

    const permissionParts = [];
    if (permissionLevels.read) permissionParts.push("read");
    if (permissionLevels.write) permissionParts.push("write");
    if (permissionLevels.manage) permissionParts.push("manage");

    const newPermission = `${gLinkMenu.name}:${pLinkMenu.name}:${permissionParts.join(",")}`;
    
    if (!formData.permissions.includes(newPermission)) {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, newPermission]
      });
    }

    // Reset and close dialog
    setSelectedGLink("");
    setSelectedPLink("");
    setPermissionLevels({ read: false, write: false, manage: false });
    setShowPermissionDialog(false);
  };

  const handleCancelPermission = () => {
    setSelectedGLink("");
    setSelectedPLink("");
    setPermissionLevels({ read: false, write: false, manage: false });
    setShowPermissionDialog(false);
  };

  const handleRemovePermission = (permission: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.filter(p => p !== permission)
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Roles</span>
      </div>
      
      <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
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
            {canCreate("roles", "user-access") && (
              <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
                <SheetTrigger asChild>
                  <Button className="h-8" data-testid="button-add-role">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </SheetTrigger>
              <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Add Role</SheetTitle>
                  <SheetDescription>
                    Create a new role with specific permissions
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-4 mt-6 pb-6">
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Permissions</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleAddPermission}
                        data-testid="button-add-permission"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Permission
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.permissions.map((permission, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="cursor-pointer"
                          onClick={() => handleRemovePermission(permission)}
                          data-testid={`badge-permission-${index}`}
                        >
                          {permission} ×
                        </Badge>
                      ))}
                      {formData.permissions.length === 0 && (
                        <span className="text-sm text-gray-500">No permissions added</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      data-testid="switch-role-active"
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div className="flex space-x-3 pt-6 sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 mt-6">
                    <Button 
                      onClick={handleSaveRole}
                      disabled={saveRoleMutation.isPending}
                      className="flex-1 h-10"
                      data-testid="button-save-role"
                    >
                      {saveRoleMutation.isPending ? "Creating..." : "Create Role"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      className="flex-1 h-10"
                      data-testid="button-cancel-role"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            )}
          </div>

          {/* Roles Grid - Vuexy Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {rolesLoading ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-gray-500">Loading roles...</div>
                  </CardContent>
                </Card>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-gray-500">
                      {searchTerm ? "No roles found matching your search." : "No roles found."}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              filteredRoles.map((role: Role, index) => {
                const roleColors = [
                  { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
                  { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
                  { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-600 dark:text-green-400", border: "border-green-200 dark:border-green-800" },
                  { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
                  { bg: "bg-pink-50 dark:bg-pink-900/20", text: "text-pink-600 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800" },
                  { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" }
                ];
                const colorScheme = roleColors[index % roleColors.length];
                
                return (
                  <Card key={role.id} className={`relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 ${colorScheme.border}`} data-testid={`card-role-${role.id}`}>
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 ${colorScheme.bg} rounded-xl flex items-center justify-center`}>
                          <Shield className={`w-6 h-6 ${colorScheme.text}`} />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={role.isActive ? "default" : "secondary"}
                            className={role.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : ""}
                            data-testid={`badge-role-status-${role.id}`}
                          >
                            {role.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>

                      {/* Role Info */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white" data-testid={`text-role-name-${role.id}`}>
                            {role.displayName}
                          </h3>
                          <p className={`text-sm font-medium ${colorScheme.text}`} data-testid={`badge-role-key-${role.id}`}>
                            @{role.name}
                          </p>
                        </div>
                        
                        {role.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2" data-testid={`text-role-description-${role.id}`}>
                            {role.description}
                          </p>
                        )}
                      </div>

                      {/* Statistics */}
                      <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid={`text-role-permissions-${role.id}`}>
                            {role.permissions?.length || 0}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Permissions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            0
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Users</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid={`text-role-created-${role.id}`}>
                            Created
                          </p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {format(new Date(role.createdAt), "MMM dd")}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-center space-x-2 pt-4">
                        {canEdit("roles", "user-access") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(role)}
                            className="flex-1 h-9"
                            data-testid={`button-edit-role-${role.id}`}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        )}
                        
                        {canManage("roles", "user-access") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRoleStatus(role.id)}
                            disabled={toggleRoleStatusMutation.isPending || role.name === "SystemAdmin" || role.name === "PortAdmin"}
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
                        
                        {canManage("roles", "user-access") && role.name !== "SystemAdmin" && role.name !== "PortAdmin" && (
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
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Edit Form Sheet */}
          <Sheet open={showEditForm} onOpenChange={(open) => {
            setShowEditForm(open);
            if (!open) {
              setEditingRole(null);
              resetForm();
            }
          }}>
            <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
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
                    disabled={editingRole?.name === "SystemAdmin" || editingRole?.name === "PortAdmin"}
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Permissions</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAddPermission}
                      data-testid="button-edit-add-permission"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Permission
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.permissions.map((permission, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="cursor-pointer"
                        onClick={() => handleRemovePermission(permission)}
                        data-testid={`badge-edit-permission-${index}`}
                      >
                        {permission} ×
                      </Badge>
                    ))}
                    {formData.permissions.length === 0 && (
                      <span className="text-sm text-gray-500">No permissions added</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="editIsActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    disabled={editingRole?.name === "SystemAdmin" || editingRole?.name === "PortAdmin"}
                    data-testid="switch-edit-role-active"
                  />
                  <Label htmlFor="editIsActive">Active</Label>
                </div>

                <div className="flex space-x-3 pt-6 sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 mt-6">
                  <Button 
                    onClick={handleSaveRole}
                    disabled={saveRoleMutation.isPending}
                    className="flex-1 h-10"
                    data-testid="button-save-edit-role"
                  >
                    {saveRoleMutation.isPending ? "Updating..." : "Update Role"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingRole(null);
                      resetForm();
                    }}
                    className="flex-1 h-10"
                    data-testid="button-cancel-edit-role"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Permission Management Dialog */}
          <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Permission</DialogTitle>
                <DialogDescription>
                  Select menu access levels and permission types for this role
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="glink">GLink (Parent Menu) *</Label>
                  <Select
                    value={selectedGLink}
                    onValueChange={(value) => {
                      setSelectedGLink(value);
                      setSelectedPLink(""); // Reset PLink when GLink changes
                    }}
                  >
                    <SelectTrigger data-testid="select-glink">
                      <SelectValue placeholder="Select a parent menu" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGLinks.map((glink) => (
                        <SelectItem key={glink.id} value={glink.id.toString()}>
                          <div className="flex items-center">
                            <span className="font-medium">{glink.label}</span>
                            <span className="ml-2 text-sm text-gray-500">({glink.name})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plink">PLink (Child Menu) *</Label>
                  <Select
                    value={selectedPLink}
                    onValueChange={setSelectedPLink}
                    disabled={!selectedGLink}
                  >
                    <SelectTrigger data-testid="select-plink">
                      <SelectValue placeholder={selectedGLink ? `Select a child menu (${availablePLinks.length} available)` : "First select a parent menu"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePLinks.length === 0 && selectedGLink ? (
                        <div className="p-2 text-sm text-gray-500">No available menus (all assigned)</div>
                      ) : (
                        availablePLinks.map((plink) => (
                          <SelectItem key={plink.id} value={plink.id.toString()}>
                            <div className="flex items-center">
                              <span className="font-medium">{plink.label}</span>
                              <span className="ml-2 text-sm text-gray-500">({plink.name})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Permission Levels *</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="read"
                        checked={permissionLevels.read}
                        onCheckedChange={(checked) =>
                          setPermissionLevels({ ...permissionLevels, read: !!checked })
                        }
                        data-testid="checkbox-permission-read"
                      />
                      <Label htmlFor="read" className="text-sm font-medium">
                        Read - View and access data
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="write"
                        checked={permissionLevels.write}
                        onCheckedChange={(checked) =>
                          setPermissionLevels({ ...permissionLevels, write: !!checked })
                        }
                        data-testid="checkbox-permission-write"
                      />
                      <Label htmlFor="write" className="text-sm font-medium">
                        Write - Create and edit data
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="manage"
                        checked={permissionLevels.manage}
                        onCheckedChange={(checked) =>
                          setPermissionLevels({ ...permissionLevels, manage: !!checked })
                        }
                        data-testid="checkbox-permission-manage"
                      />
                      <Label htmlFor="manage" className="text-sm font-medium">
                        Manage - Full administrative control
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCancelPermission} data-testid="button-cancel-permission">
                  Cancel
                </Button>
                <Button onClick={handleSavePermission} data-testid="button-save-permission">
                  Add Permission
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

// Full page component with AppLayout wrapper for standalone routing
export default function RolesPage() {
  return (
    <AppLayout title="Roles" activeSection="roles">
      <RolesContent />
    </AppLayout>
  );
}
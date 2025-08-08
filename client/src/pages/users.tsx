import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, User, Edit, ToggleLeft, ToggleRight, Trash2, Search, Calendar, Shield, Mail } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { User as UserType, Role } from "@shared/schema";

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  roleId: number;
  isActive: boolean;
}

export function UsersContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "",
    roleId: 0,
    isActive: true,
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canCreate, canEdit, canManage, canRead, isLoading: permissionsLoading } = usePermissions();

  // Get all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  // Get all roles
  const { data: roles = [] } = useQuery({
    queryKey: ["/api/roles"],
  });

  // Filter users based on search term
  const filteredUsers = (users as UserType[]).filter((user: UserType) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Save user mutation
  const saveUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (editingUser) {
        // Remove password if it's empty (don't update password)
        const updateData = { ...data };
        if (!updateData.password) {
          delete (updateData as any).password;
        }
        return apiRequest("PUT", `/api/users/${editingUser.id}`, updateData);
      } else {
        return apiRequest("POST", "/api/users", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `User ${editingUser ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowAddForm(false);
      setShowEditForm(false);
      setEditingUser(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingUser ? 'update' : 'create'} user`,
        variant: "destructive",
      });
    },
  });

  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PATCH", `/api/users/${userId}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive"
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "",
      roleId: 0,
      isActive: true,
    });
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: "", // Don't pre-fill password for security
      role: user.role,
      roleId: user.roleId || 0,
      isActive: user.isActive,
    });
    setShowEditForm(true);
  };

  const handleSaveUser = () => {
    if (!formData.email.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Password is required for new users",
        variant: "destructive",
      });
      return;
    }

    if (!formData.roleId) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    saveUserMutation.mutate(formData);
  };

  const handleToggleUserStatus = (userId: string) => {
    toggleUserStatusMutation.mutate(userId);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const handleRoleChange = (roleId: string) => {
    const selectedRole = (roles as Role[]).find(r => r.id.toString() === roleId);
    if (selectedRole) {
      setFormData({
        ...formData,
        roleId: selectedRole.id,
        role: selectedRole.name
      });
    }
  };

  const getRoleName = (roleId: number) => {
    const role = (roles as Role[]).find(r => r.id === roleId);
    return role?.displayName || "Unknown Role";
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Users</span>
      </div>
      
      <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            {canCreate("users", "user-access") && (
              <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
                <SheetTrigger asChild>
                  <Button className="h-8" data-testid="button-add-user">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </SheetTrigger>
              <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Add User</SheetTitle>
                  <SheetDescription>
                    Create a new user account
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-4 mt-6 pb-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                      data-testid="input-user-email"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="John"
                        data-testid="input-user-first-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Doe"
                        data-testid="input-user-last-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter secure password"
                      data-testid="input-user-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={formData.roleId.toString()}
                      onValueChange={handleRoleChange}
                    >
                      <SelectTrigger data-testid="select-user-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {(roles as Role[]).filter(role => role.isActive).map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            <div className="flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              {role.displayName}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      data-testid="switch-user-active"
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div className="flex space-x-3 pt-6 sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 mt-6">
                    <Button 
                      onClick={handleSaveUser}
                      disabled={saveUserMutation.isPending}
                      className="flex-1 h-10"
                      data-testid="button-save-user"
                    >
                      {saveUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      className="flex-1 h-10"
                      data-testid="button-cancel-user"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            )}
          </div>

          {/* Users List */}
          <div className="grid gap-4">
            {usersLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">Loading users...</div>
                </CardContent>
              </Card>
            ) : filteredUsers.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">
                    {searchTerm ? "No users found matching your search." : "No users found."}
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredUsers.map((user: UserType) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow" data-testid={`card-user-${user.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white" data-testid={`text-user-name-${user.id}`}>
                              {user.firstName} {user.lastName}
                            </h3>
                            <Badge
                              variant={user.isActive ? "default" : "secondary"}
                              data-testid={`badge-user-status-${user.id}`}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-4 h-4" />
                              <span data-testid={`text-user-email-${user.id}`}>{user.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Shield className="w-4 h-4" />
                              <span data-testid={`text-user-role-${user.id}`}>
                                {getRoleName(user.roleId || 0)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span data-testid={`text-user-created-${user.id}`}>
                                Created: {format(new Date(user.createdAt), "MMM dd, yyyy")}
                              </span>
                            </div>
                            {user.lastLogin && (
                              <div className="flex items-center space-x-1">
                                <span data-testid={`text-user-last-login-${user.id}`}>
                                  Last login: {format(new Date(user.lastLogin), "MMM dd, yyyy")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {canManage("users", "user-access") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(user.id)}
                            disabled={toggleUserStatusMutation.isPending || user.id === "admin-001"}
                            className="h-8"
                            data-testid={`button-toggle-user-${user.id}`}
                          >
                            {user.isActive ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        {canEdit("users", "user-access") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            className="h-8"
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canManage("users", "user-access") && user.id !== "admin-001" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="h-8" data-testid={`button-delete-user-${user.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{user.firstName} {user.lastName}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-delete-user">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid="button-confirm-delete-user"
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

          {/* Edit Form Sheet */}
          <Sheet open={showEditForm} onOpenChange={(open) => {
            setShowEditForm(open);
            if (!open) {
              setEditingUser(null);
              resetForm();
            }
          }}>
            <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Edit User</SheetTitle>
                <SheetDescription>
                  Modify user details and permissions
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-4 mt-6 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email *</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    data-testid="input-edit-user-email"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name *</Label>
                    <Input
                      id="editFirstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      data-testid="input-edit-user-first-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name *</Label>
                    <Input
                      id="editLastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                      data-testid="input-edit-user-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editPassword">New Password (leave blank to keep current)</Label>
                  <Input
                    id="editPassword"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    data-testid="input-edit-user-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRole">Role *</Label>
                  <Select
                    value={formData.roleId.toString()}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger data-testid="select-edit-user-role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(roles as Role[]).filter(role => role.isActive).map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2" />
                            {role.displayName}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="editIsActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    disabled={editingUser?.id === "admin-001"}
                    data-testid="switch-edit-user-active"
                  />
                  <Label htmlFor="editIsActive">Active</Label>
                </div>

                <div className="flex space-x-3 pt-6 sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 mt-6">
                  <Button 
                    onClick={handleSaveUser}
                    disabled={saveUserMutation.isPending}
                    className="flex-1 h-10"
                    data-testid="button-save-edit-user"
                  >
                    {saveUserMutation.isPending ? "Updating..." : "Update User"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                    className="flex-1 h-10"
                    data-testid="button-cancel-edit-user"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </main>
    </div>
  );
}

// Full page component with AppLayout wrapper for standalone routing
export default function UsersPage() {
  return (
    <AppLayout title="Users" activeSection="users">
      <UsersContent />
    </AppLayout>
  );
}
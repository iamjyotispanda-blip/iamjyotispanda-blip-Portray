import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, User, Edit, ToggleLeft, ToggleRight, Trash2, Search, Calendar, Shield, Mail, Users, TrendingUp, Clock, UserCheck, MoreHorizontal, History } from "lucide-react";
import { UserAuditLogDialog } from "@/components/UserAuditLogDialog";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  userType: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId: number;
  portId?: number;
  terminalIds?: string[];
  isActive: boolean;
}

export function UsersContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [auditLogDialog, setAuditLogDialog] = useState<{
    open: boolean;
    userId: string | null;
    userName: string | null;
  }>({
    open: false,
    userId: null,
    userName: null,
  });
  const [formData, setFormData] = useState<UserFormData>({
    userType: "PortUser",
    email: "",
    firstName: "",
    lastName: "",
    role: "",
    roleId: 0,
    portId: undefined,
    terminalIds: [],
    isActive: false, // Default to inactive for email verification
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

  // Get all ports
  const { data: ports = [] } = useQuery({
    queryKey: ["/api/ports"],
  });

  // Get all terminals
  const { data: terminals = [] } = useQuery({
    queryKey: ["/api/terminals"],
  });

  // Filter users based on search term, role, and status
  const filteredUsers = (users as UserType[]).filter((user: UserType) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = !statusFilter || statusFilter === 'all' || 
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });
  
  // Calculate statistics
  const totalUsers = (users as UserType[]).length;
  const activeUsers = (users as UserType[]).filter(u => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;
  const recentUsers = (users as UserType[]).filter(u => {
    const createdDate = new Date(u.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate >= sevenDaysAgo;
  }).length;

  // Save user mutation
  const saveUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (editingUser) {
        return apiRequest("PUT", `/api/users/${editingUser.id}`, data);
      } else {
        return apiRequest("POST", "/api/users", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingUser ? 'User updated successfully' : 'User created successfully. Verification email has been sent.',
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
      userType: "PortUser",
      email: "",
      firstName: "",
      lastName: "",
      role: "",
      roleId: 0,
      portId: undefined,
      terminalIds: [],
      isActive: false, // Default to inactive for email verification
    });
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      userType: user.userType || "PortUser",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      roleId: user.roleId || 0,
      portId: user.portId || undefined,
      terminalIds: user.terminalIds || [],
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

    if (!formData.roleId) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    // Validate user type specific fields
    if (formData.userType === "PortUser" && !formData.portId) {
      toast({
        title: "Error",
        description: "Please select a port for Port User",
        variant: "destructive",
      });
      return;
    }

    if (formData.userType === "TerminalUser" && (!formData.terminalIds || formData.terminalIds.length === 0)) {
      toast({
        title: "Error",
        description: "Please select at least one terminal for Terminal User",
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

  const handleViewAuditLog = (user: UserType) => {
    setAuditLogDialog({
      open: true,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
    });
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
  
  // Generate avatar initials and colors
  const getAvatarData = (user: UserType) => {
    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", 
      "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-teal-500"
    ];
    const colorIndex = user.id.length % colors.length;
    return { initials, color: colors[colorIndex] };
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Users</span>
      </div>
      
      <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
        <div className="space-y-4">
          {/* Statistics Cards - Vuexy Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeUsers}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                  </div>
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{inactiveUsers}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Inactive Users</p>
                  </div>
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{recentUsers}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">New This Week</p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center">
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
                  
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {(roles as Role[]).map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {canCreate("users", "user-access") && (
                  <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
                    <SheetTrigger asChild>
                      <Button className="h-8" data-testid="button-add-user">
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[95vw] sm:w-[500px] lg:w-[600px] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Add User</SheetTitle>
                        <SheetDescription>
                          Create a new user account
                        </SheetDescription>
                      </SheetHeader>
                      
                      <div className="space-y-4 mt-6 pb-6">
                        <div className="space-y-2">
                          <Label htmlFor="userType">User Type *</Label>
                          <Select
                            value={formData.userType}
                            onValueChange={(value) => setFormData({ ...formData, userType: value, portId: undefined, terminalIds: [] })}
                          >
                            <SelectTrigger data-testid="select-user-type">
                              <SelectValue placeholder="Select user type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SuperAdmin">
                                <div className="flex items-center">
                                  <Shield className="h-4 w-4 mr-2" />
                                  Super Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="PortUser">
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2" />
                                  Port User
                                </div>
                              </SelectItem>
                              <SelectItem value="TerminalUser">
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-2" />
                                  Terminal User
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Port selection for Port Users */}
                        {formData.userType === "PortUser" && (
                          <div className="space-y-2">
                            <Label htmlFor="port">Port *</Label>
                            <Select
                              value={formData.portId?.toString() || ""}
                              onValueChange={(value) => setFormData({ ...formData, portId: parseInt(value) })}
                            >
                              <SelectTrigger data-testid="select-user-port">
                                <SelectValue placeholder="Select a port" />
                              </SelectTrigger>
                              <SelectContent>
                                {(ports as any[]).map((port: any) => (
                                  <SelectItem key={port.id} value={port.id.toString()}>
                                    {port.portName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Terminal selection for Terminal Users */}
                        {formData.userType === "TerminalUser" && (
                          <div className="space-y-2">
                            <Label htmlFor="terminals">Terminals *</Label>
                            <div className="space-y-2">
                              <div className="text-sm text-gray-600">Select one or more terminals:</div>
                              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                                {(terminals as any[]).map((terminal: any) => (
                                  <div key={terminal.id} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`terminal-${terminal.id}`}
                                      checked={formData.terminalIds?.includes(terminal.id.toString()) || false}
                                      onChange={(e) => {
                                        const terminalIds = formData.terminalIds || [];
                                        if (e.target.checked) {
                                          setFormData({ 
                                            ...formData, 
                                            terminalIds: [...terminalIds, terminal.id.toString()]
                                          });
                                        } else {
                                          setFormData({ 
                                            ...formData, 
                                            terminalIds: terminalIds.filter(id => id !== terminal.id.toString())
                                          });
                                        }
                                      }}
                                      className="rounded border-gray-300"
                                      data-testid={`checkbox-terminal-${terminal.id}`}
                                    />
                                    <label 
                                      htmlFor={`terminal-${terminal.id}`}
                                      className="text-sm cursor-pointer flex-1"
                                    >
                                      {terminal.terminalName} ({terminal.shortCode})
                                    </label>
                                  </div>
                                ))}
                                {(terminals as any[]).length === 0 && (
                                  <div className="text-sm text-gray-500 text-center py-4">
                                    No terminals available
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </CardContent>
          </Card>

          {/* Users Table - Vuexy Style */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="min-w-[300px]">User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-gray-500">Loading users...</div>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-gray-500">
                            {searchTerm ? "No users found matching your search." : "No users found."}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user: UserType) => {
                        const avatarData = getAvatarData(user);
                        return (
                          <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50" data-testid={`row-user-${user.id}`}>
                            <TableCell>
                              <input type="checkbox" className="rounded border-gray-300" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 ${avatarData.color} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
                                  {avatarData.initials}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white" data-testid={`text-user-name-${user.id}`}>
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400" data-testid={`text-user-email-${user.id}`}>
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" data-testid={`text-user-role-${user.id}`}>
                                {getRoleName(user.roleId || 0)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={user.isActive ? "default" : "secondary"}
                                className={user.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : ""}
                                data-testid={`badge-user-status-${user.id}`}
                              >
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500 dark:text-gray-400" data-testid={`text-user-created-${user.id}`}>
                              {format(new Date(user.createdAt), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEdit("users", "user-access") && (
                                    <DropdownMenuItem onClick={() => handleEdit(user)} data-testid={`button-edit-user-${user.id}`}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  {canRead("users", "user-access") && (
                                    <DropdownMenuItem onClick={() => handleViewAuditLog(user)} data-testid={`button-audit-log-user-${user.id}`}>
                                      <History className="w-4 h-4 mr-2" />
                                      View Activity Log
                                    </DropdownMenuItem>
                                  )}
                                  {canManage("users", "user-access") && (
                                    <DropdownMenuItem 
                                      onClick={() => handleToggleUserStatus(user.id)}
                                      disabled={toggleUserStatusMutation.isPending || user.id === "admin-001"}
                                      data-testid={`button-toggle-user-${user.id}`}
                                    >
                                      {user.isActive ? (
                                        <>
                                          <ToggleLeft className="w-4 h-4 mr-2" />
                                          Suspend
                                        </>
                                      ) : (
                                        <>
                                          <ToggleRight className="w-4 h-4 mr-2" />
                                          Activate
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  )}
                                  {canManage("users", "user-access") && user.id !== "admin-001" && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem 
                                          onSelect={(e) => e.preventDefault()}
                                          className="text-red-600 focus:text-red-600"
                                          data-testid={`button-delete-user-${user.id}`}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
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
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit User Sheet */}
      <Sheet open={showEditForm} onOpenChange={(open) => {
        setShowEditForm(open);
        if (!open) {
          setEditingUser(null);
          resetForm();
        }
      }}>
        <SheetContent className="w-[95vw] sm:w-[500px] lg:w-[600px] overflow-y-auto">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                data-testid="switch-edit-user-active"
              />
              <Label htmlFor="editIsActive">Active</Label>
            </div>

            <div className="flex space-x-3 pt-6 sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 mt-6">
              <Button 
                onClick={handleSaveUser}
                disabled={saveUserMutation.isPending}
                className="flex-1 h-10"
                data-testid="button-update-user"
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

      {/* User Audit Log Dialog */}
      <UserAuditLogDialog
        open={auditLogDialog.open}
        onOpenChange={(open) => setAuditLogDialog(prev => ({ ...prev, open }))}
        userId={auditLogDialog.userId || ""}
        userName={auditLogDialog.userName || ""}
      />
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
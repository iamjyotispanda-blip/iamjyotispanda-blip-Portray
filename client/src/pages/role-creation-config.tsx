import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Settings, Plus, Shield, UserPlus, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const USER_TYPES = [
  { value: "SuperAdmin", label: "Super Admin", icon: Shield },
  { value: "PortUser", label: "Port User", icon: UserPlus },
  { value: "TerminalUser", label: "Terminal User", icon: UserPlus }
];

export default function RoleCreationConfig() {
  const [selectedCreatorRole, setSelectedCreatorRole] = useState<number | null>(null);
  const [selectedUserTypes, setSelectedUserTypes] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
    enabled: true,
  });

  // Fetch role creation permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["/api/role-creation-permissions"],
    enabled: true,
  });

  // Create permission mutation
  const createPermissionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/role-creation-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create permission");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-creation-permissions"] });
      toast({
        title: "Success",
        description: "Role creation permission configured successfully",
      });
      // Reset form
      setSelectedCreatorRole(null);
      setSelectedUserTypes([]);
      setSelectedRoleIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to configure role creation permission",
        variant: "destructive",
      });
    },
  });

  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/role-creation-permissions/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete permission");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-creation-permissions"] });
      toast({
        title: "Success",
        description: "Role creation permission removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role creation permission",
        variant: "destructive",
      });
    },
  });

  const handleAddUserType = (userType: string) => {
    if (!selectedUserTypes.includes(userType)) {
      setSelectedUserTypes([...selectedUserTypes, userType]);
    }
  };

  const handleRemoveUserType = (userType: string) => {
    setSelectedUserTypes(selectedUserTypes.filter(type => type !== userType));
  };

  const handleAddRole = (roleId: string) => {
    if (!selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
    }
  };

  const handleRemoveRole = (roleId: string) => {
    setSelectedRoleIds(selectedRoleIds.filter(id => id !== roleId));
  };

  const handleSaveConfiguration = () => {
    if (!selectedCreatorRole || selectedUserTypes.length === 0 || selectedRoleIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a creator role, at least one user type, and at least one assignable role",
        variant: "destructive",
      });
      return;
    }

    createPermissionMutation.mutate({
      creatorRoleId: selectedCreatorRole,
      allowedUserTypes: selectedUserTypes,
      allowedRoleIds: selectedRoleIds,
      isActive: true,
    });
  };

  const getRoleName = (roleId: string | number) => {
    const role = (roles as any[]).find((r: any) => r.id.toString() === roleId.toString());
    return role?.name || "Unknown Role";
  };

  const getUserTypeLabel = (userType: string) => {
    return USER_TYPES.find(type => type.value === userType)?.label || userType;
  };

  if (rolesLoading || permissionsLoading) {
    return (
      <AppLayout title="Role Creation Configuration" activeSection="configuration">
        <div className="p-6">
          <div className="text-center">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Role Creation Configuration" activeSection="configuration">
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Role Creation Configuration</h1>
        </div>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Configure Role Creation Permissions</CardTitle>
            <CardDescription>
              Define which roles can create specific user types and assign specific roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Creator Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Creator Role</label>
                <Select
                  value={selectedCreatorRole?.toString() || ""}
                  onValueChange={(value) => setSelectedCreatorRole(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-creator-role">
                    <SelectValue placeholder="Select creator role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.filter((role: any) => !role.name.includes("System Admin")).map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Types Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Allowed User Types</label>
                <Select onValueChange={handleAddUserType}>
                  <SelectTrigger data-testid="select-user-type">
                    <SelectValue placeholder="Add user type" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.filter(type => type.value !== "SuperAdmin").map((userType) => (
                      <SelectItem key={userType.value} value={userType.value}>
                        <div className="flex items-center">
                          <userType.icon className="h-4 w-4 mr-2" />
                          {userType.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUserTypes.map((userType) => (
                    <Badge key={userType} variant="secondary" className="flex items-center gap-1">
                      {getUserTypeLabel(userType)}
                      <button
                        onClick={() => handleRemoveUserType(userType)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                        data-testid={`remove-user-type-${userType}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Assignable Roles Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignable Roles</label>
                <Select onValueChange={handleAddRole}>
                  <SelectTrigger data-testid="select-assignable-role">
                    <SelectValue placeholder="Add assignable role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(roles as any[]).filter((role: any) => !role.name.includes("System Admin")).map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedRoleIds.map((roleId) => (
                    <Badge key={roleId} variant="secondary" className="flex items-center gap-1">
                      {getRoleName(roleId)}
                      <button
                        onClick={() => handleRemoveRole(roleId)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                        data-testid={`remove-role-${roleId}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveConfiguration}
              disabled={createPermissionMutation.isPending}
              className="h-8"
              data-testid="button-save-config"
            >
              <Plus className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Current Configurations */}
        <Card>
          <CardHeader>
            <CardTitle>Current Configurations</CardTitle>
            <CardDescription>
              Existing role creation permission configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(permissions as any[]).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No role creation permissions configured yet
              </div>
            ) : (
              <div className="space-y-4">
                {(permissions as any[]).map((permission: any) => (
                  <div key={permission.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{getRoleName(permission.creatorRoleId)}</h3>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePermissionMutation.mutate(permission.id)}
                        disabled={deletePermissionMutation.isPending}
                        data-testid={`button-delete-permission-${permission.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span className="text-sm font-medium">Can create user types: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {permission.allowedUserTypes.map((userType: string) => (
                            <Badge key={userType} variant="outline" className="text-xs">
                              {getUserTypeLabel(userType)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Can assign roles: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {permission.allowedRoleIds.map((roleId: string) => (
                            <Badge key={roleId} variant="outline" className="text-xs">
                              {getRoleName(roleId)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
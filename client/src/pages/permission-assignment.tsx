import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Menu, ChevronDown, ChevronRight, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Role, Menu as MenuType } from "@shared/schema";

interface PermissionState {
  gLink: string;
  pLink: string;
  read: boolean;
  write: boolean;
  manage: boolean;
}

interface TreeNode {
  id: number;
  name: string;
  label: string;
  type: 'glink' | 'plink';
  parentId?: number | null;
  children?: TreeNode[];
  permissions: {
    read: boolean;
    write: boolean;
    manage: boolean;
  };
  expanded: boolean;
}

export default function PermissionAssignmentPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [permissionStates, setPermissionStates] = useState<Record<string, PermissionState>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  // Get all menus
  const { data: menus = [] } = useQuery<MenuType[]>({
    queryKey: ["/api/menus"],
  });

  // Get selected role details
  const { data: selectedRole } = useQuery<Role>({
    queryKey: ["/api/roles", selectedRoleId],
    enabled: !!selectedRoleId,
  });

  // Build tree structure from menus
  const buildTree = (): TreeNode[] => {
    const menuList = menus as MenuType[];
    const gLinks = menuList.filter(menu => menu.menuType === 'glink' && menu.isActive);
    
    return gLinks.map(gLink => {
      const children = menuList
        .filter(menu => menu.menuType === 'plink' && menu.isActive && menu.parentId === gLink.id)
        .map(pLink => ({
          id: pLink.id,
          name: pLink.name,
          label: pLink.label,
          type: 'plink' as const,
          parentId: pLink.parentId,
          permissions: getPermissionsForMenu(gLink.name, pLink.name),
          expanded: false,
        }));

      return {
        id: gLink.id,
        name: gLink.name,
        label: gLink.label,
        type: 'glink' as const,
        children,
        permissions: getPermissionsForMenu(gLink.name),
        expanded: expandedNodes.has(gLink.name),
      };
    });
  };

  // Get permissions for a specific menu item
  const getPermissionsForMenu = (gLinkName: string, pLinkName?: string) => {
    if (!selectedRole?.permissions) {
      return { read: false, write: false, manage: false };
    }

    const targetPermission = selectedRole.permissions.find(permission => {
      const parts = permission.split(':');
      if (pLinkName) {
        return parts[0] === gLinkName && parts[1] === pLinkName;
      } else {
        return parts[0] === gLinkName && parts.length === 2; // GLink only permission
      }
    });

    if (targetPermission) {
      const parts = targetPermission.split(':');
      const permissionLevels = parts[2] ? parts[2].split(',') : [];
      return {
        read: permissionLevels.includes('read'),
        write: permissionLevels.includes('write'),
        manage: permissionLevels.includes('manage'),
      };
    }

    return { read: false, write: false, manage: false };
  };

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async (permissions: string[]) => {
      if (!selectedRoleId) throw new Error("No role selected");
      return apiRequest("PUT", `/api/roles/${selectedRoleId}`, {
        ...selectedRole,
        permissions,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles", selectedRoleId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  // Toggle permission for a menu item
  const togglePermission = (gLinkName: string, pLinkName: string | null, permissionType: 'read' | 'write' | 'manage', checked: boolean) => {
    if (!selectedRole) return;

    const currentPermissions = [...(selectedRole.permissions || [])];
    const targetKey = pLinkName ? `${gLinkName}:${pLinkName}` : gLinkName;
    
    // Find existing permission for this menu item
    const existingPermissionIndex = currentPermissions.findIndex(permission => {
      const parts = permission.split(':');
      if (pLinkName) {
        return parts[0] === gLinkName && parts[1] === pLinkName;
      } else {
        return parts[0] === gLinkName && parts.length === 2;
      }
    });

    let permissionLevels: string[] = [];
    if (existingPermissionIndex >= 0) {
      const parts = currentPermissions[existingPermissionIndex].split(':');
      permissionLevels = parts[2] ? parts[2].split(',') : [];
      currentPermissions.splice(existingPermissionIndex, 1);
    }

    // Update permission levels
    if (checked) {
      if (!permissionLevels.includes(permissionType)) {
        permissionLevels.push(permissionType);
      }
    } else {
      permissionLevels = permissionLevels.filter(level => level !== permissionType);
    }

    // Add back if there are any permission levels
    if (permissionLevels.length > 0) {
      const newPermission = pLinkName 
        ? `${gLinkName}:${pLinkName}:${permissionLevels.join(',')}`
        : `${gLinkName}:${permissionLevels.join(',')}`;
      currentPermissions.push(newPermission);
    }

    // Update the role with new permissions
    queryClient.setQueryData(["/api/roles", selectedRoleId], {
      ...selectedRole,
      permissions: currentPermissions,
    });
  };

  // Toggle expanded state for tree nodes
  const toggleExpanded = (nodeName: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeName)) {
      newExpanded.delete(nodeName);
    } else {
      newExpanded.add(nodeName);
    }
    setExpandedNodes(newExpanded);
  };

  // Save all permissions
  const handleSavePermissions = () => {
    if (!selectedRole?.permissions) return;
    savePermissionsMutation.mutate(selectedRole.permissions);
  };

  const treeData = buildTree();

  return (
    <AppLayout title="Permission Assignment" activeSection="permission-assignment">
      <div className="w-full bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Permission Assignment</span>
        </div>
        
        <div className="px-2 sm:px-4 lg:px-2 py-2">
          <div className="space-y-4 pb-8">
            {/* Role Selection */}
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="role-select">Select Role</Label>
                      <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                        <SelectTrigger className="w-full sm:w-80" data-testid="select-role">
                          <SelectValue placeholder="Choose a role to manage permissions" />
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
                    {selectedRoleId && (
                      <Button 
                        onClick={handleSavePermissions}
                        disabled={savePermissionsMutation.isPending}
                        className="h-8 w-full sm:w-auto"
                        data-testid="button-save-permissions"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {savePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permission Tree */}
            {selectedRoleId && (
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="text-lg font-medium">Menu Permissions</h3>
                      <div className="flex items-center space-x-4 sm:space-x-6 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                        <span>Read</span>
                        <span>Write</span>
                        <span>Manage</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {treeData.map((gLink) => (
                        <div key={gLink.id} className="space-y-2">
                          {/* GLink Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(gLink.name)}
                                className="h-6 w-6 p-0 flex-shrink-0"
                                data-testid={`button-expand-${gLink.name}`}
                              >
                                {gLink.expanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <Menu className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium truncate">{gLink.label}</span>
                              <span className="text-sm text-gray-500 hidden sm:inline">({gLink.name})</span>
                            </div>
                            <div className="flex items-center justify-end space-x-4 sm:space-x-6 flex-shrink-0">
                              <Checkbox
                                checked={gLink.permissions.read}
                                onCheckedChange={(checked) => 
                                  togglePermission(gLink.name, null, 'read', checked === true)
                                }
                                data-testid={`checkbox-${gLink.name}-read`}
                              />
                              <Checkbox
                                checked={gLink.permissions.write}
                                onCheckedChange={(checked) => 
                                  togglePermission(gLink.name, null, 'write', checked === true)
                                }
                                data-testid={`checkbox-${gLink.name}-write`}
                              />
                              <Checkbox
                                checked={gLink.permissions.manage}
                                onCheckedChange={(checked) => 
                                  togglePermission(gLink.name, null, 'manage', checked === true)
                                }
                                data-testid={`checkbox-${gLink.name}-manage`}
                              />
                            </div>
                          </div>

                          {/* PLinks (Children) */}
                          {gLink.expanded && gLink.children && gLink.children.map((pLink) => (
                            <div key={pLink.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 ml-4 sm:ml-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div className="w-6 flex-shrink-0"></div> {/* Spacer for alignment */}
                                <Menu className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <span className="font-medium truncate">{pLink.label}</span>
                                <span className="text-sm text-gray-500 hidden sm:inline">({pLink.name})</span>
                              </div>
                              <div className="flex items-center justify-end space-x-4 sm:space-x-6 flex-shrink-0">
                                <Checkbox
                                  checked={pLink.permissions.read}
                                  onCheckedChange={(checked) => 
                                    togglePermission(gLink.name, pLink.name, 'read', checked === true)
                                  }
                                  data-testid={`checkbox-${gLink.name}-${pLink.name}-read`}
                                />
                                <Checkbox
                                  checked={pLink.permissions.write}
                                  onCheckedChange={(checked) => 
                                    togglePermission(gLink.name, pLink.name, 'write', checked === true)
                                  }
                                  data-testid={`checkbox-${gLink.name}-${pLink.name}-write`}
                                />
                                <Checkbox
                                  checked={pLink.permissions.manage}
                                  onCheckedChange={(checked) => 
                                    togglePermission(gLink.name, pLink.name, 'manage', checked === true)
                                  }
                                  data-testid={`checkbox-${gLink.name}-${pLink.name}-manage`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {treeData.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No menu items available for permission assignment.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedRoleId && (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Role</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Choose a role from the dropdown above to manage its permissions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
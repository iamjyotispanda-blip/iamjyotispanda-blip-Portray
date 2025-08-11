import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Edit, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Menu } from "@shared/schema";

interface FormData {
  name: string;
  label: string;
  menuType: 'glink' | 'plink';
  parentId: number | null;
  icon: string;
  route: string;
  sortOrder: number;
  isActive: boolean;
  isSystemConfig: boolean;
}

const initialFormData: FormData = {
  name: '',
  label: '',
  menuType: 'glink',
  parentId: null,
  icon: '',
  route: '',
  sortOrder: 0,
  isActive: true,
  isSystemConfig: false
};

export default function MenuManagementNew() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all menus
  const { data: allMenus = [], isLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/menus");
      return await response.json();
    },
  });

  // Save menu mutation
  const saveMenuMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const url = editingMenu ? `/api/menus/${editingMenu.id}` : "/api/menus";
      const method = editingMenu ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      setShowAddForm(false);
      setEditingMenu(null);
      setFormData(initialFormData);
      toast({
        title: "Success",
        description: `Menu ${editingMenu ? 'updated' : 'created'} successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save menu",
        variant: "destructive",
      });
    },
  });

  // Delete menu mutation
  const deleteMenuMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/menus/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Success",
        description: "Menu deleted successfully",
      });
    },
  });

  // Organize menus in tree structure
  const menuTree = useMemo(() => {
    const glinkMenus = allMenus.filter(menu => menu.menuType === 'glink');
    const plinkMenus = allMenus.filter(menu => menu.menuType === 'plink');
    
    return glinkMenus.map(glink => ({
      ...glink,
      children: plinkMenus.filter(plink => plink.parentId === glink.id)
    }));
  }, [allMenus]);

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      label: menu.label,
      menuType: menu.menuType as 'glink' | 'plink',
      parentId: menu.parentId,
      icon: menu.icon || '',
      route: menu.route || '',
      sortOrder: menu.sortOrder,
      isActive: menu.isActive,
      isSystemConfig: menu.isSystemConfig || false
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this menu?')) {
      deleteMenuMutation.mutate(id);
    }
  };

  const handleSubmit = () => {
    saveMenuMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingMenu(null);
  };

  const toggleExpanded = (nodeId: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const MenuFormComponent = () => (
    <div className="space-y-4">
      {/* System Configuration Switch */}
      <div className="flex items-center space-x-2">
        <Switch
          id="isSystemConfig"
          checked={formData.isSystemConfig}
          onCheckedChange={(checked) => setFormData(prev => ({ 
            ...prev, 
            isSystemConfig: checked,
            parentId: checked ? null : prev.parentId
          }))}
        />
        <Label htmlFor="isSystemConfig">System Configuration</Label>
      </div>

      {/* Menu Type */}
      <div className="space-y-2">
        <Label>Menu Type</Label>
        <Select
          value={formData.menuType}
          onValueChange={(value: 'glink' | 'plink') => setFormData(prev => ({ 
            ...prev, 
            menuType: value,
            parentId: value === 'glink' ? null : prev.parentId
          }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="glink">GLink (Main Menu)</SelectItem>
            <SelectItem value="plink">PLink (Sub Menu)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Parent Menu - Only for PLink and not System Config */}
      {formData.menuType === 'plink' && !formData.isSystemConfig && (
        <div className="space-y-2">
          <Label>Parent Menu</Label>
          <Select
            value={formData.parentId?.toString() || ""}
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              parentId: value ? parseInt(value) : null 
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select parent menu" />
            </SelectTrigger>
            <SelectContent>
              {allMenus
                .filter(menu => menu.menuType === 'glink' && menu.isActive)
                .map(menu => (
                  <SelectItem key={menu.id} value={menu.id.toString()}>
                    {menu.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label>Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="menu-name"
        />
      </div>

      {/* Label */}
      <div className="space-y-2">
        <Label>Label</Label>
        <Input
          value={formData.label}
          onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
          placeholder="Menu Label"
        />
      </div>

      {/* Route */}
      <div className="space-y-2">
        <Label>Route</Label>
        <Input
          value={formData.route}
          onChange={(e) => setFormData(prev => ({ ...prev, route: e.target.value }))}
          placeholder="/menu-route"
        />
      </div>

      {/* Sort Order */}
      <div className="space-y-2">
        <Label>Sort Order</Label>
        <Input
          type="number"
          value={formData.sortOrder}
          onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
        <Label>Active</Label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setShowAddForm(false);
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saveMenuMutation.isPending}>
          {saveMenuMutation.isPending ? "Saving..." : (editingMenu ? "Update" : "Create")}
        </Button>
      </div>
    </div>
  );

  const TreeMenuItem = ({ menu, level = 0 }: { menu: Menu & { children?: Menu[] }, level?: number }) => (
    <div className="border rounded-lg mb-2">
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3" style={{ marginLeft: level * 20 }}>
          {menu.children && menu.children.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(menu.id)}
              className="p-0 h-auto"
            >
              {expandedNodes.has(menu.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          
          <div className="flex items-center space-x-2">
            <Badge variant={menu.menuType === 'glink' ? 'default' : 'secondary'}>
              {menu.menuType.toUpperCase()}
            </Badge>
            {menu.isSystemConfig && (
              <Badge variant="outline">System</Badge>
            )}
            <span className="font-medium">{menu.label}</span>
            <span className="text-sm text-gray-500">({menu.name})</span>
            {!menu.isActive && (
              <Badge variant="destructive">Inactive</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(menu)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(menu.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Show children if expanded */}
      {expandedNodes.has(menu.id) && menu.children && menu.children.length > 0 && (
        <div className="pl-4 pb-2">
          {menu.children.map(child => (
            <TreeMenuItem key={child.id} menu={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <AppLayout title="Menu Management" activeSection="menu-management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold">Menu Management</h1>
            <p className="text-gray-600">Manage navigation menus with GLink/PLink hierarchy</p>
          </div>
          
          <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
            <SheetTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Menu
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[500px]">
              <SheetHeader>
                <SheetTitle>{editingMenu ? 'Edit Menu' : 'Add New Menu'}</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <MenuFormComponent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Menu Tree */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : menuTree.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No menus found. Create your first menu to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {menuTree.map(menu => (
                  <TreeMenuItem key={menu.id} menu={menu} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
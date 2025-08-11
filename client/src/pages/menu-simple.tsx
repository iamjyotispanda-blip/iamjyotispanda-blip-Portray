import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Menu } from "@shared/schema";

export default function MenuSimple() {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [menuType, setMenuType] = useState("glink");
  const [parentId, setParentId] = useState("");
  const [route, setRoute] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [isSystemConfig, setIsSystemConfig] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: menus = [], isLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/menus");
      return await response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingId ? `/api/menus/${editingId}` : "/api/menus";
      const method = editingId ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      resetForm();
      toast({ title: "Success", description: "Menu saved successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/menus/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({ title: "Success", description: "Menu deleted successfully" });
    },
  });

  const resetForm = () => {
    setName("");
    setLabel("");
    setMenuType("glink");
    setParentId("");
    setRoute("");
    setSortOrder("0");
    setIsActive(true);
    setIsSystemConfig(false);
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (menu: Menu) => {
    setName(menu.name);
    setLabel(menu.label);
    setMenuType(menu.menuType);
    setParentId(menu.parentId?.toString() || "");
    setRoute(menu.route || "");
    setSortOrder(menu.sortOrder.toString());
    setIsActive(menu.isActive);
    setIsSystemConfig(menu.isSystemConfig || false);
    setEditingId(menu.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    const data = {
      name,
      label,
      menuType,
      parentId: parentId ? parseInt(parentId) : null,
      route,
      sortOrder: parseInt(sortOrder) || 0,
      isActive,
      isSystemConfig,
    };
    saveMutation.mutate(data);
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this menu?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const glinkMenus = menus.filter(m => m.menuType === 'glink');
  const plinkMenus = menus.filter(m => m.menuType === 'plink');

  const menuTree = glinkMenus.map(glink => ({
    ...glink,
    children: plinkMenus.filter(plink => plink.parentId === glink.id)
  }));

  return (
    <AppLayout title="Menu Management" activeSection="menu-management">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Menu Management</h1>
            <p className="text-sm text-gray-600 hidden sm:block">Manage navigation menus with GLink/PLink hierarchy</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Menu
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Menu' : 'Add New Menu'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isSystemConfig}
                  onCheckedChange={setIsSystemConfig}
                />
                <Label className="text-sm">System Configuration</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Menu Type</Label>
                <Select value={menuType} onValueChange={setMenuType}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="glink">GLink (Main)</SelectItem>
                    <SelectItem value="plink">PLink (Sub)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {menuType === 'plink' && !isSystemConfig && (
                <div className="space-y-2">
                  <Label className="text-sm">Parent Menu</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      {glinkMenus.map(menu => (
                        <SelectItem key={menu.id} value={menu.id.toString()}>
                          {menu.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Name</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="h-9" 
                    placeholder="menu-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Label</Label>
                  <Input 
                    value={label} 
                    onChange={(e) => setLabel(e.target.value)}
                    className="h-9" 
                    placeholder="Menu Label"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Route</Label>
                  <Input 
                    value={route} 
                    onChange={(e) => setRoute(e.target.value)}
                    className="h-9" 
                    placeholder="/menu-route"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Sort Order</Label>
                  <Input 
                    type="number" 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="h-9" 
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label className="text-sm">Active</Label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
                <Button variant="outline" onClick={resetForm} className="h-8">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="h-8">
                  {saveMutation.isPending ? "Saving..." : (editingId ? "Update" : "Create")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Menu Hierarchy</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading menus...</p>
              </div>
            ) : menuTree.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No menus found. Create your first menu to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {menuTree.map(menu => (
                  <div key={menu.id} className="border rounded-lg">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {menu.children.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(menu.id)}
                            className="p-1 h-auto flex-shrink-0"
                          >
                            {expanded.has(menu.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 min-w-0">
                          <Badge variant="default" className="text-xs">GLINK</Badge>
                          {menu.isSystemConfig && <Badge variant="outline" className="text-xs">System</Badge>}
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-sm sm:text-base truncate block">{menu.label}</span>
                            <span className="text-xs text-gray-500 hidden sm:inline">({menu.name})</span>
                          </div>
                          {!menu.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(menu)} className="h-8 w-8 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(menu.id)}
                          className="text-red-600 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {expanded.has(menu.id) && menu.children.length > 0 && (
                      <div className="pl-4 sm:pl-8 pb-2">
                        {menu.children.map(child => (
                          <div key={child.id} className="p-2 flex items-center justify-between border-l-2 border-gray-200">
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 min-w-0 flex-1">
                              <Badge variant="secondary" className="text-xs">PLINK</Badge>
                              {child.isSystemConfig && <Badge variant="outline" className="text-xs">System</Badge>}
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-sm truncate block">{child.label}</span>
                                <span className="text-xs text-gray-500 hidden sm:inline">({child.name})</span>
                              </div>
                              {!child.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(child)} className="h-8 w-8 p-0">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDelete(child.id)}
                                className="text-red-600 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
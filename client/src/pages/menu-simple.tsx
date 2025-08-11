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
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ["/api/menus"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/menus");
      return await response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
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
    mutationFn: async (id) => {
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

  const handleEdit = (menu) => {
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

  const handleDelete = (id) => {
    if (confirm("Delete this menu?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleExpand = (id) => {
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
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Menu Management</h1>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Menu
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Menu' : 'Add New Menu'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isSystemConfig}
                  onCheckedChange={setIsSystemConfig}
                />
                <Label>System Configuration</Label>
              </div>

              <div className="space-y-2">
                <Label>Menu Type</Label>
                <Select value={menuType} onValueChange={setMenuType}>
                  <SelectTrigger>
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
                  <Label>Parent Menu</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Route</Label>
                  <Input value={route} onChange={(e) => setRoute(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input 
                    type="number" 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)} 
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
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
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-2">
                {menuTree.map(menu => (
                  <div key={menu.id} className="border rounded-lg">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {menu.children.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(menu.id)}
                            className="p-0 h-auto"
                          >
                            {expanded.has(menu.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Badge variant="default">GLINK</Badge>
                        {menu.isSystemConfig && <Badge variant="outline">System</Badge>}
                        <span className="font-medium">{menu.label}</span>
                        <span className="text-sm text-gray-500">({menu.name})</span>
                        {!menu.isActive && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(menu)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(menu.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {expanded.has(menu.id) && menu.children.length > 0 && (
                      <div className="pl-8 pb-2">
                        {menu.children.map(child => (
                          <div key={child.id} className="p-2 flex items-center justify-between border-l">
                            <div className="flex items-center space-x-3">
                              <Badge variant="secondary">PLINK</Badge>
                              {child.isSystemConfig && <Badge variant="outline">System</Badge>}
                              <span className="font-medium">{child.label}</span>
                              <span className="text-sm text-gray-500">({child.name})</span>
                              {!child.isActive && <Badge variant="destructive">Inactive</Badge>}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(child)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDelete(child.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
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
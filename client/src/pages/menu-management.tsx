import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { Plus, Menu as MenuIcon, Trash2, Edit, ToggleLeft, ToggleRight, Settings, GitBranch } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Menu, InsertMenu, UpdateMenu } from "@shared/schema";

interface MenuFormData {
  name: string;
  label: string;
  icon: string;
  route: string;
  parentId: number | null;
  sortOrder: number;
  menuType: 'glink' | 'plink';
}

export default function MenuManagementPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [selectedMenuType, setSelectedMenuType] = useState<'glink' | 'plink'>('glink');
  const [formData, setFormData] = useState<MenuFormData>({
    name: "",
    label: "",
    icon: "",
    route: "",
    parentId: null,
    sortOrder: 0,
    menuType: 'glink',
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all menus
  const { data: allMenus = [], isLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
  });

  // Get GLink menus (parent menus)
  const { data: glinkMenus = [] } = useQuery<Menu[]>({
    queryKey: ["/api/menus", "glink"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/menus?type=glink");
      return await response.json();
    },
  });

  // Filter menus based on selected type
  const filteredMenus = allMenus.filter(menu => menu.menuType === selectedMenuType);

  // Save menu mutation
  const saveMenuMutation = useMutation({
    mutationFn: async (data: MenuFormData) => {
      if (editingMenu) {
        return apiRequest("PUT", `/api/menus/${editingMenu.id}`, data);
      } else {
        return apiRequest("POST", "/api/menus", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Menu ${editingMenu ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      setShowAddForm(false);
      setShowEditForm(false);
      setEditingMenu(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingMenu ? 'update' : 'create'} menu`,
        variant: "destructive",
      });
    },
  });

  // Delete menu mutation
  const deleteMenuMutation = useMutation({
    mutationFn: async (menuId: number) => {
      return apiRequest("DELETE", `/api/menus/${menuId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Menu deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete menu",
        variant: "destructive",
      });
    },
  });

  // Toggle menu status mutation
  const toggleMenuStatusMutation = useMutation({
    mutationFn: async (menuId: number) => {
      return apiRequest("PATCH", `/api/menus/${menuId}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Success",
        description: "Menu status updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update menu status",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      label: "",
      icon: "",
      route: "",
      parentId: null,
      sortOrder: 0,
      menuType: 'glink',
    });
  };

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      label: menu.label,
      icon: menu.icon || "",
      route: menu.route || "",
      parentId: menu.parentId,
      sortOrder: menu.sortOrder,
      menuType: menu.menuType as 'glink' | 'plink',
    });
    setShowEditForm(true);
  };

  const handleSaveMenu = () => {
    if (!formData.name || !formData.label || !formData.menuType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    saveMenuMutation.mutate(formData);
  };

  const handleToggleStatus = (menuId: number) => {
    toggleMenuStatusMutation.mutate(menuId);
  };

  const getParentMenuName = (parentId: number | null) => {
    if (!parentId) return "None";
    const parent = allMenus.find(menu => menu.id === parentId);
    return parent ? parent.label : "Unknown";
  };

  const MenuForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 mt-6 pb-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="dashboard"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Label *</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="Dashboard"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">Icon</Label>
        <Input
          id="icon"
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          placeholder="Home"
        />
        <p className="text-xs text-gray-500">Use Lucide icon names (e.g., Home, User, Settings)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="route">Route</Label>
        <Input
          id="route"
          value={formData.route}
          onChange={(e) => setFormData({ ...formData, route: e.target.value })}
          placeholder="/dashboard"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="menuType">Menu Type *</Label>
        <Select
          value={formData.menuType}
          onValueChange={(value: 'glink' | 'plink') => setFormData({ ...formData, menuType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select menu type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="glink">GLink (Main Menu)</SelectItem>
            <SelectItem value="plink">PLink (Sub Menu)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.menuType === 'plink' && (
        <div className="space-y-2">
          <Label htmlFor="parentId">Parent Menu</Label>
          <Select
            value={formData.parentId?.toString() || ""}
            onValueChange={(value: string) => setFormData({ ...formData, parentId: value ? parseInt(value) : null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select parent menu" />
            </SelectTrigger>
            <SelectContent>
              {glinkMenus.map((menu: Menu) => (
                <SelectItem key={menu.id} value={menu.id.toString()}>
                  <div className="flex items-center">
                    <GitBranch className="h-4 w-4 mr-2" />
                    {menu.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Sort Order</Label>
        <Input
          id="sortOrder"
          type="number"
          value={formData.sortOrder}
          onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
          placeholder="0"
        />
      </div>

      <div className="flex space-x-3 pt-6 sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 mt-6">
        <Button 
          onClick={handleSaveMenu}
          disabled={saveMenuMutation.isPending}
          className="flex-1 h-10"
        >
          {saveMenuMutation.isPending ? "Saving..." : `${isEdit ? 'Update' : 'Create'} Menu`}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            if (isEdit) {
              setShowEditForm(false);
              setEditingMenu(null);
            } else {
              setShowAddForm(false);
            }
            resetForm();
          }}
          className="flex-1 h-10"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <AppLayout title="Menu Management" activeSection="configuration">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Menu Management</span>
        </div>
        
        <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
          <div className="space-y-2">
            {/* Menu Type Filter and Add Button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Select
                  value={selectedMenuType}
                  onValueChange={(value: 'glink' | 'plink') => setSelectedMenuType(value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="glink">GLink (Main Menu)</SelectItem>
                    <SelectItem value="plink">PLink (Sub Menu)</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline">
                  {filteredMenus.length} menu{filteredMenus.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
                <SheetTrigger asChild>
                  <Button className="h-8">
                    <Plus className="h-4 w-4 mr-2" />
                    Add {selectedMenuType === 'glink' ? 'GLink' : 'PLink'} Menu
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Add {selectedMenuType === 'glink' ? 'GLink' : 'PLink'} Menu</SheetTitle>
                    <SheetDescription>
                      Create a new {selectedMenuType === 'glink' ? 'main menu item' : 'sub menu item'}
                    </SheetDescription>
                  </SheetHeader>
                  <MenuForm />
                </SheetContent>
              </Sheet>
            </div>

            {/* Menus List */}
            <Card>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="text-center py-4">Loading menus...</div>
                ) : filteredMenus.length === 0 ? (
                  <div className="text-center py-8">
                    <MenuIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No {selectedMenuType.toUpperCase()} Menus</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No {selectedMenuType === 'glink' ? 'main' : 'sub'} menus available</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Icon</TableHead>
                        <TableHead>Route</TableHead>
                        {selectedMenuType === 'plink' && <TableHead>Parent</TableHead>}
                        <TableHead>Sort Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMenus.map((menu) => (
                        <TableRow key={menu.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <Settings className="h-4 w-4 mr-2 text-blue-600" />
                              <div className="font-medium">{menu.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{menu.label}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{menu.icon || "None"}</Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {menu.route || "No route"}
                            </code>
                          </TableCell>
                          {selectedMenuType === 'plink' && (
                            <TableCell>
                              <div className="text-sm">{getParentMenuName(menu.parentId)}</div>
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant="secondary">{menu.sortOrder}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={menu.isActive ? "default" : "secondary"}>
                              {menu.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleStatus(menu.id)}
                                disabled={toggleMenuStatusMutation.isPending}
                                className="h-8"
                              >
                                {menu.isActive ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(menu)}
                                className="h-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm" className="h-8">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Menu</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{menu.label}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMenuMutation.mutate(menu.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            
            {/* Edit Form Sheet */}
            <Sheet open={showEditForm} onOpenChange={(open) => {
              setShowEditForm(open);
              if (!open) {
                setEditingMenu(null);
                resetForm();
              }
            }}>
              <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Edit Menu</SheetTitle>
                  <SheetDescription>
                    Modify menu settings and configuration
                  </SheetDescription>
                </SheetHeader>
                <MenuForm isEdit={true} />
              </SheetContent>
            </Sheet>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
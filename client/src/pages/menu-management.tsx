import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, List, LayoutGrid, Home, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Menu } from "@shared/schema";
import { getIconComponent } from "@/lib/iconRecommendations";

// Icon options for selection
const iconOptions = [
  { name: "Home", component: Home },
  { name: "Settings", component: Settings },
  { name: "List", component: List },
  { name: "LayoutGrid", component: LayoutGrid },
  { name: "Plus", component: Plus },
  { name: "Edit", component: Edit },
  { name: "Trash2", component: Trash2 }
];

interface FormData {
  name: string;
  label: string;
  icon: string;
  route: string;
  sortOrder: number;
  menuType: 'glink' | 'plink';
  parentId: number | null;
  isSystemConfig: boolean;
}

const initialFormData: FormData = {
  name: '',
  label: '',
  icon: '',
  route: '',
  sortOrder: 0,
  menuType: 'glink',
  parentId: null,
  isSystemConfig: false
};

export default function MenuManagementPage() {
  const [viewMode, setViewMode] = useState<'table' | 'builder'>('table');
  const [selectedMenuType, setSelectedMenuType] = useState<'glink' | 'plink'>('glink');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all menus
  const { data: allMenus = [], isLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
  });

  // Get filtered menus based on selected type - memoized to prevent re-renders
  const filteredMenus = useMemo(() => 
    allMenus.filter(menu => menu.menuType === selectedMenuType), 
    [allMenus, selectedMenuType]
  );
  const glinkMenus = useMemo(() => 
    allMenus.filter(menu => menu.menuType === 'glink'), 
    [allMenus]
  );

  // Save menu mutation
  const saveMenuMutation = useMutation({
    mutationFn: async (menuData: FormData) => {
      const endpoint = editingMenu ? `/api/menus/${editingMenu.id}` : "/api/menus";
      const method = editingMenu ? "PUT" : "POST";
      const response = await apiRequest(method, endpoint, menuData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Success",
        description: `Menu ${editingMenu ? 'updated' : 'created'} successfully`
      });
      resetForm();
      setShowAddForm(false);
      setShowEditForm(false);
    },
    onError: (error: any) => {
      console.error("Menu save error:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingMenu ? 'update' : 'create'} menu`,
        variant: "destructive"
      });
    }
  });

  // Delete menu mutation
  const deleteMenuMutation = useMutation({
    mutationFn: async (menuId: number) => {
      const response = await apiRequest("DELETE", `/api/menus/${menuId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Success",
        description: "Menu deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete menu",
        variant: "destructive"
      });
    }
  });

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setEditingMenu(null);
  }, []);

  const handleEdit = useCallback((menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name || '',
      label: menu.label || '',
      icon: menu.icon || '',
      route: menu.route || '',
      sortOrder: menu.sortOrder || 0,
      menuType: (menu.menuType as 'glink' | 'plink') || 'glink',
      parentId: menu.parentId || null,
      isSystemConfig: menu.isSystemConfig || false
    });
    setShowEditForm(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.name || !formData.label) {
      toast({
        title: "Validation Error",
        description: "Name and Label are required",
        variant: "destructive"
      });
      return;
    }

    saveMenuMutation.mutate(formData);
  }, [formData, saveMenuMutation, toast]);

  const handleDelete = useCallback((menuId: number) => {
    if (confirm("Are you sure you want to delete this menu?")) {
      deleteMenuMutation.mutate(menuId);
    }
  }, [deleteMenuMutation]);

  // Memoized form input handlers to prevent re-renders
  const handleFormDataChange = useCallback((field: keyof FormData) => (value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const MenuForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-6 pb-8 max-w-none">
      {/* System Configuration Flag */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="isSystemConfig"
            checked={formData.isSystemConfig}
            onCheckedChange={(checked) => {
              setFormData(prev => ({ 
                ...prev, 
                isSystemConfig: checked,
                parentId: checked ? null : prev.parentId
              }));
            }}
          />
          <Label htmlFor="isSystemConfig" className="text-sm font-medium">
            System Configuration
          </Label>
        </div>
        <p className="text-xs text-gray-500">
          When enabled, this menu item will appear in the header configuration section
        </p>
      </div>

      {/* Menu Type */}
      <div className="space-y-2">
        <Label htmlFor="menuType">Menu Type *</Label>
        <Select
          value={formData.menuType}
          onValueChange={(value: 'glink' | 'plink') => {
            setFormData(prev => ({ 
              ...prev, 
              menuType: value,
              parentId: value === 'glink' ? null : prev.parentId
            }));
          }}
        >
          <SelectTrigger id="menuType">
            <SelectValue placeholder="Select menu type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="glink">GLink (Main Menu)</SelectItem>
            <SelectItem value="plink">PLink (Sub Menu)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          GLink: Main navigation items | PLink: Sub-menu items under GLink
        </p>
      </div>

      {/* Parent Menu Selection */}
      {formData.menuType === 'plink' && !formData.isSystemConfig && (
        <div className="space-y-2">
          <Label htmlFor="parentId">Parent GLink Menu *</Label>
          <Select
            value={formData.parentId?.toString() || ""}
            onValueChange={(value: string) => {
              setFormData(prev => ({ 
                ...prev, 
                parentId: value ? parseInt(value) : null 
              }));
            }}
          >
            <SelectTrigger id="parentId">
              <SelectValue placeholder="Select parent GLink menu" />
            </SelectTrigger>
            <SelectContent>
              {glinkMenus
                .filter(menu => menu.isActive && menu.menuType === 'glink')
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((menu) => {
                  const IconComponent = getIconComponent(menu.icon) as React.ComponentType<{ className?: string }>;
                  return (
                    <SelectItem key={menu.id} value={menu.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4" />
                        <span>{menu.label}</span>
                        <Badge variant="outline" className="text-xs ml-2">GLink</Badge>
                      </div>
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleFormDataChange('name')(e.target.value)}
          placeholder={formData.menuType === 'glink' ? 'dashboard' : 'settings'}
          autoComplete="off"
          className="touch-manipulation"
        />
        <p className="text-xs text-gray-500">Used as the unique identifier (lowercase, no spaces)</p>
      </div>

      {/* Label Field */}
      <div className="space-y-2">
        <Label htmlFor="label">Label *</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => handleFormDataChange('label')(e.target.value)}
          placeholder="Dashboard"
          autoComplete="off"
          className="touch-manipulation"
        />
        <p className="text-xs text-gray-500">Display name shown in navigation</p>
      </div>

      {/* Icon Selection */}
      <div className="space-y-2">
        <Label htmlFor="icon">Icon</Label>
        <Select
          value={formData.icon || "no-icon"}
          onValueChange={(value: string) => {
            setFormData(prev => ({ ...prev, icon: value === "no-icon" ? "" : value }));
          }}
        >
          <SelectTrigger id="icon">
            <SelectValue placeholder="Select an icon">
              {formData.icon && (
                <div className="flex items-center space-x-2">
                  {(() => {
                    const IconComponent = getIconComponent(formData.icon) as React.ComponentType<{ className?: string }>;
                    return <IconComponent className="h-4 w-4" />;
                  })()}
                  <span>{formData.icon}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            <SelectItem value="no-icon">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4"></div>
                <span>No icon</span>
              </div>
            </SelectItem>
            {iconOptions.map((iconOption) => {
              const IconComponent = iconOption.component;
              return (
                <SelectItem key={iconOption.name} value={iconOption.name}>
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4" />
                    <span>{iconOption.name}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">Choose an icon for the navigation menu</p>
      </div>

      {/* Route Field */}
      <div className="space-y-2">
        <Label htmlFor="route">Route</Label>
        <Input
          id="route"
          value={formData.route}
          onChange={(e) => handleFormDataChange('route')(e.target.value)}
          placeholder="/dashboard"
          autoComplete="off"
          className="touch-manipulation"
        />
        <p className="text-xs text-gray-500">URL path for this menu item</p>
      </div>

      {/* Sort Order Field */}
      <div className="space-y-2">
        <Label htmlFor="sortOrder">Sort Order</Label>
        <Input
          id="sortOrder"
          type="number"
          value={formData.sortOrder}
          onChange={(e) => handleFormDataChange('sortOrder')(parseInt(e.target.value) || 0)}
          placeholder="0"
          autoComplete="off"
          className="touch-manipulation"
        />
        <p className="text-xs text-gray-500">Display order in navigation (lower numbers appear first)</p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
        <Button
          variant="outline"
          onClick={() => {
            setShowAddForm(false);
            setShowEditForm(false);
            setEditingMenu(null);
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saveMenuMutation.isPending}
        >
          {saveMenuMutation.isPending ? "Saving..." : (isEdit ? "Update" : "Create")}
        </Button>
      </div>
    </div>
  );

  return (
    <AppLayout title="Menu Management" activeSection="menu-management">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Menu Management</span>
        </div>
        
        <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div></div>
              
              <div className="flex items-center space-x-3">
                {/* Menu Type Filter */}
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
                
                {/* View toggle buttons */}
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-8 px-3"
                  >
                    <List className="h-4 w-4 mr-1" />
                    Table
                  </Button>
                  <Button
                    variant={viewMode === 'builder' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('builder')}
                    className="h-8 px-3"
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Builder
                  </Button>
                </div>
                
                {/* Add menu button */}
                <Sheet open={showAddForm} onOpenChange={(open) => {
                  setShowAddForm(open);
                  if (!open) {
                    setEditingMenu(null);
                    resetForm();
                  }
                }}>
                  <SheetTrigger asChild>
                    <Button className="flex items-center space-x-2" onClick={() => {
                      setEditingMenu(null);
                      resetForm();
                      setShowAddForm(true);
                    }}>
                      <Plus className="h-4 w-4" />
                      <span>Add {selectedMenuType === 'glink' ? 'GLink' : 'PLink'} Menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[95vw] sm:w-[640px] max-w-[95vw] sm:max-w-[640px] overflow-y-auto" aria-describedby="add-menu-description">
                    <SheetHeader>
                      <SheetTitle>Add New {selectedMenuType === 'glink' ? 'GLink' : 'PLink'} Menu</SheetTitle>
                      <div id="add-menu-description" className="sr-only">
                        Create a new menu item for the navigation system
                      </div>
                    </SheetHeader>
                    <MenuForm />
                  </SheetContent>
                </Sheet>

                {/* Edit menu sheet */}
                <Sheet open={showEditForm} onOpenChange={(open) => {
                  setShowEditForm(open);
                  if (!open) {
                    setEditingMenu(null);
                    resetForm();
                  }
                }}>
                  <SheetContent className="w-[95vw] sm:w-[640px] max-w-[95vw] sm:max-w-[640px] overflow-y-auto" aria-describedby="edit-menu-description">
                    <SheetHeader>
                      <SheetTitle>Edit Menu</SheetTitle>
                      <div id="edit-menu-description" className="sr-only">
                        Edit the selected menu item properties and settings
                      </div>
                    </SheetHeader>
                    <MenuForm isEdit={true} />
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Table View */}
            {viewMode === 'table' && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedMenuType === 'glink' ? 'GLink (Main Menu)' : 'PLink (Sub Menu)'} Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Loading menus...</div>
                  ) : filteredMenus.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No {selectedMenuType} menus found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Icon</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Label</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Sort Order</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMenus
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((menu) => {
                            const IconComponent = getIconComponent(menu.icon) as React.ComponentType<{ className?: string }>;
                            return (
                              <TableRow key={menu.id}>
                                <TableCell>
                                  <IconComponent className="h-4 w-4" />
                                </TableCell>
                                <TableCell className="font-medium">{menu.name}</TableCell>
                                <TableCell>{menu.label}</TableCell>
                                <TableCell>{menu.route || '-'}</TableCell>
                                <TableCell>{menu.sortOrder}</TableCell>
                                <TableCell>
                                  <Badge variant={menu.isActive ? "default" : "secondary"}>
                                    {menu.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
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
                                      disabled={deleteMenuMutation.isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Builder View */}
            {viewMode === 'builder' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  <div className="col-span-full text-center py-8">Loading menus...</div>
                ) : filteredMenus.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No {selectedMenuType} menus found
                  </div>
                ) : (
                  filteredMenus
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((menu) => {
                      const IconComponent = getIconComponent(menu.icon) as React.ComponentType<{ className?: string }>;
                      return (
                        <Card key={menu.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <IconComponent className="h-5 w-5" />
                                <CardTitle className="text-lg">{menu.label}</CardTitle>
                              </div>
                              <Badge variant={menu.isActive ? "default" : "secondary"}>
                                {menu.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div><strong>Name:</strong> {menu.name}</div>
                              <div><strong>Route:</strong> {menu.route || 'No route'}</div>
                              <div><strong>Sort Order:</strong> {menu.sortOrder}</div>
                              {menu.menuType === 'plink' && menu.parentId && (
                                <div>
                                  <strong>Parent:</strong> {
                                    glinkMenus.find(g => g.id === menu.parentId)?.label || 'Unknown'
                                  }
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(menu)}
                                className="flex-1"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(menu.id)}
                                disabled={deleteMenuMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, List, LayoutGrid } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Menu } from "@shared/schema";
import { getIconComponent } from "@/lib/iconRecommendations";
import { MenuForm } from "@/components/forms/MenuForm";

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

export default function MenuManagementPage() {
  const [viewMode, setViewMode] = useState<'table' | 'builder'>('table');
  const [selectedMenuType, setSelectedMenuType] = useState<'glink' | 'plink'>('glink');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all menus
  const { data: allMenus = [], isLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/menus");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Get filtered menus based on selected type
  const filteredMenus = allMenus.filter(menu => menu.menuType === selectedMenuType);
  const glinkMenus = allMenus.filter(menu => menu.menuType === 'glink');

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
      setShowAddForm(false);
      setShowEditForm(false);
      setEditingMenu(null);
    },
    onError: (error: any) => {
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

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setShowEditForm(true);
  };

  const handleFormSubmit = (formData: FormData) => {
    saveMenuMutation.mutate(formData);
  };

  const handleFormCancel = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingMenu(null);
  };

  const handleDelete = (menuId: number) => {
    if (confirm("Are you sure you want to delete this menu?")) {
      deleteMenuMutation.mutate(menuId);
    }
  };

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
                <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
                  <SheetTrigger asChild>
                    <Button className="flex items-center space-x-2" onClick={() => {
                      setEditingMenu(null);
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
                    <MenuForm
                      glinkMenus={glinkMenus}
                      onSubmit={handleFormSubmit}
                      onCancel={handleFormCancel}
                      isLoading={saveMenuMutation.isPending}
                    />
                  </SheetContent>
                </Sheet>

                {/* Edit menu sheet */}
                <Sheet open={showEditForm} onOpenChange={setShowEditForm}>
                  <SheetContent className="w-[95vw] sm:w-[640px] max-w-[95vw] sm:max-w-[640px] overflow-y-auto" aria-describedby="edit-menu-description">
                    <SheetHeader>
                      <SheetTitle>Edit Menu</SheetTitle>
                      <div id="edit-menu-description" className="sr-only">
                        Edit the selected menu item properties and settings
                      </div>
                    </SheetHeader>
                    <MenuForm
                      editingMenu={editingMenu}
                      glinkMenus={glinkMenus}
                      onSubmit={handleFormSubmit}
                      onCancel={handleFormCancel}
                      isLoading={saveMenuMutation.isPending}
                    />
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
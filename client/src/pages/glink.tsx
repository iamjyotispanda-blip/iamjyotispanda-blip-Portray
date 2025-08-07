import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
import { Plus, Link as LinkIcon, Trash2, Edit, ToggleLeft, ToggleRight, Home, Settings, Building2, Ship, Users, Shield, UserCheck, Menu as MenuIcon, GripVertical, List, LayoutGrid } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Menu, InsertMenu, UpdateMenu } from "@shared/schema";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

interface GlinkFormData {
  name: string;
  label: string;
  icon: string;
  route: string;
  sortOrder: number;
  menuType: 'glink' | 'plink';
  parentId: number | null;
}

const iconOptions = [
  { name: "Home", component: Home },
  { name: "Settings", component: Settings },
  { name: "Building2", component: Building2 },
  { name: "Ship", component: Ship },
  { name: "Users", component: Users },
  { name: "Shield", component: Shield },
  { name: "UserCheck", component: UserCheck },
  { name: "Menu", component: MenuIcon },
  { name: "Link", component: LinkIcon },
];

export default function GlinkPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'builder'>('table');
  const [builderMenus, setBuilderMenus] = useState<Menu[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState<GlinkFormData>({
    name: "",
    label: "",
    icon: "",
    route: "",
    sortOrder: 0,
    menuType: 'glink',
    parentId: null,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get GLink menus only
  const { data: glinkMenus = [], isLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus", "glink"],
    queryFn: async (): Promise<Menu[]> => {
      try {
        const response = await apiRequest("GET", "/api/menus?type=glink");
        // Ensure we always return an array
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Failed to fetch GLink menus:", error);
        return [];
      }
    },
  });

  // Ensure glinkMenus is always an array
  const safeGlinkMenus = Array.isArray(glinkMenus) ? glinkMenus : [];

  // Initialize builder menus when data is loaded
  React.useEffect(() => {
    if (safeGlinkMenus.length > 0 && builderMenus.length === 0) {
      setBuilderMenus([...safeGlinkMenus].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [safeGlinkMenus]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save menu mutation
  const saveMenuMutation = useMutation({
    mutationFn: async (data: GlinkFormData) => {
      const menuData = {
        ...data,
        parentId: data.menuType === 'glink' ? null : data.parentId,
      };
      
      if (editingMenu) {
        return apiRequest("PUT", `/api/menus/${editingMenu.id}`, menuData);
      } else {
        return apiRequest("POST", "/api/menus", menuData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `GLink menu ${editingMenu ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus", "glink"] });
      setShowAddForm(false);
      setShowEditForm(false);
      setEditingMenu(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save menu",
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
        description: "GLink menu deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus", "glink"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete menu",
        variant: "destructive",
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (menuId: number) => {
      return apiRequest("PATCH", `/api/menus/${menuId}/toggle-status`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "GLink menu status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus", "glink"] });
    },
  });

  // Bulk save menu order mutation
  const saveBulkOrderMutation = useMutation({
    mutationFn: async (menus: Menu[]) => {
      const updates = menus.map((menu, index) => ({
        id: menu.id,
        sortOrder: index + 1
      }));
      return apiRequest("PATCH", "/api/menus/bulk-update-order", { updates });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Menu order updated successfully",
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus", "glink"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update menu order",
        variant: "destructive",
      });
    },
  });


  const resetForm = () => {
    setFormData({
      name: "",
      label: "",
      icon: "",
      route: "",
      sortOrder: 0,
      menuType: 'glink',
      parentId: null,
    });
  };

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      label: menu.label,
      icon: menu.icon || "",
      route: menu.route || "",
      sortOrder: menu.sortOrder,
      menuType: menu.menuType as 'glink' | 'plink',
      parentId: menu.parentId,
    });
    setShowEditForm(true);
  };

  const handleDelete = (menuId: number) => {
    deleteMenuMutation.mutate(menuId);
  };

  const handleToggleStatus = (menuId: number) => {
    toggleStatusMutation.mutate(menuId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBuilderMenus((items) => {
        const oldIndex = items.findIndex((item) => item.id.toString() === active.id);
        const newIndex = items.findIndex((item) => item.id.toString() === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasUnsavedChanges(true);
        return newItems;
      });
    }
  };

  const handleSaveBulkOrder = () => {
    saveBulkOrderMutation.mutate(builderMenus);
  };

  const handleDiscardChanges = () => {
    setBuilderMenus([...safeGlinkMenus].sort((a, b) => a.sortOrder - b.sortOrder));
    setHasUnsavedChanges(false);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.label || !formData.menuType) {
      toast({
        title: "Error",
        description: "Name, Label, and Menu Type are required",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.menuType === 'plink' && !formData.parentId) {
      toast({
        title: "Error",
        description: "Parent GLink menu is required for PLink menus",
        variant: "destructive",
      });
      return;
    }
    
    saveMenuMutation.mutate(formData);
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return LinkIcon;
    const iconOption = iconOptions.find(option => option.name === iconName);
    return iconOption ? iconOption.component : LinkIcon;
  };

  // Sortable menu item component for drag-and-drop builder
  const SortableMenuItem = ({ menu }: { menu: Menu }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: menu.id.toString() });
  
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
  
    const IconComponent = getIconComponent(menu.icon);
  
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow ${
          isDragging ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              data-testid={`drag-handle-${menu.id}`}
            >
              <GripVertical className="h-5 w-5" />
            </div>
            
            {/* Icon */}
            <div className="flex items-center justify-center w-10 h-10 border rounded-md bg-gray-50 dark:bg-gray-700">
              <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            
            {/* Menu details */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white" data-testid={`builder-label-${menu.id}`}>
                {menu.label}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {menu.name} • Sort: {menu.sortOrder}
              </p>
              {menu.route && (
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {menu.route}
                </code>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <Badge variant={menu.isActive ? "default" : "secondary"} data-testid={`builder-status-${menu.id}`}>
              {menu.isActive ? "Active" : "Inactive"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleStatus(menu.id)}
              disabled={toggleStatusMutation.isPending}
              data-testid={`builder-toggle-${menu.id}`}
            >
              {menu.isActive ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(menu)}
              data-testid={`builder-edit-${menu.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const MenuForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-6 mt-2 pb-8 max-w-none">
      {/* Menu Type - First Field */}
      <div className="space-y-2">
        <Label htmlFor="menuType">Menu Type *</Label>
        <Select
          value={formData.menuType}
          onValueChange={(value: 'glink' | 'plink') => setFormData({ 
            ...formData, 
            menuType: value,
            parentId: value === 'glink' ? null : formData.parentId
          })}
          data-testid="select-menu-type"
        >
          <SelectTrigger>
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

      {/* Parent Menu Selection - Only for PLink */}
      {formData.menuType === 'plink' && (
        <div className="space-y-2">
          <Label htmlFor="parentId">Parent GLink Menu *</Label>
          <Select
            value={formData.parentId?.toString() || ""}
            onValueChange={(value: string) => setFormData({ 
              ...formData, 
              parentId: value ? parseInt(value) : null 
            })}
            data-testid="select-parent-menu"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select parent GLink menu" />
            </SelectTrigger>
            <SelectContent>
              {safeGlinkMenus
                .filter(menu => menu.isActive && menu.menuType === 'glink')
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((menu) => {
                  const IconComponent = getIconComponent(menu.icon);
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
          <p className="text-xs text-gray-500">All GLink menus are bound as parent options for PLink</p>
        </div>
      )}

      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={formData.menuType === 'glink' ? 'dashboard' : 'settings'}
          data-testid="input-name"
        />
        <p className="text-xs text-gray-500">Used as the unique identifier (lowercase, no spaces)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Label *</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="Dashboard"
          data-testid="input-label"
        />
        <p className="text-xs text-gray-500">Display name shown in navigation</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">Icon</Label>
        <div className="flex items-center space-x-2">
          <select
            id="icon"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="select-icon"
          >
            <option value="">Select an icon</option>
            {iconOptions.map((icon) => (
              <option key={icon.name} value={icon.name}>
                {icon.name}
              </option>
            ))}
          </select>
          {formData.icon && (
            <div className="flex items-center justify-center w-10 h-10 border rounded-md bg-gray-50">
              {(() => {
                const IconComponent = getIconComponent(formData.icon);
                return <IconComponent className="h-5 w-5" />;
              })()}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">Choose an icon for the navigation menu</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="route">Route</Label>
        <Input
          id="route"
          value={formData.route}
          onChange={(e) => setFormData({ ...formData, route: e.target.value })}
          placeholder="/dashboard"
          data-testid="input-route"
        />
        <p className="text-xs text-gray-500">URL path for this menu item</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Sort Order</Label>
        <Input
          id="sortOrder"
          type="number"
          value={formData.sortOrder}
          onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
          placeholder="0"
          data-testid="input-sort-order"
        />
        <p className="text-xs text-gray-500">Display order in navigation (lower numbers appear first)</p>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
        <Button
          variant="outline"
          onClick={() => {
            setShowAddForm(false);
            setShowEditForm(false);
            setEditingMenu(null);
            resetForm();
          }}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saveMenuMutation.isPending}
          data-testid="button-save"
        >
          {saveMenuMutation.isPending ? "Saving..." : (isEdit ? "Update" : "Create")}
        </Button>
      </div>
    </div>
  );

  return (
    <AppLayout title="GLink Management" activeSection="glink">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">GLink Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage main navigation menu items with drag-and-drop builder
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View toggle buttons */}
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-3"
                data-testid="button-table-view"
              >
                <List className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === 'builder' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('builder')}
                className="h-8 px-3"
                data-testid="button-builder-view"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Builder
              </Button>
            </div>
            
            {/* Add menu button */}
            <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
              <SheetTrigger asChild>
                <Button className="flex items-center space-x-2" data-testid="button-add-menu">
                  <Plus className="h-4 w-4" />
                  <span>Add Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[90vw] sm:w-[600px] lg:w-[700px] overflow-y-auto shadow-2xl border-l-4 border-l-blue-500">
                <SheetHeader>
                  <SheetTitle>Add New Menu</SheetTitle>
                  <SheetDescription>
                    Create a new menu item (GLink or PLink)
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-1 py-4">
                  <MenuForm />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <List className="h-5 w-5" />
                  <span>GLink Menus - Table View</span>
                </CardTitle>
                <Badge variant="outline" data-testid="text-menu-count">
                  {safeGlinkMenus.length} menu{safeGlinkMenus.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : safeGlinkMenus.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <LinkIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No GLink menus found</p>
                  <p className="text-sm">Create your first main navigation menu item</p>
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
                    {safeGlinkMenus
                      .sort((a: Menu, b: Menu) => a.sortOrder - b.sortOrder)
                      .map((menu: Menu) => {
                        const IconComponent = getIconComponent(menu.icon);
                        return (
                          <TableRow key={menu.id} data-testid={`row-menu-${menu.id}`}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center justify-center w-8 h-8 border rounded-md bg-gray-50">
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                <span className="text-sm text-gray-600">{menu.icon || "None"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`text-name-${menu.id}`}>{menu.name}</TableCell>
                            <TableCell data-testid={`text-label-${menu.id}`}>{menu.label}</TableCell>
                            <TableCell data-testid={`text-route-${menu.id}`}>
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                {menu.route || '-'}
                              </code>
                            </TableCell>
                            <TableCell data-testid={`text-sort-order-${menu.id}`}>{menu.sortOrder}</TableCell>
                            <TableCell>
                              <Badge variant={menu.isActive ? "default" : "secondary"} data-testid={`status-${menu.id}`}>
                                {menu.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(menu.id)}
                                  disabled={toggleStatusMutation.isPending}
                                  data-testid={`button-toggle-${menu.id}`}
                                >
                                  {menu.isActive ? (
                                    <ToggleRight className="h-4 w-4" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(menu)}
                                  data-testid={`button-edit-${menu.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      data-testid={`button-delete-${menu.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete GLink Menu</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{menu.label}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(menu.id)}
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
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Drag-and-Drop Builder View */}
        {viewMode === 'builder' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <LayoutGrid className="h-5 w-5" />
                  <span>GLink Menus - Drag & Drop Builder</span>
                </CardTitle>
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" data-testid="text-builder-menu-count">
                    {builderMenus.length} menu{builderMenus.length !== 1 ? 's' : ''}
                  </Badge>
                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDiscardChanges}
                        data-testid="button-discard-changes"
                      >
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveBulkOrder}
                        disabled={saveBulkOrderMutation.isPending}
                        data-testid="button-save-order"
                      >
                        {saveBulkOrderMutation.isPending ? 'Saving...' : 'Save Order'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : builderMenus.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No GLink menus found</p>
                  <p className="text-sm">Create your first main navigation menu item</p>
                </div>
              ) : (
                <div>
                  {hasUnsavedChanges && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <span className="text-sm text-amber-700 dark:text-amber-300">
                            You have unsaved changes to the menu order
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={builderMenus.map(menu => menu.id.toString())}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3" data-testid="builder-container">
                        {builderMenus.map((menu) => (
                          <SortableMenuItem key={menu.id} menu={menu} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Sheet */}
        <Sheet open={showEditForm} onOpenChange={setShowEditForm}>
          <SheetContent className="w-[90vw] sm:w-[600px] lg:w-[700px] overflow-y-auto shadow-2xl border-l-4 border-l-blue-500">
            <SheetHeader>
              <SheetTitle>Edit Menu</SheetTitle>
              <SheetDescription>
                Update the menu item details
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1 py-4">
              <MenuForm isEdit={true} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
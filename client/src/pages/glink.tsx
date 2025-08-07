import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Link as LinkIcon, Trash2, Edit, ToggleLeft, ToggleRight, Home, Settings, Building2, Ship, Users, Shield, UserCheck, Menu as MenuIcon, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Menu, InsertMenu, UpdateMenu } from "@shared/schema";

interface GlinkFormData {
  name: string;
  label: string;
  icon: string;
  route: string;
  sortOrder: number;
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
  const [formData, setFormData] = useState<GlinkFormData>({
    name: "",
    label: "",
    icon: "",
    route: "",
    sortOrder: 0,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get GLink menus only
  const { data: glinkMenus = [], isLoading, refetch } = useQuery<Menu[]>({
    queryKey: ["/api/menus", "glink"],
    queryFn: async (): Promise<Menu[]> => {
      try {
        console.log("Fetching GLink menus...");
        const response = await apiRequest("GET", "/api/menus?type=glink");
        console.log("GLink menus response:", response);
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

  // Save menu mutation
  const saveMenuMutation = useMutation({
    mutationFn: async (data: GlinkFormData) => {
      const menuData = {
        ...data,
        menuType: 'glink',
        parentId: null, // GLink menus don't have parents
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

  // Seed default menus mutation
  const seedDefaultMenusMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/menus/seed-defaults");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Successfully seeded ${data.menus?.length || 0} default menus`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus", "glink"] });
      // Force refetch
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed default menus",
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
    });
    setShowEditForm(true);
  };

  const handleDelete = (menuId: number) => {
    deleteMenuMutation.mutate(menuId);
  };

  const handleToggleStatus = (menuId: number) => {
    toggleStatusMutation.mutate(menuId);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.label) {
      toast({
        title: "Error",
        description: "Name and Label are required",
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

  const MenuForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-6 mt-2 pb-8 max-w-none">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="dashboard"
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
              Manage main navigation menu items (GLink)
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center space-x-2 mr-2"
              data-testid="button-refresh"
            >
              <ToggleRight className="h-4 w-4" />
              <span>{isLoading ? "Loading..." : "Refresh"}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => seedDefaultMenusMutation.mutate()}
              disabled={seedDefaultMenusMutation.isPending}
              className="flex items-center space-x-2"
              data-testid="button-seed-defaults"
            >
              <Download className="h-4 w-4" />
              <span>{seedDefaultMenusMutation.isPending ? "Seeding..." : "Seed Default Menus"}</span>
            </Button>
            <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
            <SheetTrigger asChild>
              <Button className="flex items-center space-x-2" data-testid="button-add-glink">
                <Plus className="h-4 w-4" />
                <span>Add GLink Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[90vw] sm:w-[600px] lg:w-[700px] overflow-y-auto shadow-2xl border-l-4 border-l-blue-500">
              <SheetHeader>
                <SheetTitle>Add New GLink Menu</SheetTitle>
                <SheetDescription>
                  Create a new main navigation menu item
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-1 py-4">
                <MenuForm />
              </div>
            </SheetContent>
            </Sheet>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="h-5 w-5" />
                <span>GLink Menus</span>
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

        {/* Edit Sheet */}
        <Sheet open={showEditForm} onOpenChange={setShowEditForm}>
          <SheetContent className="w-[90vw] sm:w-[600px] lg:w-[700px] overflow-y-auto shadow-2xl border-l-4 border-l-blue-500">
            <SheetHeader>
              <SheetTitle>Edit GLink Menu</SheetTitle>
              <SheetDescription>
                Update the main navigation menu item
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
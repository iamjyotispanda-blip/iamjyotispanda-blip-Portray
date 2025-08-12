import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronRight,
  Menu as MenuIcon,
  Home,
  Settings,
  Users,
  Building2,
  Ship,
  Shield,
  Package,
  Mail,
  Bell,
  Zap,
  MapPin,
  FileText,
  Database,
  Grid,
  Calendar,
  Search,
  Tag,
  Truck,
  Globe,
  BarChart,
  Key,
  Lock,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// Types
interface Menu {
  id: number;
  name: string;
  label: string;
  icon: string | null;
  route: string | null;
  menuType: 'glink' | 'plink';
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  children?: Menu[];
}

interface MenuFormData {
  name: string;
  label: string;
  icon: string;
  route: string;
  menuType: 'glink' | 'plink';
  parentId: number | null;
  sortOrder: number;
}

// Icon mapping function
const getIconComponent = (iconName: string | null) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Home, Settings, Users, Building2, Ship, Shield, Package, Mail, Bell, Zap,
    MapPin, FileText, Database, Grid, Calendar, Search, Tag, Truck, Globe, 
    BarChart, MenuIcon, Key, Lock
  };
  return iconMap[iconName || ''] || MenuIcon;
};

// Enhanced menu item for tree hierarchy
interface HierarchicalMenu extends Menu {
  level: number;
  isParent: boolean;
  isChild: boolean;
  isExpanded?: boolean;
  childCount: number;
}

export default function MenuManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // State management
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());
  const [menuOrder, setMenuOrder] = useState<Menu[]>([]);

  // Fetch menus
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['/api/menus'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/menus');
      return await response.json() as Menu[];
    },
  });

  // Initialize menu order when data loads
  useEffect(() => {
    if (menus.length > 0 && menuOrder.length === 0) {
      setMenuOrder([...menus].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [menus, menuOrder.length]);

  // Removed form-related functions - now using separate page for add/edit

  // Organize menus into hierarchy
  const organizeMenusHierarchically = (): HierarchicalMenu[] => {
    const sortedMenus = [...menuOrder].sort((a, b) => a.sortOrder - b.sortOrder);
    const result: HierarchicalMenu[] = [];
    const parentMenus = sortedMenus.filter(menu => menu.menuType === 'glink');
    
    parentMenus.forEach(parent => {
      const children = sortedMenus.filter(menu => menu.parentId === parent.id);
      const isExpanded = expandedMenus.has(parent.id);
      
      // Add parent menu
      result.push({
        ...parent,
        level: 0,
        isParent: children.length > 0,
        isChild: false,
        isExpanded,
        childCount: children.length,
      });
      
      // Add children if expanded
      if (isExpanded && children.length > 0) {
        children.forEach(child => {
          result.push({
            ...child,
            level: 1,
            isParent: false,
            isChild: true,
            childCount: 0,
          });
        });
      }
    });
    
    return result;
  };

  const hierarchicalMenus = organizeMenusHierarchically();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end with auto-save
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = menuOrder.findIndex(menu => menu.id.toString() === active.id);
    const newIndex = menuOrder.findIndex(menu => menu.id.toString() === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(menuOrder, oldIndex, newIndex);
      const updatedOrder = newOrder.map((menu, index) => ({
        ...menu,
        sortOrder: index + 1,
      }));
      
      setMenuOrder(updatedOrder);
      
      // Auto-save the new order
      saveOrderMutation.mutate(updatedOrder);
    }
  };

  // Toggle menu expansion
  const toggleExpansion = (menuId: number) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  // Removed save menu mutation - now handled in separate add/edit page

  // Delete menu mutation
  const deleteMenuMutation = useMutation({
    mutationFn: async (menuId: number) => {
      return apiRequest('DELETE', `/api/menus/${menuId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Menu deleted successfully',
      });
      // Invalidate and refetch the menus
      queryClient.invalidateQueries({ queryKey: ['/api/menus'] });
      queryClient.refetchQueries({ queryKey: ['/api/menus'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete menu',
        variant: 'destructive',
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (menuId: number) => {
      return apiRequest('PATCH', `/api/menus/${menuId}/toggle-status`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Menu status updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/menus'] });
      queryClient.refetchQueries({ queryKey: ['/api/menus'] });
    },
  });

  // Save order mutation with auto-save
  const saveOrderMutation = useMutation({
    mutationFn: async (orderedMenus: Menu[]) => {
      return apiRequest('POST', '/api/menus/bulk-update-order', { menus: orderedMenus });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Menu order updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/menus'] });
      queryClient.refetchQueries({ queryKey: ['/api/menus'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update menu order',
        variant: 'destructive',
      });
    },
  });

  // Handle edit - redirect to edit page
  const handleEdit = (menu: Menu) => {
    setLocation(`/configuration/menu/edit/${menu.id}`);
  };



  // Sortable menu item component
  const SortableMenuItem = ({ menu }: { menu: HierarchicalMenu }) => {
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
        className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow ${
          isDragging ? 'ring-2 ring-blue-500' : ''
        } ${menu.isChild ? 'ml-4 sm:ml-8 border-l-4 border-l-blue-200' : ''}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              data-testid={`drag-handle-${menu.id}`}
            >
              <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>

            {/* Expand/collapse button for parent menus */}
            {menu.isParent && (
              <button
                onClick={() => toggleExpansion(menu.id)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                data-testid={`expand-toggle-${menu.id}`}
              >
                {menu.isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}

            {/* Icon */}
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border rounded-md bg-gray-50 dark:bg-gray-700 flex-shrink-0">
              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
            </div>

            {/* Menu details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate" data-testid={`menu-label-${menu.id}`}>
                  {menu.label}
                </h4>
                <Badge variant={menu.menuType === 'glink' ? 'default' : 'secondary'} className="text-xs">
                  {menu.menuType.toUpperCase()}
                </Badge>
                {menu.isParent && (
                  <Badge variant="outline" className="text-xs">
                    {menu.childCount} sub
                  </Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {menu.name} • Sort: {menu.sortOrder}
                </p>
                {menu.route && (
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 sm:px-2 py-1 rounded block sm:inline truncate">
                    {menu.route}
                  </code>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end sm:justify-start space-x-1 sm:space-x-2 flex-shrink-0">
            <Badge variant={menu.isActive ? 'default' : 'secondary'} data-testid={`status-${menu.id}`} className="text-xs">
              {menu.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleStatusMutation.mutate(menu.id)}
              disabled={toggleStatusMutation.isPending}
              data-testid={`toggle-status-${menu.id}`}
              className="h-8 w-8 p-0"
            >
              {menu.isActive ? (
                <ToggleRight className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <ToggleLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(menu)}
              data-testid={`edit-${menu.id}`}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                  data-testid={`delete-${menu.id}`}
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[95vw] sm:w-full max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Menu</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{menu.label}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMenuMutation.mutate(menu.id)}
                    className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  };

  // Form component removed - now using separate add/edit page

  return (
    <AppLayout title="Menu Management">
      <div className="flex-1 space-y-4 p-3 sm:p-4 md:p-6 pt-4 sm:pt-6">
        <main className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Menu Tree */}
          <Card>
            <CardContent className="p-6">
              {/* Add Menu Button and Stats */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-xs">
                    {menus.length} total
                  </Badge>
                </div>
                <Button 
                  onClick={() => setLocation('/configuration/menu/add')}
                  data-testid="button-add-menu"
                  size="sm"
                  className="h-8 text-sm px-3"
                >
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add Menu</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : hierarchicalMenus.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MenuIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Menus Found
                  </h3>
                  <p className="mb-4">Create your first navigation menu item</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={hierarchicalMenus.map(menu => menu.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3" data-testid="menu-tree">
                      {hierarchicalMenus.map((menu) => (
                        <SortableMenuItem key={menu.id} menu={menu} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          {/* Edit dialog removed - now uses separate page */}
        </main>
      </div>
    </AppLayout>
  );
}
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Link as LinkIcon, Trash2, Edit, ToggleLeft, ToggleRight, Home, Settings, Building2, Ship, Users, Shield, UserCheck, Menu as MenuIcon, GripVertical, List, LayoutGrid, GitBranch, AlertTriangle, ChevronDown, ChevronRight, Mail, Calendar, Clock, Database, File, Folder, Globe, Heart, Image, Key, Lock, MapPin, MessageCircle, Phone, Search, Tag, Target, Trophy, Truck, Wifi, Zap, Archive, Bookmark, Camera, Download, Flag, Gift, HelpCircle, Info, LogIn, LogOut, Monitor, Palette, PieChart, Play, Plus as PlusIcon, Power, RefreshCw, Save, Star, Trash, Upload, User, Video, Volume2, Wrench, AlertCircle, BarChart, Bell, Briefcase, CheckCircle, Clipboard, Cloud, Code, CreditCard, DollarSign, Eye, FileText, Filter, Grid, Hash, Layers, Layout, Lightbulb, Link2, MessageSquare, Mic, Navigation, Package, PlusCircle, Printer, Radio, Repeat, Scissors, Server, Sliders, Smartphone, Tablet, Thermometer, Umbrella, Unlock, Verified, Wallet, X, Youtube } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Menu, InsertMenu, UpdateMenu } from "@shared/schema";
import { getIconRecommendations, getAllAvailableIcons, getIconComponent, isValidIcon, type IconRecommendation } from "@/lib/iconRecommendations";

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
  isSystemConfig: boolean;
}

// Enhanced icon recommendation system
const getRecommendedIcons = (menuType: 'glink' | 'plink', name: string, label: string, parentMenu?: Menu): string[] => {
  const recommendations = getIconRecommendations(name, label, menuType, undefined);
  return recommendations.map(rec => rec.icon).filter(icon => 
    iconOptions.some(opt => opt.name === icon)
  );
};

const iconOptions = [
  // Navigation & Core
  { name: "Home", component: Home },
  { name: "Menu", component: MenuIcon },
  { name: "Navigation", component: Navigation },
  { name: "Link", component: LinkIcon },
  { name: "Link2", component: Link2 },
  { name: "Globe", component: Globe },
  
  // Settings & Configuration
  { name: "Settings", component: Settings },
  { name: "Sliders", component: Sliders },
  { name: "Wrench", component: Wrench },
  { name: "Palette", component: Palette },
  { name: "Filter", component: Filter },
  
  // Users & Access
  { name: "User", component: User },
  { name: "Users", component: Users },
  { name: "UserCheck", component: UserCheck },
  { name: "Shield", component: Shield },
  { name: "Lock", component: Lock },
  { name: "Unlock", component: Unlock },
  { name: "Key", component: Key },
  { name: "LogIn", component: LogIn },
  { name: "LogOut", component: LogOut },
  
  // Business & Organization
  { name: "Building2", component: Building2 },
  { name: "Briefcase", component: Briefcase },
  { name: "Package", component: Package },
  { name: "Truck", component: Truck },
  { name: "Ship", component: Ship },
  { name: "DollarSign", component: DollarSign },
  { name: "CreditCard", component: CreditCard },
  { name: "Wallet", component: Wallet },
  
  // Communication
  { name: "Mail", component: Mail },
  { name: "MessageCircle", component: MessageCircle },
  { name: "MessageSquare", component: MessageSquare },
  { name: "Phone", component: Phone },
  { name: "Bell", component: Bell },
  { name: "Mic", component: Mic },
  
  // Data & Analytics
  { name: "Database", component: Database },
  { name: "Server", component: Server },
  { name: "BarChart", component: BarChart },
  { name: "PieChart", component: PieChart },
  { name: "Target", component: Target },
  { name: "Trophy", component: Trophy },
  
  // Files & Documents
  { name: "File", component: File },
  { name: "FileText", component: FileText },
  { name: "Folder", component: Folder },
  { name: "Archive", component: Archive },
  { name: "Bookmark", component: Bookmark },
  { name: "Clipboard", component: Clipboard },
  { name: "Code", component: Code },
  
  // Media & Content
  { name: "Image", component: Image },
  { name: "Camera", component: Camera },
  { name: "Video", component: Video },
  { name: "Play", component: Play },
  { name: "Volume2", component: Volume2 },
  { name: "Youtube", component: Youtube },
  
  // Actions
  { name: "Plus", component: PlusIcon },
  { name: "PlusCircle", component: PlusCircle },
  { name: "Save", component: Save },
  { name: "Download", component: Download },
  { name: "Upload", component: Upload },
  { name: "Search", component: Search },
  { name: "RefreshCw", component: RefreshCw },
  { name: "Power", component: Power },
  { name: "Repeat", component: Repeat },
  
  // Status & Alerts
  { name: "CheckCircle", component: CheckCircle },
  { name: "AlertCircle", component: AlertCircle },
  { name: "Info", component: Info },
  { name: "HelpCircle", component: HelpCircle },
  { name: "Star", component: Star },
  { name: "Heart", component: Heart },
  { name: "Flag", component: Flag },
  { name: "Gift", component: Gift },
  { name: "Verified", component: Verified },
  
  // Technology
  { name: "Monitor", component: Monitor },
  { name: "Smartphone", component: Smartphone },
  { name: "Tablet", component: Tablet },
  { name: "Wifi", component: Wifi },
  { name: "Cloud", component: Cloud },
  { name: "Zap", component: Zap },
  { name: "Radio", component: Radio },
  { name: "Printer", component: Printer },
  
  // Time & Scheduling
  { name: "Calendar", component: Calendar },
  { name: "Clock", component: Clock },
  
  // Layout & Design
  { name: "Layout", component: Layout },
  { name: "Grid", component: Grid },
  { name: "Layers", component: Layers },
  { name: "Eye", component: Eye },
  
  // Utilities
  { name: "Tag", component: Tag },
  { name: "Hash", component: Hash },
  { name: "MapPin", component: MapPin },
  { name: "Lightbulb", component: Lightbulb },
  { name: "Scissors", component: Scissors },
  { name: "Thermometer", component: Thermometer },
  { name: "Umbrella", component: Umbrella },
  { name: "Trash", component: Trash },
  { name: "X", component: X },
];

export default function MenuManagementPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [selectedMenuType, setSelectedMenuType] = useState<'glink' | 'plink'>('glink');
  const [viewMode, setViewMode] = useState<'table' | 'builder'>('table');
  const [builderMenus, setBuilderMenus] = useState<Menu[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<GlinkFormData>({
    name: "",
    label: "",
    icon: "",
    route: "",
    sortOrder: 0,
    menuType: 'glink',
    parentId: null,
    isSystemConfig: false,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get ALL menus for comprehensive parent dropdown
  const { data: allMenusData = [], isLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
  });

  // Get GLink menus only for parent dropdown
  const { data: glinkMenus = [] } = useQuery<Menu[]>({
    queryKey: ["/api/menus", "glink"],
    queryFn: async () => {
      console.log("[Menu Management Page] Fetching GLink menus for parent dropdown...");
      const response = await apiRequest("GET", "/api/menus?type=glink");
      const data = await response.json();
      console.log("[Menu Management Page] GLink menus loaded:", data);
      return Array.isArray(data) ? data : [];
    },
  });

  // Ensure allMenusData is always an array
  const safeAllMenus = Array.isArray(allMenusData) ? allMenusData : [];
  // Ensure glinkMenus is always an array for parent dropdown
  const safeGlinkMenus = Array.isArray(glinkMenus) ? glinkMenus : [];

  // Toggle parent menu expansion
  const toggleParentExpansion = (parentId: number) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  // Organize menus into hierarchical structure with expansion state
  const organizeMenusHierarchically = () => {
    const parentMenus = safeAllMenus.filter(menu => menu.menuType === 'glink');
    const childMenus = safeAllMenus.filter(menu => menu.menuType === 'plink');
    
    const hierarchicalMenus: any[] = [];
    
    // Add parent menus with their children (only if expanded)
    parentMenus.sort((a, b) => a.sortOrder - b.sortOrder).forEach(parent => {
      const isExpanded = expandedParents.has(parent.id);
      const children = childMenus
        .filter(child => child.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      
      hierarchicalMenus.push({ 
        ...parent, 
        isParent: true, 
        isExpanded, 
        childCount: children.length 
      });
      
      // Add children only if parent is expanded
      if (isExpanded) {
        children.forEach(child => {
          hierarchicalMenus.push({ ...child, isChild: true, parentMenu: parent });
        });
      }
    });
    
    // Add orphaned child menus (PLinks without valid parent)
    const orphanedChildren = childMenus.filter(child => 
      !parentMenus.find(parent => parent.id === child.parentId)
    );
    if (orphanedChildren.length > 0) {
      orphanedChildren.forEach(orphan => {
        hierarchicalMenus.push({ ...orphan, isOrphan: true });
      });
    }
    
    return hierarchicalMenus;
  };

  const hierarchicalMenus = organizeMenusHierarchically();
  
  // Filter menus based on selected type - show hierarchy when viewing GLink, flat when viewing PLink
  const filteredMenus = selectedMenuType === 'glink' 
    ? hierarchicalMenus  // Show full hierarchy for GLink view
    : hierarchicalMenus.filter(menu => menu.menuType === 'plink' || menu.isOrphan); // Show only PLinks for PLink view

  // Initialize builder menus when data is loaded
  React.useEffect(() => {
    if (safeAllMenus.length > 0 && builderMenus.length === 0) {
      setBuilderMenus([...safeAllMenus].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [safeAllMenus]);

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
      menuType: selectedMenuType, // Set based on current filter selection
      parentId: null,
      isSystemConfig: false,
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
      isSystemConfig: (menu as any).isSystemConfig || false,
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
    setBuilderMenus([...safeAllMenus].sort((a, b) => a.sortOrder - b.sortOrder));
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
    
    // Check for duplicate label names
    const existingMenuWithSameLabel = safeAllMenus.find(menu => 
      menu.label.toLowerCase() === formData.label.toLowerCase() && 
      (!editingMenu || menu.id !== editingMenu.id)
    );
    
    if (existingMenuWithSameLabel) {
      toast({
        title: "Error",
        description: `Label "${formData.label}" already exists. Please choose a different label name.`,
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicate name identifiers
    const existingMenuWithSameName = safeAllMenus.find(menu => 
      menu.name.toLowerCase() === formData.name.toLowerCase() && 
      (!editingMenu || menu.id !== editingMenu.id)
    );
    
    if (existingMenuWithSameName) {
      toast({
        title: "Error",
        description: `Name "${formData.name}" already exists. Please choose a different name identifier.`,
        variant: "destructive",
      });
      return;
    }
    
    if (formData.menuType === 'plink' && !formData.isSystemConfig && !formData.parentId) {
      toast({
        title: "Error",
        description: "Parent GLink menu is required for PLink menus (unless System Configuration is enabled)",
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
    <div className="space-y-6 pb-8 max-w-none">
      {/* FIRST FIELD: System Configuration Flag */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="isSystemConfig"
            checked={formData.isSystemConfig}
            onCheckedChange={(checked) => setFormData({ 
              ...formData, 
              isSystemConfig: checked,
              parentId: checked ? null : formData.parentId // Clear parent if system config
            })}
            data-testid="switch-system-config"
          />
          <Label htmlFor="isSystemConfig" className="text-sm font-medium">
            System Configuration
          </Label>
        </div>
        <p className="text-xs text-gray-500">
          When enabled, this menu item will appear in the header configuration section (no parent menu required)
        </p>
      </div>

      {/* Menu Type */}
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

      {/* Parent Menu Selection - Only for PLink and not System Config */}
      {formData.menuType === 'plink' && !formData.isSystemConfig && (
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
              {(() => {
                console.log("[Menu Management Page] Parent dropdown rendering, safeGlinkMenus:", safeGlinkMenus);
                const availableGLinks = safeGlinkMenus
                  .filter(menu => menu.isActive && menu.menuType === 'glink')
                  .sort((a, b) => a.sortOrder - b.sortOrder);
                console.log("[Menu Management Page] Filtered active GLinks:", availableGLinks);
                return availableGLinks.map((menu) => {
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
                });
              })()}
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
        <Select
          value={formData.icon || "no-icon"}
          onValueChange={(value: string) => setFormData({ ...formData, icon: value === "no-icon" ? "" : value })}
        >
          <SelectTrigger data-testid="select-icon">
            <SelectValue placeholder="Select an icon">
              {formData.icon && (
                <div className="flex items-center space-x-2">
                  {(() => {
                    const IconComponent = getIconComponent(formData.icon);
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
            
            {/* Enhanced Personalized Recommendations Section */}
            {(() => {
              if (!formData.name && !formData.label) return null;
              
              const parentMenu = formData.parentId ? safeGlinkMenus.find(m => m.id === formData.parentId) : undefined;
              const detailedRecommendations = getIconRecommendations(
                formData.name, 
                formData.label, 
                formData.menuType, 
                formData.icon || undefined
              );
              
              if (detailedRecommendations.length > 0) {
                const exactRecommendations = detailedRecommendations.filter(rec => rec.category === 'exact');
                const contextualRecommendations = detailedRecommendations.filter(rec => rec.category === 'contextual');
                const fallbackRecommendations = detailedRecommendations.filter(rec => rec.category === 'fallback');
                
                return (
                  <>
                    {/* Exact Match Recommendations */}
                    {exactRecommendations.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-b">
                          🎯 Perfect Match for "{formData.name || formData.label}" ({formData.menuType === 'glink' ? 'Main Menu' : 'Sub Menu'})
                        </div>
                        {exactRecommendations.map((recommendation) => {
                          const iconOption = iconOptions.find(opt => opt.name === recommendation.icon);
                          if (!iconOption) return null;
                          const IconComponent = iconOption.component;
                          
                          return (
                            <SelectItem key={`exact-${recommendation.icon}`} value={recommendation.icon}>
                              <div className="flex items-center space-x-2">
                                <IconComponent className="h-4 w-4 text-blue-600" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{recommendation.icon}</span>
                                  <span className="text-xs text-gray-500">{recommendation.reason}</span>
                                </div>
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">Exact</Badge>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </>
                    )}
                    
                    {/* Contextual Recommendations */}
                    {contextualRecommendations.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 border-b">
                          💡 Contextual Suggestions
                        </div>
                        {contextualRecommendations.map((recommendation) => {
                          const iconOption = iconOptions.find(opt => opt.name === recommendation.icon);
                          if (!iconOption) return null;
                          const IconComponent = iconOption.component;
                          
                          return (
                            <SelectItem key={`contextual-${recommendation.icon}`} value={recommendation.icon}>
                              <div className="flex items-center space-x-2">
                                <IconComponent className="h-4 w-4 text-green-600" />
                                <div className="flex flex-col">
                                  <span>{recommendation.icon}</span>
                                  <span className="text-xs text-gray-500">{recommendation.reason}</span>
                                </div>
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-700">Smart</Badge>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </>
                    )}
                    
                    {/* Fallback Options */}
                    {fallbackRecommendations.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 dark:bg-gray-800 border-b">
                          📋 General Options
                        </div>
                        {fallbackRecommendations.map((recommendation) => {
                          const iconOption = iconOptions.find(opt => opt.name === recommendation.icon);
                          if (!iconOption) return null;
                          const IconComponent = iconOption.component;
                          
                          return (
                            <SelectItem key={`fallback-${recommendation.icon}`} value={recommendation.icon}>
                              <div className="flex items-center space-x-2">
                                <IconComponent className="h-4 w-4" />
                                <div className="flex flex-col">
                                  <span>{recommendation.icon}</span>
                                  <span className="text-xs text-gray-500">{recommendation.reason}</span>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </>
                    )}
                  </>
                );
              }
              return null;
            })()}
            
            {/* All Available Icons Section */}
            <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-800 border-b">
              🎨 All Available Icons
            </div>
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
              {safeAllMenus.filter(menu => menu.menuType === selectedMenuType).length} menu{safeAllMenus.filter(menu => menu.menuType === selectedMenuType).length !== 1 ? 's' : ''}
            </Badge>
            
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
                <Button className="flex items-center space-x-2" data-testid="button-add-menu" onClick={() => {
                  resetForm(); // Pre-populate form with selected menu type
                }}>
                  <Plus className="h-4 w-4" />
                  <span>Add {selectedMenuType === 'glink' ? 'GLink' : 'PLink'} Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[90vw] sm:w-[600px] lg:w-[700px] overflow-y-auto shadow-2xl border-l-4 border-l-blue-500">
                <SheetHeader>
                  <SheetTitle>Add Menu</SheetTitle>
                  <SheetDescription>
                    Create a new menu item for navigation
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
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : hierarchicalMenus.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MenuIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Menus
                  </h3>
                  <p className="mb-4">Create your first navigation menu item</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Menu Hierarchy</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Sort Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMenus.map((menu) => {
                        const IconComponent = getIconComponent(menu.icon);
                        return (
                          <TableRow key={menu.id} className={menu.isChild ? "bg-gray-50 dark:bg-gray-800/50" : ""} data-testid={`table-row-${menu.id}`}>
                            <TableCell>
                              <div className={`flex items-center ${menu.isChild ? 'ml-8' : ''}`}>
                                {menu.isChild && (
                                  <div className="mr-2 text-gray-400">
                                    <span className="text-sm">└─</span>
                                  </div>
                                )}
                                
                                {/* Parent menu with expand/collapse functionality */}
                                {menu.isParent && (
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => toggleParentExpansion(menu.id)}
                                      className="mr-1 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                      data-testid={`expand-toggle-${menu.id}`}
                                    >
                                      {menu.isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-500" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-500" />
                                      )}
                                    </button>
                                  </div>
                                )}
                                
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center justify-center w-8 h-8 border rounded-md bg-gray-50 dark:bg-gray-700">
                                    <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                  </div>
                                  <div>
                                    <div className="flex items-center">
                                      <span className="font-medium text-gray-900 dark:text-white" data-testid={`table-label-${menu.id}`}>
                                        {menu.label}
                                      </span>
                                      {menu.isParent && menu.childCount > 0 && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {menu.childCount} sub-menu{menu.childCount !== 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                      {menu.menuType === 'plink' && (menu as any).isSystemConfig && (
                                        <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                                          <Settings className="h-3 w-3 mr-1" />
                                          Config
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{menu.name}</div>
                                    {menu.isChild && menu.parentMenu && (
                                      <div className="text-xs text-gray-400">Under: {menu.parentMenu.label}</div>
                                    )}
                                    {menu.isOrphan && (
                                      <div className="text-xs text-red-500">Orphaned PLink</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={menu.menuType === 'glink' ? 'default' : 'secondary'} data-testid={`table-type-${menu.id}`}>
                                {menu.menuType === 'glink' ? 'GLink' : 'PLink'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{menu.icon || "None"}</Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {menu.route || "No route"}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" data-testid={`table-order-${menu.id}`}>{menu.sortOrder}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={menu.isActive ? "default" : "secondary"} data-testid={`table-status-${menu.id}`}>
                                {menu.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(menu.id)}
                                  disabled={toggleStatusMutation.isPending}
                                  className="h-8"
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
                                  className="h-8"
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
                  <span>Menu Builder - Drag & Drop</span>
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
                  <p>No menus found</p>
                  <p className="text-sm">Create your first navigation menu item</p>
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
                      items={hierarchicalMenus.map(menu => menu.id.toString())}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3" data-testid="builder-container">
                        {hierarchicalMenus.map((menu) => (
                          <div key={menu.id} className={menu.isChild ? "ml-8" : ""}>
                            {menu.isChild && (
                              <div className="mb-2 text-gray-400 text-sm flex items-center">
                                <span className="mr-2">\u2514\u2500</span>
                                <span className="text-xs">Sub-menu under: {menu.parentMenu?.label}</span>
                              </div>
                            )}
                            <div className={menu.isChild ? "border-l-2 border-gray-200 dark:border-gray-600 pl-4" : ""}>
                              {menu.isParent && (
                                <div className="mb-2 flex items-center">
                                  <button
                                    onClick={() => toggleParentExpansion(menu.id)}
                                    className="mr-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                  >
                                    {menu.isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-500" />
                                    )}
                                  </button>
                                  {menu.childCount > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {menu.childCount} sub-menu{menu.childCount !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <SortableMenuItem key={menu.id} menu={menu} />
                            </div>
                          </div>
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
        </main>
      </div>
    </AppLayout>
  );
}
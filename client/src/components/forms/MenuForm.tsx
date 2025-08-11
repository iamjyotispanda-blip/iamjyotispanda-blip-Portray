import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Home, Settings, List, LayoutGrid, Plus, Edit, Trash2, Users, User, 
  Building, Ship, Anchor, Package, FileText, Calendar, Mail, Bell,
  Shield, Key, Database, Server, Globe, MapPin, Truck, Plane,
  BarChart3, PieChart, Activity, TrendingUp, DollarSign, CreditCard,
  Clock, Search, Filter, Download, Upload, RefreshCw, Zap,
  CheckCircle, AlertCircle, Info, HelpCircle, Phone, MessageSquare,
  Camera, Image, Video, Music, Folder, File, Archive, Tag,
  Star, Heart, Bookmark, Flag, Award, Target, Compass, Map
} from "lucide-react";
import { getIconComponent } from "@/lib/iconRecommendations";
import type { Menu } from "@shared/schema";

// Icon options for selection
const iconOptions = [
  // Navigation & Layout
  { name: "Home", component: Home },
  { name: "Settings", component: Settings },
  { name: "List", component: List },
  { name: "LayoutGrid", component: LayoutGrid },
  
  // Actions
  { name: "Plus", component: Plus },
  { name: "Edit", component: Edit },
  { name: "Trash2", component: Trash2 },
  { name: "Search", component: Search },
  { name: "Filter", component: Filter },
  { name: "Download", component: Download },
  { name: "Upload", component: Upload },
  { name: "RefreshCw", component: RefreshCw },
  
  // People & Organizations
  { name: "Users", component: Users },
  { name: "User", component: User },
  { name: "Building", component: Building },
  
  // Port & Maritime
  { name: "Ship", component: Ship },
  { name: "Anchor", component: Anchor },
  
  // Business & Commerce
  { name: "Package", component: Package },
  { name: "Truck", component: Truck },
  { name: "Plane", component: Plane },
  { name: "DollarSign", component: DollarSign },
  { name: "CreditCard", component: CreditCard },
  
  // Documents & Communication
  { name: "FileText", component: FileText },
  { name: "Mail", component: Mail },
  { name: "Phone", component: Phone },
  { name: "MessageSquare", component: MessageSquare },
  { name: "Bell", component: Bell },
  
  // Time & Planning
  { name: "Calendar", component: Calendar },
  { name: "Clock", component: Clock },
  
  // Security & Access
  { name: "Shield", component: Shield },
  { name: "Key", component: Key },
  
  // System & Data
  { name: "Database", component: Database },
  { name: "Server", component: Server },
  { name: "Globe", component: Globe },
  { name: "MapPin", component: MapPin },
  { name: "Zap", component: Zap },
  
  // Analytics & Reports
  { name: "BarChart3", component: BarChart3 },
  { name: "PieChart", component: PieChart },
  { name: "Activity", component: Activity },
  { name: "TrendingUp", component: TrendingUp },
  
  // Status & Alerts
  { name: "CheckCircle", component: CheckCircle },
  { name: "AlertCircle", component: AlertCircle },
  { name: "Info", component: Info },
  { name: "HelpCircle", component: HelpCircle },
  
  // Media & Files
  { name: "Camera", component: Camera },
  { name: "Image", component: Image },
  { name: "Video", component: Video },
  { name: "Music", component: Music },
  { name: "Folder", component: Folder },
  { name: "File", component: File },
  { name: "Archive", component: Archive },
  { name: "Tag", component: Tag },
  
  // Favorites & Bookmarks
  { name: "Star", component: Star },
  { name: "Heart", component: Heart },
  { name: "Bookmark", component: Bookmark },
  { name: "Flag", component: Flag },
  { name: "Award", component: Award },
  { name: "Target", component: Target },
  { name: "Compass", component: Compass },
  { name: "Map", component: Map }
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

interface MenuFormProps {
  editingMenu?: Menu | null;
  glinkMenus: Menu[];
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MenuForm({ editingMenu, glinkMenus, onSubmit, onCancel, isLoading = false }: MenuFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    label: '',
    icon: '',
    route: '',
    sortOrder: 0,
    menuType: 'glink',
    parentId: null,
    isSystemConfig: false
  });

  // Initialize form data when editing
  useEffect(() => {
    if (editingMenu) {
      setFormData({
        name: editingMenu.name,
        label: editingMenu.label,
        icon: editingMenu.icon || '',
        route: editingMenu.route || '',
        sortOrder: editingMenu.sortOrder,
        menuType: editingMenu.menuType as 'glink' | 'plink',
        parentId: editingMenu.parentId,
        isSystemConfig: editingMenu.isSystemConfig || false
      });
    } else {
      setFormData({
        name: '',
        label: '',
        icon: '',
        route: '',
        sortOrder: 0,
        menuType: 'glink',
        parentId: null,
        isSystemConfig: false
      });
    }
  }, [editingMenu]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.label) {
      alert("Name and Label are required");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8 max-w-none">
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
          onChange={(e) => {
            setFormData(prev => ({ ...prev, name: e.target.value }));
          }}
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
          onChange={(e) => {
            setFormData(prev => ({ ...prev, label: e.target.value }));
          }}
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
          onChange={(e) => {
            setFormData(prev => ({ ...prev, route: e.target.value }));
          }}
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
          onChange={(e) => {
            setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }));
          }}
          placeholder="0"
          autoComplete="off"
          className="touch-manipulation"
        />
        <p className="text-xs text-gray-500">Display order in navigation (lower numbers appear first)</p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : (editingMenu ? "Update" : "Create")}
        </Button>
      </div>
    </form>
  );
}
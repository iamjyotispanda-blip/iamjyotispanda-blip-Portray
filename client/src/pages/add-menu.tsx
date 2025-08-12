import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';

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
}

export default function AddMenu() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Simple form state
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [menuType, setMenuType] = useState('glink');
  const [parentId, setParentId] = useState('');
  const [icon, setIcon] = useState('');
  const [route, setRoute] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  // Get existing menus for parent selection
  const { data: menus = [] } = useQuery({
    queryKey: ['/api/menus'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/menus');
      return await response.json() as Menu[];
    },
  });

  const glinkMenus = menus.filter(menu => menu.menuType === 'glink');

  // Save menu mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/menus', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Menu created successfully',
      });
      setLocation('/configuration/menu');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create menu',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !label.trim()) {
      toast({
        title: 'Error',
        description: 'Name and Label are required',
        variant: 'destructive',
      });
      return;
    }

    const menuData = {
      name: name.trim(),
      label: label.trim(),
      menuType,
      parentId: menuType === 'plink' && parentId ? parseInt(parentId) : null,
      icon: icon || null,
      route: route.trim() || null,
      sortOrder: parseInt(sortOrder) || 0,
      isActive: true,
    };

    saveMutation.mutate(menuData);
  };

  return (
    <AppLayout title="Add Menu">
      <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 pt-4 sm:pt-6">
        <main className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/configuration/menu')}
              className="flex items-center space-x-2 self-start"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Menu Management</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white">
                Add New Menu
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Create a new navigation menu item
              </p>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Menu Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Menu Type */}
                <div className="space-y-2">
                  <Label htmlFor="menuType">Menu Type *</Label>
                  <select
                    id="menuType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={menuType}
                    onChange={(e) => setMenuType(e.target.value)}
                  >
                    <option value="glink">GLink (Main Menu)</option>
                    <option value="plink">PLink (Sub Menu)</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    GLink: Main navigation items | PLink: Sub-menu items under GLink
                  </p>
                </div>

                {/* Parent Menu - Only for PLink */}
                {menuType === 'plink' && (
                  <div className="space-y-2">
                    <Label htmlFor="parentId">Parent GLink Menu *</Label>
                    <select
                      id="parentId"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                    >
                      <option value="">Select parent menu</option>
                      {glinkMenus.map(menu => (
                        <option key={menu.id} value={menu.id.toString()}>
                          {menu.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="dashboard"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500">Unique identifier (lowercase, no spaces)</p>
                </div>

                {/* Label */}
                <div className="space-y-2">
                  <Label htmlFor="label">Label *</Label>
                  <Input
                    id="label"
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Dashboard"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500">Display name shown in navigation</p>
                </div>

                {/* Icon */}
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <select
                    id="icon"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                  >
                    <option value="">No icon</option>
                    <option value="Home">🏠 Home</option>
                    <option value="Settings">⚙️ Settings</option>
                    <option value="Users">👥 Users</option>
                    <option value="Building2">🏢 Building2</option>
                    <option value="Ship">🚢 Ship</option>
                    <option value="Shield">🛡️ Shield</option>
                    <option value="Package">📦 Package</option>
                    <option value="Mail">📧 Mail</option>
                    <option value="Bell">🔔 Bell</option>
                    <option value="Zap">⚡ Zap</option>
                    <option value="MapPin">📍 MapPin</option>
                    <option value="FileText">📄 FileText</option>
                    <option value="Database">🗄️ Database</option>
                    <option value="Grid">▦ Grid</option>
                    <option value="Calendar">📅 Calendar</option>
                    <option value="Search">🔍 Search</option>
                    <option value="Tag">🏷️ Tag</option>
                    <option value="Truck">🚛 Truck</option>
                    <option value="Globe">🌐 Globe</option>
                    <option value="BarChart">📊 BarChart</option>
                    <option value="MenuIcon">☰ Menu</option>
                    <option value="Key">🔑 Key</option>
                    <option value="Lock">🔒 Lock</option>
                  </select>
                </div>

                {/* Route */}
                <div className="space-y-2">
                  <Label htmlFor="route">Route</Label>
                  <Input
                    id="route"
                    type="text"
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    placeholder="/dashboard"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500">URL path for this menu item</p>
                </div>

                {/* Sort Order */}
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500">Display order in navigation (lower numbers appear first)</p>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/configuration/menu')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending || !name.trim() || !label.trim()}
                  >
                    {saveMutation.isPending ? 'Creating...' : 'Create Menu'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </AppLayout>
  );
}
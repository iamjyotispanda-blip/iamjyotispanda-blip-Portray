import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Save, Ship, Package, Users, LogOut, Menu, Settings, Building2, Shield, 
  BarChart3, FileText, Home, PanelLeftClose, PanelLeftOpen 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthService } from "@/lib/auth";
import { PortrayLogo } from "@/components/portray-logo";
import type { Port, Organization } from "@shared/schema";

interface PortFormPageProps {
  params?: {
    id?: string;
  };
}

export default function PortFormPage({ params }: PortFormPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(params?.id);
  const portId = params?.id ? parseInt(params.id) : null;
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const [formData, setFormData] = useState({
    portName: "",
    displayName: "",
    organizationId: 0,
    address: "",
    country: "India",
    state: "",
    pan: "",
    gstn: "",
    isActive: true,
  });

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get organizations for dropdown
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations"],
  });

  // Get port data for editing
  const { data: port, isLoading: portLoading } = useQuery({
    queryKey: ["/api/ports", portId],
    enabled: isEdit && !!portId,
  });

  // Populate form when editing
  useEffect(() => {
    if (isEdit && port) {
      setFormData({
        portName: (port as any).portName || "",
        displayName: (port as any).displayName || "",
        organizationId: (port as any).organizationId || 0,
        address: (port as any).address || "",
        country: (port as any).country || "India",
        state: (port as any).state || "",
        pan: (port as any).pan || "",
        gstn: (port as any).gstn || "",
        isActive: (port as any).isActive ?? true,
      });
    }
  }, [isEdit, port]);

  // Create port mutation
  const createPortMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("/api/ports", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      toast({
        title: "Success",
        description: "Port created successfully",
      });
      setLocation("/ports");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create port",
        variant: "destructive",
      });
    },
  });

  // Update port mutation
  const updatePortMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest(`/api/ports/${portId}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ports", portId] });
      toast({
        title: "Success",
        description: "Port updated successfully",
      });
      setLocation("/ports");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update port",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEdit) {
      updatePortMutation.mutate(formData);
    } else {
      createPortMutation.mutate(formData);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setLocation("/login");
  };

  const navigationItems = [
    { 
      id: "configuration", 
      label: "Configuration", 
      icon: Settings,
      children: [
        { id: "organization", label: "Organization", icon: Building2 },
        { id: "ports", label: "Ports", icon: Ship },
        { id: "security", label: "Security", icon: Shield },
        { id: "users", label: "Users", icon: Users },
      ]
    },
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "vessels", label: "Vessels", icon: Ship },
    { id: "cargo", label: "Cargo", icon: Package },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  const handleNavigation = (itemId: string) => {
    switch (itemId) {
      case "dashboard":
        setLocation("/dashboard");
        break;
      case "organization":
        setLocation("/dashboard");
        break;
      case "ports":
        setLocation("/ports");
        break;
      default:
        break;
    }
  };

  const handleBack = () => {
    setLocation("/ports");
  };

  if (isEdit && portLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading port...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300
          ${sidebarOpen ? 'w-64' : sidebarCollapsed ? 'w-16' : 'w-64'} 
          ${sidebarOpen ? 'block' : 'hidden lg:block'}
        `}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className={`flex items-center space-x-3 ${sidebarCollapsed && !sidebarHovered ? 'hidden' : ''}`}>
            <PortrayLogo className="h-8 w-8" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">PortRay</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            if (item.children) {
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <Icon className="h-5 w-5" />
                    <span className={`${sidebarCollapsed && !sidebarHovered ? 'hidden' : ''}`}>{item.label}</span>
                  </div>
                  <div className={`ml-6 space-y-1 ${sidebarCollapsed && !sidebarHovered ? 'hidden' : ''}`}>
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isActive = child.id === 'ports';
                      return (
                        <div
                          key={child.id}
                          onClick={() => handleNavigation(child.id)}
                          className={`flex items-center space-x-3 text-sm py-2 px-3 rounded-lg cursor-pointer ${
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            
            return (
              <div
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <Icon className="h-5 w-5" />
                <span className={`${sidebarCollapsed && !sidebarHovered ? 'hidden' : ''}`}>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* User Info */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 ${sidebarCollapsed && !sidebarHovered ? 'hidden' : ''}`}>
          {user && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div className="font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</div>
                <div>{user.email}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">{user.role}</div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} transition-all duration-300`}>
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Desktop user profile - always visible */}
          <div className="hidden lg:flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3 text-sm">
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</div>
                  <div className="text-gray-600 dark:text-gray-400">{user.email}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">{user.role}</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Mobile user menu */}
          <div className="lg:hidden">
            {user && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Breadcrumb Bar */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isEdit ? "Edit Port" : "New Port"}
          </span>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Port Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="portName">Port Name *</Label>
                    <Input
                      id="portName"
                      placeholder="JSW Paradeep Port"
                      value={formData.portName}
                      onChange={(e) => handleInputChange('portName', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name (2-6 digits) *</Label>
                    <Input
                      id="displayName"
                      placeholder="JSPP01"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      pattern="[A-Za-z0-9]{2,6}"
                      maxLength={6}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="organizationId">Organization *</Label>
                    <Select
                      value={formData.organizationId.toString()}
                      onValueChange={(value) => handleInputChange('organizationId', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {(organizations as Organization[]).map((org: Organization) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.organizationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => handleInputChange('country', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="Odisha"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pan">PAN</Label>
                    <Input
                      id="pan"
                      placeholder="ABCDE1234F"
                      value={formData.pan}
                      onChange={(e) => handleInputChange('pan', e.target.value)}
                      pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <Label htmlFor="gstn">GSTN</Label>
                    <Input
                      id="gstn"
                      placeholder="22AAAAA0000A1Z5"
                      value={formData.gstn}
                      onChange={(e) => handleInputChange('gstn', e.target.value)}
                      pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter complete address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleBack}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPortMutation.isPending || updatePortMutation.isPending}
                    className="h-8"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isEdit 
                      ? (updatePortMutation.isPending ? "Updating..." : "Update Port")
                      : (createPortMutation.isPending ? "Creating..." : "Create Port")
                    }
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
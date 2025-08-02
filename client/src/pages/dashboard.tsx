import { useQuery } from "@tanstack/react-query";
import { AuthService } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PortrayLogo } from "@/components/portray-logo";
import { 
  Ship, Package, TrendingUp, Users, LogOut, Menu, Settings, 
  Building2, Shield, BarChart3, FileText, Home, X, ChevronUp, ChevronDown,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  const handleLogout = async () => {
    await AuthService.logout();
    setLocation("/login");
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "vessels", label: "Vessels", icon: Ship },
    { id: "cargo", label: "Cargo", icon: Package },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "reports", label: "Reports", icon: FileText },
    { 
      id: "configuration", 
      label: "Configuration", 
      icon: Settings,
      children: [
        { id: "organization", label: "Organization", icon: Building2 },
        { id: "security", label: "Security", icon: Shield },
        { id: "users", label: "Users", icon: Users },
      ]
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "organization":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Organization Configuration
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage your organization settings and details
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Information</CardTitle>
                  <CardDescription>Update your organization details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Organization Name</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      PortRay Maritime Solutions
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Port Authority ID</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      PRT-2025-001
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contact Email</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      admin@portray.com
                    </div>
                  </div>
                  <Button>Update Organization</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure system-wide preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Time Zone</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      UTC-5 (Eastern Standard Time)
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default Currency</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      USD ($)
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Language</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      English (US)
                    </div>
                  </div>
                  <Button>Save Settings</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Port Management Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Monitor and manage your port operations in real-time
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Vessels</CardTitle>
                  <Ship className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">+2 from yesterday</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cargo Processed</CardTitle>
                  <Package className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,284</div>
                  <p className="text-xs text-muted-foreground">TEU this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$2.1M</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Staff On Duty</CardTitle>
                  <Users className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">Across all shifts</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed && !sidebarHovered ? 'w-16' : 'w-64'} bg-white dark:bg-slate-800 shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-700">
          {sidebarCollapsed && !sidebarHovered ? (
            /* Small Logo when collapsed */
            <div className="hidden lg:flex items-center justify-center w-full">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
            </div>
          ) : (
            /* Full layout when expanded */
            <>
              <PortrayLogo size="sm" />
              <div className="flex items-center space-x-1">
                {/* Desktop Toggle Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-md"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
                {/* Mobile Close Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
        
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left ${
                    activeSection === item.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={sidebarCollapsed && !sidebarHovered ? item.label : ''}
                >
                  <item.icon className={`${sidebarCollapsed && !sidebarHovered ? 'mx-auto' : 'mr-3'} h-5 w-5 ${
                    activeSection === item.id ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  {(!sidebarCollapsed || sidebarHovered) && item.label}
                </button>
                
                {item.children && (!sidebarCollapsed || sidebarHovered) && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setActiveSection(child.id)}
                        className={`group flex items-center px-2 py-1 text-sm rounded-md w-full text-left ${
                          activeSection === child.id
                            ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <child.icon className={`mr-2 h-4 w-4 ${
                          activeSection === child.id ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
        
        {/* User Profile & Logout */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-slate-700">
          <div className={`flex items-center ${sidebarCollapsed && !sidebarHovered ? 'justify-center' : ''}`}>
            {(!sidebarCollapsed || sidebarHovered) && (
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.role}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={sidebarCollapsed && !sidebarHovered ? '' : 'ml-2'}
              title={sidebarCollapsed && !sidebarHovered ? 'Logout' : ''}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden mr-3"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'}`}>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {activeSection === "organization" ? "Organization Configuration" : 
                     activeSection === "dashboard" ? "Dashboard" : 
                     activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
                  </h2>
                </div>
              </div>
              
              {/* User Profile Section */}
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex sm:items-center sm:space-x-3">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role} | {user?.email}
                    </span>
                  </div>
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
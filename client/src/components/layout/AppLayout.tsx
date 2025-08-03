import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Ship, Package, Users, LogOut, Menu, Settings, Building2, Shield, 
  BarChart3, FileText, Home, PanelLeftClose, PanelLeftOpen 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortrayLogo } from "@/components/portray-logo";
import { AuthService } from "@/lib/auth";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  activeSection?: string;
}

export function AppLayout({ children, title, activeSection }: AppLayoutProps) {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

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
        // Since organization is handled within dashboard
        break;
      case "ports":
        setLocation("/ports");
        break;
      default:
        break;
    }
  };

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
                      const isActive = activeSection === child.id;
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
            
            const isActive = activeSection === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`flex items-center space-x-3 py-2 px-3 rounded-lg cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
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

        {/* Main Content Area */}
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
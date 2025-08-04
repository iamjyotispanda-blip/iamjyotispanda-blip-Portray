import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Ship, LogOut, Menu, Settings, Building2, Home, PanelLeftClose, PanelLeftOpen, Mail 
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
    { id: "dashboard", label: "Dashboard", icon: Home },
    { 
      id: "configuration", 
      label: "Configuration", 
      icon: Settings,
      children: [
        { id: "organization", label: "Organization", icon: Building2 },
        { id: "ports", label: "Ports", icon: Ship },
        { id: "email", label: "Email Configuration", icon: Mail },
      ]
    },
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
      case "email":
        setLocation("/configuration/email");
        break;
      default:
        break;
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed && !sidebarHovered ? 'w-16' : 'w-64'} bg-white dark:bg-slate-800 shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarCollapsed && !sidebarHovered ? (
            /* Small Logo when collapsed */
            <div className="hidden lg:flex items-center justify-center w-full">
              <PortrayLogo size="xs" />
            </div>
          ) : (
            /* Full layout when expanded */
            <div className="flex items-center justify-between w-full">
              <PortrayLogo size="sm" />
              <div className="flex items-center space-x-1">
                {/* Desktop Toggle Button - Right aligned within logo section */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden lg:flex items-center justify-center w-9 h-9 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm rounded-lg transition-all duration-200"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-2 flex-1">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => handleNavigation(item.id)}
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
                        onClick={() => handleNavigation(child.id)}
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

        {/* User Info */}
        <div className={`mt-auto p-4 border-t border-gray-200 dark:border-slate-700 ${sidebarCollapsed && !sidebarHovered ? 'hidden' : ''}`}>
          {user && (
            <div className="flex items-center">
              {(!sidebarCollapsed || sidebarHovered) && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role}
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
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 shadow-md border-b border-gray-200 dark:border-slate-700">
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
                  {/* Clean header without page configuration details */}
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
                    className="flex items-center space-x-2 h-8"
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
        <main className="px-4 sm:px-6 lg:px-2 py-2">
          {children}
        </main>
      </div>
    </div>
  );
}
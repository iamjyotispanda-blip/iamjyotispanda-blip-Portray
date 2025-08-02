import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Settings, BarChart3, Ship, Package, Truck, FileText, LogOut } from "lucide-react";
import { AuthService } from "@/lib/auth";
import { HeroLogo } from "@/components/hero-logo";

export default function PortalWelcome() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      // Validate session first
      const sessionValid = await AuthService.validateSession();
      if (!sessionValid) {
        setLocation("/login");
        return;
      }
      
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (!currentUser || currentUser.role !== "SystemAdmin") {
          setLocation("/login");
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to load user:", error);
        AuthService.removeToken(); // Clear invalid session
        setLocation("/login");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [setLocation]);

  const handleLogout = () => {
    AuthService.logout();
    setLocation("/login");
  };

  const adminFeatures = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "User Management",
      description: "Manage system users, roles, and permissions",
      path: "/portal/users"
    },
    {
      icon: <Shield className="h-8 w-8 text-green-600" />,
      title: "Security & Access",
      description: "Configure security settings and access controls",
      path: "/portal/security"
    },
    {
      icon: <Settings className="h-8 w-8 text-gray-600" />,
      title: "System Configuration",
      description: "Configure system-wide settings and parameters",
      path: "/portal/settings"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: "Analytics & Reports",
      description: "View system analytics and generate reports",
      path: "/portal/analytics"
    }
  ];

  const portOperations = [
    {
      icon: <Ship className="h-6 w-6 text-blue-500" />,
      title: "Vessel Operations",
      description: "15 active vessels"
    },
    {
      icon: <Package className="h-6 w-6 text-green-500" />,
      title: "Cargo Management",
      description: "2,340 containers processed"
    },
    {
      icon: <Truck className="h-6 w-6 text-orange-500" />,
      title: "Logistics",
      description: "89% efficiency rate"
    },
    {
      icon: <FileText className="h-6 w-6 text-purple-500" />,
      title: "Financial",
      description: "$2.4M revenue this month"
    }
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>;
  }

  if (!user || user.role !== "SystemAdmin") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>Access denied. Redirecting...</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8">
                <HeroLogo />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">PortRay Admin Portal</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">System Administration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to PortRay Admin Portal
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage your port operations and system configuration from this central dashboard.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {portOperations.map((stat, index) => (
            <Card key={index} className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.description}
                    </p>
                  </div>
                  {stat.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminFeatures.map((feature, index) => (
            <Card key={index} className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-lg mx-auto mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-center text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-center text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => setLocation(feature.path)}
                >
                  Access {feature.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Status */}
        <Card className="mt-8 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>System Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">99.9%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">System Uptime</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">24/7</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitoring Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">45ms</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
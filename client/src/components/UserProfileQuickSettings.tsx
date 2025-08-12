import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  User, Settings, Bell, Moon, Sun, Monitor, Palette, 
  Shield, Mail, Key, Eye, EyeOff, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { AuthService } from "@/lib/auth";

interface UserProfileQuickSettingsProps {
  user: any;
  onLogout: () => void;
}

export function UserProfileQuickSettings({ user, onLogout }: UserProfileQuickSettingsProps) {
  const [, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState('system');
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const queryClient = useQueryClient();

  // Get user preferences
  const { data: preferences = {} } = useQuery({
    queryKey: ["/api/user/preferences"],
    enabled: !!user,
  });

  // Update user preferences
  const updatePreferenceMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest("PATCH", "/api/user/preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updatePreferenceMutation.mutate({ theme: newTheme });
    
    // Apply theme immediately
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    }
  };

  const handleNotificationToggle = (enabled: boolean) => {
    setNotifications(enabled);
    updatePreferenceMutation.mutate({ notifications: enabled });
  };

  const handleEmailAlertsToggle = (enabled: boolean) => {
    setEmailAlerts(enabled);
    updatePreferenceMutation.mutate({ emailAlerts: enabled });
  };

  const getUserInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    } else if (user.firstName) {
      return `${user.firstName.charAt(0)}${user.firstName.charAt(1) || ''}`;
    } else if (user.email) {
      return `${user.email.charAt(0)}${user.email.charAt(1) || ''}`;
    }
    return 'US';
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark': return Moon;
      case 'light': return Sun;
      default: return Monitor;
    }
  };

  const ThemeIcon = getThemeIcon();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center space-x-2 h-10 px-3"
          data-testid="button-user-profile-settings"
        >
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {getUserInitials()}
          </div>
          <div className="text-left min-w-0 hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.role || 'User'}
            </p>
          </div>
          <Settings className="h-4 w-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        {/* User Info Header */}
        <div className="px-3 py-3 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {user.role || 'User'}
                </Badge>
                {user.isSystemAdmin && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Settings */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Quick Settings</DropdownMenuLabel>
          
          {/* Theme Selector */}
          <div className="px-2 py-1">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <ThemeIcon className="w-4 h-4" />
                <span className="text-sm">Theme</span>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant={theme === 'light' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => handleThemeChange('light')}
                >
                  <Sun className="w-3 h-3" />
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => handleThemeChange('dark')}
                >
                  <Moon className="w-3 h-3" />
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => handleThemeChange('system')}
                >
                  <Monitor className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Notifications Toggle */}
          <div className="px-2 py-1">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span className="text-sm">Notifications</span>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={handleNotificationToggle}
                className="h-4"
              />
            </div>
          </div>

          {/* Email Alerts Toggle */}
          <div className="px-2 py-1">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm">Email Alerts</span>
              </div>
              <Switch
                checked={emailAlerts}
                onCheckedChange={handleEmailAlertsToggle}
                className="h-4"
              />
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Profile Actions */}
        <DropdownMenuGroup>
          <DropdownMenuItem 
            onClick={() => setLocation('/profile')}
            className="cursor-pointer"
            data-testid="menu-item-profile"
          >
            <User className="w-4 h-4 mr-2" />
            View Profile
            <ChevronRight className="w-3 h-3 ml-auto" />
          </DropdownMenuItem>

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer"
                data-testid="menu-item-settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
                <ChevronRight className="w-3 h-3 ml-auto" />
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>User Settings</DialogTitle>
                <DialogDescription>
                  Manage your account preferences and security settings.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Account Security</CardTitle>
                    <CardDescription>Manage your password and security preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setLocation('/change-password')}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setLocation('/security-settings')}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Security Settings
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Preferences</CardTitle>
                    <CardDescription>Customize your app experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setLocation('/notification-settings')}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Notification Settings
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setLocation('/appearance-settings')}
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Appearance
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem 
          onClick={onLogout}
          className="text-red-600 focus:text-red-600 cursor-pointer"
          data-testid="menu-item-logout"
        >
          <User className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
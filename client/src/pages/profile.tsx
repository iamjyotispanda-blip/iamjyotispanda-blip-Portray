import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Shield, Monitor, Smartphone, Globe, Clock, User, Mail, Eye, EyeOff, Edit, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthService } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType, Role } from "@shared/schema";

interface LoginLog {
  id: number;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  deviceType: string;
  browser: string;
  os: string;
  success: boolean;
}

interface SystemAccess {
  id: number;
  accessDate: string;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  sessionDuration: string;
  actions: string[];
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get user's role details
  const { data: userRole } = useQuery<Role>({
    queryKey: ["/api/roles", user?.roleId],
    queryFn: async () => {
      if (!user?.roleId) return null;
      const response = await apiRequest("GET", `/api/roles/${user.roleId}`);
      return response.json();
    },
    enabled: !!user?.roleId,
  });

  // Mock data for login logs (you can replace with actual API calls)
  const loginLogs: LoginLog[] = [
    {
      id: 1,
      timestamp: "2025-01-08T10:30:00Z",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: "Mumbai, India",
      deviceType: "Desktop",
      browser: "Chrome 120",
      os: "Windows 11",
      success: true,
    },
    {
      id: 2,
      timestamp: "2025-01-07T15:45:00Z",
      ipAddress: "192.168.1.101",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      location: "Mumbai, India",
      deviceType: "Mobile",
      browser: "Safari 17",
      os: "iOS 17",
      success: true,
    },
    {
      id: 3,
      timestamp: "2025-01-06T09:15:00Z",
      ipAddress: "203.115.45.10",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      location: "Delhi, India",
      deviceType: "Desktop",
      browser: "Firefox 121",
      os: "Ubuntu 22.04",
      success: false,
    },
  ];

  // Mock data for system access (you can replace with actual API calls)
  const systemAccess: SystemAccess[] = [
    {
      id: 1,
      accessDate: "2025-01-08T10:30:00Z",
      ipAddress: "192.168.1.100",
      location: "Mumbai, India",
      device: "Desktop - Chrome 120 on Windows 11",
      browser: "Chrome 120",
      sessionDuration: "2h 45m",
      actions: ["Dashboard View", "User Management", "Port Configuration"],
    },
    {
      id: 2,
      accessDate: "2025-01-07T15:45:00Z",
      ipAddress: "192.168.1.101",
      location: "Mumbai, India",
      device: "iPhone - Safari 17 on iOS 17",
      browser: "Safari 17",
      sessionDuration: "1h 20m",
      actions: ["Dashboard View", "Notifications"],
    },
  ];

  // Initialize form data when user data is loaded
  useEffect(() => {
    if (user && !editMode) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user, editMode]);

  const handleEditToggle = () => {
    setEditMode(!editMode);
    if (!editMode && user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  const getUserInitials = (user: UserType) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    } else if (user.firstName) {
      return `${user.firstName.charAt(0)}${user.firstName.charAt(1) || ''}`;
    } else if (user.email) {
      return `${user.email.charAt(0)}${user.email.charAt(1) || ''}`;
    }
    return 'US';
  };

  if (userLoading) {
    return (
      <AppLayout title="Profile" activeSection="profile">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout title="Profile" activeSection="profile">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">Unable to load profile information.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Profile" activeSection="profile">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Profile</span>
        </div>
        
        <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1 overflow-auto">
          <div className="space-y-4">
            {/* Profile Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {getUserInitials(user)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                      </h1>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                        {userRole?.displayName || user.role}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {format(new Date(user.createdAt), "MMM yyyy")}</span>
                      </div>
                      {user.lastLogin && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Last login {format(new Date(user.lastLogin), "MMM dd, yyyy 'at' hh:mm a")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleEditToggle}
                    className="h-8"
                  >
                    {editMode ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="activity">Activity Logs</TabsTrigger>
                <TabsTrigger value="access">System Access</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Personal Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        {editMode ? (
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            placeholder="Enter first name"
                          />
                        ) : (
                          <p className="text-sm text-gray-900 dark:text-white">{user.firstName || 'Not provided'}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        {editMode ? (
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            placeholder="Enter last name"
                          />
                        ) : (
                          <p className="text-sm text-gray-900 dark:text-white">{user.lastName || 'Not provided'}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        {editMode ? (
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Enter email address"
                          />
                        ) : (
                          <p className="text-sm text-gray-900 dark:text-white">{user.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <div className="flex items-center space-x-2">
                          <Badge variant={user.isActive ? "default" : "secondary"} className={user.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : ""}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {editMode && (
                      <div className="flex space-x-3 pt-6 mt-6 border-t">
                        <Button className="h-8">
                          <Check className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={handleEditToggle} className="h-8">
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Assigned Role</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {userRole?.displayName || user.role}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {userRole?.description || 'Role permissions and access level'}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            Created: {format(new Date(user.createdAt), "MMM dd, yyyy")}
                          </Badge>
                          {userRole?.isActive && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                              Active Role
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPassword ? "text" : "password"}
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            placeholder="Enter current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-8 px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                        />
                      </div>
                      <div className="pt-4">
                        <Button className="h-8">Update Password</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Security Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Last Password Change</Label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {user.updatedAt ? format(new Date(user.updatedAt), "MMM dd, yyyy 'at' hh:mm a") : 'Never changed'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Created</Label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {format(new Date(user.createdAt), "MMM dd, yyyy 'at' hh:mm a")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Logs Tab */}
              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Login Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Device</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loginLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span>{format(new Date(log.timestamp), "MMM dd, yyyy hh:mm a")}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span>{log.location}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getDeviceIcon(log.deviceType)}
                                  <div>
                                    <p className="text-sm font-medium">{log.browser}</p>
                                    <p className="text-xs text-gray-500">{log.os}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                                  {log.ipAddress}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge variant={log.success ? "default" : "destructive"} className={log.success ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : ""}>
                                  {log.success ? "Success" : "Failed"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Access Tab */}
              <TabsContent value="access" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Access History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {systemAccess.map((access) => (
                        <div key={access.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {format(new Date(access.accessDate), "MMM dd, yyyy 'at' hh:mm a")}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{access.device}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {access.sessionDuration}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-300">{access.location}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Globe className="h-4 w-4 text-gray-400" />
                              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                                {access.ipAddress}
                              </code>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Actions Performed:</p>
                            <div className="flex flex-wrap gap-2">
                              {access.actions.map((action, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
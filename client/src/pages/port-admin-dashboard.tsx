import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Ship, BarChart3, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthService } from "@/lib/auth";

export default function PortAdminDashboard() {
  const [, setLocation] = useLocation();

  // Get current user
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== "PortAdmin") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Access denied. Port Admin role required.</p>
            <Button onClick={() => setLocation("/login")} className="h-10">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout title="Port Admin Dashboard" activeSection="terminals">
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back, {user.firstName}!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your port operations and monitor key metrics from this dashboard.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Vessels</CardTitle>
                  <Ship className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">
                    +2 from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cargo Processed</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,284</div>
                  <p className="text-xs text-muted-foreground">
                    TEU this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <div className="text-lg">$</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$2.1M</div>
                  <p className="text-xs text-muted-foreground">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Staff On Duty</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">
                    Across all shifts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Terminals - Main Section for Port Admin */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Ship className="w-5 h-5 text-blue-600" />
                    <span>Terminals Management</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="text-center p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <Ship className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Vessel Operations
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Monitor vessel arrivals, departures, and berth assignments
                      </p>
                      <Button className="h-8">
                        Manage Vessels
                      </Button>
                    </div>

                    <div className="text-center p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <BarChart3 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Berth Management
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Track berth availability and scheduling
                      </p>
                      <Button className="h-8">
                        Manage Berths
                      </Button>
                    </div>

                    <div className="text-center p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <Users className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Terminal Operations
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Oversee cargo handling and terminal activities
                      </p>
                      <Button className="h-8">
                        View Operations
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
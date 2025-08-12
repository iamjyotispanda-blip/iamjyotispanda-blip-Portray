import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Package, TrendingUp, Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout title="Dashboard Overview" activeSection="dashboard">
      <div className="space-y-6">
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

        {/* Additional Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="bg-white/70 backdrop-blur-sm border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
                  <Ship className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Vessel MV Neptune arrived at Terminal A</span>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Cargo processing completed for Order #12345</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                  Add Vessel
                </button>
                <button className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                  Process Cargo
                </button>
                <button className="p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium">
                  View Reports
                </button>
                <button className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                  Manage Users
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );

}
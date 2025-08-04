import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Package, TrendingUp, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import OrganizationPage from "./organization-simple";
import { PortsContent } from "./ports";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const renderContent = () => {
    switch (activeSection) {
      case "organization":
        return <OrganizationPage />;
      case "ports":
        return <PortsContent />;
      default:
        return (
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
            
            {/* Organization and Ports sections as tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveSection("organization")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeSection === "organization"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Organizations
                </button>
                <button
                  onClick={() => setActiveSection("ports")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeSection === "ports"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Ports
                </button>
              </nav>
            </div>
            
            <div className="mt-6">
              {activeSection === "organization" && <OrganizationPage />}
              {activeSection === "ports" && <PortsContent />}
            </div>
          </div>
        );
    }
  };

  return (
    <AppLayout title="Dashboard" activeSection="dashboard">
      {renderContent()}
    </AppLayout>
  );
}
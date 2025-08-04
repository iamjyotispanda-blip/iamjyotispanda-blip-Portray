import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Users, Edit, Building2, MapPin, Flag, Search, Calendar, ToggleLeft, ToggleRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Port, Organization } from "@shared/schema";

// Component for the ports content without layout
export function PortsContent() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all ports
  const { data: ports = [], isLoading: portsLoading } = useQuery({
    queryKey: ["/api/ports"],
  });

  // Get all organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations"],
  });

  // Filter ports based on search term
  const filteredPorts = ports.filter((port: Port) =>
    port.portName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOrganizationName = (organizationId: number) => {
    const org = organizations.find((o: Organization) => o.id === organizationId);
    return org?.organizationName || "Unknown Organization";
  };

  // Toggle port status mutation
  const togglePortStatusMutation = useMutation({
    mutationFn: async (portId: number) => {
      return apiRequest(`/api/ports/${portId}/toggle-status`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      toast({
        title: "Success",
        description: "Port status updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update port status",
        variant: "destructive"
      });
    }
  });

  const handleManageContacts = (portId: number) => {
    setLocation(`/ports/${portId}/contacts`);
  };

  const handleEditPort = (portId: number) => {
    setLocation(`/ports/edit/${portId}`);
  };

  const handleTogglePortStatus = (portId: number) => {
    togglePortStatusMutation.mutate(portId);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Ports</span>
      </div>
      
      <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search ports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setLocation("/ports/new")} className="h-8">
              <Plus className="w-4 h-4 mr-2" />
              Add Port
            </Button>
          </div>

          {/* Ports List */}
          <div className="grid gap-4">
        {portsLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">Loading ports...</div>
            </CardContent>
          </Card>
        ) : filteredPorts.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                {searchTerm ? "No ports found matching your search." : "No ports found. Add the first port to get started."}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPorts.map((port: Port) => (
            <Card key={port.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {port.portName}
                        </h3>
                        <Badge variant="outline">
                          {port.displayName}
                        </Badge>
                        <Badge
                          variant={port.isActive ? "default" : "secondary"}
                        >
                          {port.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getOrganizationName(port.organizationId)}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{port.address}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Flag className="w-4 h-4" />
                          <span>{port.state}, {port.country}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Created: {format(new Date(port.createdAt), "MMM dd, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePortStatus(port.id)}
                      disabled={togglePortStatusMutation.isPending}
                      className="h-8"
                    >
                      {port.isActive ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageContacts(port.id)}
                      className="h-8"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Contacts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPort(port.id)}
                      className="h-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Full page component with AppLayout wrapper for standalone routing
export default function PortsPage() {
  return (
    <AppLayout title="Ports" activeSection="ports">
      <PortsContent />
    </AppLayout>
  );
}
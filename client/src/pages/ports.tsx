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
import { usePermissions } from "@/hooks/usePermissions";
import type { Port, Organization } from "@shared/schema";

// Component for the ports content without layout
export function PortsContent() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canCreate, canEdit, canManage, canRead } = usePermissions();

  // Get all ports
  const { data: ports = [], isLoading: portsLoading } = useQuery({
    queryKey: ["/api/ports"],
  });

  // Get all organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations"],
  });

  // Filter ports based on search term
  const filteredPorts = (ports as Port[]).filter((port: Port) =>
    port.portName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOrganizationName = (organizationId: number) => {
    const org = (organizations as Organization[]).find((o: Organization) => o.id === organizationId);
    return org?.organizationName || "Unknown Organization";
  };

  // Toggle port status mutation
  const togglePortStatusMutation = useMutation({
    mutationFn: async (portId: number) => {
      return apiRequest("PATCH", `/api/ports/${portId}/toggle-status`);
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
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Port Management</h1>
        </div>
      </div>
      
      <main className="px-6 py-6 flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search ports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
                data-testid="input-search-ports"
              />
            </div>
            {/* Temporarily force button to show while we fix permissions */}
            <Button onClick={() => setLocation("/ports/new")} className="h-8" data-testid="button-add-port">
              <Plus className="w-4 h-4 mr-2" />
              Add Port
            </Button>
          </div>

          {/* Ports List */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {portsLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredPorts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Ports Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm ? "No ports match your search criteria." : "Get started by adding your first port."}
            </p>
            <Button onClick={() => setLocation("/ports/new")} className="h-10">
              <Plus className="w-4 h-4 mr-2" />
              Add First Port
            </Button>
          </div>
        ) : (
          filteredPorts.map((port: Port) => (
            <Card key={port.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm" data-testid={`card-port-${port.id}`}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate" data-testid={`text-port-name-${port.id}`}>
                          {port.portName}
                        </h3>
                        <Badge variant="outline" data-testid={`badge-port-display-${port.id}`}>
                          {port.displayName}
                        </Badge>
                        <Badge
                          variant={port.isActive ? "default" : "secondary"}
                          data-testid={`badge-port-status-${port.id}`}
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
                    {canManage("ports") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePortStatus(port.id)}
                        disabled={togglePortStatusMutation.isPending}
                        className="h-8"
                        data-testid={`button-toggle-port-${port.id}`}
                      >
                        {port.isActive ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {canRead("port-contacts", "ports") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageContacts(port.id)}
                        className="h-8"
                        data-testid={`button-manage-contacts-${port.id}`}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Manage Contacts
                      </Button>
                    )}
                    {canEdit("ports") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPort(port.id)}
                        className="h-8"
                        data-testid={`button-edit-port-${port.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
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
    <AppLayout title="Port Management" activeSection="ports">
      <PortsContent />
    </AppLayout>
  );
}
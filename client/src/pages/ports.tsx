import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Users, Edit, Building2, MapPin, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import type { Port, Organization } from "@shared/schema";

export default function PortsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleManageContacts = (portId: number) => {
    setLocation(`/ports/${portId}/contacts`);
  };

  const handleEditPort = (portId: number) => {
    setLocation(`/ports/edit/${portId}`);
  };

  return (
    <AppLayout title="Ports" activeSection="ports">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Ports
            </h1>
          </div>
          <Button
            onClick={() => setLocation("/ports/new")}
            className="h-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Port
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Search ports by name, code, address, country, or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
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
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
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
    </AppLayout>
  );
}
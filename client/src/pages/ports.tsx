import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Eye, Edit, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthService } from "@/lib/auth";
import type { Port, Organization } from "@shared/schema";

export default function PortsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Validate session on component mount
  useEffect(() => {
    const validateSession = async () => {
      const sessionValid = await AuthService.validateSession();
      if (!sessionValid) {
        setLocation("/login");
      }
    };
    validateSession();
  }, [setLocation]);

  // Fetch ports
  const { data: ports = [], isLoading: portsLoading } = useQuery<Port[]>({
    queryKey: ["/api/ports"],
    retry: false,
  });

  // Fetch organizations for dropdown
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    retry: false,
  });

  // Toggle port status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PATCH", `/api/ports/${id}/toggle-status`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      toast({
        title: "Success",
        description: "Port status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update port status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filter ports based on search term
  const filteredPorts = ports.filter((port: Port) =>
    port.portName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.pan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.gstn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewPort = () => {
    setLocation("/ports/new");
  };

  const handleEditPort = (port: Port) => {
    setLocation(`/ports/edit/${port.id}`);
  };

  const handleToggleStatus = (id: number) => {
    toggleStatusMutation.mutate(id);
  };

  const getOrganizationName = (organizationId: number) => {
    const org = organizations.find((o: Organization) => o.id === organizationId);
    return org?.organizationName || "Unknown Organization";
  };



  if (portsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading ports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb Bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Ports</span>
      </div>

      {/* Main Content Area - Updated padding */}
      <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-2">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search ports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleNewPort} className="flex items-center gap-2 h-8">
            <Plus className="h-4 w-4" />
            New Port
          </Button>
        </div>

        {/* Ports List */}
        <Card>
          <CardContent className="pt-6">
            {filteredPorts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>
                  {searchTerm ? 
                    "No ports match your search criteria." : 
                    "No ports found. Add your first port to get started."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Port</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPorts.map((port: Port) => (
                      <TableRow key={port.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{port.portName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {port.country}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                            {port.displayName}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{getOrganizationName(port.organizationId)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-xs truncate">
                            {port.address}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={port.isActive ? "default" : "secondary"}
                            className={port.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                          >
                            {port.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPort(port)}
                              className="h-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={port.isActive ? "secondary" : "default"}
                              onClick={() => handleToggleStatus(port.id)}
                              disabled={toggleStatusMutation.isPending}
                              className="h-8"
                            >
                              {port.isActive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Eye, Edit, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Port, Organization } from "@shared/schema";
import { PortForm } from "@/components/PortForm";

export default function PortsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | "view">("create");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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
  const { data: ports = [], isLoading: portsLoading } = useQuery({
    queryKey: ["/api/ports"],
    retry: false,
  });

  // Fetch organizations for dropdown
  const { data: organizations = [] } = useQuery({
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
    setSelectedPort(null);
    setFormMode("create");
    setIsSheetOpen(true);
  };

  const handleViewPort = (port: Port) => {
    setSelectedPort(port);
    setFormMode("view");
    setIsSheetOpen(true);
  };

  const handleEditPort = (port: Port) => {
    setSelectedPort(port);
    setFormMode("edit");
    setIsSheetOpen(true);
  };

  const handleToggleStatus = (id: number) => {
    toggleStatusMutation.mutate(id);
  };

  const getOrganizationName = (organizationId: number) => {
    const org = organizations.find((o: Organization) => o.id === organizationId);
    return org?.organizationName || "Unknown Organization";
  };

  const getSheetTitle = () => {
    switch (formMode) {
      case "create": return "New Port";
      case "edit": return "Edit Port";
      case "view": return "Port Details";
      default: return "Port";
    }
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
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Ports</CardTitle>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button onClick={handleNewPort} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Port
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>{getSheetTitle()}</SheetTitle>
                  <SheetDescription>
                    {formMode === "create" && "Add a new port to the system"}
                    {formMode === "edit" && "Update port information"}
                    {formMode === "view" && "View port details"}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <PortForm
                    port={selectedPort}
                    organizations={organizations}
                    mode={formMode}
                    onSuccess={() => {
                      setIsSheetOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search ports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Port Name</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>PAN</TableHead>
                  <TableHead>GSTN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPorts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      {searchTerm ? "No ports found matching your search." : "No ports available. Create your first port to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPorts.map((port: Port) => (
                    <TableRow key={port.id}>
                      <TableCell className="font-medium">{port.portName}</TableCell>
                      <TableCell>{port.displayName}</TableCell>
                      <TableCell>{getOrganizationName(port.organizationId)}</TableCell>
                      <TableCell className="max-w-xs truncate">{port.address}</TableCell>
                      <TableCell>{port.country}</TableCell>
                      <TableCell>{port.state}</TableCell>
                      <TableCell>{port.pan}</TableCell>
                      <TableCell>{port.gstn}</TableCell>
                      <TableCell>
                        <Badge variant={port.isActive ? "default" : "secondary"}>
                          {port.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPort(port)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPort(port)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(port.id)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {port.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
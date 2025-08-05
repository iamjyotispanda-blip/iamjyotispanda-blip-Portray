import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Ship, MapPin, Building2, Globe, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthService } from "@/lib/auth";

import type { Terminal, Port } from "@shared/schema";

// Country flag component
const CountryFlag = ({ country }: { country: string }) => {
  const countryCodeMap: Record<string, string> = {
    "India": "IN",
    "United States": "US",
    "United Kingdom": "GB",
    "Australia": "AU",
    "Canada": "CA",
    "Germany": "DE",
    "France": "FR",
    "Japan": "JP",
    "China": "CN",
    "Singapore": "SG",
    // Add more as needed
  };

  const code = countryCodeMap[country] || "IN";
  
  return (
    <img 
      src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
      alt={`${country} flag`}
      className="w-5 h-3 rounded-sm border border-gray-200 object-cover"
      title={country}
      onError={(e) => {
        // Fallback to code badge if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = target.nextElementSibling as HTMLElement;
        if (fallback && fallback.classList.contains('flag-fallback')) {
          fallback.style.display = 'flex';
        }
      }}
    />
  );
};

export default function TerminalsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get authenticated user
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  // Get assigned port for Port Admin users
  const { data: assignedPort, isLoading: portLoading } = useQuery({
    queryKey: ["/api/terminals/my-port"],
    enabled: !!user && user.role === "PortAdmin",
  });

  // Get terminals for the assigned port
  const { data: terminals = [], isLoading: isLoadingTerminals } = useQuery({
    queryKey: ["/api/ports", assignedPort?.id, "terminals"],
    enabled: !!assignedPort?.id,
  });

  // Filter terminals based on search term
  const filteredTerminals = (terminals as Terminal[]).filter((terminal: Terminal) =>
    terminal.terminalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terminal.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terminal.terminalType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terminal.billingCity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Delete terminal mutation
  const deleteTerminalMutation = useMutation({
    mutationFn: async (terminalId: number) => {
      const response = await apiRequest("DELETE", `/api/terminals/${terminalId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports", assignedPort?.id, "terminals"] });
      toast({
        title: "Success",
        description: "Terminal deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete terminal",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTerminal = async (terminalId: number) => {
    if (confirm("Are you sure you want to delete this terminal?")) {
      deleteTerminalMutation.mutate(terminalId);
    }
  };

  // Show loading state while checking authentication
  if (userLoading || portLoading) {
    return (
      <AppLayout title="Loading..." activeSection="terminals">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  // Handle user error
  if (userError || !user) {
    return (
      <AppLayout title="Authentication Required" activeSection="terminals">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">Please log in to access this page.</p>
              <Button
                onClick={() => {
                  AuthService.logout();
                  setLocation("/login");
                }}
                className="h-8"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!assignedPort) {
    return (
      <AppLayout title="No Port Assigned" activeSection="terminals">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Ship className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No port has been assigned to your account.</p>
              <p className="text-sm text-gray-500">Please contact the system administrator.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Terminals" activeSection="terminals">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Terminals</span>
          <Button onClick={() => setLocation("/terminals/new")} className="h-8">
            <Plus className="w-4 h-4 mr-2" />
            New Terminal
          </Button>
        </div>
        
        <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search terminals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Terminals List */}
            {isLoadingTerminals ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">Loading terminals...</div>
                </CardContent>
              </Card>
            ) : filteredTerminals.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">
                    {searchTerm ? "No terminals found matching your search." : "No terminals found. Add the first terminal to get started."}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredTerminals.map((terminal: Terminal) => (
                  <Card key={terminal.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <Ship className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {terminal.terminalName}
                              </h3>
                              <Badge variant="outline">
                                {terminal.shortCode}
                              </Badge>
                              <Badge
                                variant={terminal.isActive ? "default" : "secondary"}
                              >
                                {terminal.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {terminal.terminalType}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <span>{terminal.billingCity}</span>
                              <span>{terminal.currency}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setLocation(`/terminals/edit/${terminal.id}`)}
                            className="h-8"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDeleteTerminal(terminal.id)}
                            className="h-8 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
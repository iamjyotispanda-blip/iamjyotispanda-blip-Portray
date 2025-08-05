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
        // Fallback to text badge if image fails
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = target.nextElementSibling as HTMLElement;
        if (fallback && fallback.classList.contains('flag-fallback')) {
          fallback.style.display = 'inline-flex';
        }
      }}
    />
  );
};

export default function TerminalsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get assigned port for Port Admin
  const { data: assignedPort } = useQuery({
    queryKey: ["/api/terminals/my-port"],
    enabled: user?.role === "PortAdmin",
  });

  // Get terminals for the assigned port
  const { data: terminals = [], isLoading } = useQuery({
    queryKey: ["/api/ports", assignedPort?.id, "terminals"],
    enabled: !!assignedPort?.id,
  });

  // Delete terminal mutation
  const deleteTerminalMutation = useMutation({
    mutationFn: (terminalId: number) => apiRequest("DELETE", `/api/terminals/${terminalId}`),
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

  // Auto-generate short code from terminal name
  const generateShortCode = (terminalName: string): string => {
    return terminalName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 6);
  };

  // Filter terminals based on search
  const filteredTerminals = terminals.filter((terminal: Terminal) =>
    terminal.terminalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terminal.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terminal.terminalType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteTerminal = (terminalId: number) => {
    if (window.confirm("Are you sure you want to delete this terminal?")) {
      deleteTerminalMutation.mutate(terminalId);
    }
  };

  if (user?.role !== "PortAdmin") {
    return (
      <AppLayout title="Access Denied" activeSection="terminals">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">Access denied. Port Admin role required.</p>
              <Button onClick={() => setLocation("/login")} className="h-8">
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Terminals
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage terminals for {assignedPort.portName}
              </p>
            </div>
            
            <Button
              onClick={() => setLocation("/terminals/new")}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Terminal
            </Button>
          </div>
        </div>

        {/* Assigned Port Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700 px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Ship className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {assignedPort.portName}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-200">
                Organization ID: {assignedPort.organizationId}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-200">
                {assignedPort.state}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <CountryFlag country={assignedPort.country} />
              <div 
                className="flag-fallback inline-flex items-center justify-center w-5 h-3 rounded-sm border border-gray-200 text-xs font-bold bg-gradient-to-br from-blue-500 to-green-500 text-white"
                style={{ display: 'none' }}
                title={assignedPort.country}
              >
                {assignedPort.country.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-sm text-blue-700 dark:text-blue-200">
                {assignedPort.country}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Search */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search terminals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Terminals Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTerminals.length === 0 ? (
              <div className="text-center py-12">
                <Ship className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No terminals found" : "No terminals yet"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchTerm 
                    ? "Try adjusting your search criteria"
                    : "Get started by creating your first terminal"
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setLocation("/terminals/new")} className="h-8">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Terminal
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTerminals.map((terminal: Terminal) => (
                  <Card key={terminal.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{terminal.terminalName}</CardTitle>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/terminals/edit/${terminal.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTerminal(terminal.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{terminal.shortCode}</Badge>
                        <Badge variant="outline">{terminal.terminalType}</Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Currency</p>
                          <p className="font-medium">{terminal.currency}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Timezone</p>
                          <p className="font-medium">{terminal.timezone}</p>
                        </div>
                      </div>
                      
                      {(terminal.gst || terminal.pan) && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {terminal.gst && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">GST</p>
                              <p className="font-medium">{terminal.gst}</p>
                            </div>
                          )}
                          {terminal.pan && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">PAN</p>
                              <p className="font-medium">{terminal.pan}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <p className="text-gray-500 dark:text-gray-400">Billing Address</p>
                        <p className="font-medium">{terminal.billingAddress}</p>
                        <p className="text-gray-600 dark:text-gray-300">
                          {terminal.billingCity}, {terminal.billingPinCode}
                        </p>
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
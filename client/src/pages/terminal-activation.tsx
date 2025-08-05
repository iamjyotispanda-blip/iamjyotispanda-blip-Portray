import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Clock, Search, Building, MapPin, Phone, Calendar, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthService } from "@/lib/auth";
import { format } from "date-fns";

import type { Terminal, Port, Organization } from "@shared/schema";

interface TerminalWithDetails extends Terminal {
  port: Port;
  organization: Organization;
}

export default function TerminalActivationPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/me");
      return response.json();
    },
  });

  // Fetch terminals pending activation
  const { data: terminals = [], isLoading } = useQuery({
    queryKey: ["/api/terminals/pending-activation"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/terminals/pending-activation");
      return response.json();
    },
  });

  // Update terminal status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ terminalId, status }: { terminalId: number; status: string }) => {
      return apiRequest("PUT", `/api/terminals/${terminalId}/status`, { status });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/terminals/pending-activation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Success",
        description: `Terminal ${status === "Active" ? "activated" : "rejected"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update terminal status",
        variant: "destructive",
      });
    },
  });

  const filteredTerminals = terminals.filter((terminal: TerminalWithDetails) =>
    terminal.terminalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terminal.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terminal.port?.portName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terminal.organization?.organizationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleActivate = (terminalId: number) => {
    updateStatusMutation.mutate({ terminalId, status: "Active" });
  };

  const handleReject = (terminalId: number) => {
    updateStatusMutation.mutate({ terminalId, status: "Rejected" });
  };

  // Check if user is System Admin
  if (user?.role !== "SystemAdmin") {
    return (
      <AppLayout title="Access Denied" activeSection="terminal-activation">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">Access denied. System Admin role required.</p>
              <Button onClick={() => setLocation("/login")} className="h-8">
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Terminal Activation" activeSection="terminal-activation">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Terminal Activation</span>
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
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">Loading terminals...</div>
                </CardContent>
              </Card>
            ) : filteredTerminals.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">
                    {searchTerm ? "No terminals found matching your search." : "No terminals pending activation."}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredTerminals.map((terminal: TerminalWithDetails) => (
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
                                variant={
                                  terminal.status === "Active" ? "default" :
                                  terminal.status === "Processing for activation" ? "secondary" :
                                  "outline"
                                }
                              >
                                {terminal.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              <div className="flex items-center space-x-2">
                                <Building className="w-4 h-4" />
                                <span>{terminal.organization?.organizationName}</span>
                                <span className="text-gray-400">•</span>
                                <span>{terminal.organization?.organizationCode}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4" />
                                <span>{terminal.port?.portName}</span>
                                <span className="text-gray-400">•</span>
                                <span>{terminal.port?.state}, {terminal.port?.country}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>Created {format(new Date(terminal.createdAt), "MMM d, yyyy")}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button
                            variant="outline"
                            onClick={() => setLocation(`/terminals/${terminal.id}`)}
                            className="h-8"
                          >
                            <Ship className="w-4 h-4 mr-2" />
                            View Profile
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ terminalId: terminal.id, status: "Active" })}
                            disabled={updateStatusMutation.isPending}
                            className="h-8"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Activate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ terminalId: terminal.id, status: "Rejected" })}
                            disabled={updateStatusMutation.isPending}
                            className="h-8"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
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
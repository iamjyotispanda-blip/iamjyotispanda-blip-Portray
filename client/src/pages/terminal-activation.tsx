import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Clock, Search, Building, MapPin, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <div className="flex-1 p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Terminal Activation Requests
            </h1>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search terminals, ports, or organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold">
                    {terminals.filter((t: TerminalWithDetails) => t.status === "Processing for activation").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
                  <p className="text-2xl font-bold">{terminals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Organizations</p>
                  <p className="text-2xl font-bold">
                    {new Set(terminals.map((t: TerminalWithDetails) => t.organization?.id)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Terminals Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terminal Activation Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : filteredTerminals.length === 0 ? (
              <div className="text-center p-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm ? "No terminals found matching your search" : "No pending terminal activation requests"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terminal</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTerminals.map((terminal: TerminalWithDetails) => (
                      <TableRow key={terminal.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{terminal.terminalName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Code: {terminal.shortCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{terminal.port?.portName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span>{terminal.organization?.organizationName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{terminal.billingCity}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {terminal.port?.country}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{terminal.billingPhone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {format(new Date(terminal.createdAt), "MMM dd, yyyy")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              terminal.status === "Active"
                                ? "default"
                                : terminal.status === "Rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {terminal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {terminal.status === "Processing for activation" && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={() => handleActivate(terminal.id)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Activate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => handleReject(terminal.id)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
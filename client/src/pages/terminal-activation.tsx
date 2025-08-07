import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, XCircle, Clock, Search, Building, MapPin, Phone, Calendar, Ship, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthService } from "@/lib/auth";
import { format, addMonths } from "date-fns";

import type { Terminal, Port, Organization, SubscriptionType } from "@shared/schema";

interface TerminalWithDetails extends Terminal {
  port: Port;
  organization: Organization;
}

// Activation form schema
const activationFormSchema = z.object({
  activationStartDate: z.string().min(1, "Activation start date is required"),
  subscriptionTypeId: z.string().min(1, "Subscription type is required"),
  workOrderNo: z.string().optional(),
  workOrderDate: z.string().optional(),
}).superRefine((data, ctx) => {
  // If subscription is not 1 month, work order fields are required
  const subscriptionTypeId = parseInt(data.subscriptionTypeId);
  if (subscriptionTypeId !== 1) { // Assuming ID 1 is for 1 month
    if (!data.workOrderNo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Work order number is required for subscriptions longer than 1 month",
        path: ["workOrderNo"]
      });
    }
    if (!data.workOrderDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Work order date is required for subscriptions longer than 1 month",
        path: ["workOrderDate"]
      });
    }
  }
});

type ActivationFormData = z.infer<typeof activationFormSchema>;

export default function TerminalActivationPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activationDialog, setActivationDialog] = useState<{ open: boolean; terminal?: TerminalWithDetails }>({ open: false });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for activation
  const form = useForm<ActivationFormData>({
    resolver: zodResolver(activationFormSchema),
    defaultValues: {
      activationStartDate: format(new Date(), "yyyy-MM-dd"),
      subscriptionTypeId: "",
      workOrderNo: "",
      workOrderDate: "",
    },
  });

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

  // Fetch subscription types
  const { data: subscriptionTypes = [] } = useQuery({
    queryKey: ["/api/subscription-types"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/subscription-types");
      return response.json();
    },
  });

  // Activate terminal mutation
  const activateTerminalMutation = useMutation({
    mutationFn: async ({ terminalId, data }: { terminalId: number; data: ActivationFormData }) => {
      return apiRequest("PUT", `/api/terminals/${terminalId}/activate`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/terminals/pending-activation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      setActivationDialog({ open: false });
      form.reset();
      toast({
        title: "Success",
        description: "Terminal activated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate terminal",
        variant: "destructive",
      });
    },
  });

  // Reject terminal mutation
  const rejectTerminalMutation = useMutation({
    mutationFn: async (terminalId: number) => {
      return apiRequest("PUT", `/api/terminals/${terminalId}/status`, { status: "Rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/terminals/pending-activation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Success",
        description: "Terminal rejected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject terminal",
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

  const handleActivate = (terminal: TerminalWithDetails) => {
    setActivationDialog({ open: true, terminal });
    form.reset({
      activationStartDate: format(new Date(), "yyyy-MM-dd"),
      subscriptionTypeId: "",
      workOrderNo: "",
      workOrderDate: "",
    });
  };

  const handleReject = (terminalId: number) => {
    rejectTerminalMutation.mutate(terminalId);
  };

  const onActivationSubmit = (data: ActivationFormData) => {
    if (activationDialog.terminal) {
      activateTerminalMutation.mutate({ 
        terminalId: activationDialog.terminal.id, 
        data 
      });
    }
  };

  const getSelectedSubscriptionType = () => {
    const selectedId = form.watch("subscriptionTypeId");
    return subscriptionTypes.find((type: SubscriptionType) => type.id.toString() === selectedId);
  };

  const calculateEndDate = () => {
    const startDate = form.watch("activationStartDate");
    const subscriptionType = getSelectedSubscriptionType();
    
    if (startDate && subscriptionType) {
      return format(addMonths(new Date(startDate), subscriptionType.months), "yyyy-MM-dd");
    }
    return "";
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
                              <div className="flex items-center space-x-3">
                                <Badge
                                  variant={
                                    terminal.status === "Active" ? "default" :
                                    terminal.status === "Processing for activation" ? "secondary" :
                                    "outline"
                                  }
                                  className={terminal.status === "Active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                                >
                                  {terminal.status}
                                </Badge>
                                
                                {/* Show remaining days alongside Active badge */}
                                {terminal.status === "Active" && terminal.activationEndDate && (
                                  <h5 className="text-lg font-bold text-green-700 dark:text-green-300">
                                    {Math.max(0, Math.ceil((new Date(terminal.activationEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))} days remaining
                                  </h5>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              <div className="flex items-center space-x-2">
                                <Building className="w-4 h-4" />
                                <span>{terminal.organization?.organizationName}</span>
                                <span className="text-gray-400">•</span>
                                <span>{terminal.organization?.organizationCode}</span>
                                {/* Show subscription details alongside organization info */}
                                {terminal.status === "Active" && terminal.activationStartDate && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <div className="flex items-center space-x-1 text-green-700 dark:text-green-300">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {format(new Date(terminal.activationStartDate), "MMM d yyyy")} - {terminal.activationEndDate && format(new Date(terminal.activationEndDate), "MMM d, yyyy")} {terminal.subscriptionTypeId === 1 ? "1Month" : terminal.subscriptionTypeId === 2 ? "12Month" : terminal.subscriptionTypeId === 3 ? "24Month" : terminal.subscriptionTypeId === 4 ? "48Month" : "Unknown"}{terminal.workOrderNo && ` WO: ${terminal.workOrderNo}`}
                                      </span>
                                    </div>
                                  </>
                                )}
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
                            onClick={() => handleActivate(terminal)}
                            disabled={activateTerminalMutation.isPending}
                            className="h-8"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Activate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(terminal.id)}
                            disabled={rejectTerminalMutation.isPending}
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

      {/* Activation Dialog */}
      <Dialog open={activationDialog.open} onOpenChange={(open) => setActivationDialog({ open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Ship className="w-5 h-5 text-blue-600" />
              <span>Activate Terminal</span>
            </DialogTitle>
          </DialogHeader>

          {activationDialog.terminal && (
            <div className="space-y-6">
              {/* Terminal Details */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-lg">{activationDialog.terminal.terminalName}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Applied On:</span>
                    <p className="font-medium">{format(new Date(activationDialog.terminal.createdAt), "MMM dd, yyyy")}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Contact:</span>
                    <p className="font-medium">{activationDialog.terminal.billingPhone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Organization:</span>
                    <p className="font-medium">{activationDialog.terminal.organization?.organizationName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Port:</span>
                    <p className="font-medium">{activationDialog.terminal.port?.portName}</p>
                  </div>
                </div>
              </div>

              {/* Activation Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onActivationSubmit)} className="space-y-4">
                  {/* Primary activation fields - side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="activationStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activation Start From</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subscriptionTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subscription Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subscription type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subscriptionTypes.map((type: SubscriptionType) => (
                                <SelectItem key={type.id} value={type.id.toString()}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Show calculated end date */}
                  {calculateEndDate() && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Subscription Period:</strong> {form.watch("activationStartDate")} to {calculateEndDate()}
                      </p>
                    </div>
                  )}

                  {/* Work Order fields (required for non-1-month subscriptions) - side by side */}
                  {getSelectedSubscriptionType()?.months !== 1 && getSelectedSubscriptionType()?.months && (
                    <div className="space-y-4 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                        Work Order Required for {getSelectedSubscriptionType()?.name} subscription
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="workOrderNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Work Order No *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter work order number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="workOrderDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Work Order Date *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <DialogFooter className="space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActivationDialog({ open: false })}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={activateTerminalMutation.isPending}
                    >
                      {activateTerminalMutation.isPending ? "Activating..." : "Activate Terminal"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
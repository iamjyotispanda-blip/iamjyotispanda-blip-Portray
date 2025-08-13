import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Clock, Search, Building, MapPin, Phone, Calendar, Ship, X, FileText, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
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

// Suspension form schema
const suspensionFormSchema = z.object({
  suspensionRemarks: z.string().min(10, "Suspension remarks must be at least 10 characters long"),
});

type SuspensionFormData = z.infer<typeof suspensionFormSchema>;

export default function TerminalActivationPage() {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activationDialog, setActivationDialog] = useState<{ open: boolean; terminal?: TerminalWithDetails }>({ open: false });
  const [activationLogDialog, setActivationLogDialog] = useState<{ open: boolean; terminalId?: number }>({ open: false });
  const [suspensionDialog, setSuspensionDialog] = useState<{ open: boolean; terminal?: TerminalWithDetails }>({ open: false });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get URL parameters to check for auto-activation
  const urlParams = new URLSearchParams(window.location.search);
  const autoActivateTerminalId = urlParams.get('autoActivate');


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

  // Form for suspension
  const suspensionForm = useForm<SuspensionFormData>({
    resolver: zodResolver(suspensionFormSchema),
    defaultValues: {
      suspensionRemarks: "",
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

  // Fetch activation log for specific terminal
  const { data: activationLog = [] } = useQuery({
    queryKey: ["/api/terminals", activationLogDialog.terminalId, "activation-log"],
    enabled: !!activationLogDialog.terminalId && activationLogDialog.open,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/terminals/${activationLogDialog.terminalId}/activation-log`);
      return response.json();
    },
  });

  // Auto-open activation dialog when navigated from notification
  useEffect(() => {
    if (autoActivateTerminalId && terminals.length > 0 && !activationDialog.open) {
      const terminalToActivate = terminals.find((terminal: TerminalWithDetails) => 
        terminal.id.toString() === autoActivateTerminalId
      );
      
      if (terminalToActivate) {
        handleActivate(terminalToActivate);
        
        // Clear the URL parameter after opening the dialog
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [autoActivateTerminalId, terminals, activationDialog.open]);

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

  // Suspend terminal mutation
  const suspendTerminalMutation = useMutation({
    mutationFn: async ({ terminalId, data }: { terminalId: number; data: SuspensionFormData }) => {
      return apiRequest("PUT", `/api/terminals/${terminalId}/suspend`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/terminals/pending-activation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      setSuspensionDialog({ open: false });
      suspensionForm.reset();
      toast({
        title: "Success",
        description: "Terminal suspended successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to suspend terminal",
        variant: "destructive",
      });
    },
  });

  // Reject terminal mutation - INACTIVE
  // const rejectTerminalMutation = useMutation({
  //   mutationFn: async (terminalId: number) => {
  //     return apiRequest("PUT", `/api/terminals/${terminalId}/status`, { status: "Rejected" });
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ["/api/terminals/pending-activation"] });
  //     queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  //     queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
  //     toast({
  //       title: "Success",
  //       description: "Terminal rejected successfully",
  //     });
  //   },
  //   onError: (error: any) => {
  //     toast({
  //       title: "Error",
  //       description: error.message || "Failed to reject terminal",
  //       variant: "destructive",
  //     });
  //   },
  // });

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

  const handleSuspend = (terminal: TerminalWithDetails) => {
    setSuspensionDialog({ open: true, terminal });
    suspensionForm.reset({
      suspensionRemarks: "",
    });
  };

  // const handleReject = (terminalId: number) => {
  //   rejectTerminalMutation.mutate(terminalId);
  // };

  const onActivationSubmit = (data: ActivationFormData) => {
    if (activationDialog.terminal) {
      activateTerminalMutation.mutate({ 
        terminalId: activationDialog.terminal.id, 
        data 
      });
    }
  };

  const onSuspensionSubmit = (data: SuspensionFormData) => {
    if (suspensionDialog.terminal) {
      suspendTerminalMutation.mutate({
        terminalId: suspensionDialog.terminal.id,
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
        
        <main className="px-2 sm:px-4 lg:px-6 py-2 flex-1">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search terminals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-8 w-full"
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
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Ship className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate">
                                {terminal.terminalName}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {terminal.shortCode}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {(() => {
                                const remainingDays = terminal.status === "Active" && terminal.activationEndDate 
                                  ? Math.max(0, Math.ceil((new Date(terminal.activationEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
                                  : 0;
                                const isExpiringSoon = remainingDays <= 30 && remainingDays > 0;
                                
                                return (
                                  <>
                                    <Badge
                                      variant={
                                        terminal.status === "Active" ? "default" :
                                        terminal.status === "Processing for activation" ? "secondary" :
                                        terminal.status === "Suspended" ? "destructive" :
                                        "outline"
                                      }
                                      className={
                                        terminal.status === "Active" 
                                          ? (isExpiringSoon ? "bg-orange-600 text-white dark:bg-orange-700 dark:text-white" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200")
                                          : terminal.status === "Suspended"
                                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                          : ""
                                      }
                                    >
                                      {terminal.status}
                                    </Badge>
                                    
                                    {/* Show remaining days alongside Active badge */}
                                    {terminal.status === "Active" && terminal.activationEndDate && (
                                      <span className={`text-sm font-medium ${isExpiringSoon ? "text-orange-600 dark:text-orange-400" : "text-green-700 dark:text-green-300"}`}>
                                        {remainingDays} days remaining
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <div className="flex items-center space-x-2">
                                  <Building className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="truncate">{terminal.organization?.organizationName}</span>
                                  <span className="text-gray-400">•</span>
                                  <span>{terminal.organization?.organizationCode}</span>
                                </div>
                                {/* Show subscription details */}
                                {terminal.status === "Active" && terminal.activationStartDate && (
                                  <div className="flex items-center space-x-1 text-green-700 dark:text-green-300">
                                    <Calendar className="h-3 w-3" />
                                    <span className="text-xs">
                                      {format(new Date(terminal.activationStartDate), "MMM d yyyy")} - {terminal.activationEndDate && format(new Date(terminal.activationEndDate), "MMM d, yyyy")}
                                      {terminal.workOrderNo && ` WO: ${terminal.workOrderNo}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="truncate">{terminal.port?.portName}</span>
                                <span className="text-gray-400">•</span>
                                <span>{terminal.port?.state}, {terminal.port?.country}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="text-xs">Created {format(new Date(terminal.createdAt), "MMM d, yyyy")}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-2 lg:flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/terminals/${terminal.id}`)}
                            className="h-8 text-xs lg:text-sm"
                          >
                            <Ship className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                            <span className="hidden sm:inline">View Profile</span>
                            <span className="sm:hidden">View</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleActivate(terminal)}
                            disabled={activateTerminalMutation.isPending}
                            className="h-8 text-xs lg:text-sm"
                          >
                            <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                            Activate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActivationLogDialog({ open: true, terminalId: terminal.id })}
                            className="h-8 text-xs lg:text-sm"
                          >
                            <FileText className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                            <span className="hidden sm:inline">View Logs</span>
                            <span className="sm:hidden">Logs</span>
                          </Button>
                          {terminal.status === "Active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuspend(terminal)}
                              className="h-8 text-xs lg:text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border-red-300 hover:border-red-500"
                            >
                              <Ban className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                              Suspend
                            </Button>
                          )}
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
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Activation Log Dialog */}
      <Dialog open={activationLogDialog.open} onOpenChange={(open) => setActivationLogDialog({ open })}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Activation Log</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activationLog.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No activation log available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activationLog.map((log: any, index: number) => {
                  const getLogStyle = (action: string) => {
                    switch (action.toLowerCase()) {
                      case 'activated':
                      case 'activation':
                        return {
                          border: 'border-green-500',
                          bg: 'bg-green-50 dark:bg-green-900/20',
                          titleColor: 'text-green-800 dark:text-green-200',
                          textColor: 'text-green-700 dark:text-green-300'
                        };
                      case 'submitted':
                      case 'processing':
                        return {
                          border: 'border-blue-500',
                          bg: 'bg-blue-50 dark:bg-blue-900/20',
                          titleColor: 'text-blue-800 dark:text-blue-200',
                          textColor: 'text-blue-700 dark:text-blue-300'
                        };
                      case 'verified':
                      case 'documentation':
                        return {
                          border: 'border-yellow-500',
                          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                          titleColor: 'text-yellow-800 dark:text-yellow-200',
                          textColor: 'text-yellow-700 dark:text-yellow-300'
                        };
                      case 'rejected':
                        return {
                          border: 'border-red-500',
                          bg: 'bg-red-50 dark:bg-red-900/20',
                          titleColor: 'text-red-800 dark:text-red-200',
                          textColor: 'text-red-700 dark:text-red-300'
                        };
                      default:
                        return {
                          border: 'border-gray-500',
                          bg: 'bg-gray-50 dark:bg-gray-900/20',
                          titleColor: 'text-gray-800 dark:text-gray-200',
                          textColor: 'text-gray-700 dark:text-gray-300'
                        };
                    }
                  };
                  
                  const style = getLogStyle(log.action || log.status || '');
                  
                  return (
                    <div key={index} className={`border-l-4 ${style.border} pl-4 py-2 ${style.bg}`}>
                      <div className="flex items-center justify-between">
                        <h4 className={`font-semibold ${style.titleColor}`}>
                          {log.action || log.title || log.status || 'Terminal Activity'}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {format(new Date(log.timestamp || log.createdAt || log.date), "MMM dd, yyyy - hh:mm a")}
                        </span>
                      </div>
                      <p className={`text-sm ${style.textColor} mt-1`}>
                        {log.description || log.message || 'Terminal status updated'}
                      </p>
                      {(log.performedBy || log.workOrderNo || log.details) && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {log.performedBy && (
                            <span>
                              Performed by: {log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.role})` : 'Unknown User'}
                            </span>
                          )}
                          {log.performedBy && log.workOrderNo && <span> • </span>}
                          {log.workOrderNo && <span>Work Order: {log.workOrderNo}</span>}
                          {log.details && (
                            <div className="mt-1">
                              <span>{log.details}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActivationLogDialog({ open: false })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspension Dialog */}
      <Dialog open={suspensionDialog.open} onOpenChange={(open) => setSuspensionDialog({ open })}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Ban className="w-5 h-5 text-red-600" />
              <span>Suspend Terminal</span>
            </DialogTitle>
          </DialogHeader>

          {suspensionDialog.terminal && (
            <div className="space-y-4">
              {/* Terminal Details */}
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-lg text-red-800 dark:text-red-200">
                  {suspensionDialog.terminal.terminalName}
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  This action will suspend the terminal's operations.
                </p>
              </div>

              {/* Suspension Form */}
              <Form {...suspensionForm}>
                <form onSubmit={suspensionForm.handleSubmit(onSuspensionSubmit)} className="space-y-4">
                  <FormField
                    control={suspensionForm.control}
                    name="suspensionRemarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suspension Remarks *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Please provide detailed reasons for suspension..."
                            rows={4}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSuspensionDialog({ open: false })}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={suspendTerminalMutation.isPending}
                    >
                      {suspendTerminalMutation.isPending ? "Suspending..." : "Suspend Terminal"}
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
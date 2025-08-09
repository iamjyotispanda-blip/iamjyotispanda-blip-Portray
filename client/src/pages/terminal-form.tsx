import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Ship, Building2, MapPin, Globe, Clock, CreditCard, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthService } from "@/lib/auth";

import type { Terminal, Port, InsertTerminal } from "@shared/schema";

// Terminal form schema
const terminalFormSchema = z.object({
  // Auto-filled fields
  portName: z.string().min(1),
  organization: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  
  terminalName: z.string().min(1, "Terminal name is required"),
  shortCode: z.string().min(1, "Short code is required").max(6, "Short code must be 6 characters or less"),
  gst: z.string().optional(),
  pan: z.string().optional(),
  currency: z.string().default("INR"),
  timezone: z.string().min(1, "Timezone is required"),
  
  // Billing Address
  billingAddress: z.string().min(1, "Billing address is required"),
  billingCity: z.string().min(1, "Billing city is required"),
  billingPinCode: z.string().min(1, "Billing pin code is required"),
  billingPhone: z.string().min(1, "Billing phone is required"),
  billingFax: z.string().optional(),
  
  // Shipping Address
  shippingAddress: z.string().min(1, "Shipping address is required"),
  shippingCity: z.string().min(1, "Shipping city is required"),
  shippingPinCode: z.string().min(1, "Shipping pin code is required"),
  shippingPhone: z.string().min(1, "Shipping phone is required"),
  shippingFax: z.string().optional(),
  
  sameAsBilling: z.boolean().default(false),
});

type TerminalFormData = z.infer<typeof terminalFormSchema>;



// Timezone options for India
const timezones = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Mumbai", label: "Asia/Mumbai (IST)" },
  { value: "Asia/Delhi", label: "Asia/Delhi (IST)" },
];

// Currency options
const currencies = [
  { value: "INR", label: "Indian Rupee (INR)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
];

export default function TerminalFormPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get assigned port for Port Admin
  const { data: assignedPort, isLoading: isPortLoading } = useQuery({
    queryKey: ["/api/terminals/my-port"],
    enabled: user?.role === "PortAdmin",
  });

  // Get terminal data if editing
  const { data: terminal } = useQuery({
    queryKey: ["/api/terminals", id],
    enabled: isEditing,
  });

  const form = useForm<TerminalFormData>({
    resolver: zodResolver(terminalFormSchema),
    defaultValues: {
      portName: "",
      organization: "",
      state: "",
      country: "India",
      terminalName: "",
      shortCode: "",
      gst: "",
      pan: "",
      currency: "INR",
      timezone: "Asia/Kolkata",
      billingAddress: "",
      billingCity: "",
      billingPinCode: "",
      billingPhone: "",
      billingFax: "",
      shippingAddress: "",
      shippingCity: "",
      shippingPinCode: "",
      shippingPhone: "",
      shippingFax: "",
      sameAsBilling: false,
    },
  });

  // Get current user's contact details
  const { data: userContact } = useQuery({
    queryKey: ["/api/contacts/my-contact"],
    enabled: !!user && user.role === "PortAdmin",
  });

  // Update form with port and contact data when available
  useEffect(() => {
    if (assignedPort) {
      // Auto-fill port information from port admin assignment
      form.setValue("portName", (assignedPort as any).portName || "");
      form.setValue("organization", (assignedPort as any).organizationName || "");
      form.setValue("state", (assignedPort as any).state || "");
      form.setValue("country", (assignedPort as any).country || "India");
    }
    
    if (userContact && !isEditing) {
      // Auto-fill contact information from port admin contact details for new terminals
      const contactName = (userContact as any).contactName || "";
      form.setValue("billingPhone", (userContact as any).mobileNumber || "");
      form.setValue("shippingPhone", (userContact as any).mobileNumber || "");
    }
  }, [assignedPort, userContact, form, isEditing]);

  // Watch for terminal name changes to auto-generate short code
  const terminalName = form.watch("terminalName");
  const sameAsBilling = form.watch("sameAsBilling");

  useEffect(() => {
    if (terminalName && !isEditing) {
      const shortCode = terminalName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 6);
      form.setValue("shortCode", shortCode);
    }
  }, [terminalName, form, isEditing]);

  // Copy billing address to shipping when sameAsBilling is checked
  useEffect(() => {
    if (sameAsBilling) {
      try {
        const billingData = form.getValues();
        if (billingData) {
          form.setValue("shippingAddress", billingData.billingAddress || "");
          form.setValue("shippingCity", billingData.billingCity || "");
          form.setValue("shippingPinCode", billingData.billingPinCode || "");
          form.setValue("shippingPhone", billingData.billingPhone || "");
          form.setValue("shippingFax", billingData.billingFax || "");
        }
      } catch (error) {
        console.error("Error copying billing data to shipping:", error);
      }
    }
  }, [sameAsBilling, form]);

  // Populate form when editing
  useEffect(() => {
    if (terminal && isEditing && assignedPort) {
      form.reset({
        // Port-related fields from assignedPort
        portName: (assignedPort as any).portName || "",
        organization: (assignedPort as any).organizationName || "",
        state: (assignedPort as any).state || "",
        country: (assignedPort as any).country || "India",
        // Terminal-specific fields from terminal data
        terminalName: (terminal as any).terminalName,
        shortCode: (terminal as any).shortCode,
        gst: (terminal as any).gst || "",
        pan: (terminal as any).pan || "",
        currency: (terminal as any).currency,
        timezone: (terminal as any).timezone,
        billingAddress: (terminal as any).billingAddress,
        billingCity: (terminal as any).billingCity,
        billingPinCode: (terminal as any).billingPinCode,
        billingPhone: (terminal as any).billingPhone,
        billingFax: (terminal as any).billingFax || "",
        shippingAddress: (terminal as any).shippingAddress,
        shippingCity: (terminal as any).shippingCity,
        shippingPinCode: (terminal as any).shippingPinCode,
        shippingPhone: (terminal as any).shippingPhone,
        shippingFax: (terminal as any).shippingFax || "",
        sameAsBilling: (terminal as any).sameAsBilling,
      });
    }
  }, [terminal, assignedPort, form, isEditing]);

  // Create/Update terminal mutation
  const terminalMutation = useMutation({
    mutationFn: async (data: TerminalFormData) => {
      // Check if terminal is already activated
      const isActivated = terminal && (terminal as any).status === "Active";
      
      let submissionData;
      if (isEditing && isActivated) {
        // If terminal is activated, only update basic fields, preserve activation data
        submissionData = {
          terminalName: data.terminalName,
          shortCode: data.shortCode,
          gst: data.gst,
          pan: data.pan,
          currency: data.currency,
          timezone: data.timezone,
          billingAddress: data.billingAddress,
          billingCity: data.billingCity,
          billingPinCode: data.billingPinCode,
          billingPhone: data.billingPhone,
          billingFax: data.billingFax,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity,
          shippingPinCode: data.shippingPinCode,
          shippingPhone: data.shippingPhone,
          shippingFax: data.shippingFax,
          sameAsBilling: data.sameAsBilling,
          // Do not change status for activated terminals
        };
      } else {
        // For new terminals or non-activated terminals, include status
        submissionData = {
          ...data,
          status: "Processing for activation"
        };
      }
      
      if (isEditing) {
        return apiRequest("PUT", `/api/terminals/${id}`, submissionData);
      } else {
        return apiRequest("POST", `/api/ports/${(assignedPort as any)?.id}/terminals`, submissionData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports", (assignedPort as any)?.id, "terminals"] });
      toast({
        title: "Success",
        description: `Terminal ${isEditing ? "updated" : "created"} successfully`,
      });
      setLocation("/terminals");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} terminal`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TerminalFormData) => {
    terminalMutation.mutate(data);
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

  // Show loading state while data is being fetched
  if (isPortLoading || (user?.role === "PortAdmin" && !assignedPort)) {
    return (
      <AppLayout title="Loading..." activeSection="terminals">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading terminal form...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (user?.role === "PortAdmin" && !assignedPort) {
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
    <AppLayout title={`${isEditing ? "Edit" : "New"} Terminal`} activeSection="terminals">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/terminals")}
              className="h-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? "Edit Terminal" : "New Terminal"}
              </h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <main className="p-6">
            <div className="max-w-6xl mx-auto space-y-6 pb-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Auto-filled Port Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5" />
                      <span>Port Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="portName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Port Name</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly className="bg-gray-50 dark:bg-gray-800" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="organization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly className="bg-gray-50 dark:bg-gray-800" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly className="bg-gray-50 dark:bg-gray-800" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                readOnly 
                                className="bg-gray-50 dark:bg-gray-800" 
                                value={field.value ? `🇮🇳 ${field.value}` : ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Terminal Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Ship className="h-5 w-5" />
                      <span>Terminal Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Primary Terminal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="portName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Port Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                readOnly 
                                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-10" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="terminalName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Terminal Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter terminal name" 
                                {...field} 
                                className="border-gray-200 dark:border-gray-700 h-10" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Terminal Code and Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="shortCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Short Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Auto-generated" 
                                maxLength={6} 
                                {...field} 
                                className="border-gray-200 dark:border-gray-700 h-10 font-mono" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-gray-200 dark:border-gray-700 h-10">
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {timezones.map((tz) => (
                                  <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-gray-200 dark:border-gray-700 h-10">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currencies.map((currency) => (
                                  <SelectItem key={currency.value} value={currency.value}>
                                    {currency.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Optional Tax Information */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Tax Information (Optional)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="gst"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">GST Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter GST number" 
                                  {...field} 
                                  className="border-gray-200 dark:border-gray-700 h-10 bg-white dark:bg-gray-900" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pan"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">PAN Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter PAN number" 
                                  {...field} 
                                  className="border-gray-200 dark:border-gray-700 h-10 bg-white dark:bg-gray-900" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Information - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Billing Address */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <CreditCard className="h-5 w-5" />
                        <span>Billing Address</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="billingAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter billing address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="billingCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter city" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billingPinCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pin Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter pin code" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billingPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billingFax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fax (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter fax number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shipping Address */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5" />
                        <span>Shipping Address</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="sameAsBilling"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Same as billing address</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {!sameAsBilling && (
                        <>
                          <FormField
                            control={form.control}
                            name="shippingAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Enter shipping address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={form.control}
                              name="shippingCity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter city" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="shippingPinCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pin Code</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter pin code" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="shippingPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter phone number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="shippingFax"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fax (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter fax number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/terminals")}
                    className="h-8"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={terminalMutation.isPending}
                    className="h-8"
                    data-testid="button-submit"
                  >
                    {terminalMutation.isPending ? "Saving..." : isEditing ? "Update Terminal" : "Create Terminal"}
                  </Button>
                </div>
                </form>
              </Form>
            </div>
          </main>
        </div>
      </div>
    </AppLayout>
  );
}
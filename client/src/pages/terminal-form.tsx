import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Ship, Building2, MapPin, Globe, Clock, CreditCard, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

// Terminal form validation schema
const terminalFormSchema = z.object({
  // Auto-filled fields
  portName: z.string().min(1, "Port name is required"),
  organization: z.string().min(1, "Organization is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  
  // Terminal details
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
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingPinCode: z.string().optional(),
  shippingPhone: z.string().optional(),
  shippingFax: z.string().optional(),
  
  sameAsBilling: z.boolean().default(false),
});

type TerminalFormData = z.infer<typeof terminalFormSchema>;

// Configuration options
const timezones = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Mumbai", label: "Asia/Mumbai (IST)" },
  { value: "Asia/Delhi", label: "Asia/Delhi (IST)" },
];

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

  // Initialize form with default values
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

  // Watch form values
  const terminalName = form.watch("terminalName");
  const sameAsBilling = form.watch("sameAsBilling");

  // Data queries
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  const { data: assignedPort, isLoading: isPortLoading } = useQuery({
    queryKey: ["/api/terminals/my-port"],
    enabled: !!user && user.role === "PortAdmin",
  });

  const { data: terminal } = useQuery({
    queryKey: ["/api/terminals", id],
    enabled: !!id && isEditing,
  });

  const { data: userContact } = useQuery({
    queryKey: ["/api/contacts/my-contact"],
    enabled: !!user && user.role === "PortAdmin",
  });

  // Auto-generate short code from terminal name
  useEffect(() => {
    if (terminalName && !isEditing) {
      const shortCode = terminalName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 6);
      form.setValue("shortCode", shortCode);
    }
  }, [terminalName, isEditing, form]);

  // Copy billing to shipping when toggle is enabled
  useEffect(() => {
    if (sameAsBilling) {
      const values = form.getValues();
      form.setValue("shippingAddress", values.billingAddress);
      form.setValue("shippingCity", values.billingCity);
      form.setValue("shippingPinCode", values.billingPinCode);
      form.setValue("shippingPhone", values.billingPhone);
      form.setValue("shippingFax", values.billingFax);
    }
  }, [sameAsBilling, form]);

  // Auto-fill port and contact data
  useEffect(() => {
    if (assignedPort) {
      const portData = assignedPort as any;
      form.setValue("portName", portData?.portName || "");
      form.setValue("organization", portData?.organizationName || "");
      form.setValue("state", portData?.state || "");
      form.setValue("country", portData?.country || "India");
    }
  }, [assignedPort, form]);

  useEffect(() => {
    if (userContact && !isEditing) {
      const contactData = userContact as any;
      if (contactData?.mobileNumber) {
        form.setValue("billingPhone", contactData.mobileNumber);
        form.setValue("shippingPhone", contactData.mobileNumber);
      }
    }
  }, [userContact, isEditing, form]);

  // Populate form for editing
  useEffect(() => {
    if (terminal && isEditing && assignedPort) {
      const terminalData = terminal as any;
      const portData = assignedPort as any;
      
      form.reset({
        portName: portData?.portName || "",
        organization: portData?.organizationName || "",
        state: portData?.state || "",
        country: portData?.country || "India",
        terminalName: terminalData?.terminalName || "",
        shortCode: terminalData?.shortCode || "",
        gst: terminalData?.gst || "",
        pan: terminalData?.pan || "",
        currency: terminalData?.currency || "INR",
        timezone: terminalData?.timezone || "Asia/Kolkata",
        billingAddress: terminalData?.billingAddress || "",
        billingCity: terminalData?.billingCity || "",
        billingPinCode: terminalData?.billingPinCode || "",
        billingPhone: terminalData?.billingPhone || "",
        billingFax: terminalData?.billingFax || "",
        shippingAddress: terminalData?.shippingAddress || "",
        shippingCity: terminalData?.shippingCity || "",
        shippingPinCode: terminalData?.shippingPinCode || "",
        shippingPhone: terminalData?.shippingPhone || "",
        shippingFax: terminalData?.shippingFax || "",
        sameAsBilling: terminalData?.sameAsBilling || false,
      });
    }
  }, [terminal, assignedPort, isEditing, form]);

  // Terminal mutation
  const terminalMutation = useMutation({
    mutationFn: async (data: TerminalFormData) => {
      const isActivated = terminal && (terminal as any).status === "Active";
      
      let submissionData;
      if (isEditing && isActivated) {
        // For activated terminals, preserve activation status
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
        };
      } else {
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

  // Access control
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

  // Loading state
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

  // No port assigned
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
    <AppLayout title={isEditing ? "Edit Terminal" : "Add Terminal"} activeSection="terminals">
      <div className="flex h-full bg-gray-50 dark:bg-gray-900">
        {/* Breadcrumb Bar */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 flex items-center space-x-2 w-full h-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/terminals")}
            className="h-6 px-2 text-xs"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isEditing ? "Edit Terminal" : "Add Terminal"}
          </span>
        </div>

        <div className="flex-1 flex">
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Port Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Ship className="h-5 w-5" />
                        <span>Port Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="portName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Port Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled className="bg-gray-100" />
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
                                <Input {...field} disabled className="bg-gray-100" />
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
                                <Input {...field} disabled className="bg-gray-100" />
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
                                <Input {...field} disabled className="bg-gray-100" />
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
                        <Building2 className="h-5 w-5" />
                        <span>Terminal Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="terminalName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Terminal Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter terminal name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="shortCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Short Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Auto-generated" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="gst"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GST Number (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter GST number" {...field} />
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
                              <FormLabel>PAN Number (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter PAN number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
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

                        <FormField
                          control={form.control}
                          name="timezone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Timezone</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select timezone" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {timezones.map((timezone) => (
                                    <SelectItem key={timezone.value} value={timezone.value}>
                                      {timezone.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

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

                      <div className="grid grid-cols-2 gap-4">
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
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Same as billing address</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
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

                          <div className="grid grid-cols-2 gap-4">
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

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-2 pb-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/terminals")}
                      className="h-8"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={terminalMutation.isPending}
                      className="h-8"
                    >
                      {terminalMutation.isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Terminal" : "Create Terminal")
                      }
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
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
  terminalName: z.string().min(1, "Terminal name is required"),
  shortCode: z.string().min(1, "Short code is required").max(6, "Short code must be 6 characters or less"),
  terminalType: z.string().min(1, "Terminal type is required"),
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

// Terminal types
const terminalTypes = [
  { value: "Dry Bulk", label: "Dry Bulk" },
  { value: "Break Bulk", label: "Break Bulk" },
  { value: "Container", label: "Container" },
];

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
  const { data: assignedPort } = useQuery({
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
      terminalName: "",
      shortCode: "",
      terminalType: "",
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
      const billingData = form.getValues();
      form.setValue("shippingAddress", billingData.billingAddress);
      form.setValue("shippingCity", billingData.billingCity);
      form.setValue("shippingPinCode", billingData.billingPinCode);
      form.setValue("shippingPhone", billingData.billingPhone);
      form.setValue("shippingFax", billingData.billingFax || "");
    }
  }, [sameAsBilling, form]);

  // Populate form when editing
  useEffect(() => {
    if (terminal && isEditing) {
      form.reset({
        terminalName: (terminal as any).terminalName,
        shortCode: (terminal as any).shortCode,
        terminalType: (terminal as any).terminalType,
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
  }, [terminal, form, isEditing]);

  // Create/Update terminal mutation
  const terminalMutation = useMutation({
    mutationFn: async (data: TerminalFormData) => {
      if (isEditing) {
        return apiRequest("PUT", `/api/terminals/${id}`, data);
      } else {
        return apiRequest("POST", `/api/ports/${(assignedPort as any)?.id}/terminals`, data);
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
    <AppLayout title={`${isEditing ? "Edit" : "New"} Terminal`} activeSection="terminals">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/terminals")}
              className="h-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Terminals
            </Button>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? "Edit Terminal" : "New Terminal"}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isEditing ? "Update terminal details" : "Create a new terminal"} for {(assignedPort as any).portName}
              </p>
            </div>
          </div>
        </div>

        {/* Port Info Bar */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700 px-6 py-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Ship className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {(assignedPort as any).portName}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-200">
                Org ID: {(assignedPort as any).organizationId}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-200">
                {(assignedPort as any).state}, {(assignedPort as any).country}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Terminal Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Ship className="h-5 w-5" />
                      <span>Terminal Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              <Input placeholder="Auto-generated" maxLength={6} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="terminalType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Terminal Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select terminal type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {terminalTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
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
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Submit Buttons */}
                <div className="flex items-center justify-end space-x-4">
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
                    {terminalMutation.isPending ? "Saving..." : isEditing ? "Update Terminal" : "Create Terminal"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
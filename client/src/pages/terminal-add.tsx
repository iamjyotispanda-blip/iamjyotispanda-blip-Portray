import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Ship, Building2, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthService } from "@/lib/auth";

// Form validation schema
const terminalSchema = z.object({
  portName: z.string().min(1),
  organization: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  terminalName: z.string().min(1, "Terminal name is required"),
  shortCode: z.string().min(1, "Short code is required").max(6),
  gst: z.string().optional(),
  pan: z.string().optional(),
  currency: z.string().default("INR"),
  timezone: z.string().min(1, "Timezone is required"),
  billingAddress: z.string().min(1, "Billing address is required"),
  billingCity: z.string().min(1, "Billing city is required"),
  billingPinCode: z.string().min(1, "Billing pin code is required"),
  billingPhone: z.string().min(1, "Billing phone is required"),
  billingFax: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingPinCode: z.string().optional(),
  shippingPhone: z.string().optional(),
  shippingFax: z.string().optional(),
  sameAsBilling: z.boolean().default(false),
});

type TerminalFormData = z.infer<typeof terminalSchema>;

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

export default function TerminalAddPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TerminalFormData>({
    resolver: zodResolver(terminalSchema),
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

  const terminalName = form.watch("terminalName");
  const sameAsBilling = form.watch("sameAsBilling");

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get assigned port for Port Admin
  const { data: assignedPort, isLoading: isPortLoading } = useQuery({
    queryKey: ["/api/terminals/my-port"],
    enabled: !!user && user.role === "PortAdmin",
  });

  // Get user contact
  const { data: userContact } = useQuery({
    queryKey: ["/api/contacts/my-contact"],
    enabled: !!user && user.role === "PortAdmin",
  });

  // Auto-generate short code
  useEffect(() => {
    if (terminalName) {
      const shortCode = terminalName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 6);
      form.setValue("shortCode", shortCode);
    }
  }, [terminalName, form]);

  // Copy billing to shipping
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

  // Auto-fill port data
  useEffect(() => {
    if (assignedPort) {
      const portData = assignedPort as any;
      form.setValue("portName", portData?.portName || "");
      form.setValue("organization", portData?.organizationName || "");
      form.setValue("state", portData?.state || "");
      form.setValue("country", portData?.country || "India");
    }
  }, [assignedPort, form]);

  // Auto-fill contact data
  useEffect(() => {
    if (userContact) {
      const contactData = userContact as any;
      if (contactData?.mobileNumber) {
        form.setValue("billingPhone", contactData.mobileNumber);
        form.setValue("shippingPhone", contactData.mobileNumber);
      }
    }
  }, [userContact, form]);

  // Create terminal mutation
  const createMutation = useMutation({
    mutationFn: async (data: TerminalFormData) => {
      const submissionData = {
        ...data,
        status: "Processing for activation"
      };
      return apiRequest("POST", `/api/ports/${(assignedPort as any)?.id}/terminals`, submissionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports", (assignedPort as any)?.id, "terminals"] });
      toast({
        title: "Success",
        description: "Terminal created successfully",
      });
      setLocation("/terminals");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create terminal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TerminalFormData) => {
    createMutation.mutate(data);
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
  if (isPortLoading) {
    return (
      <AppLayout title="Loading..." activeSection="terminals">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // No port assigned
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
    <AppLayout title="Add Terminal" activeSection="terminals">
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        {/* Breadcrumb Bar */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/terminals")}
            className="h-6 px-2 text-xs"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Add Terminal</span>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4">
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
                  disabled={createMutation.isPending}
                  className="h-8"
                >
                  {createMutation.isPending ? "Creating..." : "Create Terminal"}
                </Button>
              </div>
            </form>
          </Form>
        </main>
      </div>
    </AppLayout>
  );
}
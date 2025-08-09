import { useEffect, useState } from "react";
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

// Simple validation schema
const schema = z.object({
  terminalName: z.string().min(1, "Terminal name is required"),
  shortCode: z.string().min(1, "Short code is required"),
  currency: z.string(),
  timezone: z.string(),
  billingAddress: z.string().min(1, "Address required"),
  billingCity: z.string().min(1, "City required"),
  billingPinCode: z.string().min(1, "Pin code required"),
  billingPhone: z.string().min(1, "Phone required"),
  billingFax: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingPinCode: z.string().optional(),
  shippingPhone: z.string().optional(),
  shippingFax: z.string().optional(),
  sameAsBilling: z.boolean(),
  gst: z.string().optional(),
  pan: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const currencies = [
  { value: "INR", label: "Indian Rupee (INR)" },
  { value: "USD", label: "US Dollar (USD)" },
];

const timezones = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Mumbai", label: "Asia/Mumbai (IST)" },
];

export default function TerminalAddPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      terminalName: "",
      shortCode: "",
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
      gst: "",
      pan: "",
    },
  });

  const terminalName = form.watch("terminalName");
  const sameAsBilling = form.watch("sameAsBilling");

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: AuthService.getCurrentUser,
  });

  // Get assigned port
  const { data: assignedPort } = useQuery({
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
      const code = terminalName.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6);
      form.setValue("shortCode", code);
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

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      
      const submissionData = {
        ...data,
        status: "Processing for activation"
      };
      
      await apiRequest("POST", `/api/ports/${(assignedPort as any)?.id}/terminals`, submissionData);
      
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      
      toast({
        title: "Success",
        description: "Terminal created successfully",
      });
      
      setLocation("/terminals");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create terminal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Access control
  if (user?.role !== "PortAdmin") {
    return (
      <AppLayout title="Access Denied" activeSection="terminals">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">Access denied</p>
              <Button onClick={() => setLocation("/login")} className="h-8">
                Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // No port assigned
  if (!assignedPort) {
    return (
      <AppLayout title="No Port" activeSection="terminals">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Ship className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No port assigned</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Add Terminal" activeSection="terminals">
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
          <span className="text-sm text-gray-600 dark:text-gray-400">Add Terminal</span>
        </div>

        <div className="flex-1 flex">
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Port Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Ship className="h-5 w-5" />
                    <span>Port Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Port Name</label>
                      <Input 
                        value={(assignedPort as any)?.portName || ""} 
                        disabled 
                        className="bg-gray-100 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Organization</label>
                      <Input 
                        value={(assignedPort as any)?.organizationName || ""} 
                        disabled 
                        className="bg-gray-100 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">State</label>
                      <Input 
                        value={(assignedPort as any)?.state || ""} 
                        disabled 
                        className="bg-gray-100 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Country</label>
                      <Input 
                        value={(assignedPort as any)?.country || "India"} 
                        disabled 
                        className="bg-gray-100 mt-1" 
                      />
                    </div>
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
                          <FormLabel>GST (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="GST number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="PAN number" {...field} />
                          </FormControl>
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
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencies.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timezones.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <Input placeholder="City" {...field} />
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
                            <Input placeholder="Pin code" {...field} />
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
                            <Input placeholder="Phone number" {...field} />
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
                            <Input placeholder="Fax number" {...field} />
                          </FormControl>
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
                        <FormLabel>Same as billing address</FormLabel>
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
                              <Textarea placeholder="Shipping address" {...field} />
                            </FormControl>
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
                                <Input placeholder="City" {...field} />
                              </FormControl>
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
                                <Input placeholder="Pin code" {...field} />
                              </FormControl>
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
                                <Input placeholder="Phone number" {...field} />
                              </FormControl>
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
                                <Input placeholder="Fax number" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
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
                  disabled={isLoading}
                  className="h-8"
                >
                  {isLoading ? "Creating..." : "Create Terminal"}
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
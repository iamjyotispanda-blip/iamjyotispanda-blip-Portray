import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer, type Terminal } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, FileText, Users, Building2, Mail, Phone, Check, ChevronsUpDown, MoreHorizontal, Eye, Edit, MapPin, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";

// Updated schema with country and state dropdowns, removed website and operational address
const customerFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email"),
  confirmEmail: z.string().email("Invalid email"),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please enter a valid PAN number (e.g., ABCDE1234F)"),
  gst: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Please enter a valid GST number"),
  country: z.string().default("India"),
  state: z.string().min(1, "Please select a state"),
  terminalId: z.number().min(1, "Please select a terminal"),
}).refine((data) => data.email === data.confirmEmail, {
  message: "Email addresses must match",
  path: ["confirmEmail"],
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

// Country flag component with fallback
const CountryFlag = ({ country }: { country: { code: string; name: string; flag: string } }) => {
  return (
    <div className="flex items-center space-x-2 min-w-0">
      <img 
        src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
        alt={`${country.name} flag`}
        className="w-6 h-4 rounded-sm border border-gray-200 object-cover"
        title={`${country.name} (${country.code})`}
        onError={(e) => {
          // Fallback to code badge if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback && fallback.classList.contains('flag-fallback')) {
            fallback.style.display = 'flex';
          }
        }}
      />
      <div 
        className="flag-fallback w-6 h-4 rounded-sm border border-gray-200 items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-500 to-green-500 text-white shadow-sm"
        style={{ display: 'none' }}
        title={`${country.name} (${country.code})`}
      >
        {country.code}
      </div>
      <span className="truncate">{country.name}</span>
    </div>
  );
};

// Use database countries data instead of static list
const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
];

function CustomersContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: terminals = [] } = useQuery<Terminal[]>({
    queryKey: ['/api/terminals'],
  });

  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ['/api/countries'],
  });

  const { data: states = [] } = useQuery<any[]>({
    queryKey: ['/api/states'],
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const { confirmEmail, ...customerData } = data;
      // Add portId automatically - for now using port 5 (JSW Paradip Port)
      const customerDataWithPort = {
        ...customerData,
        portId: 5
      };
      return apiRequest("POST", "/api/customers", customerDataWithPort);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Customer creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customerName: "",
      displayName: "",
      email: "",
      confirmEmail: "",
      pan: "",
      gst: "",
      country: "India",
      state: "",
      terminalId: 0,
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Prospect":
        return "bg-yellow-100 text-yellow-800";
      case "Customer SC":
        return "bg-blue-100 text-blue-800";
      case "Customer TC":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTerminalName = (terminalId: number) => {
    const terminal = terminals.find((t: Terminal) => t.id === terminalId);
    if (!terminal) return "Unknown";
    return `${terminal.terminalName}${terminal.shortCode ? ` (${terminal.shortCode})` : ''}`;
  };

  if (customersLoading) {
    return <div className="flex items-center justify-center h-64">Loading customers...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-customers"
          />
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-8" data-testid="button-add-customer">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer profile for onboarding
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter customer name" 
                            data-testid="input-customer-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter display name" 
                            data-testid="input-display-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter email address" 
                            data-testid="input-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Email *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Confirm email address" 
                            data-testid="input-confirm-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <div className="w-full h-10 px-3 py-2 border border-input rounded-md bg-muted flex items-center">
                          <CountryFlag country={{ code: "IN", name: "India", flag: "🇮🇳" }} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter PAN number" 
                            data-testid="input-pan"
                            {...field} 
                          />
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
                        <FormLabel>GST Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter GST number" 
                            data-testid="input-gst"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {states.filter((state: any) => state.countryId === 1).map((state: any) => (
                              <SelectItem key={state.id} value={state.name}>
                                {state.name}
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
                    name="terminalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terminal *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-terminal">
                              <SelectValue placeholder="Select terminal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {terminals.map((terminal: any) => (
                              <SelectItem key={terminal.id} value={terminal.id.toString()}>
                                {terminal.terminalName}{terminal.shortCode ? ` (${terminal.shortCode})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>



                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCustomerMutation.isPending}
                    data-testid="button-create-customer"
                  >
                    {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customer Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer: Customer) => (
          <Card key={customer.id} className="hover:shadow-lg transition-shadow duration-200" data-testid={`card-customer-${customer.id}`}>
            <CardContent className="p-6">
              {/* Header with Customer Code and Status */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-sm text-muted-foreground" data-testid={`text-customer-code-${customer.id}`}>
                      {customer.customerCode}
                    </p>
                    <Badge className={`${getStatusColor(customer.status)} mt-1`} data-testid={`badge-status-${customer.id}`}>
                      {customer.status}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem data-testid={`menu-view-${customer.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid={`menu-edit-${customer.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Customer
                    </DropdownMenuItem>
                    {customer.status === "Activation in Progress" && (
                      <DropdownMenuItem data-testid={`menu-contract-${customer.id}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Create Contract
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Customer Information */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg leading-6" data-testid={`text-customer-name-${customer.id}`}>
                    {customer.customerName}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid={`text-display-name-${customer.id}`}>
                    {customer.displayName}
                  </p>
                </div>

                {/* Contact Information */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate" data-testid={`text-customer-email-${customer.id}`}>
                      {customer.email}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span data-testid={`text-location-${customer.id}`}>
                      {customer.state}, {customer.country}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Truck className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span data-testid={`text-terminal-${customer.id}`}>
                      {getTerminalName(customer.terminalId)}
                    </span>
                  </div>
                </div>

                {/* Business Details */}
                <div className="pt-3 border-t border-border">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">PAN</p>
                      <p className="font-mono font-medium" data-testid={`text-pan-${customer.id}`}>
                        {customer.pan}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">GST</p>
                      <p className="font-mono font-medium truncate" data-testid={`text-gst-${customer.id}`}>
                        {customer.gst}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created</span>
                    <span data-testid={`text-created-${customer.id}`}>
                      {new Date(customer.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No customers found</h3>
            <p className="text-muted-foreground text-center mb-6">
              {searchTerm ? 
                "No customers match your search criteria. Try adjusting your search." :
                "Get started by adding your first customer to the system."
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-first-customer">
                <Plus className="h-4 w-4 mr-2" />
                Add First Customer
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Customers() {
  return (
    <AppLayout title="Customers" activeSection="customers">
      <CustomersContent />
    </AppLayout>
  );
}
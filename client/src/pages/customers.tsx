import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { Plus, Search, FileText, Users, Building2, Mail, Phone, Check, ChevronsUpDown, MoreHorizontal, Eye, Edit, MapPin, Truck, Grid3X3, List } from "lucide-react";
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Load only active and subscribed terminals for customer forms
  const { data: terminals = [] } = useQuery<Terminal[]>({
    queryKey: ['/api/terminals/active-subscribed'],
  });

  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ['/api/countries'],
  });

  // Load states for India (country ID = 1)
  const { data: states = [] } = useQuery<any[]>({
    queryKey: ['/api/countries/1/states'],
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

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData & { id: number }) => {
      const { confirmEmail, id, ...customerData } = data;
      return apiRequest("PUT", `/api/customers/${id}`, customerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Customer update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
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

  const editForm = useForm<CustomerFormData>({
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

  const onEditSubmit = (data: CustomerFormData) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate({ ...data, id: editingCustomer.id });
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    editForm.reset({
      customerName: customer.customerName,
      displayName: customer.displayName,
      email: customer.email,
      confirmEmail: customer.email,
      pan: customer.pan,
      gst: customer.gst,
      country: customer.country,
      state: customer.state,
      terminalId: customer.terminalId,
    });
    setIsEditDialogOpen(true);
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
        <div className="flex items-center space-x-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-customers"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
          </div>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-md">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-3 rounded-r-none"
              data-testid="button-list-view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              className="h-8 px-3 rounded-l-none border-l"
              data-testid="button-card-view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
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
                            {states.map((state: any) => (
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

        {/* Edit Customer Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>
                Update customer profile information
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter customer name" 
                            data-testid="edit-input-customer-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter display name" 
                            data-testid="edit-input-display-name"
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
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter email address" 
                            data-testid="edit-input-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="confirmEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Email *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Confirm email address" 
                            data-testid="edit-input-confirm-email"
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
                    control={editForm.control}
                    name="pan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., ABCDE1234F" 
                            data-testid="edit-input-pan"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="gst"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 22ABCDE1234F1Z5" 
                            data-testid="edit-input-gst"
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
                    control={editForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Country *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              value="India"
                              disabled
                              className="bg-gray-50 cursor-not-allowed"
                              data-testid="edit-input-country"
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center">
                              <img 
                                src="https://flagcdn.com/w20/in.png"
                                alt="India flag"
                                className="w-4 h-3 mr-2"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="edit-select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {states.map((state: any) => (
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
                </div>

                <FormField
                  control={editForm.control}
                  name="terminalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terminal *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="edit-select-terminal">
                            <SelectValue placeholder="Select terminal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {terminals.map((terminal: Terminal) => (
                            <SelectItem key={terminal.id} value={terminal.id.toString()}>
                              {terminal.terminalName} {terminal.shortCode && `(${terminal.shortCode})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="edit-button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateCustomerMutation.isPending}
                    data-testid="edit-button-update-customer"
                  >
                    {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Professional Customer List Table */}
      <Card>
        <CardContent className="p-0">
          {/* List View - Table Layout */}
          {viewMode === "list" && (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="w-12 pl-6"></TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Customer ID</TableHead>
                  <TableHead className="font-semibold">Terminal</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Business Details</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-12 pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer: Customer) => (
                  <TableRow 
                    key={customer.id} 
                    className="hover:bg-muted/50 transition-colors border-b last:border-0" 
                    data-testid={`row-customer-${customer.id}`}
                  >
                    {/* Avatar Column */}
                    <TableCell className="pl-6">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                    </TableCell>

                    {/* Customer Info Column */}
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm" data-testid={`text-customer-name-${customer.id}`}>
                          {customer.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-display-name-${customer.id}`}>
                          {customer.displayName}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 mr-1" />
                          <span data-testid={`text-customer-email-${customer.id}`}>
                            {customer.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Customer Code Column */}
                    <TableCell>
                      <span 
                        className="font-mono text-sm bg-muted px-2 py-1 rounded" 
                        data-testid={`text-customer-code-${customer.id}`}
                      >
                        {customer.customerCode}
                      </span>
                    </TableCell>

                    {/* Terminal Column */}
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Truck className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span data-testid={`text-terminal-${customer.id}`}>
                          {getTerminalName(customer.terminalId)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Location Column */}
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span data-testid={`text-location-${customer.id}`}>
                          {customer.state}, {customer.country}
                        </span>
                      </div>
                    </TableCell>

                    {/* Business Details Column */}
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center">
                          <span className="text-muted-foreground w-8">PAN:</span>
                          <span className="font-mono" data-testid={`text-pan-${customer.id}`}>
                            {customer.pan}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-muted-foreground w-8">GST:</span>
                          <span className="font-mono truncate max-w-24" data-testid={`text-gst-${customer.id}`}>
                            {customer.gst}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status Column */}
                    <TableCell>
                      <Badge 
                        className={getStatusColor(customer.status)} 
                        data-testid={`badge-status-${customer.id}`}
                      >
                        {customer.status}
                      </Badge>
                    </TableCell>

                    {/* Date Column */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground" data-testid={`text-created-${customer.id}`}>
                        {new Date(customer.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell className="pr-6">
                      <div className="flex items-center space-x-2">
                        {customer.status === "Draft" && (
                          <Button 
                            size="sm" 
                            className="h-8"
                            onClick={() => setLocation(`/customers/${customer.id}/contracts`)}
                            data-testid={`button-contract-${customer.id}`}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Create Contract
                          </Button>
                        )}
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
                            <DropdownMenuItem 
                              onClick={() => handleEditCustomer(customer)}
                              data-testid={`menu-edit-${customer.id}`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}

          {/* Card View */}
          {viewMode === "card" && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer: Customer) => (
                  <Card key={customer.id} className="hover:shadow-md transition-shadow" data-testid={`card-customer-${customer.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm" data-testid={`card-customer-name-${customer.id}`}>
                              {customer.customerName}
                            </h3>
                            <p className="text-xs text-muted-foreground" data-testid={`card-display-name-${customer.id}`}>
                              {customer.displayName}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem data-testid={`card-menu-view-${customer.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEditCustomer(customer)}
                              data-testid={`card-menu-edit-${customer.id}`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Customer
                            </DropdownMenuItem>
                            {customer.status === "Draft" && (
                              <DropdownMenuItem data-testid={`card-menu-contract-${customer.id}`}>
                                <FileText className="mr-2 h-4 w-4" />
                                Create Contract
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 mr-2 text-muted-foreground" />
                          <span data-testid={`card-email-${customer.id}`}>{customer.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Truck className="w-3 h-3 mr-2 text-muted-foreground" />
                          <span data-testid={`card-terminal-${customer.id}`}>{getTerminalName(customer.terminalId)}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-2 text-muted-foreground" />
                          <span data-testid={`card-location-${customer.id}`}>{customer.state}, {customer.country}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="text-muted-foreground">ID: </span>
                              <span className="font-mono" data-testid={`card-customer-code-${customer.id}`}>
                                {customer.customerCode}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">PAN: </span>
                              <span className="font-mono" data-testid={`card-pan-${customer.id}`}>
                                {customer.pan}
                              </span>
                            </div>
                          </div>
                          <Badge 
                            className={getStatusColor(customer.status)} 
                            data-testid={`card-status-${customer.id}`}
                          >
                            {customer.status}
                          </Badge>
                        </div>
                        
                        {customer.status === "Draft" && (
                          <Button 
                            size="sm" 
                            className="w-full h-8"
                            onClick={() => setLocation(`/customers/${customer.id}/contracts`)}
                            data-testid={`card-button-contract-${customer.id}`}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Create Contract
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredCustomers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
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
            </div>
          )}
        </CardContent>
      </Card>
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
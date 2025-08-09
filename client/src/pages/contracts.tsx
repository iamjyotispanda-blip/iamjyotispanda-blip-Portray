import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContractSchema, insertContractTariffSchema, insertContractCargoDetailSchema, insertContractStorageChargeSchema, insertContractSpecialConditionSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, FileText, Calendar, Building, DollarSign } from "lucide-react";

type Contract = {
  id: number;
  customerId: number;
  contractNumber: string;
  contractTitle: string;
  contractType: string;
  validFrom: Date;
  validTo: Date;
  status: string;
  totalValue: number;
  createdAt: Date;
};

type Customer = {
  id: number;
  customerCode: string;
  customerName: string;
  status: string;
};

type CargoType = {
  id: number;
  typeName: string;
};

type Plot = {
  id: number;
  plotNumber: string;
  area: number;
};

const contractFormSchema = insertContractSchema;
type ContractFormData = z.infer<typeof contractFormSchema>;

const tariffFormSchema = insertContractTariffSchema.omit({ contractId: true });
type TariffFormData = z.infer<typeof tariffFormSchema>;

const cargoDetailFormSchema = insertContractCargoDetailSchema.omit({ contractId: true });
type CargoDetailFormData = z.infer<typeof cargoDetailFormSchema>;

const storageChargeFormSchema = insertContractStorageChargeSchema.omit({ contractId: true });
type StorageChargeFormData = z.infer<typeof storageChargeFormSchema>;

const specialConditionFormSchema = insertContractSpecialConditionSchema.omit({ contractId: true });
type SpecialConditionFormData = z.infer<typeof specialConditionFormSchema>;

export default function Contracts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [createdContractId, setCreatedContractId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/contracts'],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
  });

  const { data: cargoTypes = [] } = useQuery({
    queryKey: ['/api/cargo-types'],
  });

  const { data: plots = [] } = useQuery({
    queryKey: ['/api/terminals', selectedCustomerId ? customers.find((c: Customer) => c.id === selectedCustomerId)?.terminalId : 1, 'plots'],
    enabled: !!selectedCustomerId,
  });

  const createContractMutation = useMutation({
    mutationFn: (data: ContractFormData) => 
      apiRequest('/api/contracts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setCreatedContractId(contract.id);
      contractForm.reset();
      toast({
        title: "Success",
        description: "Contract created successfully. You can now add tariffs and details.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contract",
        variant: "destructive",
      });
    },
  });

  const createTariffMutation = useMutation({
    mutationFn: ({ contractId, data }: { contractId: number; data: TariffFormData }) => 
      apiRequest(`/api/contracts/${contractId}/tariffs`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      tariffForm.reset();
      toast({
        title: "Success",
        description: "Tariff added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add tariff",
        variant: "destructive",
      });
    },
  });

  const createCargoDetailMutation = useMutation({
    mutationFn: ({ contractId, data }: { contractId: number; data: CargoDetailFormData }) => 
      apiRequest(`/api/contracts/${contractId}/cargo-details`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      cargoDetailForm.reset();
      toast({
        title: "Success",
        description: "Cargo detail added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add cargo detail",
        variant: "destructive",
      });
    },
  });

  const createStorageChargeMutation = useMutation({
    mutationFn: ({ contractId, data }: { contractId: number; data: StorageChargeFormData }) => 
      apiRequest(`/api/contracts/${contractId}/storage-charges`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      storageChargeForm.reset();
      toast({
        title: "Success",
        description: "Storage charge added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add storage charge",
        variant: "destructive",
      });
    },
  });

  const createSpecialConditionMutation = useMutation({
    mutationFn: ({ contractId, data }: { contractId: number; data: SpecialConditionFormData }) => 
      apiRequest(`/api/contracts/${contractId}/special-conditions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      specialConditionForm.reset();
      toast({
        title: "Success",
        description: "Special condition added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add special condition",
        variant: "destructive",
      });
    },
  });

  const contractForm = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      customerId: 0,
      contractTitle: "",
      contractType: "Service",
      validFrom: "",
      validTo: "",
      totalValue: 0,
      paymentTerms: "",
      penaltyClause: "",
      terminationClause: "",
      governingLaw: "Indian Law",
      disputeResolution: "Arbitration",
      status: "Draft",
    },
  });

  const tariffForm = useForm<TariffFormData>({
    resolver: zodResolver(tariffFormSchema),
    defaultValues: {
      serviceDescription: "",
      unitOfMeasure: "",
      ratePerUnit: 0,
      minimumCharge: 0,
      effectiveFrom: "",
      effectiveTo: "",
    },
  });

  const cargoDetailForm = useForm<CargoDetailFormData>({
    resolver: zodResolver(cargoDetailFormSchema),
    defaultValues: {
      cargoTypeId: 0,
      handlingInstructions: "",
      storageRequirements: "",
      specialEquipment: "",
    },
  });

  const storageChargeForm = useForm<StorageChargeFormData>({
    resolver: zodResolver(storageChargeFormSchema),
    defaultValues: {
      plotId: 0,
      ratePerSqMeter: 0,
      freePeriodDays: 0,
      penaltyRate: 0,
      effectiveFrom: "",
      effectiveTo: "",
    },
  });

  const specialConditionForm = useForm<SpecialConditionFormData>({
    resolver: zodResolver(specialConditionFormSchema),
    defaultValues: {
      conditionType: "Operational",
      description: "",
      complianceRequired: true,
    },
  });

  const onSubmitContract = (data: ContractFormData) => {
    createContractMutation.mutate(data);
  };

  const onSubmitTariff = (data: TariffFormData) => {
    if (createdContractId) {
      createTariffMutation.mutate({ contractId: createdContractId, data });
    }
  };

  const onSubmitCargoDetail = (data: CargoDetailFormData) => {
    if (createdContractId) {
      createCargoDetailMutation.mutate({ contractId: createdContractId, data });
    }
  };

  const onSubmitStorageCharge = (data: StorageChargeFormData) => {
    if (createdContractId) {
      createStorageChargeMutation.mutate({ contractId: createdContractId, data });
    }
  };

  const onSubmitSpecialCondition = (data: SpecialConditionFormData) => {
    if (createdContractId) {
      createSpecialConditionMutation.mutate({ contractId: createdContractId, data });
    }
  };

  const filteredContracts = contracts.filter((contract: Contract) =>
    contract.contractTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-800";
      case "Active":
        return "bg-green-100 text-green-800";
      case "Expired":
        return "bg-red-100 text-red-800";
      case "Terminated":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer ? `${customer.customerName} (${customer.customerCode})` : "Unknown";
  };

  const eligibleCustomers = customers.filter((c: Customer) => c.status === "Prospect");

  if (contractsLoading) {
    return <div className="flex items-center justify-center h-64">Loading contracts...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Contract Management</h1>
          <p className="text-muted-foreground">Create and manage customer contracts</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-contract">
              <Plus className="h-4 w-4 mr-2" />
              Create Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Contract</DialogTitle>
              <DialogDescription>
                Create a contract for a prospect customer
              </DialogDescription>
            </DialogHeader>
            
            {!createdContractId ? (
              <Form {...contractForm}>
                <form onSubmit={contractForm.handleSubmit(onSubmitContract)} className="space-y-4">
                  <FormField
                    control={contractForm.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer *</FormLabel>
                        <Select onValueChange={(value) => {
                          const customerId = parseInt(value);
                          field.onChange(customerId);
                          setSelectedCustomerId(customerId);
                        }}>
                          <FormControl>
                            <SelectTrigger data-testid="select-customer">
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {eligibleCustomers.map((customer: Customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.customerName} ({customer.customerCode}) - {customer.status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={contractForm.control}
                      name="contractTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Title *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter contract title" 
                              data-testid="input-contract-title"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contractForm.control}
                      name="contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-contract-type">
                                <SelectValue placeholder="Select contract type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Service">Service Agreement</SelectItem>
                              <SelectItem value="Storage">Storage Agreement</SelectItem>
                              <SelectItem value="Combined">Combined Services</SelectItem>
                              <SelectItem value="Handling">Cargo Handling</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={contractForm.control}
                      name="validFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid From *</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              data-testid="input-valid-from"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contractForm.control}
                      name="validTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid To *</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              data-testid="input-valid-to"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={contractForm.control}
                    name="totalValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Contract Value *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Enter total value" 
                            data-testid="input-total-value"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={contractForm.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter payment terms and conditions" 
                            data-testid="textarea-payment-terms"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={contractForm.control}
                      name="penaltyClause"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Penalty Clause</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter penalty conditions" 
                              data-testid="textarea-penalty-clause"
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contractForm.control}
                      name="terminationClause"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Termination Clause</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter termination conditions" 
                              data-testid="textarea-termination-clause"
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
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
                      disabled={createContractMutation.isPending}
                      data-testid="button-create-contract"
                    >
                      {createContractMutation.isPending ? "Creating..." : "Create Contract"}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Tabs defaultValue="tariffs" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tariffs">Tariffs</TabsTrigger>
                  <TabsTrigger value="cargo">Cargo Details</TabsTrigger>
                  <TabsTrigger value="storage">Storage Charges</TabsTrigger>
                  <TabsTrigger value="conditions">Special Conditions</TabsTrigger>
                </TabsList>

                <TabsContent value="tariffs" className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Add tariff structure for the contract services
                  </div>
                  <Form {...tariffForm}>
                    <form onSubmit={tariffForm.handleSubmit(onSubmitTariff)} className="space-y-4">
                      <FormField
                        control={tariffForm.control}
                        name="serviceDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Description *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Describe the service" 
                                data-testid="input-service-description"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={tariffForm.control}
                          name="unitOfMeasure"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit of Measure *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., per MT, per TEU" 
                                  data-testid="input-unit-measure"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tariffForm.control}
                          name="ratePerUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rate per Unit *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="Enter rate" 
                                  data-testid="input-rate-per-unit"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={tariffForm.control}
                          name="minimumCharge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Charge</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  data-testid="input-minimum-charge"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tariffForm.control}
                          name="effectiveFrom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Effective From</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  data-testid="input-tariff-from"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tariffForm.control}
                          name="effectiveTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Effective To</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  data-testid="input-tariff-to"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={createTariffMutation.isPending}
                        data-testid="button-add-tariff"
                      >
                        {createTariffMutation.isPending ? "Adding..." : "Add Tariff"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="cargo" className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Specify cargo handling requirements and details
                  </div>
                  <Form {...cargoDetailForm}>
                    <form onSubmit={cargoDetailForm.handleSubmit(onSubmitCargoDetail)} className="space-y-4">
                      <FormField
                        control={cargoDetailForm.control}
                        name="cargoTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cargo Type *</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger data-testid="select-cargo-type">
                                  <SelectValue placeholder="Select cargo type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cargoTypes.map((type: CargoType) => (
                                  <SelectItem key={type.id} value={type.id.toString()}>
                                    {type.typeName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={cargoDetailForm.control}
                        name="handlingInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Handling Instructions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Special handling requirements" 
                                data-testid="textarea-handling-instructions"
                                rows={3}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={cargoDetailForm.control}
                        name="storageRequirements"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Storage Requirements</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Storage conditions and requirements" 
                                data-testid="textarea-storage-requirements"
                                rows={3}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={cargoDetailForm.control}
                        name="specialEquipment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Equipment</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Required special equipment" 
                                data-testid="textarea-special-equipment"
                                rows={3}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={createCargoDetailMutation.isPending}
                        data-testid="button-add-cargo-detail"
                      >
                        {createCargoDetailMutation.isPending ? "Adding..." : "Add Cargo Detail"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="storage" className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Define storage charges and plot allocations
                  </div>
                  <Form {...storageChargeForm}>
                    <form onSubmit={storageChargeForm.handleSubmit(onSubmitStorageCharge)} className="space-y-4">
                      <FormField
                        control={storageChargeForm.control}
                        name="plotId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plot Assignment *</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger data-testid="select-plot">
                                  <SelectValue placeholder="Select plot" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {plots.map((plot: Plot) => (
                                  <SelectItem key={plot.id} value={plot.id.toString()}>
                                    Plot {plot.plotNumber} ({plot.area} sq.m)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={storageChargeForm.control}
                          name="ratePerSqMeter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rate per Sq.M *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  data-testid="input-rate-per-sqm"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={storageChargeForm.control}
                          name="freePeriodDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Free Period (Days)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  data-testid="input-free-period"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={storageChargeForm.control}
                          name="penaltyRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Penalty Rate</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  data-testid="input-penalty-rate"
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
                          control={storageChargeForm.control}
                          name="effectiveFrom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Effective From</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  data-testid="input-storage-from"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={storageChargeForm.control}
                          name="effectiveTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Effective To</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  data-testid="input-storage-to"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={createStorageChargeMutation.isPending}
                        data-testid="button-add-storage-charge"
                      >
                        {createStorageChargeMutation.isPending ? "Adding..." : "Add Storage Charge"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="conditions" className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Add special terms and conditions
                  </div>
                  <Form {...specialConditionForm}>
                    <form onSubmit={specialConditionForm.handleSubmit(onSubmitSpecialCondition)} className="space-y-4">
                      <FormField
                        control={specialConditionForm.control}
                        name="conditionType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-condition-type">
                                  <SelectValue placeholder="Select condition type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Operational">Operational</SelectItem>
                                <SelectItem value="Safety">Safety</SelectItem>
                                <SelectItem value="Environmental">Environmental</SelectItem>
                                <SelectItem value="Commercial">Commercial</SelectItem>
                                <SelectItem value="Legal">Legal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={specialConditionForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Detailed condition description" 
                                data-testid="textarea-condition-description"
                                rows={4}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={createSpecialConditionMutation.isPending}
                        data-testid="button-add-condition"
                      >
                        {createSpecialConditionMutation.isPending ? "Adding..." : "Add Condition"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            )}

            {createdContractId && (
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setCreatedContractId(null);
                    setSelectedCustomerId(null);
                  }}
                  data-testid="button-finish"
                >
                  Finish Contract
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-contracts">
              {contracts.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-contracts">
              {contracts.filter((c: Contract) => c.status === "Active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Contracts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-draft-contracts">
              {contracts.filter((c: Contract) => c.status === "Draft").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-value">
              ₹{contracts.reduce((sum: number, c: Contract) => sum + (c.totalValue || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contracts</CardTitle>
              <CardDescription>Manage customer contracts and agreements</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-contracts"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract: Contract) => (
                  <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`}>
                    <TableCell className="font-mono text-sm" data-testid={`text-contract-number-${contract.id}`}>
                      {contract.contractNumber}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-contract-title-${contract.id}`}>
                      {contract.contractTitle}
                    </TableCell>
                    <TableCell data-testid={`text-contract-customer-${contract.id}`}>
                      {getCustomerName(contract.customerId)}
                    </TableCell>
                    <TableCell data-testid={`text-contract-type-${contract.id}`}>
                      {contract.contractType}
                    </TableCell>
                    <TableCell data-testid={`text-contract-value-${contract.id}`}>
                      ₹{contract.totalValue?.toLocaleString()}
                    </TableCell>
                    <TableCell data-testid={`text-contract-validity-${contract.id}`}>
                      {new Date(contract.validFrom).toLocaleDateString()} - {new Date(contract.validTo).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(contract.status)} data-testid={`badge-contract-status-${contract.id}`}>
                        {contract.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-view-contract-${contract.id}`}
                        >
                          View
                        </Button>
                        {contract.status === "Draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-activate-contract-${contract.id}`}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredContracts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-contracts">
              No contracts found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
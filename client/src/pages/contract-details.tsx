import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, User, Package, DollarSign, Warehouse, Plus, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ContractForm } from "@/components/contract-form";
import type { Customer, Contract, CustomerContact, ContractTariff, ContractCargoDetail, ContractStorageCharge } from "@shared/schema";

const CONTRACT_TABS = [
  { id: "contract", label: "CONTRACT", icon: Package },
  { id: "contacts", label: "CONTACTS", icon: User },
  { id: "cargo", label: "CARGO", icon: Package },
  { id: "tariffs", label: "TARIFFS", icon: DollarSign },
  { id: "storage", label: "STORAGE", icon: Warehouse }
];

export default function ContractDetails() {
  const [, params] = useRoute("/customers/:customerId/contracts/:contractId?");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("contract");
  const [isContractFormOpen, setIsContractFormOpen] = useState(false);
  const [renewContractId, setRenewContractId] = useState<number | undefined>();
  
  const customerId = params?.customerId ? parseInt(params.customerId) : null;
  const contractId = params?.contractId ? parseInt(params.contractId) : null;

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    enabled: !!customerId,
  });

  // Fetch all contracts for the customer
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ['/api/customers', customerId, 'contracts'],
    enabled: !!customerId,
  });

  // Get the specific contract if contractId is provided, otherwise use the latest one
  const contract = contractId 
    ? contracts.find(c => c.id === contractId)
    : contracts.length > 0 
      ? contracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      : null;

  // Fetch contract-specific data when a contract is selected
  const { data: contacts = [] } = useQuery<CustomerContact[]>({
    queryKey: ['/api/customers', customerId, 'contacts'],
    enabled: !!customerId,
  });

  const { data: tariffs = [] } = useQuery<ContractTariff[]>({
    queryKey: ['/api/contracts', contract?.id, 'tariffs'],
    enabled: !!contract?.id,
  });

  const { data: cargoDetails = [] } = useQuery<ContractCargoDetail[]>({
    queryKey: ['/api/contracts', contract?.id, 'cargo'],
    enabled: !!contract?.id,
  });

  const { data: storageCharges = [] } = useQuery<ContractStorageCharge[]>({
    queryKey: ['/api/contracts', contract?.id, 'storage'],
    enabled: !!contract?.id,
  });

  if (customerLoading || contractsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Customer not found</h3>
          <p className="text-muted-foreground mb-4">The requested customer could not be found.</p>
          <Button onClick={() => setLocation("/customers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/customers")}
                data-testid="button-back-to-customers"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Customers
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(customer.customerName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-semibold" data-testid="customer-name">
                    {customer.customerName}
                  </h1>
                  <p className="text-sm text-muted-foreground" data-testid="customer-display-name">
                    {customer.displayName}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" data-testid="customer-status">
                {customer.status}
              </Badge>
              <Badge variant="secondary" data-testid="customer-code">
                {customer.customerCode}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-3">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span data-testid="customer-email">{customer.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span data-testid="customer-location">{customer.state}, {customer.country}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span data-testid="customer-pan">PAN: {customer.pan}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span data-testid="customer-gst">GST: {customer.gst}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span data-testid="customer-created">
                Created {new Date(customer.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {CONTRACT_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Contract Tab */}
          <TabsContent value="contract" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Contract Management
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setRenewContractId(undefined);
                      setIsContractFormOpen(true);
                    }}
                    data-testid="button-add-new-contract"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Contract
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contracts.length > 0 ? (
                  <div className="space-y-6">
                    {/* Contract List */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">All Contracts ({contracts.length})</h3>
                      <div className="grid gap-4">
                        {contracts.map((contractItem) => {
                          const isExpired = new Date(contractItem.validTo) < new Date();
                          const isActive = new Date(contractItem.validFrom) <= new Date() && new Date(contractItem.validTo) >= new Date();
                          const isUpcoming = new Date(contractItem.validFrom) > new Date();
                          
                          return (
                            <div 
                              key={contractItem.id} 
                              className={`border rounded-lg p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                contractItem.id === contract?.id ? 'border-primary bg-primary/5' : ''
                              }`}
                              data-testid={`contract-card-${contractItem.id}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="font-semibold" data-testid={`contract-number-${contractItem.id}`}>
                                      {contractItem.contractNumber}
                                    </h4>
                                    <Badge 
                                      variant={isActive ? "default" : isExpired ? "destructive" : "secondary"}
                                      data-testid={`contract-status-${contractItem.id}`}
                                    >
                                      {isActive ? "Active" : isExpired ? "Expired" : "Upcoming"}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Valid From: </span>
                                      <span data-testid={`contract-from-${contractItem.id}`}>
                                        {new Date(contractItem.validFrom).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Valid To: </span>
                                      <span data-testid={`contract-to-${contractItem.id}`}>
                                        {new Date(contractItem.validTo).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  {contractItem.contractCopyUrl && (
                                    <div className="flex items-center space-x-2">
                                      {contractItem.documentType === "upload" ? (
                                        <>
                                          <Download className="h-3 w-3 text-primary" />
                                          <a 
                                            href={contractItem.contractCopyUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-sm"
                                            data-testid={`contract-document-${contractItem.id}`}
                                          >
                                            {contractItem.documentName || "Download Contract Document"}
                                          </a>
                                          {contractItem.documentSize && (
                                            <span className="text-xs text-muted-foreground">
                                              ({(contractItem.documentSize / 1024 / 1024).toFixed(2)} MB)
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <ExternalLink className="h-3 w-3 text-primary" />
                                          <a 
                                            href={contractItem.contractCopyUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-sm"
                                            data-testid={`contract-document-${contractItem.id}`}
                                          >
                                            View Contract Document
                                          </a>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setLocation(`/customers/${customerId}/contracts/${contractItem.id}`)}
                                    data-testid={`button-view-contract-${contractItem.id}`}
                                  >
                                    {contractItem.id === contract?.id ? "Current" : "View"}
                                  </Button>
                                  {isExpired && (
                                    <Button 
                                      size="sm"
                                      onClick={() => {
                                        setRenewContractId(contractItem.id);
                                        setIsContractFormOpen(true);
                                      }}
                                      data-testid={`button-renew-contract-${contractItem.id}`}
                                    >
                                      Renew
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Current Contract Details */}
                    {contract && (
                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">
                            Contract Details - {contract.contractNumber}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            All associated data (contacts, cargo, tariffs, storage) linked to this contract
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Contract ID</label>
                            <p className="font-mono" data-testid="current-contract-id">{contract.id}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Contract Number</label>
                            <p data-testid="current-contract-number" className="font-semibold text-primary">
                              {contract.contractNumber}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Valid From</label>
                            <p data-testid="current-contract-valid-from">
                              {new Date(contract.validFrom).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Valid To</label>
                            <p data-testid="current-contract-valid-to">
                              {new Date(contract.validTo).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Contract Reference: {contract.contractNumber}
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                            This contract number serves as the reference for all associated contacts, cargo details, tariff rates, and storage charges shown in the tabs above.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Contracts Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      This customer doesn't have any contracts yet. Create the first one to get started.
                    </p>
                    <Button 
                      onClick={() => {
                        setRenewContractId(undefined);
                        setIsContractFormOpen(true);
                      }}
                      data-testid="button-create-first-contract"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Contract
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Customer Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contacts.length > 0 ? (
                  <div className="space-y-4">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(contact.contactName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold" data-testid={`contact-name-${contact.id}`}>
                                {contact.contactName}
                              </h4>
                              <p className="text-sm text-muted-foreground" data-testid={`contact-designation-${contact.id}`}>
                                {contact.designation}
                              </p>
                            </div>
                          </div>
                          {contact.isPrimaryContact && (
                            <Badge variant="default">Primary</Badge>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`contact-email-${contact.id}`}>{contact.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`contact-phone-${contact.id}`}>{contact.contactNumber}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Contacts</h3>
                    <p className="text-muted-foreground mb-4">
                      No contacts have been added for this customer yet.
                    </p>
                    <Button data-testid="button-add-contact">
                      Add Contact
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cargo Tab */}
          <TabsContent value="cargo" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Cargo Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contract && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Cargo Details for Contract: {contract.contractNumber}
                      </span>
                    </div>
                  </div>
                )}
                {cargoDetails.length > 0 ? (
                  <div className="space-y-4">
                    {cargoDetails.map((cargo) => (
                      <div key={cargo.id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Cargo Type</label>
                            <p data-testid={`cargo-type-${cargo.id}`}>{cargo.cargoType}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Expected Per Year</label>
                            <p data-testid={`cargo-quantity-${cargo.id}`}>{cargo.expectedCargoPerYear}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Assigned Plots</label>
                            <p data-testid={`cargo-plots-${cargo.id}`}>
                              {cargo.assignedPlots?.join(', ') || 'None assigned'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Cargo Details</h3>
                    <p className="text-muted-foreground mb-4">
                      {contract 
                        ? `No cargo details have been added for contract ${contract.contractNumber} yet.`
                        : "No cargo details have been added for this contract yet."
                      }
                    </p>
                    <Button data-testid="button-add-cargo">
                      Add Cargo Details
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tariffs Tab */}
          <TabsContent value="tariffs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Tariff Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contract && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Tariff Rates for Contract: {contract.contractNumber}
                      </span>
                    </div>
                  </div>
                )}
                {tariffs.length > 0 ? (
                  <div className="space-y-4">
                    {tariffs.map((tariff) => (
                      <div key={tariff.id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">CHC Rate to Customer</label>
                            <p data-testid={`tariff-chc-customer-${tariff.id}`}>{tariff.chcRateToCustomer || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">CHC Rate to Port</label>
                            <p data-testid={`tariff-chc-port-${tariff.id}`}>{tariff.chcRateToPort || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">BHC Rate to Customer</label>
                            <p data-testid={`tariff-bhc-customer-${tariff.id}`}>{tariff.bhcRateToCustomer || 'Not set'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">BHC Rate to Port</label>
                            <p data-testid={`tariff-bhc-port-${tariff.id}`}>{tariff.bhcRateToPort || 'Not set'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Tariffs</h3>
                    <p className="text-muted-foreground mb-4">
                      {contract 
                        ? `No tariff rates have been set for contract ${contract.contractNumber} yet.`
                        : "No tariff details have been added for this contract yet."
                      }
                    </p>
                    <Button data-testid="button-add-tariff">
                      Add Tariff
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage Tab */}
          <TabsContent value="storage" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Warehouse className="mr-2 h-5 w-5" />
                  Storage Charges
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contract && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Storage Charges for Contract: {contract.contractNumber}
                      </span>
                    </div>
                  </div>
                )}
                {storageCharges.length > 0 ? (
                  <div className="space-y-4">
                    {storageCharges.map((storage) => (
                      <div key={storage.id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Free Time</label>
                            <p data-testid={`storage-free-time-${storage.id}`}>{storage.storageFreeTime} days</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Charge Per Day</label>
                            <p data-testid={`storage-charge-${storage.id}`}>{storage.chargePerDay}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Applicable Days</label>
                            <p data-testid={`storage-applicable-${storage.id}`}>{storage.chargeApplicableDays}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Warehouse className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Storage Charges</h3>
                    <p className="text-muted-foreground mb-4">
                      {contract 
                        ? `No storage charges have been configured for contract ${contract.contractNumber} yet.`
                        : "No storage charges have been added for this contract yet."
                      }
                    </p>
                    <Button data-testid="button-add-storage">
                      Add Storage Charge
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Contract Form Dialog */}
      {customerId && (
        <ContractForm
          customerId={customerId}
          isOpen={isContractFormOpen}
          onClose={() => {
            setIsContractFormOpen(false);
            setRenewContractId(undefined);
          }}
          renewFromContractId={renewContractId}
        />
      )}
    </div>
  );
}
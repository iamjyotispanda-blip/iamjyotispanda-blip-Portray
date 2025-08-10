import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, User, Package, DollarSign, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  
  const customerId = params?.customerId ? parseInt(params.customerId) : null;
  const contractId = params?.contractId ? parseInt(params.contractId) : null;

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    enabled: !!customerId,
  });

  // Fetch contract data if contractId exists
  const { data: contract, isLoading: contractLoading } = useQuery<Contract>({
    queryKey: ['/api/contracts', contractId],
    enabled: !!contractId,
  });

  // Temporary placeholder data - will be replaced with actual API calls
  const contacts: CustomerContact[] = [];
  const tariffs: ContractTariff[] = [];
  const cargoDetails: ContractCargoDetail[] = [];
  const storageCharges: ContractStorageCharge[] = [];

  if (customerLoading) {
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
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Contract Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contract ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contract ID</label>
                        <p className="font-mono" data-testid="contract-id">{contract.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contract Number</label>
                        <p data-testid="contract-number">{contract.contractNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Valid From</label>
                        <p data-testid="contract-valid-from">
                          {new Date(contract.validFrom).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Valid To</label>
                        <p data-testid="contract-valid-to">
                          {new Date(contract.validTo).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {contract.contractCopyUrl && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contract Document</label>
                        <p className="mt-1">
                          <a 
                            href={contract.contractCopyUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            data-testid="contract-document-link"
                          >
                            View Contract Document
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Contract Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      This customer doesn't have a contract yet. Create one to get started.
                    </p>
                    <Button data-testid="button-create-contract">
                      Create Contract
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
                      No cargo details have been added for this contract yet.
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
                      No tariff details have been added for this contract yet.
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
                      No storage charges have been added for this contract yet.
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
    </div>
  );
}
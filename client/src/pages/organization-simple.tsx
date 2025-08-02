import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Edit2, Power, Building2, MapPin, Phone, Globe } from "lucide-react";
import { type Organization } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OrganizationFormData {
  organizationName: string;
  displayName: string;
  organizationCode: string;
  registerOffice: string;
  country: string;
  telephone: string;
  fax: string;
  website: string;
  isActive: boolean;
}

export default function OrganizationPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState<OrganizationFormData>({
    organizationName: "",
    displayName: "",
    organizationCode: "",
    registerOffice: "",
    country: "",
    telephone: "",
    fax: "",
    website: "",
    isActive: true,
  });
  
  const isEditMode = selectedOrganization !== null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch organizations
  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  // Add organization mutation
  const addOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const response = await apiRequest("POST", "/api/organizations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setIsFormOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Organization added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add organization",
        variant: "destructive",
      });
    },
  });

  // Update organization mutation
  const updateOrganizationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: OrganizationFormData }) => {
      const response = await apiRequest("PUT", `/api/organizations/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setIsFormOpen(false);
      setSelectedOrganization(null);
      resetForm();
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
        variant: "destructive",
      });
    },
  });

  // Toggle organization status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PATCH", `/api/organizations/${id}/toggle-status`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Success",
        description: "Organization status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization status",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      organizationName: "",
      displayName: "",
      organizationCode: "",
      registerOffice: "",
      country: "",
      telephone: "",
      fax: "",
      website: "",
      isActive: true,
    });
    setSelectedOrganization(null);
  };

  const handleInputChange = (field: keyof OrganizationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organizationName || !formData.displayName || !formData.organizationCode || !formData.registerOffice || !formData.country) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditMode && selectedOrganization) {
      updateOrganizationMutation.mutate({
        id: selectedOrganization.id,
        data: formData,
      });
    } else {
      addOrganizationMutation.mutate(formData);
    }
  };

  const handleEdit = (organization: Organization) => {
    setSelectedOrganization(organization);
    setFormData({
      organizationName: organization.organizationName,
      displayName: organization.displayName,
      organizationCode: organization.organizationCode,
      registerOffice: organization.registerOffice,
      country: organization.country,
      telephone: organization.telephone || "",
      fax: organization.fax || "",
      website: organization.website || "",
      isActive: organization.isActive,
    });
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleToggleStatus = (id: number) => {
    toggleStatusMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Organization Management
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Organization Management
          </h1>
        </div>
        
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </Button>
      </div>

      {/* Unified Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) resetForm();
      }}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Organization" : "Add New Organization"}</SheetTitle>
            <SheetDescription>
              {isEditMode ? "Update organization details and information." : "Create a new port operator organization with complete details."}
            </SheetDescription>
          </SheetHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    placeholder="JSW Infrastructure Limited"
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    placeholder="JSW Infrastructure"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="organizationCode">Organization Code *</Label>
                  <Input
                    id="organizationCode"
                    placeholder="JSW-INFRA-001"
                    value={formData.organizationCode}
                    onChange={(e) => handleInputChange('organizationCode', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    placeholder="India"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="registerOffice">Registered Office *</Label>
                <Input
                  id="registerOffice"
                  placeholder="Complete registered office address"
                  value={formData.registerOffice}
                  onChange={(e) => handleInputChange('registerOffice', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="telephone">Telephone</Label>
                  <Input
                    id="telephone"
                    placeholder="+91-22-1234-5678"
                    value={formData.telephone}
                    onChange={(e) => handleInputChange('telephone', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="fax">FAX</Label>
                  <Input
                    id="fax"
                    placeholder="+91-22-1234-5679"
                    value={formData.fax}
                    onChange={(e) => handleInputChange('fax', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://www.company.com"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                </div>
              </div>

            <div className="flex justify-end space-x-2 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addOrganizationMutation.isPending || updateOrganizationMutation.isPending}
              >
                {isEditMode 
                  ? (updateOrganizationMutation.isPending ? "Updating..." : "Update Organization")
                  : (addOrganizationMutation.isPending ? "Adding..." : "Add Organization")
                }
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Organizations List */}
      <Card>
        <CardContent className="pt-6">
          {organizations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No organizations found. Add your first organization to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{org.displayName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {org.organizationName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                          {org.organizationCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 mr-1" />
                          {org.country}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {org.telephone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {org.telephone}
                            </div>
                          )}
                          {org.website && (
                            <div className="flex items-center">
                              <Globe className="w-3 h-3 mr-1" />
                              <a 
                                href={org.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Website
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={org.isActive ? "default" : "secondary"}
                          className={org.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                        >
                          {org.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(org)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={org.isActive ? "secondary" : "default"}
                            onClick={() => handleToggleStatus(org.id)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import type { Port, Organization } from "@shared/schema";

interface PortFormPageProps {
  params?: {
    id?: string;
  };
}

export default function PortFormPage({ params }: PortFormPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(params?.id);
  const portId = params?.id ? parseInt(params.id) : null;

  const [formData, setFormData] = useState({
    portName: "",
    displayName: "",
    organizationId: 0,
    address: "",
    country: "India",
    state: "",
    pan: "",
    gstn: "",
    isActive: true,
  });

  // Get organizations for dropdown
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations"],
  });

  // Get port data for editing
  const { data: port, isLoading: portLoading } = useQuery({
    queryKey: ["/api/ports", portId],
    enabled: isEdit && !!portId,
  });

  // Populate form when editing
  useEffect(() => {
    if (isEdit && port) {
      setFormData({
        portName: (port as any).portName || "",
        displayName: (port as any).displayName || "",
        organizationId: (port as any).organizationId || 0,
        address: (port as any).address || "",
        country: (port as any).country || "India",
        state: (port as any).state || "",
        pan: (port as any).pan || "",
        gstn: (port as any).gstn || "",
        isActive: (port as any).isActive ?? true,
      });
    }
  }, [isEdit, port]);

  // Create port mutation
  const createPortMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("/api/ports", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      toast({
        title: "Success",
        description: "Port created successfully",
      });
      setLocation("/ports");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create port",
        variant: "destructive",
      });
    },
  });

  // Update port mutation
  const updatePortMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest(`/api/ports/${portId}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ports", portId] });
      toast({
        title: "Success",
        description: "Port updated successfully",
      });
      setLocation("/ports");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update port",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEdit) {
      updatePortMutation.mutate(formData);
    } else {
      createPortMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    setLocation("/ports");
  };

  if (isEdit && portLoading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Loading...</span>
        </div>
        <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading port...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb Bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">
          {isEdit ? "Edit Port" : "New Port"}
        </span>
      </div>
      
      {/* Main Content Area - Updated padding */}
      <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
        <div className="space-y-2">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Port Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="portName">Port Name *</Label>
                    <Input
                      id="portName"
                      placeholder="JSW Paradeep Port"
                      value={formData.portName}
                      onChange={(e) => handleInputChange('portName', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name (2-6 digits) *</Label>
                    <Input
                      id="displayName"
                      placeholder="JSPP01"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      pattern="[A-Za-z0-9]{2,6}"
                      maxLength={6}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="organizationId">Organization *</Label>
                    <Select
                      value={formData.organizationId.toString()}
                      onValueChange={(value) => handleInputChange('organizationId', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {(organizations as Organization[]).map((org: Organization) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.organizationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => handleInputChange('country', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="Odisha"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pan">PAN</Label>
                    <Input
                      id="pan"
                      placeholder="ABCDE1234F"
                      value={formData.pan}
                      onChange={(e) => handleInputChange('pan', e.target.value)}
                      pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <Label htmlFor="gstn">GSTN</Label>
                    <Input
                      id="gstn"
                      placeholder="22AAAAA0000A1Z5"
                      value={formData.gstn}
                      onChange={(e) => handleInputChange('gstn', e.target.value)}
                      pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter complete address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleBack}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPortMutation.isPending || updatePortMutation.isPending}
                    className="h-8"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isEdit 
                      ? (updatePortMutation.isPending ? "Updating..." : "Update Port")
                      : (createPortMutation.isPending ? "Creating..." : "Create Port")
                    }
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
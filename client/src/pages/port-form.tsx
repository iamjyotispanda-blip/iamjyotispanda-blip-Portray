import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthService } from "@/lib/auth";
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

  // Validate session on component mount
  useEffect(() => {
    const validateSession = async () => {
      const sessionValid = await AuthService.validateSession();
      if (!sessionValid) {
        setLocation("/login");
      }
    };
    validateSession();
  }, [setLocation]);

  // Fetch organizations for dropdown
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    retry: false,
  });

  // Fetch port data if editing
  const { data: port, isLoading: portLoading } = useQuery<Port>({
    queryKey: ["/api/ports", portId],
    enabled: isEdit && portId !== null,
    retry: false,
  });

  // Update form data when port data is loaded
  useEffect(() => {
    if (port && isEdit) {
      setFormData({
        portName: port.portName,
        displayName: port.displayName,
        organizationId: port.organizationId,
        address: port.address,
        country: port.country,
        state: port.state,
        pan: port.pan,
        gstn: port.gstn,
        isActive: port.isActive,
      });
    }
  }, [port, isEdit]);

  // Create port mutation
  const createPortMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/ports", data);
      return response.json();
    },
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
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("PUT", `/api/ports/${portId}`, data);
      return response.json();
    },
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading port...</p>
        </div>
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

      {/* Main Content Area */}
      <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
        <div className="space-y-2">
          {/* Back Button */}
          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-8"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Ports
            </Button>
          </div>

          {/* Form Card */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      placeholder="PP001"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
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
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.organizationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      placeholder="Odisha"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pan">PAN *</Label>
                    <Input
                      id="pan"
                      placeholder="ABCDE1234F"
                      value={formData.pan}
                      onChange={(e) => handleInputChange('pan', e.target.value)}
                      maxLength={10}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="gstn">GSTN *</Label>
                    <Input
                      id="gstn"
                      placeholder="12ABCDE1234F1Z5"
                      value={formData.gstn}
                      onChange={(e) => handleInputChange('gstn', e.target.value)}
                      maxLength={15}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    placeholder="Port address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    required
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
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
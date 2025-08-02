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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Plus, Edit2, Power, Building2, MapPin, Phone, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
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

// Comprehensive country list with flags
const COUNTRIES = [
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", flag: "🇧🇧" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CV", name: "Cape Verde", flag: "🇨🇻" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "CD", name: "Congo (Democratic Republic)", flag: "🇨🇩" },
  { code: "CG", name: "Congo (Republic)", flag: "🇨🇬" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "FJ", name: "Fiji", flag: "🇫🇯" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GD", name: "Grenada", flag: "🇬🇩" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "CI", name: "Ivory Coast", flag: "🇨🇮" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", flag: "🇰🇮" },
  { code: "KP", name: "Korea (North)", flag: "🇰🇵" },
  { code: "KR", name: "Korea (South)", flag: "🇰🇷" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", flag: "🇲🇭" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "FM", name: "Micronesia", flag: "🇫🇲" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", flag: "🇳🇷" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PW", name: "Palau", flag: "🇵🇼" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "KN", name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", flag: "🇱🇨" },
  { code: "VC", name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", flag: "🇸🇲" },
  { code: "ST", name: "Sao Tome and Principe", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", flag: "🇸🇧" },
  { code: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", flag: "🇹🇱" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "TO", name: "Tonga", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "VA", name: "Vatican City", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
];

export default function OrganizationPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [formData, setFormData] = useState<OrganizationFormData>({
    organizationName: "",
    displayName: "",
    organizationCode: "",
    registerOffice: "",
    country: "India",
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
      country: "India",
      telephone: "",
      fax: "",
      website: "",
      isActive: true,
    });
    setSelectedOrganization(null);
    setCountryOpen(false);
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
        if (!open) {
          resetForm();
          setCountryOpen(false);
        }
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
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full justify-between h-10 px-3"
                      >
                        {formData.country ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {COUNTRIES.find((country) => country.name === formData.country)?.flag}
                            </span>
                            <span>{formData.country}</span>
                          </div>
                        ) : (
                          "Select a country..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search countries..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-y-auto">
                            {COUNTRIES.map((country) => (
                              <CommandItem
                                key={country.code}
                                value={country.name}
                                onSelect={(currentValue) => {
                                  handleInputChange('country', currentValue === formData.country ? "" : currentValue);
                                  setCountryOpen(false);
                                }}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">{country.flag}</span>
                                  <span>{country.name}</span>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    formData.country === country.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                          {(() => {
                            const country = COUNTRIES.find(c => c.name === org.country);
                            return country ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-base">{country.flag}</span>
                                <span>{org.country}</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {org.country}
                              </div>
                            );
                          })()}
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
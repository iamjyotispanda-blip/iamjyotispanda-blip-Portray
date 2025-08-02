import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPortSchema } from "@shared/schema";
import type { Port, Organization } from "@shared/schema";

const countries = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium",
  "Brazil", "Bulgaria", "Cambodia", "Canada", "Chile", "China", "Colombia",
  "Croatia", "Czech Republic", "Denmark", "Ecuador", "Egypt", "Estonia",
  "Finland", "France", "Georgia", "Germany", "Ghana", "Greece", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Latvia",
  "Lebanon", "Lithuania", "Luxembourg", "Malaysia", "Mexico", "Morocco",
  "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Saudi Arabia", "Singapore", "Slovakia", "Slovenia", "South Africa",
  "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Thailand",
  "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Vietnam", "Yemen"
];

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const formSchema = insertPortSchema.extend({
  organizationId: z.coerce.number().min(1, "Please select an organization"),
  displayName: z.string()
    .min(2, "Display name must be at least 2 characters")
    .max(6, "Display name must be at most 6 characters")
    .regex(/^[A-Z0-9]+$/, "Display name must contain only uppercase letters and numbers"),
  pan: z.string()
    .length(10, "PAN must be exactly 10 characters")
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g., AAACJ1234P)"),
  gstn: z.string()
    .length(15, "GSTN must be exactly 15 characters")
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[0-9A-Z]{1}$/, "Invalid GSTN format"),
});

type FormData = z.infer<typeof formSchema>;

interface PortFormProps {
  port?: Port | null;
  organizations: Organization[];
  mode: "create" | "edit" | "view";
  onSuccess: () => void;
}

export function PortForm({ port, organizations, mode, onSuccess }: PortFormProps) {
  const [selectedCountry, setSelectedCountry] = useState(port?.country || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      portName: port?.portName || "",
      displayName: port?.displayName || "",
      organizationId: port?.organizationId || 0,
      address: port?.address || "",
      country: port?.country || "",
      state: port?.state || "",
      pan: port?.pan || "",
      gstn: port?.gstn || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/ports", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Port created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create port: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<FormData>) => {
      if (!port) throw new Error("No port to update");
      const response = await apiRequest("PUT", `/api/ports/${port.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Port updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ports"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update port: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (mode === "create") {
      createMutation.mutate(data);
    } else if (mode === "edit") {
      updateMutation.mutate(data);
    }
  };

  const isReadOnly = mode === "view";
  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="portName">Port Name</Label>
        <Input
          id="portName"
          {...form.register("portName")}
          readOnly={isReadOnly}
          className={isReadOnly ? "bg-gray-50" : ""}
        />
        {form.formState.errors.portName && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.portName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="displayName">Display Name (2-6 characters)</Label>
        <Input
          id="displayName"
          {...form.register("displayName")}
          placeholder="e.g., JSWPP"
          readOnly={isReadOnly}
          className={isReadOnly ? "bg-gray-50" : ""}
        />
        {form.formState.errors.displayName && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.displayName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="organizationId">Organization</Label>
        {isReadOnly ? (
          <Input
            value={organizations.find(org => org.id === port?.organizationId)?.organizationName || ""}
            readOnly
            className="bg-gray-50"
          />
        ) : (
          <Select
            value={form.watch("organizationId")?.toString() || ""}
            onValueChange={(value) => form.setValue("organizationId", parseInt(value))}
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
        )}
        {form.formState.errors.organizationId && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.organizationId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          {...form.register("address")}
          readOnly={isReadOnly}
          className={isReadOnly ? "bg-gray-50" : ""}
          rows={3}
        />
        {form.formState.errors.address && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.address.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="country">Country</Label>
        {isReadOnly ? (
          <Input
            value={port?.country || ""}
            readOnly
            className="bg-gray-50"
          />
        ) : (
          <Select
            value={form.watch("country")}
            onValueChange={(value) => {
              form.setValue("country", value);
              setSelectedCountry(value);
              // Reset state if country changes
              if (value !== "India") {
                form.setValue("state", "");
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {form.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.country.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="state">State</Label>
        {isReadOnly ? (
          <Input
            value={port?.state || ""}
            readOnly
            className="bg-gray-50"
          />
        ) : selectedCountry === "India" ? (
          <Select
            value={form.watch("state")}
            onValueChange={(value) => form.setValue("state", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {indianStates.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            {...form.register("state")}
            placeholder="Enter state/province"
          />
        )}
        {form.formState.errors.state && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.state.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="pan">PAN</Label>
        <Input
          id="pan"
          {...form.register("pan")}
          placeholder="e.g., AAACJ1234P"
          readOnly={isReadOnly}
          className={isReadOnly ? "bg-gray-50" : ""}
        />
        {form.formState.errors.pan && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.pan.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="gstn">GSTN</Label>
        <Input
          id="gstn"
          {...form.register("gstn")}
          placeholder="e.g., 21AAACJ1234P1ZA"
          readOnly={isReadOnly}
          className={isReadOnly ? "bg-gray-50" : ""}
        />
        {form.formState.errors.gstn && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.gstn.message}</p>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {mode === "create" ? "Create Port" : "Update Port"}
          </Button>
        </div>
      )}
    </form>
  );
}
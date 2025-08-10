import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileText, Upload, Link, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertContractSchema, type InsertContract } from "@shared/schema";
import { z } from "zod";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UploadResult } from "@uppy/core";

const contractFormSchema = z.object({
  customerId: z.number(),
  contractNumber: z.string().min(1, "Contract number is required"),
  contractCopyUrl: z.string().min(1, "Contract document URL or file is required"),
  documentType: z.enum(["upload", "url"], { 
    required_error: "Document type is required" 
  }),
  documentName: z.string().optional(),
  documentSize: z.number().optional(),
  validFrom: z.date({ required_error: "Valid from date is required" }),
  validTo: z.date({ required_error: "Valid to date is required" }),
  createdBy: z.string(),
}).refine((data) => data.validTo > data.validFrom, {
  message: "End date must be after start date",
  path: ["validTo"],
});

type ContractFormData = z.infer<typeof contractFormSchema>;

interface ContractFormProps {
  customerId: number;
  isOpen: boolean;
  onClose: () => void;
  renewFromContractId?: number;
}

export function ContractForm({ customerId, isOpen, onClose, renewFromContractId }: ContractFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [documentType, setDocumentType] = useState<"upload" | "url">("url");
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    name: string;
    size: number;
  } | null>(null);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      customerId,
      contractNumber: "",
      contractCopyUrl: "",
      documentType: "url",
      validFrom: renewFromContractId ? new Date() : undefined,
      validTo: renewFromContractId ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined, // 1 year from now
      createdBy: "current-user-id", // This should come from auth context
    },
  });

  // Get upload parameters for file upload
  const handleGetUploadParameters = async () => {
    const response = await apiRequest('/api/objects/upload', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return {
      method: 'PUT' as const,
      url: response.uploadURL,
    };
  };

  // Handle file upload completion
  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const uploadedFileData = {
        url: file.uploadURL || "",
        name: file.name || "",
        size: file.size || 0,
      };
      setUploadedFile(uploadedFileData);
      
      // Update form with uploaded file information
      form.setValue("contractCopyUrl", uploadedFileData.url);
      form.setValue("documentType", "upload");
      form.setValue("documentName", uploadedFileData.name);
      form.setValue("documentSize", uploadedFileData.size);
      
      toast({
        title: "Success",
        description: `File "${uploadedFileData.name}" uploaded successfully`,
      });
    }
  };

  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      return await apiRequest(`/api/contracts`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          validFrom: data.validFrom.toISOString(),
          validTo: data.validTo.toISOString(),
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'contracts'] });
      onClose();
      form.reset();
      setUploadedFile(null);
      setDocumentType("url");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create contract. Please try again.",
        variant: "destructive",
      });
      console.error("Contract creation error:", error);
    },
  });

  const onSubmit = (data: ContractFormData) => {
    createContractMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            {renewFromContractId ? "Renew Contract" : "Create New Contract"}
          </DialogTitle>
          <DialogDescription>
            {renewFromContractId 
              ? "Create a new contract to replace the expired one" 
              : "Add a new contract for this customer"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="contractNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Number *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., CON-2025-001" 
                        {...field} 
                        data-testid="input-contract-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Document Upload/URL Section */}
              <FormItem>
                <FormLabel>Contract Document *</FormLabel>
                <Tabs value={documentType} onValueChange={(value) => {
                  setDocumentType(value as "upload" | "url");
                  form.setValue("documentType", value as "upload" | "url");
                  if (value === "url") {
                    setUploadedFile(null);
                    form.setValue("documentName", undefined);
                    form.setValue("documentSize", undefined);
                  }
                }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url" className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      URL Link
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      File Upload
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="url" className="space-y-2">
                    <FormField
                      control={form.control}
                      name="contractCopyUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/contract.pdf" 
                              {...field} 
                              data-testid="input-contract-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="upload" className="space-y-2">
                    {uploadedFile ? (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="font-medium">{uploadedFile.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUploadedFile(null);
                                form.setValue("contractCopyUrl", "");
                                form.setValue("documentName", undefined);
                                form.setValue("documentSize", undefined);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={50 * 1024 * 1024} // 50MB
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleUploadComplete}
                        buttonClassName="w-full"
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span>Upload Contract Document</span>
                        </div>
                      </ObjectUploader>
                    )}
                  </TabsContent>
                </Tabs>
              </FormItem>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valid From *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-valid-from"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valid To *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-valid-to"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-contract"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createContractMutation.isPending}
                data-testid="button-save-contract"
              >
                {createContractMutation.isPending ? "Creating..." : "Create Contract"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
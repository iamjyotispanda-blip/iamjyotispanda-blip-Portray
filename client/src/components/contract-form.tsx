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
import { CalendarIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertContractSchema, type InsertContract } from "@shared/schema";
import { z } from "zod";

const contractFormSchema = insertContractSchema.extend({
  validFrom: z.date({ required_error: "Valid from date is required" }),
  validTo: z.date({ required_error: "Valid to date is required" }),
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

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      customerId,
      contractNumber: "",
      contractCopyUrl: "",
      validFrom: renewFromContractId ? new Date() : undefined,
      validTo: renewFromContractId ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined, // 1 year from now
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      return apiRequest(`/api/contracts`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          validFrom: data.validFrom.toISOString(),
          validTo: data.validTo.toISOString(),
          createdBy: "current-user-id", // This should come from auth context
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

              <FormField
                control={form.control}
                name="contractCopyUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Document URL</FormLabel>
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
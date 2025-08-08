import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PortAdminContact } from "@shared/schema";

const editContactSchema = z.object({
  contactName: z.string().min(1, "Contact name is required"),
  designation: z.string().min(1, "Designation is required"),
  email: z.string().email("Please enter a valid email address"),
  mobileNumber: z.string().min(10, "Please enter a valid mobile number"),
  status: z.enum(["active", "inactive"]),
});

type EditContactFormData = z.infer<typeof editContactSchema>;

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: PortAdminContact;
  onSuccess: () => void;
}

export function EditContactDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: EditContactDialogProps) {
  const { toast } = useToast();

  const form = useForm<EditContactFormData>({
    resolver: zodResolver(editContactSchema),
    defaultValues: {
      contactName: contact.contactName,
      designation: contact.designation,
      email: contact.email,
      mobileNumber: contact.mobileNumber,
      status: contact.status as "active" | "inactive",
    },
  });

  // Update form when contact changes
  useEffect(() => {
    form.reset({
      contactName: contact.contactName,
      designation: contact.designation,
      email: contact.email,
      mobileNumber: contact.mobileNumber,
      status: contact.status as "active" | "inactive",
    });
  }, [contact, form]);

  const updateContactMutation = useMutation({
    mutationFn: async (data: EditContactFormData) => {
      return apiRequest("PUT", `/api/contacts/${contact.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact",
        variant: "destructive",
      });
    },
  });

  // Get all existing contacts for email validation
  const { data: allContacts = [] } = useQuery<PortAdminContact[]>({
    queryKey: ["/api/contacts"],
  });

  const handleSubmit = (data: EditContactFormData) => {
    // Check for unique email constraint (exclude current contact)
    if (allContacts) {
      const emailExists = allContacts.find(c => 
        c.id !== contact.id && c.email.toLowerCase() === data.email.toLowerCase()
      );

      if (emailExists) {
        toast({
          title: "Duplicate Entry",
          description: "Email already exists. Please choose different value.",
          variant: "destructive",
        });
        return;
      }
    }

    updateContactMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input placeholder="Port Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john.doe@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateContactMutation.isPending}
                className="h-8"
              >
                {updateContactMutation.isPending ? "Updating..." : "Update Contact"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Mail, Phone, User, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddContactDialog } from "@/components/add-contact-dialog";
import { EditContactDialog } from "@/components/edit-contact-dialog";
import type { Port, PortAdminContact } from "@shared/schema";

interface PortContactsPageProps {
  params: { portId: string };
}

export default function PortContactsPage({ params }: PortContactsPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const portId = parseInt(params.portId);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<PortAdminContact | null>(null);

  // Get port details
  const { data: port } = useQuery({
    queryKey: ["/api/ports", portId],
    enabled: !!portId,
  });

  // Get port admin contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["/api/ports", portId, "contacts"],
    enabled: !!portId,
  });

  // Toggle contact status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (contactId: number) => {
      return apiRequest(`/api/contacts/${contactId}/toggle-status`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports", portId, "contacts"] });
      toast({
        title: "Success",
        description: "Contact status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact status",
        variant: "destructive",
      });
    },
  });

  // Resend verification mutation
  const resendVerificationMutation = useMutation({
    mutationFn: async (contactId: number) => {
      return apiRequest(`/api/contacts/${contactId}/resend-verification`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Verification email sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      return apiRequest(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ports", portId, "contacts"] });
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const handleToggleStatus = (contactId: number) => {
    toggleStatusMutation.mutate(contactId);
  };

  const handleResendVerification = (contactId: number) => {
    resendVerificationMutation.mutate(contactId);
  };

  const handleDeleteContact = (contactId: number) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      deleteContactMutation.mutate(contactId);
    }
  };

  const handleEditContact = (contact: PortAdminContact) => {
    setEditingContact(contact);
  };

  return (
    <AppLayout title="Port Admin Contacts" activeSection="ports">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/ports")}
              className="h-8"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Ports
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Port Admin Contacts
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {port ? `${port.portName} (${port.displayName})` : "Loading..."}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="h-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Contacts List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">Loading contacts...</div>
              </CardContent>
            </Card>
          ) : contacts.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  No contacts found. Add the first contact to get started.
                </div>
              </CardContent>
            </Card>
          ) : (
            contacts.map((contact: PortAdminContact) => (
              <Card key={contact.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {contact.contactName}
                          </h3>
                          <Badge
                            variant={contact.status === "active" ? "default" : "secondary"}
                          >
                            {contact.status}
                          </Badge>
                          {contact.isVerified ? (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              Pending Verification
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {contact.designation}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{contact.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{contact.mobileNumber}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!contact.isVerified && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendVerification(contact.id)}
                          disabled={resendVerificationMutation.isPending}
                          className="h-8"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Resend Verification
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditContact(contact)}
                        className="h-8"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(contact.id)}
                        disabled={toggleStatusMutation.isPending}
                        className="h-8"
                      >
                        {contact.status === "active" ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteContact(contact.id)}
                        disabled={deleteContactMutation.isPending}
                        className="h-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        portId={portId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/ports", portId, "contacts"] });
          setShowAddDialog(false);
        }}
      />

      {/* Edit Contact Dialog */}
      {editingContact && (
        <EditContactDialog
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          contact={editingContact}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/ports", portId, "contacts"] });
            setEditingContact(null);
          }}
        />
      )}
    </AppLayout>
  );
}
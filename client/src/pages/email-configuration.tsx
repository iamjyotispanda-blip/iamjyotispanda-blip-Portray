import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Mail, Server, Shield, CheckCircle, AlertCircle, Settings, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmailConfiguration {
  id: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  enableTLS: boolean;
  isActive: boolean;
  createdAt: string;
}

interface EmailConfigFormData {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  enableTLS: boolean;
}

export default function EmailConfigurationPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EmailConfiguration | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [formData, setFormData] = useState<EmailConfigFormData>({
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "",
    fromName: "PortRay Support",
    enableTLS: true,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get email configurations
  const { data: emailConfigs = [], isLoading } = useQuery<EmailConfiguration[]>({
    queryKey: ["/api/configuration/email"],
  });

  // Save email configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: EmailConfigFormData) => {
      return apiRequest("POST", "/api/configuration/email", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email configuration saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/configuration/email"] });
      setShowAddForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save email configuration",
        variant: "destructive",
      });
    },
  });

  // Send test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async (data: { configId: number; testEmail: string }) => {
      return apiRequest("POST", "/api/configuration/email/test", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test email sent successfully",
      });
      setTestEmailAddress("");
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: number) => {
      return apiRequest("DELETE", `/api/configuration/email/${configId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email configuration deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/configuration/email"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete email configuration",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "",
      fromName: "PortRay Support",
      enableTLS: true,
    });
  };

  const handleSaveConfig = () => {
    if (!formData.smtpHost || !formData.smtpUser || !formData.smtpPassword || !formData.fromEmail || !formData.fromName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    saveConfigMutation.mutate(formData);
  };

  const handleSendTest = (configId: number) => {
    if (!testEmailAddress) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    testEmailMutation.mutate({ configId, testEmail: testEmailAddress });
  };

  return (
    <AppLayout title="Email Configuration" activeSection="email">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Email Configuration</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage SMTP settings for email notifications</p>
        </div>

        {/* Email Configurations List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading configurations...</div>
            ) : emailConfigs.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Configurations</h3>
                <p className="text-gray-500 dark:text-gray-400">No email configurations available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SMTP Host</TableHead>
                    <TableHead>From Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>TLS</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{config.smtpHost}</div>
                          <div className="text-sm text-gray-500">Port: {config.smtpPort}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{config.fromEmail}</div>
                          <div className="text-sm text-gray-500">{config.fromName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.enableTLS ? "default" : "outline"}>
                          {config.enableTLS ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(config.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Input
                              placeholder="test@example.com"
                              value={testEmailAddress}
                              onChange={(e) => setTestEmailAddress(e.target.value)}
                              className="w-32 h-8"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendTest(config.id)}
                              disabled={testEmailMutation.isPending}
                              className="h-8"
                            >
                              Test
                            </Button>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="h-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this email configuration? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteConfigMutation.mutate(config.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
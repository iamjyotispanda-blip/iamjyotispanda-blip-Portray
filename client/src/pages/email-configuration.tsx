import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Mail, Trash2, Eye, EyeOff } from "lucide-react";
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
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 pl-4">Email Configuration</span>
        </div>
        
        <main className="px-4 sm:px-6 lg:px-2 py-2 flex-1">
          <div className="space-y-2">
            {/* Email Configurations List */}
            <Card>
              <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-4">Loading configurations...</div>
            ) : emailConfigs.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Configurations</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">No email configurations available</p>
                <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
                  <SheetTrigger asChild>
                    <Button className="h-8">
                      <Plus className="h-4 w-4 mr-2" />
                      New mail configuration
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Add Email Configuration</SheetTitle>
                      <SheetDescription>
                        Configure SMTP settings for sending emails
                      </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-4 mt-6 pb-6">
                      <div className="space-y-2">
                        <Label htmlFor="smtpHost">SMTP Host *</Label>
                        <Input
                          id="smtpHost"
                          value={formData.smtpHost}
                          onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                          placeholder="smtp.gmail.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtpPort">SMTP Port *</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          value={formData.smtpPort}
                          onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
                          placeholder="587"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtpUser">SMTP Username *</Label>
                        <Input
                          id="smtpUser"
                          type="email"
                          value={formData.smtpUser}
                          onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                          placeholder="your-email@gmail.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtpPassword">SMTP Password *</Label>
                        <div className="relative">
                          <Input
                            id="smtpPassword"
                            type={showPassword ? "text" : "password"}
                            value={formData.smtpPassword}
                            onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                            placeholder="Enter password or app password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fromEmail">From Email *</Label>
                        <Input
                          id="fromEmail"
                          type="email"
                          value={formData.fromEmail}
                          onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                          placeholder="noreply@yourcompany.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fromName">From Name *</Label>
                        <Input
                          id="fromName"
                          value={formData.fromName}
                          onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                          placeholder="PortRay Support"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enableTLS"
                          checked={formData.enableTLS}
                          onCheckedChange={(checked) => setFormData({ ...formData, enableTLS: checked })}
                        />
                        <Label htmlFor="enableTLS">Enable TLS/SSL</Label>
                      </div>

                      <div className="flex space-x-3 pt-6 sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 mt-6">
                        <Button 
                          onClick={handleSaveConfig}
                          disabled={saveConfigMutation.isPending}
                          className="flex-1 h-10"
                        >
                          {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowAddForm(false);
                            resetForm();
                          }}
                          className="flex-1 h-10"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
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
        </main>
      </div>
    </AppLayout>
  );
}
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Mail, 
  Server, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Send,
  Eye,
  EyeOff 
} from "lucide-react";

// Email configuration schema
const emailConfigSchema = z.object({
  smtpHost: z.string().min(1, "SMTP Host is required"),
  smtpPort: z.number().min(1).max(65535, "Port must be between 1 and 65535"),
  smtpUser: z.string().email("Valid email address required"),
  smtpPassword: z.string().min(1, "SMTP Password is required"),
  fromEmail: z.string().email("Valid from email address required"),
  fromName: z.string().min(1, "From name is required"),
  enableTLS: z.boolean().default(true),
});

type EmailConfigForm = z.infer<typeof emailConfigSchema>;

export default function EmailConfigurationPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm<EmailConfigForm>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "",
      fromName: "PortRay Support",
      enableTLS: true,
    },
  });

  // Get current email configuration
  const { data: emailConfig, isLoading } = useQuery({
    queryKey: ["/api/configuration/email"],
    enabled: false, // We'll implement this later if needed
  });

  // Save email configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: EmailConfigForm) => {
      return apiRequest("POST", "/api/configuration/email", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email configuration saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/configuration/email"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save email configuration",
        variant: "destructive",
      });
    },
  });

  // Test email configuration mutation
  const testEmailMutation = useMutation({
    mutationFn: async (testEmail: string) => {
      const formData = form.getValues();
      return apiRequest("POST", "/api/configuration/email/test", {
        ...formData,
        testEmail,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test email sent successfully! Check your inbox.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const handleSaveConfiguration = (data: EmailConfigForm) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestEmail = () => {
    if (!testEmailAddress) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }
    testEmailMutation.mutate(testEmailAddress);
  };

  const getConnectionStatus = () => {
    if (saveConfigMutation.isSuccess) {
      return { status: "connected", message: "Configuration saved" };
    }
    if (saveConfigMutation.isError) {
      return { status: "error", message: "Configuration error" };
    }
    return { status: "pending", message: "Not configured" };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <AppLayout title="Email Configuration" activeSection="configuration">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Email Configuration</span>
            <Badge
              variant={
                connectionStatus.status === "connected" 
                  ? "default" 
                  : connectionStatus.status === "error" 
                  ? "destructive" 
                  : "secondary"
              }
              className="flex items-center space-x-1"
            >
              {connectionStatus.status === "connected" && <CheckCircle className="w-3 h-3" />}
              {connectionStatus.status === "error" && <XCircle className="w-3 h-3" />}
              {connectionStatus.status === "pending" && <AlertCircle className="w-3 h-3" />}
              <span>{connectionStatus.message}</span>
            </Badge>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Mail className="w-6 h-6" />
                <span>Email Configuration</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configure SMTP settings to enable email notifications, verification emails, and password reset functionality.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Configuration */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Server className="w-5 h-5" />
                      <span>SMTP Configuration</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={form.handleSubmit(handleSaveConfiguration)}>
                      {/* Server Settings */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="smtpHost">SMTP Host</Label>
                          <Input
                            id="smtpHost"
                            placeholder="smtp.gmail.com"
                            {...form.register("smtpHost")}
                            className={form.formState.errors.smtpHost ? "border-red-500" : ""}
                          />
                          {form.formState.errors.smtpHost && (
                            <p className="text-sm text-red-500">{form.formState.errors.smtpHost.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="smtpPort">SMTP Port</Label>
                          <Input
                            id="smtpPort"
                            type="number"
                            placeholder="587"
                            {...form.register("smtpPort", { valueAsNumber: true })}
                            className={form.formState.errors.smtpPort ? "border-red-500" : ""}
                          />
                          {form.formState.errors.smtpPort && (
                            <p className="text-sm text-red-500">{form.formState.errors.smtpPort.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Authentication */}
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center space-x-2">
                          <Shield className="w-4 h-4" />
                          <span>Authentication</span>
                        </h3>

                        <div className="space-y-2">
                          <Label htmlFor="smtpUser">SMTP Username (Email)</Label>
                          <Input
                            id="smtpUser"
                            type="email"
                            placeholder="your-email@gmail.com"
                            {...form.register("smtpUser")}
                            className={form.formState.errors.smtpUser ? "border-red-500" : ""}
                          />
                          {form.formState.errors.smtpUser && (
                            <p className="text-sm text-red-500">{form.formState.errors.smtpUser.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="smtpPassword">SMTP Password</Label>
                          <div className="relative">
                            <Input
                              id="smtpPassword"
                              type={showPassword ? "text" : "password"}
                              placeholder="App Password (not your regular password)"
                              {...form.register("smtpPassword")}
                              className={form.formState.errors.smtpPassword ? "border-red-500" : ""}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                          {form.formState.errors.smtpPassword && (
                            <p className="text-sm text-red-500">{form.formState.errors.smtpPassword.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Sender Settings */}
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Sender Information</h3>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="fromEmail">From Email</Label>
                            <Input
                              id="fromEmail"
                              type="email"
                              placeholder="your-email@gmail.com"
                              {...form.register("fromEmail")}
                              className={form.formState.errors.fromEmail ? "border-red-500" : ""}
                            />
                            {form.formState.errors.fromEmail && (
                              <p className="text-sm text-red-500">{form.formState.errors.fromEmail.message}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="fromName">From Name</Label>
                            <Input
                              id="fromName"
                              placeholder="PortRay Support"
                              {...form.register("fromName")}
                              className={form.formState.errors.fromName ? "border-red-500" : ""}
                            />
                            {form.formState.errors.fromName && (
                              <p className="text-sm text-red-500">{form.formState.errors.fromName.message}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Security Settings */}
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Security Settings</h3>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="enableTLS">Enable TLS/STARTTLS</Label>
                            <p className="text-sm text-gray-500">
                              Recommended for secure email transmission
                            </p>
                          </div>
                          <Switch
                            id="enableTLS"
                            checked={form.watch("enableTLS")}
                            onCheckedChange={(checked) => form.setValue("enableTLS", checked)}
                          />
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={saveConfigMutation.isPending}
                          className="w-full md:w-auto"
                        >
                          {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Test & Status */}
              <div className="space-y-6">
                {/* Test Email */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Send className="w-5 h-5" />
                      <span>Test Email</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="testEmail">Test Email Address</Label>
                      <Input
                        id="testEmail"
                        type="email"
                        placeholder="test@example.com"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleTestEmail}
                      disabled={testEmailMutation.isPending || !testEmailAddress}
                      className="w-full"
                      variant="outline"
                    >
                      {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Setup Guide */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gmail Setup Guide</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-2">
                      <p className="font-medium">For Gmail:</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                        <li>Enable 2-Factor Authentication</li>
                        <li>Generate an App Password</li>
                        <li>Use App Password (not regular password)</li>
                        <li>Host: smtp.gmail.com</li>
                        <li>Port: 587 (with TLS)</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                {/* Common Providers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Common SMTP Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-3">
                      <div>
                        <p className="font-medium">Gmail</p>
                        <p className="text-gray-600 dark:text-gray-400">smtp.gmail.com:587</p>
                      </div>
                      <div>
                        <p className="font-medium">Outlook</p>
                        <p className="text-gray-600 dark:text-gray-400">smtp-mail.outlook.com:587</p>
                      </div>
                      <div>
                        <p className="font-medium">Yahoo</p>
                        <p className="text-gray-600 dark:text-gray-400">smtp.mail.yahoo.com:587</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
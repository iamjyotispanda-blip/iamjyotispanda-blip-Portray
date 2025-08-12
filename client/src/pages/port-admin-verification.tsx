import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { PortrayLogo } from "@/components/portray-logo";
import { apiRequest } from "@/lib/queryClient";

const registrationSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function PortAdminVerificationPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string>("");
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [registrationStatus, setRegistrationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    
    if (tokenParam) {
      setToken(tokenParam);
      verifyToken(tokenParam);
    } else {
      setVerificationStatus("invalid");
      setError("No verification token provided");
    }
  }, []);

  const verifyToken = async (tokenValue: string) => {
    try {
      const response = await apiRequest("GET", `/api/verify?token=${tokenValue}`);
      const data = await response.json();
      
      setContactInfo(data);
      setVerificationStatus("valid");
    } catch (error: any) {
      setVerificationStatus("invalid");
      setError(error.message || "Invalid or expired verification token");
    }
  };

  const handleRegistration = async (data: RegistrationFormData) => {
    setRegistrationStatus("loading");
    setError("");

    try {
      const response = await apiRequest("POST", "/api/register-port-admin", {
        token,
        password: data.password,
      });
      const responseData = await response.json();

      // Store the authentication token
      localStorage.setItem("authToken", responseData.token);
      
      setRegistrationStatus("success");
      
      // Redirect to Port Admin Dashboard
      setTimeout(() => {
        setLocation("/port-admin-dashboard");
      }, 2000);
    } catch (error: any) {
      setRegistrationStatus("error");
      setError(error.message || "Registration failed");
    }
  };

  if (verificationStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Verifying your token...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === "invalid") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <PortrayLogo size="sm" className="mx-auto mb-4" />
            <CardTitle className="text-red-600">Verification Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setLocation("/login")}
                className="h-10"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registrationStatus === "success") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <PortrayLogo size="sm" className="mx-auto mb-4" />
            <CardTitle className="text-green-600">Registration Successful!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your account has been created successfully. You are being redirected to your dashboard...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <PortrayLogo size="sm" className="mx-auto mb-4" />
          <CardTitle>Complete Your Registration</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Welcome, {contactInfo?.contactName}! Please set up your password to activate your Port Admin account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleRegistration)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={contactInfo?.email || ""}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-10"
              disabled={registrationStatus === "loading"}
            >
              {registrationStatus === "loading" ? "Setting up your account..." : "Complete Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
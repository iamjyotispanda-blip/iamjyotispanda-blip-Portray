import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, RefreshCw, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function PasswordSetupForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("Password must be at least 8 characters long");
    if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
    if (!/\d/.test(password)) errors.push("Password must contain at least one number");
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Error",
        description: "No password setup token available",
        variant: "destructive",
      });
      return;
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      toast({
        title: "Password Requirements",
        description: passwordErrors[0],
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/setup-password", { 
        token: token, 
        password 
      });
      
      if (response) {
        toast({
          title: "Password Set Successfully",
          description: "You can now log in to your account",
        });
        
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to set password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your new password"
            className="pr-10"
            data-testid="input-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            data-testid="button-toggle-password"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            className="pr-10"
            data-testid="input-confirm-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            data-testid="button-toggle-confirm-password"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-8" 
        disabled={isSubmitting || !password || !confirmPassword}
        data-testid="button-set-password"
      >
        {isSubmitting ? "Setting Password..." : "Set Password"}
      </Button>
    </form>
  );
}

export default function VerifyEmailPage() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/verify-email");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [message, setMessage] = useState("");
  const [passwordSetupToken, setPasswordSetupToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log("VerifyEmailPage: Current location:", location);
    console.log("VerifyEmailPage: Full window location:", window.location.href);
    
    // Parse URL more thoroughly
    const fullUrl = window.location.href;
    const urlObj = new URL(fullUrl);
    const token = urlObj.searchParams.get('token');
    
    console.log("VerifyEmailPage: URL object:", urlObj);
    console.log("VerifyEmailPage: Search params:", urlObj.search);
    console.log("VerifyEmailPage: Extracted token:", token);

    if (!token) {
      console.log("VerifyEmailPage: No token found, setting error status");
      setStatus("error");
      setMessage("Invalid verification link - no token provided");
      return;
    }

    console.log("VerifyEmailPage: Token found, calling verifyEmail");
    verifyEmail(token);
  }, [location]);

  const verifyEmail = async (token: string) => {
    try {
      setStatus("loading");
      const response = await apiRequest("POST", "/api/auth/verify-email", { token });
      
      console.log("VerifyEmailPage: API response:", response);
      
      if (response && (response as any).passwordSetupToken) {
        console.log("VerifyEmailPage: Password setup token found:", (response as any).passwordSetupToken);
        setPasswordSetupToken((response as any).passwordSetupToken);
        setStatus("success");
        setMessage("Email verified successfully! Please set up your password.");
        
        toast({
          title: "Email Verified",
          description: "Please set up your password to complete registration",
        });
      } else {
        console.log("VerifyEmailPage: No password setup token in response");
        setStatus("success");
        setMessage("Email verified successfully!");
        
        toast({
          title: "Email Verified",
          description: "Email verification completed",
        });
      }
    } catch (error: any) {
      console.error("Email verification error:", error);
      
      if (error.message?.includes("expired")) {
        setStatus("expired");
        setMessage("Verification link has expired. Please contact your administrator for a new invitation.");
      } else {
        setStatus("error");
        setMessage(error.message || "Failed to verify email. Please try again or contact support.");
      }
      
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify email",
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    const queryString = location.includes('?') ? location.split('?')[1] : '';
    const urlParams = new URLSearchParams(queryString);
    const token = urlParams.get('token');
    if (token) {
      verifyEmail(token);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <RefreshCw className="h-16 w-16 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case "expired":
        return <Clock className="h-16 w-16 text-orange-500" />;
      case "error":
      default:
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "loading":
        return "Verifying Email...";
      case "success":
        return "Email Verified Successfully!";
      case "expired":
        return "Verification Link Expired";
      case "error":
      default:
        return "Verification Failed";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              {getStatusIcon()}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
              <CardDescription className="text-center">
                {message}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {status === "error" && (
              <Button 
                onClick={handleRetry}
                className="w-full"
                data-testid="button-retry-verification"
              >
                Try Again
              </Button>
            )}
            
            {status === "success" && (
              <div className="text-center space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Email verified successfully! Please set up your password to complete your account setup.
                  </p>
                </div>
                
                {passwordSetupToken && <PasswordSetupForm token={passwordSetupToken} />}
              </div>
            )}
            
            {(status === "expired" || status === "error") && (
              <div className="text-center">
                <Button 
                  onClick={() => window.location.href = "/login"}
                  variant="outline"
                  className="w-full"
                  data-testid="button-back-to-login"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
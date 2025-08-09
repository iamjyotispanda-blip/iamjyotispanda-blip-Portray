import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const [location] = useLocation();
  const [, params] = useRoute("/verify-email");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1]);
    const token = urlParams.get('token');

    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link - no token provided");
      return;
    }

    verifyEmail(token);
  }, [location]);

  const verifyEmail = async (token: string) => {
    try {
      setStatus("loading");
      const response = await apiRequest("POST", "/api/auth/verify-email", { token });
      
      if (response) {
        setStatus("success");
        setMessage("Email verified successfully! Please check your email for password setup instructions.");
        
        toast({
          title: "Email Verified",
          description: "Check your email for password setup instructions",
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
    const urlParams = new URLSearchParams(location.split('?')[1]);
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
                    A password setup email has been sent to your email address. Please check your inbox and follow the instructions to complete your account setup.
                  </p>
                </div>
                
                <Button 
                  onClick={() => window.location.href = "/login"}
                  variant="outline"
                  className="w-full"
                  data-testid="button-go-to-login"
                >
                  Go to Login
                </Button>
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
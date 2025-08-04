import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link - no token provided');
      return;
    }

    // Call verification API
    fetch(`/api/verify?token=${token}`)
      .then(response => response.json())
      .then(data => {
        if (data.message === "Email verified successfully" || data.message === "Email already verified" || data.message === "Token valid") {
          setStatus('success');
          setMessage('Email verified successfully! You can now complete your registration.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed');
        }
      })
      .catch(error => {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-blue-600" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
            <span>Email Verification</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {message}
          </p>
          
          {status === 'success' && (
            <Button 
              onClick={() => setLocation('/login')}
              className="w-full"
            >
              Continue to Login
            </Button>
          )}
          
          {status === 'error' && (
            <Button 
              variant="outline"
              onClick={() => setLocation('/')}
              className="w-full"
            >
              Return to Home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
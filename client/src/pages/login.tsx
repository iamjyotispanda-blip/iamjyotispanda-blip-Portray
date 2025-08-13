import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Ship, Package, TrendingUp, Moon, Sun, Monitor, Truck, FileText } from "lucide-react";
import portBackgroundImage from "@assets/8_1754302078221.png";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { PortrayLogo } from "@/components/portray-logo";
import { HeroLogo } from "@/components/hero-logo";

import { loginSchema, type LoginCredentials } from "@shared/schema";
import { AuthService } from "@/lib/auth";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const features = [
    {
      title: "Vessel & Berth Management",
      description: "Smart scheduling based on vessel size, ETA, and berth availability",
      icon: <Ship className="h-16 w-16 text-white" />,
    },
    {
      title: "Cargo & Yard Management", 
      description: "Track dwell times, turnaround rates, and handling performance",
      icon: <Package className="h-16 w-16 text-white" />,
    },
    {
      title: "Cargo & Yard Management",
      description: "Track dwell times, turnaround rates, and handling performance", 
      icon: <Truck className="h-16 w-16 text-white" />,
    },
    {
      title: "Auto-Invoice & Financial Analysis",
      description: "Generate invoices instantly from vessel berthing, cargo handling, storage, and logistics events",
      icon: <FileText className="h-16 w-16 text-white" />,
    },
  ];

  // Auto-scroll through features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [features.length]);

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: AuthService.login,
    onSuccess: (response: any) => {
      console.log("Login mutation success, response:", response);
      toast({
        title: "Welcome to PortRay",
        description: "Successfully signed in to your account.",
      });
      // Use the redirectPath from backend response or default to dashboard
      const redirectPath = response.redirectPath || "/dashboard";
      console.log("Redirecting to:", redirectPath);
      
      // Force page reload to ensure proper state reset
      setTimeout(() => {
        console.log("Reloading page to:", redirectPath);
        window.location.href = redirectPath;
      }, 500);
    },
    onError: (error: any) => {
      const message = error.message || "Login failed. Please try again.";
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  const toggleTheme = () => {
    const themes = ["light", "dark", "system"] as const;
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Theme Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-6 right-6 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm h-8 w-8"
        onClick={toggleTheme}
      >
        {getThemeIcon()}
      </Button>
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-shrink-0">
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${portBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700/30 via-blue-600/20 to-purple-500/10" />
        
        <div className="relative z-10 flex flex-col justify-start pt-16 px-12 text-white w-full">
          {/* Logo and tagline */}
          <div className="mb-8">
            <HeroLogo />
            <p className="text-sm text-blue-100 mt-2 font-medium">Steering Port Operations into the Future</p>
          </div>

          {/* Feature Carousel - positioned below logo */}
          <div className="relative mb-6">
            <div className="p-6 min-h-[200px] pl-[-5px] pr-[-5px] pt-[18px] pb-[18px]">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {features[currentFeature].icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-lime-300 mb-3">
                    {features[currentFeature].title}
                  </h3>
                  <p className="text-white text-sm leading-relaxed">
                    {features[currentFeature].description}
                  </p>
                </div>
              </div>
              
              {/* Dots indicator */}
              <div className="flex justify-center space-x-2 mt-4">
                {features.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentFeature 
                        ? 'bg-lime-300 w-6' 
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                    onClick={() => setCurrentFeature(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <div className="w-full max-w-md">
          
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <PortrayLogo size="md" />
          </div>
          
          {/* Login Card */}
          <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-2xl border-gray-200 dark:border-slate-700">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                Sign In
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Access your port management System
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="h-11 border-2 focus:border-blue-500 dark:focus:border-blue-400"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-11 border-2 focus:border-blue-500 dark:focus:border-blue-400 pr-10"
                      {...form.register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="rememberMe"
                      checked={form.watch("rememberMe") || false}
                      onCheckedChange={(checked) => form.setValue("rememberMe", checked === true)}
                    />
                    <Label 
                      htmlFor="rememberMe"
                      className="text-sm text-gray-600 dark:text-gray-400"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0 h-8"
                  >
                    Forgot password?
                  </Button>
                </div>
                
                {/* Login Button */}
                <Button 
                  type="submit" 
                  className="w-full h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
                
                {/* Error Message */}
                {loginMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {loginMutation.error?.message || "Invalid email or password. Please try again."}
                    </AlertDescription>
                  </Alert>
                )}
                
              </form>
              
              {/* Additional Options */}
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                      Or
                    </span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full h-10 border-2"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z"/>
                    </svg>
                    Sign in with Corporate SSO
                  </Button>
                </div>
              </div>
              
            </CardContent>
          </Card>
          
          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Need help? {" "}
              <Button variant="link" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0 h-8">
                Contact Support
              </Button>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
              © 2024 CSM PortRay. All rights reserved. | Port Management System v2.1
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}

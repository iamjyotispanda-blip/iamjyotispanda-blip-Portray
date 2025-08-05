import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import PortalWelcome from "@/pages/portal-welcome";
import PortsPage from "@/pages/ports";
import PortFormPage from "@/pages/port-form";
import PortContactsPage from "@/pages/port-contacts";
import PortAdminVerificationPage from "@/pages/port-admin-verification";
import PortAdminDashboard from "@/pages/port-admin-dashboard";
import EmailConfigurationPage from "@/pages/email-configuration";
import OrganizationsPage from "@/pages/organizations";
import VerifyPage from "@/pages/verify";
import SetupPasswordPage from "@/pages/setup-password";
import TerminalsPage from "@/pages/terminals";
import TerminalFormPage from "@/pages/terminal-form";
import { AuthService } from "@/lib/auth";

// Wrapper component for AppLayout
function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="Port Management" activeSection="ports">
      {children}
    </AppLayout>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const token = AuthService.getToken();
      console.log("Checking session, token exists:", !!token);
      
      if (!AuthService.isAuthenticated()) {
        console.log("No authentication token found");
        setIsValid(false);
        setIsChecking(false);
        return;
      }

      console.log("Token found, validating session...");
      const sessionValid = await AuthService.validateSession();
      console.log("Session validation result:", sessionValid);
      setIsValid(sessionValid);
      setIsChecking(false);
    };

    checkSession();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    console.log("Session invalid, redirecting to login");
    return <LoginPage />;
  }

  console.log("Session valid, rendering protected component");
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/verify" component={VerifyPage} />
      <Route path="/setup-password" component={SetupPasswordPage} />
      <Route path="/port-admin-verification" component={PortAdminVerificationPage} />
      <Route path="/port-admin-dashboard" component={PortAdminDashboard} />
      <Route path="/portal/welcome">
        {() => <ProtectedRoute component={PortalWelcome} />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/ports/new">
        {() => <ProtectedRoute component={PortFormPage} />}
      </Route>
      <Route path="/ports/edit/:id">
        {(params) => <ProtectedRoute component={() => <PortFormPage params={params} />} />}
      </Route>
      <Route path="/ports/:portId/contacts">
        {(params) => <ProtectedRoute component={() => <PortContactsPage params={params} />} />}
      </Route>
      <Route path="/ports">
        {() => <ProtectedRoute component={PortsPage} />}
      </Route>
      <Route path="/organizations">
        {() => <ProtectedRoute component={OrganizationsPage} />}
      </Route>
      <Route path="/configuration/email">
        {() => <ProtectedRoute component={EmailConfigurationPage} />}
      </Route>
      <Route path="/terminals/new">
        {() => <ProtectedRoute component={TerminalFormPage} />}
      </Route>
      <Route path="/terminals/edit/:id">
        {() => <ProtectedRoute component={TerminalFormPage} />}
      </Route>
      <Route path="/terminals">
        {() => <ProtectedRoute component={TerminalsPage} />}
      </Route>
      <Route path="/">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="portray-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

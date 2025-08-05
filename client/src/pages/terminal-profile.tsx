import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AuthService } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Ship, MapPin, Globe, Phone, Mail, Calendar } from "lucide-react";

export default function TerminalProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  // Get terminal details
  const { data: terminal, isLoading: terminalLoading } = useQuery({
    queryKey: ["/api/terminals", id],
    enabled: !!id,
  });

  // Get port details for the terminal
  const { data: port, isLoading: portLoading } = useQuery({
    queryKey: ["/api/ports", terminal?.portId],
    enabled: !!terminal?.portId,
  });

  // Get organization details
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["/api/organizations", port?.organizationId],
    enabled: !!port?.organizationId,
  });

  if (terminalLoading || portLoading || orgLoading) {
    return (
      <AppLayout title="Loading Terminal Profile..." activeSection="terminals">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!terminal) {
    return (
      <AppLayout title="Terminal Not Found" activeSection="terminals">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">Terminal not found.</p>
              <Button onClick={() => setLocation("/terminals")} className="h-8">
                Back to Terminals
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Terminal Profile" activeSection="terminals">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Breadcrumb Bar */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between px-6 py-3">
            <Button
              variant="ghost"
              onClick={() => setLocation("/terminals")}
              className="h-8 px-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Terminals
            </Button>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Terminal Profile
              </h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Organization Logo */}
            {organization && organization.logoUrl && (
              <Card>
                <CardContent className="p-6 text-center">
                  <img 
                    src={organization.logoUrl} 
                    alt={organization.organizationName}
                    className="h-20 w-auto object-contain mx-auto"
                  />
                  <p className="text-lg font-semibold mt-2">{organization.organizationName}</p>
                </CardContent>
              </Card>
            )}

            {/* Terminal Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Ship className="h-5 w-5" />
                  <span>Terminal Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Terminal Name</label>
                      <p className="text-lg font-semibold">{terminal.terminalName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Short Code</label>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block">
                        {terminal.shortCode}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">GST</label>
                      <p>{terminal.gst || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">PAN</label>
                      <p>{terminal.pan || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Currency</label>
                      <p>{terminal.currency}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Timezone</label>
                      <p>{terminal.timezone}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Billing Address</label>
                      <div className="space-y-1">
                        <p>{terminal.billingAddress}</p>
                        <p>{terminal.billingCity}, {terminal.billingPinCode}</p>
                        <p className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{terminal.billingPhone}</span>
                        </p>
                        {terminal.billingFax && (
                          <p>Fax: {terminal.billingFax}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Shipping Address</label>
                      <div className="space-y-1">
                        {terminal.sameAsBilling ? (
                          <p className="text-gray-500 italic">Same as billing address</p>
                        ) : (
                          <>
                            <p>{terminal.shippingAddress}</p>
                            <p>{terminal.shippingCity}, {terminal.shippingPinCode}</p>
                            <p className="flex items-center space-x-2">
                              <Phone className="h-4 w-4" />
                              <span>{terminal.shippingPhone}</span>
                            </p>
                            {terminal.shippingFax && (
                              <p>Fax: {terminal.shippingFax}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(terminal.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Port Details */}
            {port && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Ship className="h-5 w-5" />
                    <span>Port Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Port Name</label>
                        <p className="text-lg font-semibold">{port.portName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Display Name</label>
                        <p>{port.displayName}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 mt-1" />
                          <span>{port.address}</span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p>{port.state}, {port.country}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organization Details */}
            {organization && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Organization Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Organization Name</label>
                        <p className="text-lg font-semibold">{organization.organizationName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Display Name</label>
                        <p>{organization.displayName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Organization Code</label>
                        <p>{organization.organizationCode}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Country</label>
                        <p className="flex items-center space-x-2">
                          <Globe className="h-4 w-4" />
                          <span>{organization.country}</span>
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Register Office</label>
                        <p className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 mt-1" />
                          <span>{organization.registerOffice}</span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Telephone</label>
                        <p className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{organization.telephone || "Not provided"}</span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Website</label>
                        <p className="flex items-center space-x-2">
                          <Globe className="h-4 w-4" />
                          <span>{organization.website || "Not provided"}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
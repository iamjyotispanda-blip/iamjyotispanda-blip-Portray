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
    queryKey: ["/api/ports", (terminal as any)?.portId],
    enabled: !!(terminal as any)?.portId,
  });

  // Get organization details
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["/api/organizations", (port as any)?.organizationId],
    enabled: !!(port as any)?.organizationId,
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
            {/* Organization Details with Logo */}
            {organization && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Organization: <span className="text-blue-600 dark:text-blue-400">{(organization as any).organizationName}</span></span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-6 h-[120px]">
                    {/* Logo Section */}
                    <div className="flex-shrink-0 text-center">
                      {(organization as any).logoUrl ? (
                        <img 
                          src={(organization as any).logoUrl} 
                          alt={(organization as any).organizationName}
                          className="h-20 w-20 object-contain rounded-lg mx-auto"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={`h-20 w-20 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto ${(organization as any).logoUrl ? 'hidden' : ''}`}
                        style={{ display: (organization as any).logoUrl ? 'none' : 'flex' }}
                      >
                        <Building2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    
                    {/* Organization Details Grid */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 h-full">
                      {/* Organization Code */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex flex-col justify-center">
                        <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 text-center">
                          {(organization as any).organizationCode}
                        </p>
                      </div>
                      
                      {/* Country */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium">{(organization as any).country}</span>
                        </div>
                      </div>
                      
                      {/* Telephone */}
                      {(organization as any).telephone && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-center">
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm font-medium">{(organization as any).telephone}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Website or Register Office */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-center">
                        {(organization as any).website ? (
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate">
                              {(organization as any).website}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium truncate" title={(organization as any).registerOffice}>
                              {(organization as any).registerOffice}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Terminal Logo Section */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <label className="text-sm font-medium text-gray-500 block mb-3">Terminal Logo</label>
                      {(terminal as any).logoUrl ? (
                        <img 
                          src={(terminal as any).logoUrl} 
                          alt={(terminal as any).terminalName}
                          className="h-20 w-20 object-contain rounded-lg mx-auto"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={`h-20 w-20 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto ${(terminal as any).logoUrl ? 'hidden' : ''}`}
                        style={{ display: (terminal as any).logoUrl ? 'none' : 'flex' }}
                      >
                        <Ship className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-2">Terminal Name</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{terminal.terminalName}</p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-2">Short Code</label>
                      <p className="font-mono text-lg font-semibold bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-2 rounded inline-block">
                        {terminal.shortCode}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-2">GST</label>
                        <p className="text-gray-900 dark:text-white">{terminal.gst || "Not provided"}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-2">PAN</label>
                        <p className="text-gray-900 dark:text-white">{terminal.pan || "Not provided"}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-2">Currency</label>
                        <p className="text-gray-900 dark:text-white">{terminal.currency}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-2">Timezone</label>
                        <p className="text-gray-900 dark:text-white">{terminal.timezone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-3">Billing Address</label>
                      <div className="space-y-2">
                        <p className="text-gray-900 dark:text-white">{terminal.billingAddress}</p>
                        <p className="text-gray-700 dark:text-gray-300">{terminal.billingCity}, {terminal.billingPinCode}</p>
                        <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                          <Phone className="h-4 w-4" />
                          <span>{terminal.billingPhone}</span>
                        </div>
                        {terminal.billingFax && (
                          <p className="text-gray-600 dark:text-gray-400">Fax: {terminal.billingFax}</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-3">Shipping Address</label>
                      <div className="space-y-2">
                        {terminal.sameAsBilling ? (
                          <p className="text-gray-500 italic">Same as billing address</p>
                        ) : (
                          <>
                            <p className="text-gray-900 dark:text-white">{terminal.shippingAddress}</p>
                            <p className="text-gray-700 dark:text-gray-300">{terminal.shippingCity}, {terminal.shippingPinCode}</p>
                            <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                              <Phone className="h-4 w-4" />
                              <span>{terminal.shippingPhone}</span>
                            </div>
                            {terminal.shippingFax && (
                              <p className="text-gray-600 dark:text-gray-400">Fax: {terminal.shippingFax}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-2">Created</label>
                      <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(terminal.createdAt).toLocaleDateString()}</span>
                      </div>
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


          </div>
        </main>
      </div>
    </AppLayout>
  );
}
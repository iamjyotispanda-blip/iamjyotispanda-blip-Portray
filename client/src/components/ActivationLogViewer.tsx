import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, User, Calendar, Activity } from "lucide-react";

interface ActivationLogViewerProps {
  terminalId: number;
  terminalName?: string;
}

interface ActivationLogEntry {
  id: number;
  terminalId: number;
  action: string;
  description: string;
  performedBy: string;
  data?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export function ActivationLogViewer({ terminalId, terminalName }: ActivationLogViewerProps) {
  const { data: logs = [], isLoading } = useQuery<ActivationLogEntry[]>({
    queryKey: ["/api/terminals", terminalId, "activation-log"],
    enabled: !!terminalId,
  });

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "submitted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "updated":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "activated":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "approved":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "submitted":
        return <FileText className="h-4 w-4" />;
      case "updated":
        return <Activity className="h-4 w-4" />;
      case "activated":
        return <Activity className="h-4 w-4" />;
      case "rejected":
        return <FileText className="h-4 w-4" />;
      case "approved":
        return <Activity className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Activation Log</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">Loading activation logs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Activation Log</span>
          {terminalName && (
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
              - {terminalName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No activation logs available</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  className="relative border-l-2 border-gray-200 dark:border-gray-700 pl-4 pb-4"
                  data-testid={`activation-log-entry-${log.id}`}
                >
                  {index !== logs.length - 1 && (
                    <div className="absolute left-0 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div className="absolute left-[-5px] top-2 w-3 h-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full" />
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={`capitalize ${getActionColor(log.action)}`}>
                          <span className="flex items-center space-x-1">
                            {getActionIcon(log.action)}
                            <span>{log.action}</span>
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                      {log.description}
                    </p>
                    
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <User className="h-3 w-3 mr-1" />
                      <span>
                        {log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.role})` : 'Unknown User'}
                      </span>
                    </div>
                    
                    {log.data && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                        <details>
                          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                            Additional Details
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {JSON.stringify(JSON.parse(log.data), null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

// Higher-order component for permission-based rendering
export function withPermission<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  requiredPermission: { section: string; subsection?: string; level?: 'read' | 'write' | 'manage' }
) {
  return function PermissionWrapper(props: T) {
    const { hasPermission } = usePermissions();
    
    if (!hasPermission(requiredPermission.section, requiredPermission.subsection, requiredPermission.level)) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">You don't have permission to access this feature.</p>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}

// Component for conditional rendering based on permissions
export function PermissionGate({ 
  children, 
  section, 
  subsection, 
  level = 'read',
  fallback = null 
}: {
  children: React.ReactNode;
  section: string;
  subsection?: string;
  level?: 'read' | 'write' | 'manage';
  fallback?: React.ReactNode;
}) {
  const { hasPermission } = usePermissions();
  
  if (hasPermission(section, subsection, level)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

// Button wrapper with permission check
export function PermissionButton({
  section,
  subsection,
  level = 'read',
  children,
  fallback,
  ...props
}: {
  section: string;
  subsection?: string;
  level?: 'read' | 'write' | 'manage';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <PermissionGate
      section={section}
      subsection={subsection}
      level={level}
      fallback={fallback}
    >
      <button {...props}>{children}</button>
    </PermissionGate>
  );
}
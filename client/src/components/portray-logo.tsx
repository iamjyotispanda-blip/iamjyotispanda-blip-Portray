import { useTheme } from "./theme-provider";

interface PortrayLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PortrayLogo({ className = "", size = "md" }: PortrayLogoProps) {
  const { theme } = useTheme();
  
  // Determine if we should show dark or light logo
  const isDark = theme === "dark" || 
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16"
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* CSM Text */}
      <div className="text-gray-800 dark:text-white font-bold text-lg mr-2">
        CSM
      </div>
      
      {/* PortRay Logo with gradient effect */}
      <div className="flex items-center">
        <div className="font-bold text-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent">
          portray
        </div>
        
        {/* Lighthouse icon with gradient */}
        <div className="ml-2 relative">
          <svg 
            className={`${sizeClasses[size]} w-auto`}
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Lighthouse base */}
            <path 
              d="M12 2L14 8H10L12 2Z" 
              fill="url(#portrayGradient)"
            />
            <rect 
              x="10" 
              y="8" 
              width="4" 
              height="10" 
              fill="url(#portrayGradient)"
            />
            <rect 
              x="8" 
              y="18" 
              width="8" 
              height="2" 
              fill="url(#portrayGradient)"
            />
            <rect 
              x="6" 
              y="20" 
              width="12" 
              height="2" 
              fill="url(#portrayGradient)"
            />
            
            {/* Light beam */}
            <path 
              d="M12 2L20 6L18 8L12 4L6 8L4 6L12 2Z" 
              fill="url(#lightGradient)" 
              opacity="0.6"
            />
            
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="portrayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#FF7043" />
              </linearGradient>
              <linearGradient id="lightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}

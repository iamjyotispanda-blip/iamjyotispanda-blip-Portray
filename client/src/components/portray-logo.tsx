import { useTheme } from "./theme-provider";
import portrayLogoBlack from "@assets/Portray_logo_black_1754125058482.png";
import portrayLogoWhite from "@assets/Portray_logo_white_1754125058490.png";

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
      <img 
        src={isDark ? portrayLogoWhite : portrayLogoBlack}
        alt="CSM PortRay Logo"
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
}

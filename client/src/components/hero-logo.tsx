import portrayLogoWhite from "@assets/Portray_logo_white_1754126276022.png";

interface HeroLogoProps {
  className?: string;
}

export function HeroLogo({ className = "" }: HeroLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src={portrayLogoWhite}
        alt="CSM PortRay Logo"
        className="h-16 w-auto object-contain"
      />
    </div>
  );
}
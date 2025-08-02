interface HeroLogoProps {
  className?: string;
}

export function HeroLogo({ className = "" }: HeroLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      {/* CSM Text */}
      <div className="text-white font-bold text-lg mr-2">
        CSM
      </div>
      
      {/* PortRay Logo with white gradient effect */}
      <div className="flex items-center">
        <div className="font-bold text-3xl bg-gradient-to-r from-white via-blue-100 to-orange-200 bg-clip-text text-transparent">
          portray
        </div>
        
        {/* Lighthouse icon with white/light gradient */}
        <div className="ml-2 relative">
          <svg 
            className="h-12 w-auto"
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Lighthouse base */}
            <path 
              d="M12 2L14 8H10L12 2Z" 
              fill="url(#whitePortrayGradient)"
            />
            <rect 
              x="10" 
              y="8" 
              width="4" 
              height="10" 
              fill="url(#whitePortrayGradient)"
            />
            <rect 
              x="8" 
              y="18" 
              width="8" 
              height="2" 
              fill="url(#whitePortrayGradient)"
            />
            <rect 
              x="6" 
              y="20" 
              width="12" 
              height="2" 
              fill="url(#whitePortrayGradient)"
            />
            
            {/* Light beam */}
            <path 
              d="M12 2L20 6L18 8L12 4L6 8L4 6L12 2Z" 
              fill="url(#whiteLightGradient)" 
              opacity="0.8"
            />
            
            {/* Gradient definitions for white/light theme */}
            <defs>
              <linearGradient id="whitePortrayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#e0e7ff" />
                <stop offset="100%" stopColor="#fed7aa" />
              </linearGradient>
              <linearGradient id="whiteLightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#dbeafe" />
                <stop offset="100%" stopColor="#fef3c7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
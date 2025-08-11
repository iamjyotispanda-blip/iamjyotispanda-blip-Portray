import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onFocus, onBlur, onKeyUp, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    
    const setRef = React.useCallback((node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Prevent mobile viewport jumping on focus
      if (window.innerWidth <= 768) {
        e.target.style.position = 'relative';
        e.target.style.zIndex = '1000';
        // Delay to ensure keyboard is visible
        setTimeout(() => {
          e.target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 300);
      }
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Reset styles on blur
      if (window.innerWidth <= 768) {
        e.target.style.position = '';
        e.target.style.zIndex = '';
      }
      if (onBlur) onBlur(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent focus loss on keyup by ensuring the element stays focused
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
      if (onKeyUp) onKeyUp(e);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyUp={handleKeyUp}
        ref={setRef}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

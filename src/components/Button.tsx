import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth = false, children, ...props }, ref) => {
    const baseStyles = 'relative inline-flex items-center justify-center font-geist transition-all duration-300 ease-out overflow-hidden';
    
    const variants = {
      primary: 'bg-white text-black hover:bg-neutral-200 border border-white',
      outline: 'bg-transparent text-white border border-white/20 hover:border-white hover:bg-white/5',
      ghost: 'bg-transparent text-white/70 hover:text-white hover:bg-white/5 border border-transparent',
    };

    const sizes = {
      sm: 'text-xs px-4 py-2',
      md: 'text-sm px-6 py-3',
      lg: 'text-base px-8 py-4',
    };

    const width = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
        {...props}
      >
        <span className="relative z-10 font-medium tracking-wide uppercase">{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

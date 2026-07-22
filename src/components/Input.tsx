import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, fullWidth = true, ...props }, ref) => {
    const width = fullWidth ? 'w-full' : '';

    return (
      <div className={`flex flex-col gap-1.5 ${width}`}>
        {label && (
          <label className="text-sm font-geist text-white/70 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`
              ${width} 
              bg-transparent 
              border border-white/20 
              rounded-none 
              px-4 py-3 
              text-white font-inter font-light
              placeholder:text-white/30 
              focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20
              transition-colors duration-300
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs text-red-500 font-inter font-light mt-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

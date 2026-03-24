import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    icon, 
    fullWidth = false,
    children,
    className = '',
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm hover:shadow-md',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
      outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-500',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 size={size === 'sm' ? 14 : size === 'md' ? 18 : 20} className="animate-spin" />}
        {!isLoading && icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;


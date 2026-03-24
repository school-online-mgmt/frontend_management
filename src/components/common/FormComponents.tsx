import React from 'react';

// ============= CARD COMPONENT =============
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  bordered?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, bordered = true, className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`bg-white rounded-xl ${bordered ? 'border border-slate-100' : ''} shadow-sm ${hoverable ? 'hover:shadow-md' : ''} transition-shadow duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';

// ============= CARD HEADER COMPONENT =============
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`border-b border-slate-100 px-6 py-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

// ============= CARD TITLE COMPONENT =============
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-lg font-semibold text-slate-900 ${className}`}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

// ============= CARD CONTENT COMPONENT =============
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

// ============= CARD FOOTER COMPONENT =============
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

// ============= BADGE COMPONENT =============
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'md', className = '', children, ...props }, ref) => {
    const variantClasses = {
      success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      warning: 'bg-amber-100 text-amber-700 border border-amber-200',
      danger: 'bg-red-100 text-red-700 border border-red-200',
      info: 'bg-blue-100 text-blue-700 border border-blue-200',
      neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1.5 rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

// ============= ALERT COMPONENT =============
type AlertType = 'success' | 'warning' | 'error' | 'info';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  icon?: React.ReactNode;
  title?: string;
  onClose?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ type = 'info', icon, title, onClose, className = '', children, ...props }, ref) => {
    const typeClasses = {
      success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    return (
      <div
        ref={ref}
        className={`rounded-lg border p-4 ${typeClasses[type]} ${className}`}
        {...props}
      >
        <div className="flex gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <div className="flex-1">
            {title && <h4 className="font-semibold mb-1">{title}</h4>}
            <div className="text-sm">{children}</div>
          </div>
          {onClose && (
            <button onClick={onClose} className="flex-shrink-0 opacity-50 hover:opacity-100 transition">
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }
);
Alert.displayName = 'Alert';

// ============= EMPTY STATE COMPONENT =============
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="text-center py-12 px-6">
    {icon && <div className="w-16 h-16 mx-auto mb-4 text-slate-300">{icon}</div>}
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    {description && <p className="text-slate-500 mb-6">{description}</p>}
    {action && <div>{action}</div>}
  </div>
);

// ============= INPUT FIELD COMPONENT =============
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, help, icon, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input
          ref={ref}
          className={`w-full px-4 py-3 ${icon ? 'pl-10' : ''} rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {help && <p className="mt-1 text-sm text-slate-500">{help}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ============= SELECT COMPONENT =============
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options = [], className = '', children, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <select
        ref={ref}
        className={`w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 bg-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      >
        {options.length > 0 ? (
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        ) : (
          children
        )}
      </select>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';


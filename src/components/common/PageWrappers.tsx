import React from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ children, className = '' }) => (
  <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50 ${className}`}>
    {children}
  </div>
);

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContent: React.FC<PageContentProps> = ({ children, className = '' }) => (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 ${className}`}>
    {children}
  </div>
);

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className = '' }) => (
  <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 ${className}`}>
    <div>
      <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-slate-600 mt-2 text-lg">{subtitle}</p>}
    </div>
    {actions && (
      <div className="flex gap-3 flex-wrap">
        {actions}
      </div>
    )}
  </div>
);

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}

export const Section: React.FC<SectionProps> = ({ children, className = '', spacing = 'lg' }) => {
  const spacingClasses = {
    sm: 'mb-6',
    md: 'mb-8',
    lg: 'mb-12',
  };

  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  );
};

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, icon }) => (
  <div className="mb-6">
    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
      {icon}
      {title}
    </h2>
    {subtitle && <p className="text-slate-600 mt-2">{subtitle}</p>}
  </div>
);


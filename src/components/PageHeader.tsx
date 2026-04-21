import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  gradient?: string;
}

const PageHeader = ({ icon: Icon, title, subtitle, actions, gradient = "from-emerald-600 via-teal-600 to-cyan-600" }: PageHeaderProps) => (
  <header className={`shrink-0 bg-gradient-to-r ${gradient} text-white px-6 py-5`}>
    <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  </header>
);

export default PageHeader;


import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  gradient?: string;
}

/**
 * Standard management-portal page header.
 *
 * Mobile UX: padding tightens on small screens (`px-3` → `lg:px-6`), title
 * shrinks (`text-base` → `lg:text-lg`), the icon tile drops one size, and
 * actions are pushed onto their own row below the title using `flex-wrap`.
 * The container uses `min-w-0` + `truncate` so long titles never push the
 * action buttons off-screen on a 320px-wide device.
 */
const PageHeader = ({ icon: Icon, title, subtitle, actions, gradient = "from-emerald-600 via-teal-600 to-cyan-600" }: PageHeaderProps) => (
  <header className={`shrink-0 bg-gradient-to-r ${gradient} text-white px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5`}>
    <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2 sm:gap-3">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/15 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 shrink-0">
          <Icon size={16} className="text-white sm:hidden" />
          <Icon size={20} className="text-white hidden sm:block" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-white/70 text-[10px] sm:text-xs mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">{actions}</div>}
    </div>
  </header>
);

export default PageHeader;

import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, LogOut, School, Users,
  UserPlus, UserCog, Layers, ClipboardList, Bell, Calendar, CreditCard,
  ChevronLeft, Menu, X, ChevronDown, Settings, HelpCircle,
  Megaphone, ClipboardCheck, UserCheck, CalendarDays, Library, BarChart3,
  GraduationCap, BookMarked, MessageSquare, Wallet, ChevronRight,
} from "lucide-react";
import useAuth from "../hooks/useAuth";

/* ── Nav configuration ─────────────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    collapsible: false,
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "People",
    icon: Users,
    collapsible: true,
    items: [
      { path: "/applicants-home", label: "Applicants", icon: UserPlus },
      { path: "/students-home", label: "Students", icon: Users },
      { path: "/staff", label: "Staff Accounts", icon: Settings },
    ],
  },
  {
    label: "Teachers",
    icon: UserCog,
    collapsible: true,
    items: [
      { path: "/teacher-home", label: "Teachers", icon: UserCog },
      { path: "/assignments", label: "Assignments", icon: ClipboardList },
    ],
  },
  {
    label: "Academics",
    icon: GraduationCap,
    collapsible: true,
    items: [
      { path: "/subject-Home", label: "Subjects", icon: BookOpen },
      { path: "/class-Home", label: "Classes", icon: Layers },
    ],
  },
  {
    label: "Studies",
    icon: BookMarked,
    collapsible: true,
    items: [
      { path: "/exam-home", label: "Exams", icon: ClipboardList },
      { path: "/performance", label: "Performance", icon: BarChart3 },
    ],
  },
  {
    label: "Attendance",
    icon: ClipboardCheck,
    collapsible: true,
    items: [
      { path: "/attendance", label: "Student Attendance", icon: ClipboardCheck },
      { path: "/teacher-attendance", label: "Teacher Attendance", icon: UserCheck },
      { path: "/leaves", label: "Leave Management", icon: CalendarDays },
    ],
  },
  {
    label: "Library",
    icon: Library,
    collapsible: true,
    items: [
      { path: "/library", label: "Library", icon: Library },
    ],
  },
  {
    label: "Communication",
    icon: MessageSquare,
    collapsible: true,
    items: [
      { path: "/notices", label: "Notice Board", icon: Megaphone },
      { path: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Finance",
    icon: Wallet,
    collapsible: true,
    items: [
      { path: "/fees", label: "Fee Management", icon: CreditCard },
    ],
  },
];

const getInitials = (first?: string, last?: string) =>
  `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase() || "A";

/* ── Layout Component ──────────────────────────────────────────────────── */
const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const NAV_SCROLL_KEY = "nav_scroll_top";

  // Track which sections are expanded — default all to expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_SECTIONS.forEach(s => {
      if (!s.collapsible || s.items.length <= 1) return;
      initial[s.label] = true;
    });
    return initial;
  });

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-expand section containing the active route
  useEffect(() => {
    NAV_SECTIONS.forEach(s => {
      if (!s.collapsible || s.items.length <= 1) return;
      const hasActive = s.items.some(i =>
        location.pathname === i.path ||
        (i.path !== "/dashboard" && location.pathname.startsWith(i.path.split("-")[0]) && i.path.split("-")[0].length > 1)
      );
      if (hasActive) {
        setExpandedSections(prev => prev[s.label] ? prev : { ...prev, [s.label]: true });
      }
    });
  }, [location.pathname]);

  // Persist nav scroll position across refreshes
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = sessionStorage.getItem(NAV_SCROLL_KEY);
    if (saved) nav.scrollTop = parseInt(saved, 10);
    const onScroll = () => sessionStorage.setItem(NAV_SCROLL_KEY, String(nav.scrollTop));
    nav.addEventListener("scroll", onScroll, { passive: true });
    return () => nav.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/dashboard" && location.pathname === "/") ||
    (path !== "/dashboard" && location.pathname.startsWith(path.split("-")[0]) && path.split("-")[0].length > 1);

  const isSectionActive = (section: typeof NAV_SECTIONS[0]) =>
    section.items.some(i => isActive(i.path));


  /* ── Sidebar ─────────────────────────────────────────────────────────── */
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const showFull = !collapsed || isMobile;

    return (
      <div className="flex flex-col h-full bg-slate-900">
        {/* Brand */}
        <div className={`flex items-center h-14 border-b border-white/[0.06] shrink-0 ${showFull ? "px-4" : "justify-center px-2"}`}>
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/25">
              <School size={16} className="text-emerald-400" />
            </div>
            {showFull && (
              <div className="min-w-0">
                <h1 className="text-xs font-bold text-white tracking-tight leading-none">EduAdmin</h1>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">Management Portal</p>
              </div>
            )}
          </Link>
          {isMobile && (
            <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav ref={isMobile ? undefined : navRef} className={`flex-1 overflow-y-auto py-3 ${showFull ? "px-2.5" : "px-1.5"} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
          <div className="space-y-0.5">
            {NAV_SECTIONS.map((section) => {
              const sectionActive = isSectionActive(section);
              const isExpanded = expandedSections[section.label] ?? false;
              const SectionIcon = section.icon;
              const isSingleItem = section.collapsible && section.items.length === 1;

              // Non-collapsible sections (Dashboard) or single-item collapsible sections — render as flat links
              if (!section.collapsible || isSingleItem) {
                return (
                  <div key={section.label}>
                    {section.collapsible && showFull && (
                      <p className="px-2.5 mt-3 mb-1 text-[9px] font-semibold text-slate-600 uppercase tracking-widest">{section.label}</p>
                    )}
                    {section.items.map((item) => {
                      const active = isActive(item.path);
                      return (
                        <Link key={item.path} to={item.path}
                          title={!showFull ? item.label : undefined}
                          className={`group flex items-center gap-2.5 rounded-lg transition-all duration-200 relative
                            ${showFull ? "px-2.5 py-2" : "justify-center px-2 py-2"}
                            ${active
                              ? "bg-emerald-500/15 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.1)]"
                              : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                            }`}
                        >
                          {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-emerald-400 rounded-r-full transition-all duration-300" />}
                          <item.icon size={16} strokeWidth={active ? 2.2 : 1.8}
                            className={`shrink-0 transition-all duration-200 ${active ? "text-emerald-400 scale-110" : "text-slate-500 group-hover:text-slate-300"}`} />
                          {showFull && <span className={`text-xs truncate transition-colors duration-200 ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              // Collapsed sidebar: show individual item icons
              if (!showFull) {
                return (
                  <div key={section.label} className="space-y-0.5">
                    <div className="mx-auto w-5 border-t border-white/[0.06] my-1.5" />
                    {section.items.map((item) => {
                      const active = isActive(item.path);
                      return (
                        <Link key={item.path} to={item.path} title={item.label}
                          className={`group flex justify-center px-2 py-2 rounded-lg transition-all duration-200 relative
                            ${active ? "bg-emerald-500/15 text-emerald-400" : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"}`}
                        >
                          {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-emerald-400 rounded-r-full" />}
                          <item.icon size={16} strokeWidth={active ? 2.2 : 1.8}
                            className={`shrink-0 transition-all duration-200 ${active ? "text-emerald-400 scale-110" : "text-slate-500 group-hover:text-slate-300"}`} />
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              // Multi-item collapsible bucket
              return (
                <div key={section.label} className="mt-1.5">
                  <button onClick={() => toggleSection(section.label)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg transition-all duration-200 group
                      ${sectionActive
                        ? "text-emerald-400"
                        : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                      }`}
                  >
                    <SectionIcon size={14} strokeWidth={1.8}
                      className={`shrink-0 transition-all duration-200 ${sectionActive ? "text-emerald-400" : "text-slate-600 group-hover:text-slate-400"}`} />
                    <span className={`text-[10px] flex-1 text-left truncate uppercase tracking-wider ${sectionActive ? "font-bold text-emerald-400/80" : "font-semibold text-slate-600"}`}>
                      {section.label}
                    </span>
                    <ChevronRight size={11}
                      className={`shrink-0 transition-all duration-300 ease-out ${isExpanded ? "rotate-90 text-slate-500" : "text-slate-700"}`} />
                  </button>

                  {/* Expandable items with smooth animation */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
                  >
                    <div className="ml-[13px] pl-2.5 border-l border-white/[0.06] mt-0.5 mb-1 space-y-0.5">
                      {section.items.map((item) => {
                        const active = isActive(item.path);
                        return (
                          <Link key={item.path} to={item.path}
                            className={`group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg transition-all duration-200 relative
                              ${active
                                ? "bg-emerald-500/15 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.1)]"
                                : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                              }`}
                          >
                            {active && <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 w-[2px] h-3 bg-emerald-400 rounded-full transition-all duration-300" />}
                            <item.icon size={14} strokeWidth={active ? 2.2 : 1.8}
                              className={`shrink-0 transition-all duration-200 ${active ? "text-emerald-400 scale-105" : "text-slate-500 group-hover:text-slate-400"}`} />
                            <span className={`text-[11px] truncate transition-colors duration-200 ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Bottom user area */}
        <div className={`border-t border-white/[0.06] shrink-0 ${showFull ? "p-2.5" : "p-2"}`}>
          {showFull ? (
            <>
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.04] mb-1.5">
                <div className="w-7 h-7 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 text-[10px] font-bold">{getInitials(user?.firstName, user?.lastName)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[9px] text-slate-500 truncate capitalize">{user?.role ?? "Admin"}</p>
                </div>
              </div>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-7 h-7 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-emerald-400 text-[10px] font-bold">{getInitials(user?.firstName, user?.lastName)}</span>
              </div>
              <button onClick={handleLogout} title="Sign Out"
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ease-in-out relative ${collapsed ? "w-[60px]" : "w-[240px]"}`}>
        <SidebarContent />
        {/* Collapse extender tab — matches the h-14 (56px) brand header */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex absolute -right-3 top-0 z-20 w-6 h-14 items-center justify-center bg-slate-800 hover:bg-slate-700 border border-white/[0.08] rounded-r-lg text-slate-400 hover:text-slate-200 transition-colors shadow-md"
        >
          <ChevronLeft size={13} className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 z-50 w-[260px] shadow-2xl transform transition-transform duration-200 ease-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent isMobile />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-12 bg-slate-900 border-b border-white/[0.06] flex items-center gap-3 px-4 lg:px-5 shrink-0 z-10">
          <button onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 -ml-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <Menu size={18} />
          </button>
          <div className="flex-1 min-w-0" />

          <div className="flex items-center gap-1">
            <button className="relative p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-slate-900" />
            </button>
            <div ref={profileRef} className="relative">
              <button onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
                <div className="w-7 h-7 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 text-[10px] font-bold">{getInitials(user?.firstName, user?.lastName)}</span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-white leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[10px] text-slate-500 capitalize mt-0.5">{user?.role ?? "Admin"}</p>
                </div>
                <ChevronDown size={12} className={`text-slate-500 transition-transform hidden sm:block ${profileOpen ? "rotate-180" : ""}`} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 py-1 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] text-slate-400">{user?.email ?? "admin@school.edu"}</p>
                  </div>
                  <div className="py-0.5">
                    <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50 transition-colors">
                      <Settings size={13} className="text-slate-400" /> Settings
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50 transition-colors">
                      <HelpCircle size={13} className="text-slate-400" /> Help & Support
                    </button>
                  </div>
                  <div className="border-t border-slate-100 pt-0.5">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100">
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;


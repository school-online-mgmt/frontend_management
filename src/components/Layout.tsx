import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, LogOut, School, GraduationCap, Users,
  UserPlus, UserCog, Layers, ClipboardList, Bell, Calendar, CreditCard,
  ChevronLeft, Menu, X, Search, ChevronDown, Settings, HelpCircle,
  Megaphone,
} from "lucide-react";
import useAuth from "../hooks/useAuth";

/* ── Nav configuration ─────────────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "People",
    items: [
      { path: "/applicants-home", label: "Applicants", icon: UserPlus },
      { path: "/students-home", label: "Students", icon: Users },
      { path: "/teacher-home", label: "Teachers", icon: UserCog },
    ],
  },
  {
    label: "Academics",
    items: [
      { path: "/subject-Home", label: "Subjects", icon: BookOpen },
      { path: "/course-Home", label: "Courses", icon: GraduationCap },
      { path: "/class-Home", label: "Classes", icon: Layers },
      { path: "/exam-home", label: "Exams", icon: ClipboardList },
    ],
  },
  {
    label: "Communication",
    items: [
      { path: "/notices", label: "Notice Board", icon: Megaphone },
      { path: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Finance",
    items: [
      { path: "/fees", label: "Fee Management", icon: CreditCard },
    ],
  },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */
const getPageTitle = (pathname: string): string => {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.path || pathname.startsWith(item.path.split("-")[0])) {
        return item.label;
      }
    }
  }
  return "Dashboard";
};

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

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/dashboard" && location.pathname === "/") ||
    (path !== "/dashboard" && location.pathname.startsWith(path.split("-")[0]) && path.split("-")[0].length > 1);

  const pageTitle = getPageTitle(location.pathname);

  /* ── Sidebar (dark, admin-authority feel) ─────────────────────────────── */
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Brand */}
      <div className={`flex items-center h-16 border-b border-white/[0.06] shrink-0 ${collapsed && !isMobile ? "justify-center px-3" : "px-5"}`}>
        <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/25">
            <School size={18} className="text-emerald-400" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">EduAdmin</h1>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Management Portal</p>
            </div>
          )}
        </Link>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-4 ${collapsed && !isMobile ? "px-2" : "px-3"}`}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            {(!collapsed || isMobile) && (
              <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            {collapsed && !isMobile && section.label !== "Overview" && (
              <div className="mx-auto w-6 border-t border-white/[0.06] mb-2" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed && !isMobile ? item.label : undefined}
                    className={`group flex items-center gap-3 rounded-lg transition-all duration-150 relative
                      ${collapsed && !isMobile ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}
                      ${active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                      }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 rounded-r-full" />
                    )}
                    <item.icon
                      size={18}
                      strokeWidth={active ? 2.2 : 1.8}
                      className={`shrink-0 transition-colors ${active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"}`}
                    />
                    {(!collapsed || isMobile) && (
                      <span className={`text-[13px] truncate ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user area */}
      <div className={`border-t border-white/[0.06] shrink-0 ${collapsed && !isMobile ? "p-2" : "p-3"}`}>
        {(!collapsed || isMobile) ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.04] mb-2">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                <span className="text-emerald-400 text-xs font-bold">{getInitials(user?.firstName, user?.lastName)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-slate-500 truncate capitalize">{user?.role ?? "Admin"}</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={15} /> Sign Out
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <span className="text-emerald-400 text-xs font-bold">{getInitials(user?.firstName, user?.lastName)}</span>
            </div>
            <button onClick={handleLogout} title="Sign Out"
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ease-in-out ${collapsed ? "w-[68px]" : "w-[260px]"}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 z-50 w-[280px] shadow-2xl transform transition-transform duration-200 ease-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent isMobile />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-4 lg:px-6 shrink-0 z-10">
          <button onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <Menu size={20} />
          </button>
          <button onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex items-center justify-center w-8 h-8 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft size={18} className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 truncate">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-1">
            <button className="flex items-center gap-2 h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors">
              <Search size={14} />
              <span className="hidden sm:inline">Search…</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400 ml-2">⌘K</kbd>
            </button>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>
            <div ref={profileRef} className="relative">
              <button onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-700 text-xs font-bold">{getInitials(user?.firstName, user?.lastName)}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform hidden sm:block ${profileOpen ? "rotate-180" : ""}`} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 py-1 z-50">
                  <div className="px-3 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-slate-400">{user?.email ?? "admin@school.edu"}</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                      <Settings size={14} className="text-slate-400" /> Settings
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                      <HelpCircle size={14} className="text-slate-400" /> Help & Support
                    </button>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut size={14} /> Sign Out
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


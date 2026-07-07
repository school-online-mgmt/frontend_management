import { useState, useEffect, useRef } from "react";
import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, LogOut, School, Users,
  UserPlus, UserCog, Layers, ClipboardList, Calendar, CreditCard,
  ChevronLeft, Menu, X, ChevronDown, Settings, HelpCircle,
  Megaphone, ClipboardCheck, UserCheck, CalendarDays, Library, BarChart3,
  GraduationCap, BookMarked, MessageSquare, Wallet, ChevronRight, Bus,
  KeyRound, Eye, EyeOff, Send, Trophy, Zap, Package,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { useAuthContext } from "../context/AuthContext";
import { SessionProvider } from "../context/SessionContext";
import TopbarSessionSelector from "./common/TopbarSessionSelector";
import TopbarClock from "./common/TopbarClock";
import api from "../api/api";
import DesktopOnlyGate from "./DesktopOnlyGate";
import PageFooter from "./PageFooter";
import OverdueBillsBanner from "./OverdueBillsBanner";

/* ── Nav configuration ─────────────────────────────────────────────────── */
// module: matches AppModule enum. null = always visible (no permission needed)
const NAV_SECTIONS = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    collapsible: false,
    module: null,
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "People",
    icon: Users,
    collapsible: true,
    module: "PEOPLE" as const,
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
    module: "TEACHERS" as const,
    items: [
      { path: "/teacher-home", label: "Teachers", icon: UserCog },
      { path: "/assignments", label: "Assignments", icon: ClipboardList },
    ],
  },
  {
    label: "Academics",
    icon: GraduationCap,
    collapsible: true,
    module: "ACADEMICS" as const,
    items: [
      { path: "/sessions", label: "Sessions", icon: CalendarDays },
      { path: "/class-Home", label: "Classes", icon: Layers },
      { path: "/course-Home", label: "Courses", icon: BookMarked },
      { path: "/subject-Home", label: "Subjects", icon: BookOpen },
    ],
  },
  {
    label: "Studies",
    icon: BookMarked,
    collapsible: true,
    module: "STUDIES" as const,
    items: [
      { path: "/exam-home", label: "Exams", icon: ClipboardList },
      { path: "/performance", label: "Performance", icon: BarChart3 },
    ],
  },
  {
    label: "Attendance",
    icon: ClipboardCheck,
    collapsible: true,
    module: "ATTENDANCE" as const,
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
    module: "LIBRARY" as const,
    items: [
      { path: "/library", label: "Library", icon: Library },
    ],
  },
  {
    label: "Sports",
    icon: Trophy,
    collapsible: true,
    module: "SPORTS" as const,
    items: [
      { path: "/sports", label: "Sports", icon: Trophy },
    ],
  },
  {
    label: "Homework",
    icon: BookMarked,
    module: "HOMEWORK" as const,
    items: [
      { path: "/homework", label: "Homework", icon: BookMarked },
    ],
  },
  {
    label: "Timetable",
    icon: CalendarDays,
    module: "TIMETABLE" as const,
    items: [
      { path: "/timetable", label: "Timetable", icon: CalendarDays },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    collapsible: true,
    module: "INVENTORY" as const,
    items: [
      { path: "/inventory", label: "Inventory", icon: Package },
    ],
  },
  {
    label: "Communication",
    icon: MessageSquare,
    collapsible: true,
    module: "COMMUNICATION" as const,
    items: [
      { path: "/notices",       label: "Notice Board",  icon: Megaphone },
      { path: "/communication", label: "Email Blast",   icon: Send },
      { path: "/calendar",      label: "Calendar",      icon: Calendar },
    ],
  },
  {
    label: "Finance",
    icon: Wallet,
    collapsible: true,
    module: "FINANCE" as const,
    items: [
      { path: "/fees", label: "Fee Management", icon: CreditCard },
      { path: "/transport", label: "Transport", icon: Bus },
    ],
  },
  {
    label: "Account",
    icon: School,
    collapsible: true,
    module: null,
    items: [
      { path: "/account",         label: "My Account",     icon: School },
      { path: "/platform-bills",  label: "Platform Bills", icon: Wallet },
      { path: "/jobs",            label: "Scheduled Jobs", icon: Zap },
      { path: "/support",         label: "Support Center", icon: MessageSquare },
    ],
  },
];

const getInitials = (first?: string, last?: string) =>
  `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase() || "A";

/* ── Change Password Modal ──────────────────────────────────────────────── */
const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setIsSubmitting(true);
    try {
      await api.changeOwnPassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <KeyRound size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">Update your account password</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <KeyRound size={22} className="text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">Password changed successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>
            )}
            {[
              { label: "Current Password", value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
              { label: "New Password", value: newPassword, setter: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
              { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
            ].map(({ label, value, setter, show, toggle }) => (
              <div key={label}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={e => setter(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                  <button type="button" onClick={toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {isSubmitting ? "Changing..." : "Change Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ── Layout Component ──────────────────────────────────────────────────── */
const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { canUseModule } = useAuthContext();

  const [collapsed, setCollapsed] = useState(false);
  const [schoolName, setSchoolName] = useState<string>("EduAdmin");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
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

  // Resolve the school name once on mount: drive the sidebar brand heading and
  // publish it to a global so PageFooter can render it without wiring a context.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__schoolName) { setSchoolName(window.__schoolName); return; }
    api.getTenantConfig()
      .then((res: any) => {
        const name = res?.config?.schoolName?.trim();
        if (name) {
          window.__schoolName = name;
          setSchoolName(name);
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-expand section containing the active route. Uses the same
  // exact-or-`/<base>/:id` rule as `isActive` so we never expand the
  // wrong section.
  useEffect(() => {
    const matches = (path: string) => {
      const p = location.pathname;
      if (p === path) return true;
      if (path === "/dashboard" && p === "/") return true;
      const dash = path.indexOf("-");
      if (dash > 0) {
        const base = path.slice(0, dash);
        const suffix = path.slice(dash + 1).toLowerCase();
        if (suffix === "home" && base.length > 1) {
          if (p === base || p.startsWith(base + "/")) return true;
        }
      }
      return false;
    };
    NAV_SECTIONS.forEach(s => {
      if (!s.collapsible || s.items.length <= 1) return;
      if (s.items.some(i => matches(i.path))) {
        setExpandedSections(prev => prev[s.label] ? prev : { ...prev, [s.label]: true });
      }
    });
  }, [location.pathname]);

  // Persist nav scroll position across hard refreshes. Across in-app
  // navigation we don't need this at all because SidebarContent is now
  // invoked as a function (not a JSX component), so React diffs the nav
  // subtree in place — the scroll offset survives route changes for free.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = sessionStorage.getItem(NAV_SCROLL_KEY);
    if (saved) nav.scrollTop = parseInt(saved, 10);
    const onScroll = () => sessionStorage.setItem(NAV_SCROLL_KEY, String(nav.scrollTop));
    nav.addEventListener("scroll", onScroll, { passive: true });
    return () => nav.removeEventListener("scroll", onScroll);
  }, []);

  // Make sure the active nav item is in view whenever the route changes.
  // Uses `block: "nearest"` so we never scroll if the active link is
  // already visible — the user's manual scroll position wins. Only when
  // the active item would be off-screen do we nudge it into view.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // Defer to the next frame so the DOM has settled after the click +
    // any expand/collapse re-render kicked off by `setExpandedSections`.
    const id = requestAnimationFrame(() => {
      const active = nav.querySelector<HTMLAnchorElement>('[data-active="true"]');
      if (!active) return;
      const navRect = nav.getBoundingClientRect();
      const elRect = active.getBoundingClientRect();
      const offscreen = elRect.top < navRect.top || elRect.bottom > navRect.bottom;
      if (offscreen) active.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  // A nav item is active when the current pathname is its `path` exactly,
  // OR — for the convention `/<entity>-home` list pages — when we're on
  // a detail route `/<entity>/:id`. Crucially, we do NOT treat other
  // dashed routes (like `/teacher-attendance`) as variants of `/teacher`,
  // which the old prefix-on-first-dash heuristic did and caused two nav
  // items to highlight when on `/teacher-home`.
  const isActive = (path: string) => {
    const p = location.pathname;
    if (p === path) return true;
    if (path === "/dashboard" && p === "/") return true;
    const dash = path.indexOf("-");
    if (dash > 0) {
      const base   = path.slice(0, dash);            // "/teacher" from "/teacher-home"
      const suffix = path.slice(dash + 1).toLowerCase(); // "home"
      // Only the *-home / *-Home list page claims its `/<base>/:id`
      // detail route. Sibling dashed routes (teacher-attendance, etc.)
      // are exact-match only.
      if (suffix === "home" && base.length > 1) {
        if (p === base || p.startsWith(base + "/")) return true;
      }
    }
    return false;
  };

  const isSectionActive = (section: typeof NAV_SECTIONS[0]) =>
    section.items.some(i => isActive(i.path));

  // Sections the current user may see. Account (My Account, Platform Bills,
  // Scheduled Jobs, Support) is ADMIN-only — matches the AdminRoute guard.
  const hideAccount = user?.role !== 'ADMIN';
  const visibleSections = NAV_SECTIONS.filter(s => {
    if (s.label === 'Account' && hideAccount) return false;
    return s.module === null || canUseModule(s.module);
  });

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
                <h1 className="text-xs font-bold text-white tracking-tight leading-none truncate">{schoolName}</h1>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">Management Portal</p>
              </div>
            )}
          </Link>
          {isMobile && (
            <button onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="ml-auto w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors active:bg-white/20">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav ref={isMobile ? undefined : navRef} className={`flex-1 overflow-y-auto py-3 ${showFull ? "px-2.5" : "px-1.5"} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
          <div className="space-y-0.5">
            {visibleSections.map((section) => {
              const sectionActive = isSectionActive(section);
              const isExpanded = expandedSections[section.label] ?? false;
              const SectionIcon = section.icon;
              const isSingleItem = section.collapsible && section.items.length === 1;

              // Non-collapsible sections (Dashboard) or single-item collapsible sections — render as flat links
              if (!section.collapsible || isSingleItem) {
                return (
                  <div key={section.label}>
                    {/* Only show the section title when it groups more than one
                        item. Single-item sections (Library, Sports, Homework,
                        Timetable, Inventory) render as a bare link — no header. */}
                    {section.collapsible && showFull && section.items.length > 1 && (
                      <p className="px-2.5 mt-3 mb-1 text-[9px] font-semibold text-slate-600 uppercase tracking-widest">{section.label}</p>
                    )}
                    {section.items.map((item) => {
                      const active = isActive(item.path);
                      return (
                        <Link key={item.path} to={item.path}
                          data-testid={`nav-item-${item.path.replace(/\//g, "")}`}
                          data-nav-label={item.label}
                          data-active={active ? "true" : undefined}
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
                          data-testid={`nav-item-${item.path.replace(/\//g, "")}`}
                          data-nav-label={item.label}
                          data-active={active ? "true" : undefined}
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
                    data-testid={`nav-section-${section.label.toLowerCase().replace(/\s+/g, "-")}`}
                    data-section-label={section.label}
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
                            data-testid={`nav-item-${item.path.replace(/\//g, "")}`}
                            data-nav-label={item.label}
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

        {/* Bottom user area — pads for iOS home indicator on mobile */}
        <div className={`border-t border-white/[0.06] shrink-0 ${showFull ? "p-2.5" : "p-2"}`}
          style={isMobile ? { paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" } : undefined}>
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
    <SessionProvider>
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile devices see a desktop-required gate instead of the cramped layout */}
      <DesktopOnlyGate />
      {changePasswordOpen && <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />}
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ease-in-out relative ${collapsed ? "w-[60px]" : "w-[240px]"}`}>
        {/* Invoke SidebarContent as a plain function call (not as a JSX
            component) so React diffs the returned JSX in place across
            route changes. Rendering it as `<SidebarContent />` would
            create a new component type on every Layout render — that
            unmounts the <nav> and resets scroll position to 0. */}
        {SidebarContent({})}
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

      {/* Mobile Sidebar — capped width so it never covers the whole screen on tiny devices */}
      <aside className={`fixed left-0 top-0 bottom-0 z-50 w-[min(280px,85vw)] shadow-2xl transform transition-transform duration-200 ease-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {SidebarContent({ isMobile: true })}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — sticky topbar with iOS safe-area inset on mobile */}
        <header
          className="bg-slate-900 border-b border-white/[0.06] flex items-center gap-2 px-3 sm:px-4 lg:px-5 shrink-0 z-10"
          style={{ paddingTop: "env(safe-area-inset-top)", minHeight: "calc(48px + env(safe-area-inset-top))" }}
        >
          <button onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="lg:hidden w-10 h-10 -ml-1 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0" />

          <div className="flex items-center gap-1.5">
            {/* Live IST clock — shows current date + time so management
                always knows the timezone of every action they take. */}
            <TopbarClock />

            {/* Global session selector — applies to every page that scopes
                data per academic session. Lives here instead of per-page
                so changing sessions updates everything at once. */}
            <TopbarSessionSelector />
            <div ref={profileRef} className="relative">
              <button onClick={() => setProfileOpen((o) => !o)}
                aria-label="Open account menu"
                className="flex items-center gap-1.5 px-1.5 h-10 rounded-lg hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors">
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
                    <button onClick={() => { setChangePasswordOpen(true); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50 transition-colors">
                      <KeyRound size={13} className="text-slate-400" /> Change Password
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

        {/* Page content. Outlet renders the page; the shared footer hangs
            below it inside the same scroll container. flex-col + min-h-full
            on the inner wrapper makes the footer stick to the bottom of
            short pages instead of floating mid-screen. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100">
          <div className="min-h-full flex flex-col">
            <OverdueBillsBanner />
            <div className="flex-1 flex flex-col">
              <Outlet />
            </div>
            <PageFooter />
          </div>
        </main>
      </div>
    </div>
    </SessionProvider>
  );
};

export default Layout;


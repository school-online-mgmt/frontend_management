import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, RefreshCcw, Users, Search, ChevronRight, Phone,
  GraduationCap, Filter, X, CheckCircle2, XCircle,
  Loader2, UserPlus, BarChart3, UserCheck, UserX,
  Briefcase, AlignJustify, Mail, MapPin
} from "lucide-react";
import api from "../../api/api";
import CreateTeacher from "../../components/CreateTeacher";
import PageHeader from "../../components/PageHeader";
import type { Teacher } from "../../api/types";

/* ── Helpers ────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "from-emerald-400 to-emerald-600",
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-violet-600",
  "from-rose-400 to-rose-600",
  "from-amber-400 to-amber-600",
  "from-sky-400 to-sky-600",
  "from-teal-400 to-teal-600",
];
function avatarColor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
const GENDER_OPTIONS = ["Male", "Female", "Other"];

/* ── Stat Card ──────────────────────────────────────────────────────────── */
const StatCard = ({
  icon: Icon, label, value, sub, bg, iconColor,
}: {
  icon: typeof Users; label: string; value: number; sub?: string;
  bg: string; iconColor: string;
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
      <Icon size={20} className={iconColor} />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ── Teacher Card (Grid) ────────────────────────────────────────────────── */
const TeacherCard = ({ teacher, onClick }: { teacher: Teacher; onClick: () => void }) => {
  const color    = avatarColor(teacher.name);
  const initials = getInitials(teacher.name);
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group flex flex-col"
    >
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
              {teacher.name}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
              <GraduationCap size={11} className="shrink-0" />
              {teacher.qualification}
            </p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          teacher.isActive
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
            : "bg-slate-100 text-slate-500 border border-slate-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${teacher.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
          {teacher.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="border-t border-slate-100 mx-5" />

      <div className="px-5 py-3.5 space-y-2 flex-1">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Phone size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{teacher.phone || "No phone on record"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Mail size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{teacher.email || "No email provided"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{teacher.address || "No address provided"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Briefcase size={12} className="text-slate-400 shrink-0" />
          <span className="capitalize">{teacher.gender}</span>
          <span className="text-slate-300">·</span>
          <span>{teacher.age} yrs</span>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">View profile</span>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
      </div>
    </div>
  );
};

/* ── Main Page ──────────────────────────────────────────────────────────── */
const TeacherHome = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers]         = useState<Teacher[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [genderFilter, setGenderFilter] = useState("");
  const [showFilters, setShowFilters]   = useState(false);
  const [viewMode, setViewMode]         = useState<"grid" | "table">("grid");

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getTeachers();
      const list = Array.isArray(data) ? data : data?.teachers ?? [];
      setTeachers(list);
    } catch {
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const stats = useMemo(() => ({
    total:    teachers.length,
    active:   teachers.filter((t) => t.isActive).length,
    inactive: teachers.filter((t) => !t.isActive).length,
  }), [teachers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (statusFilter === "active"   && !t.isActive) return false;
      if (statusFilter === "inactive" &&  t.isActive) return false;
      if (genderFilter && t.gender.toLowerCase() !== genderFilter.toLowerCase()) return false;
      if (q) {
        const hay = `${t.name} ${t.qualification ?? ""} ${t.phone ?? ""} ${t.email ?? ""} ${t.address ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [teachers, search, statusFilter, genderFilter]);

  const activeFilterCount = [statusFilter !== "all" ? statusFilter : "", genderFilter].filter(Boolean).length;
  const clearFilters = () => { setStatusFilter("all"); setGenderFilter(""); setSearch(""); };

  /* ── Full-page initial loading ───────────────────────────────────────── */
  if (isLoading && teachers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-emerald-500 mx-auto" />
          <p className="text-sm text-slate-500">Loading teachers…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      {isModalOpen && (
        <CreateTeacher onClose={() => setIsModalOpen(false)} onRefresh={fetchTeachers} />
      )}

      <PageHeader
        icon={Users}
        title="Teachers"
        gradient="from-violet-600 via-purple-600 to-indigo-600"
        subtitle="Manage faculty, track assignments and control portal access"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={fetchTeachers} disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 disabled:opacity-50 transition backdrop-blur-sm">
              <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-xl hover:bg-white/25 transition backdrop-blur-sm">
              <UserPlus size={14} /> Add Teacher
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-6">

        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Users}     label="Total Teachers" value={stats.total}    bg="bg-indigo-50"  iconColor="text-indigo-600" />
          <StatCard icon={UserCheck} label="Active"         value={stats.active}   bg="bg-emerald-50" iconColor="text-emerald-600"
            sub={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% of faculty` : undefined}
          />
          <StatCard icon={UserX}     label="Inactive"       value={stats.inactive} bg="bg-slate-100"  iconColor="text-slate-500" />
        </div>

        {/* ── Search & Filters ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, qualification, phone, email or address…"
                className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 placeholder-slate-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all ${
                showFilters || activeFilterCount > 0
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Grid / Table toggle */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`px-3 py-2 transition-all ${viewMode === "grid" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <BarChart3 size={15} className="rotate-90" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={`px-3 py-2 transition-all ${viewMode === "table" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <AlignJustify size={15} />
              </button>
            </div>

            {(search || activeFilterCount > 0) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
              >
                <X size={13} /> Clear all
              </button>
            )}
          </div>

          {showFilters && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "active", "inactive"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                        statusFilter === s
                          ? s === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : s === "inactive"
                            ? "bg-slate-200 text-slate-700 border-slate-300"
                            : "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {s === "active"   && <CheckCircle2 size={11} />}
                      {s === "inactive" && <XCircle size={11} />}
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setGenderFilter("")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${!genderFilter ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                  >
                    All
                  </button>
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(genderFilter === g ? "" : g)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${genderFilter === g ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Result count ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{teachers.length}</span> teachers
          </p>
          {isLoading && teachers.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 size={13} className="animate-spin" /> Refreshing…
            </div>
          )}
        </div>

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">No teachers found</p>
            <p className="text-sm text-slate-400">
              {search || activeFilterCount > 0
                ? "Try adjusting your search or filters."
                : "Add your first teacher to get started."}
            </p>
            {search || activeFilterCount > 0 ? (
              <button onClick={clearFilters} className="mt-1 text-sm text-emerald-600 hover:underline font-medium">Clear filters</button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-1 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition"
              >
                <Plus size={14} /> Add Teacher
              </button>
            )}
          </div>

        ) : viewMode === "grid" ? (
          /* ── Grid View ───────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onClick={() => navigate(`/teacher/${teacher.id}`)}
              />
            ))}
          </div>

        ) : (
          /* ── Table View ──────────────────────────────────────────────────── */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Qualification</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Email</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Address</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((teacher) => {
                    const color    = avatarColor(teacher.name);
                    const initials = getInitials(teacher.name);
                    return (
                      <tr
                        key={teacher.id}
                        onClick={() => navigate(`/teacher/${teacher.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {initials}
                            </div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {teacher.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-xs text-slate-600">{teacher.qualification}</span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone size={11} className="text-slate-400 shrink-0" />
                            {teacher.phone || "—"}
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                           <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            {teacher.email || "—"}
                          </div>
                        </td>
                         <td className="px-5 py-4 hidden lg:table-cell">
                           <div className="flex items-center gap-1.5 text-xs text-slate-500 max-w-[150px] truncate">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            {teacher.address || "—"}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            teacher.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${teacher.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {teacher.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <ChevronRight size={16} className="inline text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherHome;

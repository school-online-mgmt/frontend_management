import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Layers, Plus, Search, RefreshCcw, ChevronRight, ChevronDown, Users,
    User, UserX, Wand2, ExternalLink, AlertTriangle, Network,
} from "lucide-react";
import api from "../../api/api";
import type { StructureClass } from "../../api/types";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import { useSessionId } from "../../context/SessionContext";
import CreateClassModal from "../../components/Classes/CreateClassModal";
import AddSectionModal from "../../components/Structure/AddSectionModal";
import { ErrorState } from "../../components/ui";

/**
 * Classes & Sections — one page, one hierarchy.
 *
 * These were two separate pages, which was always slightly false: a section
 * cannot exist without a class, so presenting them as peers made people hunt
 * for a "sections" list that could only ever be a flattened view of this one.
 * (The old standalone page was in fact dead code — never routed, and it fetched
 * sections without a session filter, so it would have mixed every year
 * together.)
 *
 * A class expands to reveal its sections inline. The two things a school
 * actually needs to see — "which sections have no teacher" and "where are my
 * students" — are visible without opening anything.
 */

type TeacherFilter = "all" | "missing";

const ClassesSections = () => {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const sessionId = useSessionId();
    const [params, setParams] = useSearchParams();

    const [search, setSearch] = useState("");
    const [teacherFilter, setTeacherFilter] = useState<TeacherFilter>("all");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [addSectionTo, setAddSectionTo] = useState<StructureClass | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const notify = (text: string, type: "success" | "error" = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 4000);
    };

    const q = useQuery({
        queryKey: ["structure", "overview", sessionId],
        queryFn: () => api.getStructureOverview(sessionId!),
        enabled: !!sessionId,
    });
    const refresh = () => qc.invalidateQueries({ queryKey: ["structure", "overview", sessionId] });

    const classes = useMemo(() => q.data?.classes ?? [], [q.data]);

    // Deep-link from the Overview's to-do list: ?open=<classId> expands that
    // class and scrolls to it, so "fix this" lands on the thing to fix.
    useEffect(() => {
        const open = params.get("open");
        if (!open || classes.length === 0) return;
        setExpanded((prev) => new Set(prev).add(open));
        const el = document.querySelector(`[data-class-id="${open}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        // Consume the parameter so a refresh does not keep re-scrolling.
        params.delete("open");
        setParams(params, { replace: true });
    }, [classes, params, setParams]);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return classes.filter((c) => {
            if (teacherFilter === "missing") {
                const gap = !c.teacher || c.sections.some((s) => !s.teacher);
                if (!gap) return false;
            }
            if (!needle) return true;
            return c.name.toLowerCase().includes(needle)
                || c.slug.toLowerCase().includes(needle)
                || c.sections.some((s) => s.name.toLowerCase().includes(needle));
        });
    }, [classes, search, teacherFilter]);

    const toggle = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const allExpanded = filtered.length > 0 && filtered.every((c) => expanded.has(c.id));
    const toggleAll = () =>
        setExpanded(allExpanded ? new Set() : new Set(filtered.map((c) => c.id)));

    const missingTeachers = classes.reduce(
        (n, c) => n + c.sections.filter((s) => !s.teacher).length, 0);

    return (
        <div className="min-h-full bg-slate-50">
            {toast && (
                <div
                    data-testid="structure-toast"
                    data-type={toast.type}
                    className={`fixed top-6 right-6 z-[9999] px-5 py-4 rounded-xl shadow-lg text-white text-sm font-medium ${
                        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
                    }`}
                >
                    {toast.text}
                </div>
            )}

            {showCreateClass && sessionId && (
                <CreateClassModal
                    sessionId={sessionId}
                    onClose={() => setShowCreateClass(false)}
                    onSuccess={(msg: any) => {
                        notify(msg?.text ?? "Class created");
                        refresh();
                    }}
                />
            )}

            {addSectionTo && (
                <AddSectionModal
                    classId={addSectionTo.id}
                    className={addSectionTo.name}
                    existingSlugs={addSectionTo.sections.map((s) => s.slug)}
                    onClose={() => setAddSectionTo(null)}
                    onSuccess={(n) => {
                        notify(`Added ${n} section${n === 1 ? "" : "s"} to ${addSectionTo.name}`);
                        setExpanded((prev) => new Set(prev).add(addSectionTo.id));
                        setAddSectionTo(null);
                        refresh();
                    }}
                />
            )}

            <PageHeader
                icon={Layers}
                title="Classes & Sections"
                subtitle="Your class structure for this session — expand a class to see its sections"
                gradient={MODULE_THEMES.classes}
                onRefresh={refresh}
                refreshing={q.isFetching}
                primaryActions={
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate("/structure/setup")}
                            disabled={!sessionId}
                            data-testid="classes-bulk-btn"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/20 disabled:opacity-40 transition backdrop-blur-sm shrink-0"
                        >
                            <Wand2 size={15} /> Bulk Setup
                        </button>
                        <button
                            onClick={() => setShowCreateClass(true)}
                            disabled={!sessionId}
                            data-testid="create-class-btn"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 disabled:opacity-40 transition backdrop-blur-sm shrink-0"
                        >
                            <Plus size={15} /> Add Class
                        </button>
                    </div>
                }
            />

            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-4">
                {!sessionId ? (
                    <EmptySessionState entityPlural="classes" />
                ) : (
                    <>
                        {/* Filters */}
                        <div className="flex flex-wrap gap-2">
                            <div className="relative flex-1 min-w-[220px]">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    data-testid="class-search-term-input"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search a class or section…"
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                />
                            </div>
                            <button
                                data-testid="classes-missing-teacher-filter"
                                onClick={() => setTeacherFilter((f) => (f === "missing" ? "all" : "missing"))}
                                className={`px-3 py-2.5 rounded-xl text-sm border inline-flex items-center gap-1.5 transition ${
                                    teacherFilter === "missing"
                                        ? "bg-amber-50 border-amber-300 text-amber-700"
                                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                <UserX size={14} /> Needs a teacher
                                {missingTeachers > 0 && (
                                    <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                                        {missingTeachers}
                                    </span>
                                )}
                            </button>
                            {filtered.length > 0 && (
                                <button
                                    onClick={toggleAll}
                                    data-testid="classes-toggle-all"
                                    className="px-3 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                                >
                                    {allExpanded ? "Collapse all" : "Expand all"}
                                </button>
                            )}
                        </div>

                        {q.isLoading ? (
                            <div className="flex items-center justify-center py-24">
                                <RefreshCcw size={26} className="animate-spin text-emerald-600" />
                            </div>
                        ) : q.isError ? (
                            /* Without this, a failed load fell through to "No
                               classes yet" — which invites someone to rebuild a
                               structure that is already there. */
                            <ErrorState
                                message="Could not load classes for this session."
                                onRetry={() => void q.refetch()}
                                testId="classes-error"
                            />
                        ) : classes.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center" data-testid="classes-empty">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                                    <Network size={26} className="text-indigo-600" />
                                </div>
                                <h2 className="text-base font-bold text-slate-900">No classes yet</h2>
                                <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
                                    Build your whole structure at once, or add a single class if you prefer.
                                </p>
                                <div className="mt-5 flex gap-2 justify-center">
                                    <button
                                        onClick={() => navigate("/structure/setup")}
                                        data-testid="classes-empty-bulk-btn"
                                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 inline-flex items-center gap-2"
                                    >
                                        <Wand2 size={15} /> Quick Setup
                                    </button>
                                    <button
                                        onClick={() => setShowCreateClass(true)}
                                        className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:border-slate-300"
                                    >
                                        Add one class
                                    </button>
                                </div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-16">
                                No class or section matches that filter.
                            </p>
                        ) : (
                            <div className="space-y-2.5">
                                {filtered.map((cls) => {
                                    const open = expanded.has(cls.id);
                                    const noTeacherCount = cls.sections.filter((s) => !s.teacher).length;
                                    return (
                                        <div
                                            key={cls.id}
                                            data-class-id={cls.id}
                                            data-testid={`class-row-${cls.slug}`}
                                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                                        >
                                            {/* Class row */}
                                            <div className="flex items-center gap-3 px-4 py-3.5">
                                                <button
                                                    onClick={() => toggle(cls.id)}
                                                    data-testid="class-expand-btn"
                                                    aria-label={open ? `Collapse ${cls.name}` : `Expand ${cls.name}`}
                                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0"
                                                >
                                                    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </button>

                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                                                    {cls.name.charAt(0)}
                                                </div>

                                                <button onClick={() => toggle(cls.id)} className="flex-1 min-w-0 text-left">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-900">{cls.name}</span>
                                                        <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                            #{cls.slug}
                                                        </span>
                                                        {cls.sections.length === 0 && (
                                                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                                                                <AlertTriangle size={10} /> no sections
                                                            </span>
                                                        )}
                                                        {noTeacherCount > 0 && (
                                                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                                                {noTeacherCount} section{noTeacherCount === 1 ? "" : "s"} without a teacher
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            <User size={11} />
                                                            {cls.teacher ? cls.teacher.name : <span className="italic text-slate-400">no class teacher</span>}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1"><Network size={11} /> {cls.sections.length} sections</span>
                                                        <span className="inline-flex items-center gap-1"><Users size={11} /> {cls.studentCount} students</span>
                                                    </div>
                                                </button>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        onClick={() => setAddSectionTo(cls)}
                                                        data-testid="add-section-btn"
                                                        className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 inline-flex items-center gap-1"
                                                    >
                                                        <Plus size={12} /> Section
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/class/${cls.id}`)}
                                                        data-testid="class-open-btn"
                                                        title="Open class details"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Sections, inline */}
                                            {open && (
                                                <div className="border-t border-slate-100 bg-slate-50/60">
                                                    {cls.sections.length === 0 ? (
                                                        <div className="px-5 py-5 text-center">
                                                            <p className="text-sm text-slate-500">
                                                                This class has no sections, so no student can be admitted into it.
                                                            </p>
                                                            <button
                                                                onClick={() => setAddSectionTo(cls)}
                                                                className="mt-2.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                                                            >
                                                                Add its first section
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-slate-100">
                                                            {cls.sections.map((s) => (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={() => navigate(`/section/${s.id}`)}
                                                                    data-testid={`section-row-${s.slug}`}
                                                                    className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-white text-left"
                                                                >
                                                                    <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                                        {s.name.charAt(0)}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-slate-800 w-28 shrink-0 truncate">{s.name}</span>
                                                                    <span className={`text-xs flex-1 min-w-0 truncate inline-flex items-center gap-1 ${
                                                                        s.teacher ? "text-slate-600" : "text-amber-700 font-medium"
                                                                    }`}>
                                                                        {s.teacher
                                                                            ? <><User size={11} /> {s.teacher.name}</>
                                                                            : <><UserX size={11} /> no section teacher</>}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500 shrink-0 inline-flex items-center gap-1">
                                                                        <Users size={11} /> {s.studentCount}
                                                                    </span>
                                                                    <ChevronRight size={14} className="text-slate-300 shrink-0" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <p className="text-xs text-slate-400 text-center pt-1">
                                    Showing {filtered.length} of {classes.length} classes
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ClassesSections;

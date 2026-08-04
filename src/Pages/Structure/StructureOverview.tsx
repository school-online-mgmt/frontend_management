import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Network, Layers, BookMarked, BookOpen, Users, RefreshCcw,
    CheckCircle2, AlertTriangle, ChevronRight, Wand2, UserX, Info,
} from "lucide-react";
import api from "../../api/api";
import type { StructureGapRef } from "../../api/types";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import { useSessionId } from "../../context/SessionContext";
import { ErrorState } from "../../components/ui";

/**
 * Academic Structure — Overview.
 *
 * The module's landing page, and the one screen that answers "is my school
 * actually set up?". Before this, finding a section with no class teacher meant
 * opening every class in turn — so in practice nobody found it until week two
 * of term, when attendance could not be marked.
 *
 * Every gap listed here is a link that goes to the place you fix it. The page
 * is a to-do list, not a report.
 */

const StructureOverviewPage = () => {
    const navigate = useNavigate();
    const sessionId = useSessionId();

    const q = useQuery({
        queryKey: ["structure", "overview", sessionId],
        queryFn: () => api.getStructureOverview(sessionId!),
        enabled: !!sessionId,
    });

    const d = q.data;

    /**
     * The gaps, ordered by how much they hurt. A class with no section cannot
     * take a student at all; an empty section is merely information before
     * admissions open. Presenting them in one flat list would imply they matter
     * equally, which would train people to ignore all of them.
     */
    const issues = useMemo(() => {
        if (!d) return [];
        return [
            {
                key: "classesWithoutSections",
                severity: "blocking" as const,
                title: "Classes with no sections",
                why: "A student cannot be admitted into a class that has no section.",
                items: d.gaps.classesWithoutSections,
                fix: (g: StructureGapRef) => navigate(`/structure/classes?open=${g.id}`),
                cta: "Add sections",
            },
            {
                key: "sectionsWithoutTeacher",
                severity: "blocking" as const,
                title: "Sections with no class teacher",
                why: "Attendance, feedback and promotion decisions all need a section teacher.",
                items: d.gaps.sectionsWithoutTeacher,
                fix: (g: StructureGapRef) => navigate(`/structure/classes?open=${g.classId}`),
                cta: "Assign a teacher",
            },
            {
                key: "coursesWithoutSubjects",
                severity: "blocking" as const,
                title: "Courses with no subjects",
                why: "Timetables and report cards come out empty for these courses.",
                items: d.gaps.coursesWithoutSubjects,
                fix: (g: StructureGapRef) => navigate(`/course/${g.id}`),
                cta: "Add subjects",
            },
            {
                key: "classesWithoutTeacher",
                severity: "advisory" as const,
                title: "Classes with no class teacher",
                why: "Not blocking — the section teacher usually covers this.",
                items: d.gaps.classesWithoutTeacher,
                fix: (g: StructureGapRef) => navigate(`/structure/classes?open=${g.id}`),
                cta: "Assign",
            },
            {
                key: "emptySections",
                severity: "info" as const,
                title: "Sections with no students yet",
                why: "Expected before admissions open. Worth a look once the year starts.",
                items: d.gaps.emptySections,
                fix: (g: StructureGapRef) => navigate(`/structure/classes?open=${g.classId}`),
                cta: "View",
            },
        ].filter((i) => i.items.length > 0);
    }, [d, navigate]);

    return (
        <div className="min-h-full bg-slate-50">
            <PageHeader
                icon={Network}
                title="Academic Structure"
                subtitle="Your school's classes, sections, courses and subjects for this session"
                gradient={MODULE_THEMES.classes}
                onRefresh={() => q.refetch()}
                refreshing={q.isFetching}
                primaryActions={
                    <button
                        onClick={() => navigate("/structure/setup")}
                        disabled={!sessionId}
                        data-testid="structure-quick-setup-btn"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 disabled:opacity-40 transition backdrop-blur-sm shrink-0"
                    >
                        <Wand2 size={15} /> Quick Setup
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-5">
                {!sessionId ? (
                    <EmptySessionState entityPlural="structure" />
                ) : q.isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <RefreshCcw size={26} className="animate-spin text-emerald-600" />
                    </div>
                ) : !d ? (
                    /* Was a dead-end message with no way forward. A failed
                       fetch here is usually transient, so offer the retry. */
                    <ErrorState
                        message="Could not load the structure for this session."
                        onRetry={() => void q.refetch()}
                        testId="structure-error"
                    />
                ) : d.totals.classes === 0 ? (
                    /* First run. Point straight at the bulk builder rather than
                       making someone create ten classes one modal at a time. */
                    <div
                        data-testid="structure-empty"
                        className="bg-white rounded-2xl border border-slate-200 p-10 text-center"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                            <Wand2 size={26} className="text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Let's set up {d.session.name}</h2>
                        <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                            Create all your classes and their sections in one go — Class 1 to 10 with sections
                            A to D takes about a minute.
                        </p>
                        <button
                            onClick={() => navigate("/structure/setup")}
                            data-testid="structure-empty-setup-btn"
                            className="mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 inline-flex items-center gap-2"
                        >
                            <Wand2 size={15} /> Start Quick Setup
                        </button>
                        <p className="text-xs text-slate-400 mt-3">
                            Or add them one at a time from{" "}
                            <button onClick={() => navigate("/structure/classes")} className="text-indigo-600 hover:underline">
                                Classes &amp; Sections
                            </button>
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Readiness — one number, and what it is made of. */}
                        <div
                            data-testid="structure-readiness"
                            data-ready={d.readiness.isReady}
                            className={`rounded-2xl border p-5 ${
                                d.readiness.isReady
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-amber-50 border-amber-200"
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    d.readiness.isReady ? "bg-emerald-100" : "bg-amber-100"
                                }`}>
                                    {d.readiness.isReady
                                        ? <CheckCircle2 size={24} className="text-emerald-600" />
                                        : <AlertTriangle size={24} className="text-amber-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className={`text-base font-bold ${d.readiness.isReady ? "text-emerald-900" : "text-amber-900"}`}>
                                        {d.readiness.isReady
                                            ? `${d.session.name} is ready to run`
                                            : `${d.readiness.blockingIssues} thing${d.readiness.blockingIssues === 1 ? "" : "s"} to fix before term starts`}
                                    </h2>
                                    <p className={`text-sm mt-0.5 ${d.readiness.isReady ? "text-emerald-700" : "text-amber-800"}`}>
                                        {d.readiness.isReady
                                            ? "Every class has sections, every section has a teacher, and every course has subjects."
                                            : "These block day-to-day work — attendance, timetables and report cards depend on them."}
                                    </p>
                                    <div className="mt-3 h-2 bg-white/70 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${d.readiness.isReady ? "bg-emerald-500" : "bg-amber-500"}`}
                                            style={{ width: `${d.readiness.percent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Totals — each one navigates to the page that owns it. */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <Tile icon={<Layers size={20} className="text-indigo-500" />} bg="bg-indigo-50"
                                  value={d.totals.classes}  label="Classes"  onClick={() => navigate("/structure/classes")} testId="tile-classes" />
                            <Tile icon={<Network size={20} className="text-violet-500" />} bg="bg-violet-50"
                                  value={d.totals.sections} label="Sections" onClick={() => navigate("/structure/classes")} testId="tile-sections" />
                            <Tile icon={<BookMarked size={20} className="text-sky-500" />} bg="bg-sky-50"
                                  value={d.totals.courses}  label="Courses"  onClick={() => navigate("/course-Home")} testId="tile-courses" />
                            <Tile icon={<BookOpen size={20} className="text-teal-500" />} bg="bg-teal-50"
                                  value={d.totals.subjects} label="Subjects" onClick={() => navigate("/subject-Home")} testId="tile-subjects" />
                            <Tile icon={<Users size={20} className="text-emerald-500" />} bg="bg-emerald-50"
                                  value={d.totals.students} label="Students" testId="tile-students" />
                        </div>

                        {/* The to-do list */}
                        {issues.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                                <p className="text-sm font-semibold text-slate-800">Nothing needs attention</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Your structure for {d.session.name} is complete.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {issues.map((iss) => (
                                    <div
                                        key={iss.key}
                                        data-testid={`structure-issue-${iss.key}`}
                                        className={`bg-white rounded-2xl border overflow-hidden ${
                                            iss.severity === "blocking" ? "border-amber-200" : "border-slate-200"
                                        }`}
                                    >
                                        <div className="px-5 py-3.5 flex items-start gap-3 border-b border-slate-100">
                                            {iss.severity === "blocking"
                                                ? <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                                                : iss.severity === "advisory"
                                                ? <UserX size={17} className="text-slate-400 shrink-0 mt-0.5" />
                                                : <Info size={17} className="text-slate-400 shrink-0 mt-0.5" />}
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {iss.title}
                                                    <span className="ml-2 text-xs font-normal text-slate-500">
                                                        {iss.items.length}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">{iss.why}</p>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {iss.items.slice(0, 6).map((g) => (
                                                <button
                                                    key={g.id}
                                                    onClick={() => iss.fix(g)}
                                                    data-testid="structure-issue-row"
                                                    className="w-full px-5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50"
                                                >
                                                    <span className="text-sm text-slate-700 truncate">
                                                        {g.className ? `${g.className} · ${g.name}` : g.name}
                                                    </span>
                                                    <span className="text-xs text-indigo-600 font-medium shrink-0 inline-flex items-center gap-1">
                                                        {iss.cta} <ChevronRight size={13} />
                                                    </span>
                                                </button>
                                            ))}
                                            {iss.items.length > 6 && (
                                                <p className="px-5 py-2 text-xs text-slate-400">
                                                    and {iss.items.length - 6} more
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const Tile = ({ icon, bg, value, label, onClick, testId }: {
    icon: React.ReactNode; bg: string; value: number; label: string;
    onClick?: () => void; testId?: string;
}) => {
    const Cmp = onClick ? "button" : "div";
    return (
        <Cmp
            {...(onClick ? { onClick } : {})}
            data-testid={testId}
            className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3 text-left ${
                onClick ? "hover:border-indigo-200 hover:shadow-md transition-all" : ""
            }`}
        >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
        </Cmp>
    );
};

export default StructureOverviewPage;

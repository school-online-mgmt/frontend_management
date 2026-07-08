import { useEffect, useMemo, useState } from "react";
import { X, Calculator, Loader2, Users, AlertTriangle, CheckCircle2, Info, TrendingUp } from "lucide-react";
import api from "../../api/api";
import { useSessionId } from "../../context/SessionContext";

/**
 * TeacherCalculatorModal — estimates the minimum teaching staff a school needs
 * to run properly, from real staffing constraints. Prefilled from the school's
 * live class/section/subject counts; every parameter is editable.
 *
 * Model (all transparent in the "How this is calculated" panel):
 *   demand  = sections × periods/day × working-days           (weekly periods to cover)
 *   supply  = effectiveDailyPeriods × working-days per teacher (a teacher's weekly capacity)
 *             where effectiveDailyPeriods respects both the daily cap AND the
 *             "max N consecutive periods then a mandatory break" rule.
 *   teachingNeed        = ceil(demand / supply)
 *   withAttendanceCover = ceil(teachingNeed / attendanceRate)  (cover ~20% daily absence)
 *   subjectInchargeFloor= ceil(distinctSubjects / maxSubjectsPerTeacher)
 *   inchargeFloor       = sections (each section needs its own section-incharge)
 *   RECOMMENDED = max(withAttendanceCover, subjectInchargeFloor, inchargeFloor)
 */

type Params = {
    sections: number;
    classes: number;
    distinctSubjects: number;
    periodsPerDay: number;
    workingDays: number;
    maxPeriodsPerDay: number;      // a teacher teaches at most this many periods/day
    maxSubjectsPerTeacher: number; // a teacher handles at most this many distinct subjects
    maxStretch: number;            // max consecutive periods before a mandatory break
    attendancePct: number;         // expected daily teacher attendance (%)
    nonTeachingLoadPct: number;    // % of a teacher's capacity lost to admin/incharge duties
};

const DEFAULTS: Params = {
    sections: 0, classes: 0, distinctSubjects: 0,
    periodsPerDay: 7, workingDays: 6,
    maxPeriodsPerDay: 5, maxSubjectsPerTeacher: 4, maxStretch: 3,
    attendancePct: 80, nonTeachingLoadPct: 10,
};

// Max teaching periods that physically fit in a day given the stretch rule:
// after every `stretch` consecutive teaching periods, one slot must be a break.
const teachingThatFits = (periodsPerDay: number, stretch: number): number => {
    let taught = 0, sinceBreak = 0;
    for (let slot = 0; slot < periodsPerDay; slot++) {
        if (sinceBreak >= stretch) { sinceBreak = 0; continue; } // mandatory break slot
        taught++; sinceBreak++;
    }
    return taught;
};

const Field = ({ label, value, onChange, min = 0, max = 999, hint }: {
    label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; hint?: string;
}) => (
    <div>
        <label className="text-[11px] font-semibold text-slate-600">{label}</label>
        <input type="number" min={min} max={max} value={value}
            onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
);

const TeacherCalculatorModal = ({ currentTeachers, onClose }: { currentTeachers: number; onClose: () => void }) => {
    const sessionId = useSessionId();
    const [loading, setLoading] = useState(true);
    const [p, setP] = useState<Params>(DEFAULTS);
    const set = (k: keyof Params, v: number) => setP(prev => ({ ...prev, [k]: v }));

    // Prefill from the school's live data.
    useEffect(() => {
        if (!sessionId) { setLoading(false); return; }
        Promise.allSettled([api.getClasses(sessionId), api.getSubjects({ sessionId })])
            .then(([c, s]) => {
                const cls: any[] = c.status === "fulfilled" ? (Array.isArray(c.value) ? c.value : []) : [];
                const subs: any[] = s.status === "fulfilled" ? (Array.isArray(s.value) ? s.value : []) : [];
                const sections = cls.reduce((sum, x) => sum + (x.sections?.length ?? 0), 0);
                setP(prev => ({
                    ...prev,
                    classes: cls.length,
                    sections: sections || cls.length,
                    distinctSubjects: subs.length,
                }));
            })
            .finally(() => setLoading(false));
    }, [sessionId]);

    const r = useMemo(() => {
        const effectiveDaily = Math.max(1, Math.min(p.maxPeriodsPerDay, teachingThatFits(p.periodsPerDay, p.maxStretch)));
        const demand = p.sections * p.periodsPerDay * p.workingDays;
        const rawSupply = effectiveDaily * p.workingDays;
        const supply = Math.max(1, Math.round(rawSupply * (1 - p.nonTeachingLoadPct / 100)));
        const teachingNeed = demand > 0 ? Math.ceil(demand / supply) : 0;
        const attendanceRate = Math.max(0.5, Math.min(1, p.attendancePct / 100));
        const withAttendance = Math.ceil(teachingNeed / attendanceRate);
        const subjectInchargeFloor = p.maxSubjectsPerTeacher > 0 ? Math.ceil(p.distinctSubjects / p.maxSubjectsPerTeacher) : 0;
        const sectionInchargeFloor = p.sections; // one section-incharge per section
        const recommended = Math.max(withAttendance, subjectInchargeFloor, sectionInchargeFloor);
        return {
            effectiveDaily, demand, supply, teachingNeed, withAttendance,
            attendanceBuffer: withAttendance - teachingNeed,
            subjectInchargeFloor, sectionInchargeFloor, recommended,
            deficit: recommended - currentTeachers,
        };
    }, [p, currentTeachers]);

    const bindingLabel =
        r.recommended === r.withAttendance ? "Teaching load + attendance cover"
        : r.recommended === r.sectionInchargeFloor ? "Section-incharge coverage"
        : "Subject-incharge coverage";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center"><Calculator size={17} className="text-violet-600" /></div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Staffing Calculator</h3>
                            <p className="text-[11px] text-slate-500">Minimum teachers to run the school properly</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={16} /></button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
                ) : (
                    <div className="p-5 overflow-y-auto space-y-5">
                        {/* Headline result */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl p-4 text-white">
                                <p className="text-[11px] font-bold opacity-80">Recommended minimum</p>
                                <p className="text-3xl font-black leading-tight">{r.recommended}</p>
                                <p className="text-[10px] opacity-80">teachers</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                <p className="text-[11px] font-bold text-slate-400">Current teachers</p>
                                <p className="text-3xl font-black text-slate-800 leading-tight">{currentTeachers}</p>
                                <p className="text-[10px] text-slate-400">on record</p>
                            </div>
                            <div className={`rounded-2xl p-4 border ${r.deficit > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
                                <p className={`text-[11px] font-bold ${r.deficit > 0 ? "text-rose-500" : "text-emerald-600"}`}>{r.deficit > 0 ? "Shortfall" : "Sufficient"}</p>
                                <p className={`text-3xl font-black leading-tight ${r.deficit > 0 ? "text-rose-700" : "text-emerald-700"}`}>{r.deficit > 0 ? `+${r.deficit}` : "✓"}</p>
                                <p className={`text-[10px] ${r.deficit > 0 ? "text-rose-500" : "text-emerald-600"}`}>{r.deficit > 0 ? "more needed" : `${-r.deficit} buffer`}</p>
                            </div>
                        </div>

                        {r.deficit > 0 ? (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>Hire at least <b>{r.deficit}</b> more teacher{r.deficit > 1 ? "s" : ""}. The binding constraint is <b>{bindingLabel.toLowerCase()}</b>.</span>
                            </div>
                        ) : (
                            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-800">
                                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                                <span>Staffing is sufficient with a buffer of <b>{-r.deficit}</b>. Binding constraint: <b>{bindingLabel.toLowerCase()}</b>.</span>
                            </div>
                        )}

                        {/* Parameters */}
                        <div>
                            <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><TrendingUp size={13} /> School size <span className="text-[10px] font-normal text-slate-400">(prefilled — edit if needed)</span></p>
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="Sections" value={p.sections} onChange={v => set("sections", v)} />
                                <Field label="Classes" value={p.classes} onChange={v => set("classes", v)} />
                                <Field label="Distinct subjects" value={p.distinctSubjects} onChange={v => set("distinctSubjects", v)} />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-700 mb-2">Timetable & workload rules</p>
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="Periods / day" value={p.periodsPerDay} onChange={v => set("periodsPerDay", v)} min={1} max={15} />
                                <Field label="Working days / week" value={p.workingDays} onChange={v => set("workingDays", v)} min={1} max={7} />
                                <Field label="Max periods / teacher / day" value={p.maxPeriodsPerDay} onChange={v => set("maxPeriodsPerDay", v)} min={1} max={15} />
                                <Field label="Max subjects / teacher" value={p.maxSubjectsPerTeacher} onChange={v => set("maxSubjectsPerTeacher", v)} min={1} max={10} hint="distinct subjects one teacher handles" />
                                <Field label="Max consecutive periods" value={p.maxStretch} onChange={v => set("maxStretch", v)} min={1} max={10} hint="then a mandatory break" />
                                <Field label="Non-teaching load %" value={p.nonTeachingLoadPct} onChange={v => set("nonTeachingLoadPct", v)} min={0} max={60} hint="incharge / admin duties" />
                                <Field label="Expected attendance %" value={p.attendancePct} onChange={v => set("attendancePct", v)} min={50} max={100} hint="cover daily absences" />
                            </div>
                        </div>

                        {/* Breakdown / insights */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Info size={13} /> How this is calculated</p>
                            <div className="space-y-1.5 text-[12px] text-slate-600">
                                <Row label="Weekly periods to cover" value={`${r.demand}`} sub={`${p.sections} sections × ${p.periodsPerDay} periods × ${p.workingDays} days`} />
                                <Row label="Effective teaching / teacher / day" value={`${r.effectiveDaily}`} sub={`min(${p.maxPeriodsPerDay} cap, fits with ${p.maxStretch}-period stretch rule)`} />
                                <Row label="Weekly capacity / teacher" value={`${r.supply}`} sub={`after ${p.nonTeachingLoadPct}% non-teaching load`} />
                                <Row label="Teachers for teaching load" value={`${r.teachingNeed}`} sub={`ceil(${r.demand} ÷ ${r.supply})`} />
                                <Row label="+ Attendance cover" value={`${r.withAttendance}`} sub={`for ${p.attendancePct}% daily attendance (+${r.attendanceBuffer})`} highlight={r.recommended === r.withAttendance} />
                                <Row label="Section-incharge floor" value={`${r.sectionInchargeFloor}`} sub={`one incharge per section`} highlight={r.recommended === r.sectionInchargeFloor} />
                                <Row label="Subject-incharge floor" value={`${r.subjectInchargeFloor}`} sub={`ceil(${p.distinctSubjects} subjects ÷ ${p.maxSubjectsPerTeacher} per teacher)`} highlight={r.recommended === r.subjectInchargeFloor} />
                                <div className="border-t border-slate-200 pt-1.5 mt-1.5 flex items-center justify-between font-bold text-slate-800">
                                    <span>Recommended = max of the above</span><span>{r.recommended}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">Also ensure every class ({p.classes}) has a class-incharge — these can double as section-incharges, so they don't add to the count.</p>
                        </div>
                    </div>
                )}

                <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 inline-flex items-center gap-1.5"><Users size={13} /> Done</button>
                </div>
            </div>
        </div>
    );
};

const Row = ({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) => (
    <div className={`flex items-center justify-between gap-3 ${highlight ? "text-violet-700 font-bold" : ""}`}>
        <div className="min-w-0"><span>{label}</span>{sub && <span className="text-[10px] text-slate-400 ml-1.5">{sub}</span>}</div>
        <span className="font-bold shrink-0">{value}</span>
    </div>
);

export default TeacherCalculatorModal;

import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ClipboardCheck, Users, CheckCircle2, XCircle, Clock,
    ChevronLeft, ChevronRight, BarChart3, Search, RefreshCw,
    AlertTriangle, Building2, Edit3, Loader2, CalendarDays, X, Calendar
} from "lucide-react";
import api from "../../api/api";

// --- Types --------------------------------------------------------------------
interface ClassItem { id: string; name: string; sections: { id: string; name: string; teacher?: { name: string } | null }[] }
interface Student {
    studentId: string; academicId: string; firstName: string; lastName: string;
    rollNo: string | null; admissionId: string | null;
    attendance: { status: string; remarks: string | null } | null;
}
interface Rec {
    id: string; studentId: string; date: string; status: string; remarks: string | null;
    sectionId: string; firstName: string; lastName: string; rollNo: string | null;
    sectionName: string; className: string; classId: string;
}

// --- Helpers ------------------------------------------------------------------
const NOW   = new Date();
const TODAY = `${NOW.getFullYear()}-${String(NOW.getMonth()+1).padStart(2,"0")}-${String(NOW.getDate()).padStart(2,"0")}`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type SK = "PRESENT" | "ABSENT" | "LATE";
const SC: Record<SK, { bg:string; text:string; border:string; icon:React.ElementType }> = {
    PRESENT: { bg:"bg-emerald-50", text:"text-emerald-700", border:"border-emerald-200", icon:CheckCircle2 },
    ABSENT:  { bg:"bg-red-50",     text:"text-red-700",     border:"border-red-200",     icon:XCircle },
    LATE:    { bg:"bg-amber-50",   text:"text-amber-700",   border:"border-amber-200",   icon:Clock },
};
const pctColor = (p:number|null) => !p ? "text-slate-300" : p>=90 ? "text-emerald-600" : p>=75 ? "text-amber-600" : "text-red-600";
const attPct   = (p:number,a:number,l:number) => { const t=p+a+l; return t>0?Math.round(((p+l)/t)*100):null; };

// --- Toast --------------------------------------------------------------------
function Toast({ t, clear }: { t:{type:string;msg:string}|null; clear:()=>void }) {
    if (!t) return null;
    return (
        <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow ${
                t.type==="success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
            }`}>
            {t.type==="success" ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
            <span>{t.msg}</span>
            <button onClick={clear} className="ml-auto opacity-60 hover:opacity-100"><X size={13}/></button>
        </motion.div>
    );
}

// =============================================================================
//  ROOT COMPONENT
// =============================================================================
export default function AttendanceHome() {
    const [tab, setTab] = useState<"mark"|"calendar"|"view"|"summary">("mark");
    const TABS = [
        { key:"mark"     as const, label:"Mark Attendance", icon:Edit3 },
        { key:"calendar" as const, label:"Calendar View",   icon:CalendarDays },
        { key:"view"     as const, label:"Reports",         icon:BarChart3 },
        { key:"summary"  as const, label:"Today Summary",   icon:Users },
    ];
    return (
        <div className="h-full flex flex-col overflow-hidden bg-slate-50">
            <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <ClipboardCheck size={19} className="text-white"/>
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-800">Attendance Management</h1>
                            <p className="text-[11px] text-slate-400">Mark, review and manage school attendance</p>
                        </div>
                    </div>
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
                        {TABS.map(tb => (
                            <button key={tb.key} onClick={() => setTab(tb.key)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                                    tab===tb.key ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"
                                }`}>
                                <tb.icon size={13}/>{tb.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {tab==="mark"     && <motion.div key="mark"     className="h-full overflow-y-auto"      initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}><MarkTab/></motion.div>}
                    {tab==="calendar" && <motion.div key="calendar" className="h-full flex overflow-hidden" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}><CalendarTab/></motion.div>}
                    {tab==="view"     && <motion.div key="view"     className="h-full overflow-y-auto"      initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}><ViewTab/></motion.div>}
                    {tab==="summary"  && <motion.div key="summary"  className="h-full overflow-y-auto"      initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}><TodaySummaryTab/></motion.div>}
                </AnimatePresence>
            </div>
        </div>
    );
}

// =============================================================================
//  MARK TAB — management can pick any section and back-date
// =============================================================================
function MarkTab() {
    const [allClasses,  setAllClasses]  = useState<ClassItem[]>([]);
    const [selSection,  setSelSection]  = useState("");
    const [selDate,     setSelDate]     = useState(TODAY);
    const [students,    setStudents]    = useState<Student[]>([]);
    const [statuses,    setStatuses]    = useState<Record<string,string>>({});
    const [loading,     setLoading]     = useState(false);
    const [submitting,  setSubmitting]  = useState(false);
    const [secInfo,     setSecInfo]     = useState<any>(null);
    const [isHoliday,   setIsHoliday]   = useState(false);
    const [holReason,   setHolReason]   = useState("");
    const [marked,      setMarked]      = useState(false);
    const [toast,       setToast]       = useState<{type:string;msg:string}|null>(null);
    const [search,      setSearch]      = useState("");

    useEffect(() => {
        api.getAttendanceSections().then(r => {
            setAllClasses(r.classes || []);
        });
    }, []);

    const sectionOptions = useMemo(() => {
        const opts: { id:string; label:string }[] = [];
        allClasses.forEach(c => c.sections.forEach(s => opts.push({ id: s.id, label: `${c.name} — ${s.name}` })));
        return opts;
    }, [allClasses]);

    const load = useCallback(async () => {
        if (!selSection) return;
        setLoading(true);
        try {
            const r = await api.getAttendanceStudents(selSection, selDate);
            setStudents(r.students || []);
            setSecInfo(r.section);
            setIsHoliday(r.isHoliday || false);
            setHolReason(r.holidayReason || "");
            setMarked(r.isAlreadyMarked || false);
            const st: Record<string,string> = {};
            (r.students||[]).forEach((s:Student) => { st[s.studentId] = s.attendance?.status || "PRESENT"; });
            setStatuses(st);
        } catch (e: any) {
            setToast({ type:"error", msg: e.response?.data?.message || "Failed to load students" });
        } finally { setLoading(false); }
    }, [selSection, selDate]);
    useEffect(() => { load(); }, [load]);

    const submit = async () => {
        if (!selSection || students.length===0) return;
        setSubmitting(true);
        try {
            const records = students.map(s => ({ studentId:s.studentId, academicId:s.academicId, status:statuses[s.studentId]||"PRESENT" }));
            await api.markAttendanceManagement(selSection, { date:selDate, records });
            setToast({ type:"success", msg:`Attendance ${marked?"updated":"saved"} for ${records.length} students` });
            setMarked(true);
        } catch (e: any) {
            setToast({ type:"error", msg: e.response?.data?.message || "Failed to submit attendance" });
        } finally { setSubmitting(false); }
    };

    const setAll = (s:string) => { const u:Record<string,string>={}; students.forEach(st=>{u[st.studentId]=s;}); setStatuses(u); };

    const sum = useMemo(() => {
        const v = Object.values(statuses);
        return { p:v.filter(x=>x==="PRESENT").length, a:v.filter(x=>x==="ABSENT").length, l:v.filter(x=>x==="LATE").length, t:v.length };
    }, [statuses]);

    const filtered = useMemo(() => {
        if (!search) return students;
        const q = search.toLowerCase();
        return students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || (s.rollNo||"").toLowerCase().includes(q));
    }, [students, search]);

    const dateLabel = new Date(selDate+"T00:00:00").toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-4">
            <AnimatePresence><Toast t={toast} clear={() => setToast(null)}/></AnimatePresence>

            {/* top row */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Section</label>
                        {sectionOptions.length === 0 ? (
                            <p className="text-sm text-slate-400 py-2">No active sections found</p>
                        ) : (
                            <select value={selSection} onChange={e => setSelSection(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                <option value="">— Select Section —</option>
                                {sectionOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
                        <input type="date" value={selDate} max={TODAY}
                            onChange={e => setSelDate(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"/>
                        <p className="text-[10px] text-slate-400 mt-1">{dateLabel}</p>
                    </div>
                </div>
            </div>

            {isHoliday && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
                    <AlertTriangle size={15}/> This date is a holiday: <strong>{holReason}</strong>
                </div>
            )}
            {marked && !isHoliday && students.length>0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                    <RefreshCw size={14}/> Attendance already marked for this date — resubmit to update.
                </div>
            )}

            {loading && <div className="flex items-center justify-center py-14"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>}

            {!loading && students.length>0 && !isHoliday && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* toolbar */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{secInfo?.className} — {secInfo?.name}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-500 font-semibold px-1.5 py-0.5 rounded-full">{students.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-1 text-[11px] font-bold">
                            <span className="text-emerald-600">{sum.p}P</span><span className="text-slate-300">·</span>
                            <span className="text-red-600">{sum.a}A</span><span className="text-slate-300">·</span>
                            <span className="text-amber-600">{sum.l}L</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                            {(["PRESENT","ABSENT","LATE"] as SK[]).map(s => (
                                <button key={s} onClick={() => setAll(s)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:opacity-80 transition-opacity ${SC[s].bg} ${SC[s].text} ${SC[s].border}`}>
                                    All {s[0]+s.slice(1).toLowerCase()}
                                </button>
                            ))}
                            <div className="relative ml-1">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                                    className="pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-slate-200 w-28 focus:ring-2 focus:ring-emerald-400 outline-none"/>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50 max-h-[55vh] overflow-y-auto">
                        {filtered.map((s, i) => {
                            const cur = statuses[s.studentId]||"PRESENT";
                            const sc  = SC[cur as SK]||SC.PRESENT;
                            return (
                                <div key={s.studentId} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-[11px] text-slate-300 w-5 shrink-0 font-mono">{i+1}</span>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${sc.bg} ${sc.text}`}>
                                        {s.firstName[0]}{s.lastName[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{s.firstName} {s.lastName}</p>
                                        <p className="text-[10px] text-slate-400">{s.rollNo?`Roll ${s.rollNo}`:""}{s.admissionId?` · ${s.admissionId}`:""}</p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        {(["PRESENT","ABSENT","LATE"] as SK[]).map(st => {
                                            const c = SC[st]; const sel = cur===st;
                                            return (
                                                <button key={st} onClick={() => setStatuses(p=>({...p,[s.studentId]:st}))}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                                                        sel ? `${c.bg} ${c.text} ${c.border} shadow-sm` : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                                                    }`}>
                                                    <c.icon size={11}/>{st[0]+st.slice(1).toLowerCase()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-2 rounded-full bg-slate-200 overflow-hidden flex">
                                {sum.t>0&&<><div className="bg-emerald-500 h-full transition-all" style={{width:`${(sum.p/sum.t)*100}%`}}/><div className="bg-amber-500 h-full" style={{width:`${(sum.l/sum.t)*100}%`}}/><div className="bg-red-500 h-full" style={{width:`${(sum.a/sum.t)*100}%`}}/></>}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">{sum.t>0?`${Math.round(((sum.p+sum.l)/sum.t)*100)}% present`:"—"}</span>
                        </div>
                        <button onClick={submit} disabled={submitting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 shadow-md shadow-emerald-200 active:scale-95 transition-all">
                            {submitting?<Loader2 size={14} className="animate-spin"/>:<CheckCircle2 size={14}/>}
                            {submitting?"Saving…":marked?"Update Attendance":"Submit Attendance"}
                        </button>
                    </div>
                </div>
            )}

            {!loading&&!isHoliday&&students.length===0&&selSection&&(
                <div className="text-center py-20"><Users size={44} className="mx-auto mb-3 text-slate-200"/><p className="text-sm font-medium text-slate-400">No active students in this section</p></div>
            )}
            {!selSection&&sectionOptions.length>0&&(
                <div className="text-center py-20"><Building2 size={44} className="mx-auto mb-3 text-slate-200"/><p className="text-sm font-medium text-slate-400">Select a section to mark attendance</p></div>
            )}
        </div>
    );
}

// =============================================================================
//  CALENDAR TAB — monthly overview for any section
// =============================================================================
function CalendarTab() {
    const [year,  setYear]  = useState(NOW.getFullYear());
    const [month, setMonth] = useState(NOW.getMonth()+1);
    const [allClasses,  setAllClasses]  = useState<ClassItem[]>([]);
    const [selSection,  setSelSection]  = useState("");
    const [allRecs,     setAllRecs]     = useState<Rec[]>([]);
    const [holidays,    setHolidays]    = useState<string[]>([]);
    const [loading,     setLoading]     = useState(false);
    const [selDay,      setSelDay]      = useState<string|null>(TODAY);

    useEffect(() => {
        api.getAttendanceSections().then(r => setAllClasses(r.classes || []));
    }, []);

    const sectionOptions = useMemo(() => {
        const opts: { id:string; label:string }[] = [];
        allClasses.forEach(c => c.sections.forEach(s => opts.push({ id: s.id, label: `${c.name} — ${s.name}` })));
        return opts;
    }, [allClasses]);

    const load = useCallback(async () => {
        setLoading(true);
        const mm  = String(month).padStart(2,"0");
        const ld  = new Date(year,month,0).getDate();
        const from = `${year}-${mm}-01`, to = `${year}-${mm}-${ld}`;
        try {
            const params: any = { from, to };
            if (selSection) params.sectionId = selSection;
            const [a, h] = await Promise.all([
                api.getAttendanceView(params),
                api.getAttendanceHolidays(year, month),
            ]);
            setAllRecs(a.records || []);
            setHolidays(h.holidays || []);
        } finally { setLoading(false); }
    }, [year, month, selSection]);
    useEffect(() => { load(); }, [load]);

    const dayMap = useMemo(() => {
        const m = new Map<string,{p:number;a:number;l:number;recs:Rec[]}>();
        allRecs.forEach(r => {
            if(!m.has(r.date)) m.set(r.date,{p:0,a:0,l:0,recs:[]});
            const d=m.get(r.date)!; d.recs.push(r);
            if(r.status==="PRESENT")d.p++; else if(r.status==="ABSENT")d.a++; else d.l++;
        });
        return m;
    }, [allRecs]);

    type Cell = null | { d:number; ds:string; dow:number; isHol:boolean; isToday:boolean; isFuture:boolean; data:{p:number;a:number;l:number;recs:Rec[]}|null };
    const cells = useMemo<Cell[]>(() => {
        const hset = new Set(holidays);
        const dim  = new Date(year,month,0).getDate();
        const fdow = new Date(year,month-1,1).getDay();
        const arr:Cell[] = [];
        for(let i=0;i<fdow;i++) arr.push(null);
        for(let d=1;d<=dim;d++){
            const ds=`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const dow=new Date(year,month-1,d).getDay();
            arr.push({d,ds,dow,isHol:hset.has(ds),isToday:ds===TODAY,isFuture:ds>TODAY,data:dayMap.get(ds)??null});
        }
        return arr;
    }, [year,month,holidays,dayMap]);

    const prevM = () => { if(month===1){setYear(y=>y-1);setMonth(12);}else setMonth(m=>m-1); };
    const nextM = () => { if(month===12){setYear(y=>y+1);setMonth(1);}else setMonth(m=>m+1); };
    const isCurr = year===NOW.getFullYear()&&month===NOW.getMonth()+1;
    const mTot = useMemo(()=>{ let p=0,a=0,l=0; allRecs.forEach(r=>{if(r.status==="PRESENT")p++;else if(r.status==="ABSENT")a++;else l++;}); return{p,a,l,t:p+a+l}; },[allRecs]);

    const selData  = selDay ? (dayMap.get(selDay)??null) : null;
    const selIsHol = selDay ? holidays.includes(selDay) : false;

    return (
        <div className="flex flex-1 overflow-hidden w-full">
            <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-5">

                {/* section picker + month stats */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Section</label>
                        <select value={selSection} onChange={e=>setSelSection(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                            <option value="">All Sections</option>
                            {sectionOptions.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </div>
                    {mTot.t>0&&(
                        <div className="flex items-center gap-3 text-sm font-semibold">
                            <span className="text-emerald-600">{mTot.p} P</span>
                            <span className="text-red-600">{mTot.a} A</span>
                            <span className="text-amber-600">{mTot.l} L</span>
                            <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden flex ml-1">
                                <div className="bg-emerald-500 h-full" style={{width:`${(mTot.p/mTot.t)*100}%`}}/>
                                <div className="bg-amber-500 h-full"   style={{width:`${(mTot.l/mTot.t)*100}%`}}/>
                                <div className="bg-red-500 h-full"     style={{width:`${(mTot.a/mTot.t)*100}%`}}/>
                            </div>
                            <span className={`text-xs font-extrabold ${pctColor(attPct(mTot.p,mTot.a,mTot.l))}`}>{attPct(mTot.p,mTot.a,mTot.l)??0}%</span>
                        </div>
                    )}
                </div>

                {/* calendar */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <button onClick={prevM} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><ChevronLeft size={16}/></button>
                            <p className="text-sm font-extrabold text-slate-800 min-w-[160px] text-center">{MONTHS[month-1]} {year}</p>
                            <button onClick={nextM} disabled={isCurr} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30"><ChevronRight size={16}/></button>
                        </div>
                        {loading&&<Loader2 size={13} className="animate-spin text-emerald-400"/>}
                    </div>

                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                        {DAYS.map(d=><div key={d} className={`text-center py-2.5 text-[10px] font-bold uppercase tracking-wider ${d==="Sun"||d==="Sat"?"text-rose-400":"text-slate-400"}`}>{d}</div>)}
                    </div>

                    <div className="grid grid-cols-7">
                        {cells.map((cell,idx)=>{
                            if(!cell) return <div key={`e${idx}`} className="border-r border-b border-slate-50 min-h-[72px]"/>;
                            const isWknd = cell.dow===0||cell.dow===6;
                            const total  = cell.data?cell.data.p+cell.data.a+cell.data.l:0;
                            const pct    = cell.data?attPct(cell.data.p,cell.data.a,cell.data.l):null;
                            const isSel  = selDay===cell.ds;
                            return (
                                <motion.button key={cell.ds} whileTap={{scale:0.95}}
                                    onClick={()=>{ if(!cell.isFuture) setSelDay(isSel?null:cell.ds); }}
                                    className={[
                                        "relative border-r border-b border-slate-100 min-h-[72px] flex flex-col p-2 text-left transition-all",
                                        isSel?"ring-2 ring-inset ring-emerald-500 bg-emerald-50 z-10":"",
                                        cell.isToday&&!isSel?"ring-2 ring-inset ring-emerald-200 bg-emerald-50/30":"",
                                        cell.isHol&&!cell.data?"bg-slate-50/80":"",
                                        isWknd&&!isSel&&!cell.data?"opacity-50":"",
                                        cell.isFuture?"opacity-35 cursor-default":"cursor-pointer hover:bg-slate-50/80",
                                    ].filter(Boolean).join(" ")}>

                                    <span className={`text-[11px] font-bold leading-none mb-1 ${cell.isToday?"text-emerald-600":isWknd?"text-rose-400":"text-slate-600"}`}>{cell.d}</span>

                                    {cell.isHol&&!cell.data?(
                                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-wide mt-auto">holiday</span>
                                    ):cell.data&&total>0?(
                                        <div className="flex flex-col gap-1 mt-auto w-full">
                                            <span className={`text-[12px] font-extrabold leading-none ${pctColor(pct)}`}>{pct}%</span>
                                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                                                <div className="bg-emerald-500 h-full" style={{width:`${(cell.data.p/total)*100}%`}}/>
                                                <div className="bg-amber-500 h-full"   style={{width:`${(cell.data.l/total)*100}%`}}/>
                                                <div className="bg-red-500 h-full"     style={{width:`${(cell.data.a/total)*100}%`}}/>
                                            </div>
                                        </div>
                                    ):!cell.isFuture&&!cell.isHol?(
                                        <span className="text-[8px] text-slate-200 font-medium mt-auto">—</span>
                                    ):null}

                                    {cell.isToday&&<div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500"/>}
                                </motion.button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-center gap-6 py-3 bg-slate-50/80 border-t border-slate-100 flex-wrap">
                        {[{l:"= 90%",c:"text-emerald-600",bg:"bg-emerald-500"},{l:"75–89%",c:"text-amber-600",bg:"bg-amber-500"},{l:"< 75%",c:"text-red-600",bg:"bg-red-500"},{l:"Holiday",c:"text-slate-400",bg:"bg-slate-300"}].map(x=>(
                            <span key={x.l} className={`flex items-center gap-1.5 text-[10px] font-semibold ${x.c}`}><span className={`w-2 h-2 rounded-full ${x.bg}`}/>{x.l}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* -- Day detail panel -- */}
            <AnimatePresence>
                {selDay&&(
                    <motion.div initial={{width:0,opacity:0}} animate={{width:300,opacity:1}} exit={{width:0,opacity:0}}
                        transition={{type:"spring",stiffness:380,damping:32}}
                        className="shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                            <div>
                                <p className="text-xs font-bold text-slate-800">
                                    {new Date(selDay+"T00:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"long",year:"numeric"})}
                                </p>
                                {selIsHol&&<p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5"><AlertTriangle size={9}/>Holiday</p>}
                            </div>
                            <button onClick={()=>setSelDay(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={15}/></button>
                        </div>

                        {selData?(
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-3 gap-px bg-slate-100">
                                    {[{l:"Present",v:selData.p,c:"text-emerald-600",bg:"bg-emerald-50"},{l:"Absent",v:selData.a,c:"text-red-600",bg:"bg-red-50"},{l:"Late",v:selData.l,c:"text-amber-600",bg:"bg-amber-50"}].map(s=>(
                                        <div key={s.l} className={`${s.bg} py-3 text-center`}>
                                            <p className={`text-xl font-extrabold ${s.c}`}>{s.v}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{s.l}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 space-y-0.5 max-h-full overflow-y-auto">
                                    {selData.recs.map(r=>{
                                        const sc=SC[r.status as SK]||SC.PRESENT;
                                        return(
                                            <div key={r.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50">
                                                <div>
                                                    <p className="text-[11px] font-semibold text-slate-700">{r.firstName} {r.lastName}</p>
                                                    {r.rollNo&&<p className="text-[9px] text-slate-400">Roll {r.rollNo}</p>}
                                                </div>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{r.status}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ):(
                            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                <Calendar size={32} className="text-slate-200"/>
                                <p className="text-xs font-medium text-slate-400 text-center px-4">
                                    {selIsHol?"Holiday — no attendance":"No records for this day"}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// =============================================================================
//  VIEW / REPORTS TAB
// =============================================================================
function ViewTab() {
    const [classes,    setClasses]    = useState<ClassItem[]>([]);
    const [selClass,   setSelClass]   = useState("");
    const [selSection, setSelSection] = useState("");
    const [date,       setDate]       = useState(TODAY);
    const [records,    setRecords]    = useState<Rec[]>([]);
    const [summary,    setSummary]    = useState<any>({});
    const [loading,    setLoading]    = useState(false);
    const [search,     setSearch]     = useState("");

    useEffect(() => { api.getAttendanceSections().then(r => setClasses(r.classes||[])); }, []);
    const sections = useMemo(() => classes.find(c=>c.id===selClass)?.sections||[], [classes,selClass]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const p: any ={date};
            if(selClass)   p.classId=selClass;
            if(selSection) p.sectionId=selSection;
            const r = await api.getAttendanceView(p);
            setRecords(r.records||[]); setSummary(r.summary||{});
        } finally { setLoading(false); }
    }, [date,selClass,selSection]);
    useEffect(()=>{ load(); },[load]);

    const filtered = useMemo(()=>{ if(!search) return records; const q=search.toLowerCase(); return records.filter(r=>`${r.firstName} ${r.lastName}`.toLowerCase().includes(q)||(r.rollNo||"").toLowerCase().includes(q)); },[records,search]);
    const grouped  = useMemo(()=>{ const m=new Map<string,{cls:string;sec:string;recs:Rec[]}>(); filtered.forEach(r=>{ if(!m.has(r.sectionId)) m.set(r.sectionId,{cls:r.className,sec:r.sectionName,recs:[]}); m.get(r.sectionId)!.recs.push(r); }); return Array.from(m.values()); },[filtered]);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
                {[
                    {l:"Date",    n:<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"/>},
                    {l:"Class",   n:<select value={selClass} onChange={e=>{setSelClass(e.target.value);setSelSection("");}} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"><option value="">All Classes</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>},
                    {l:"Section", n:<select value={selSection} onChange={e=>setSelSection(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"><option value="">All Sections</option>{sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>},
                    {l:"Search",  n:<div className="relative"><Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"/></div>},
                ].map(({l,n})=>(
                    <div key={l} className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{l}</label>
                        {n}
                    </div>
                ))}
            </div>

            {summary.total>0&&(
                <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center gap-4 flex-wrap shadow-sm">
                    <span className="text-xs font-bold text-slate-600">{summary.total} total</span>
                    <div className="h-4 w-px bg-slate-200"/>
                    <span className="text-xs font-semibold text-emerald-600">{summary.present} Present ({summary.presentPercent || 0}%)</span>
                    <span className="text-xs font-semibold text-red-600">{summary.absent} Absent ({summary.absentPercent || 0}%)</span>
                    <span className="text-xs font-semibold text-amber-600">{summary.late} Late ({summary.latePercent || 0}%)</span>
                </div>
            )}

            {loading&&<div className="flex items-center justify-center py-14"><Loader2 className="animate-spin text-emerald-400" size={32}/></div>}

            {!loading&&grouped.map((g,gi)=>{
                const t=g.recs.length,p=g.recs.filter(r=>r.status==="PRESENT").length,a=g.recs.filter(r=>r.status==="ABSENT").length,l=g.recs.filter(r=>r.status==="LATE").length;
                return(
                    <motion.div key={gi} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:gi*0.04}}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-700">{g.cls} — {g.sec}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400">{t} students</span>
                                <span className={`text-xs font-extrabold ${pctColor(attPct(p,a,l))}`}>{attPct(p,a,l)??0}%</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="border-b border-slate-50">{["#","Student","Roll","Status","Remarks"].map(h=><th key={h} className={`text-[10px] font-bold text-slate-400 uppercase px-5 py-2.5 ${h==="Status"?"text-center":"text-left"}`}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {g.recs.map((r,i)=>{
                                        const sc=SC[r.status as SK]||SC.PRESENT;
                                        return(
                                            <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="px-5 py-2.5 text-[10px] text-slate-300 font-mono">{i+1}</td>
                                                <td className="px-5 py-2.5 text-sm font-medium text-slate-700">{r.firstName} {r.lastName}</td>
                                                <td className="px-5 py-2.5 text-xs text-slate-500 font-mono">{r.rollNo||"—"}</td>
                                                <td className="px-5 py-2.5 text-center"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text} border ${sc.border}`}><sc.icon size={10}/>{r.status}</span></td>
                                                <td className="px-5 py-2.5 text-xs text-slate-400">{r.remarks||"—"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                );
            })}

            {!loading&&records.length===0&&(
                <div className="text-center py-20"><BarChart3 size={44} className="mx-auto mb-3 text-slate-200"/><p className="text-sm font-medium text-slate-400">No attendance data for this selection</p></div>
            )}
        </div>
    );
}

// =============================================================================
//  TODAY SUMMARY TAB — dashboard-style overview
// =============================================================================
function TodaySummaryTab() {
    const [data, setData]       = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getAttendanceTodaySummary()
            .then(r => setData(r))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-emerald-400" size={32}/></div>;
    if (!data) return <div className="text-center py-20 text-slate-400 text-sm">Failed to load summary</div>;

    const { summary, totalStudents, totalSections, sectionsCovered, date } = data;
    const pct = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                    <Calendar size={16} className="text-slate-400"/>
                    <h3 className="text-sm font-bold text-slate-800">
                        Today's Summary — {new Date(date+"T00:00:00").toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
                    </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: "Present", value: summary.present, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Absent", value: summary.absent, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
                        { label: "Late", value: summary.late, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                        { label: "Total Marked", value: summary.total, icon: Users, color: "text-slate-700", bg: "bg-slate-50" },
                    ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                            <s.icon size={18} className={`${s.color} mx-auto mb-2`}/>
                            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-extrabold text-slate-700">{totalStudents}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Total Active Students</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-extrabold text-slate-700">{sectionsCovered} / {totalSections}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Sections Covered</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <p className={`text-2xl font-extrabold ${pct >= 90 ? "text-emerald-600" : pct >= 75 ? "text-amber-600" : "text-red-600"}`}>{pct}%</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Attendance Rate</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useRef, useState } from "react";
import api from "../../api/api";

const TERMS = ["TERM1", "TERM2", "TERM3"];

const CreateExamModal = ({
    onClose,
    onRefresh,
    setMessage,
    setMessageType,
}: any) => {
    const [examName, setExamName] = useState("");
    const [examTerm, setExamTerm] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [filterType, setFilterType] = useState<"class" | "course" | "subject" | "">("");
    const [filterOptions, setFilterOptions] = useState<any[]>([]);
    const [selectedFilterValue, setSelectedFilterValue] = useState("");
    const [subjectSearch, setSubjectSearch] = useState("");

    const [subjects, setSubjects] = useState<any[]>([]);
    const [subjectIds, setSubjectIds] = useState<string[]>([]);

    const [fullMarks, setFullMarks] = useState<number | "">("");

    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    const subjectListRef = useRef<HTMLDivElement>(null);

    // Load sessions
    useEffect(() => {
        api.getSessions().then((s) => setSessions(s || []));
    }, []);

    // Load filter options when session + filterType changes
    useEffect(() => {
        if (!sessionId || !filterType) return;
        setSelectedFilterValue("");
        setSubjects([]);
        setSubjectIds([]);
        setSubjectSearch("");

        if (filterType === "subject") {
            // Load subjects directly
            setLoadingSubjects(true);
            api.getSubjects({ sessionId, onlyWithTeacher: true })
                .then((d) => setSubjects(d || []))
                .catch(() => setSubjects([]))
                .finally(() => setLoadingSubjects(false));
            return;
        }

        const loadOptions = async () => {
            let data: any[] = [];
            if (filterType === "class") data = (await api.getClasses()) || [];
            else if (filterType === "course") data = (await api.getCourses({ sessionId })) || [];
            setFilterOptions(data);
        };
        loadOptions();
    }, [sessionId, filterType]);

    // Fetch subjects when a class/course filter value is picked
    useEffect(() => {
        if (!sessionId || !filterType || filterType === "subject" || !selectedFilterValue) return;

        setLoadingSubjects(true);
        const params: any = { sessionId, onlyWithTeacher: true };
        if (filterType === "class") params.classId = selectedFilterValue;
        else if (filterType === "course") params.courseId = selectedFilterValue;

        api.getSubjects(params)
            .then((d) => { setSubjects(d || []); setSubjectIds([]); })
            .catch(() => setSubjects([]))
            .finally(() => setLoadingSubjects(false));
    }, [filterType, selectedFilterValue, sessionId]);

    const toggleSubject = (id: string) =>
        setSubjectIds((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );

    const filteredSubjects = subjects.filter((s) =>
        s.name.toLowerCase().includes(subjectSearch.toLowerCase())
    );
    const unselected = filteredSubjects.filter((s) => !subjectIds.includes(s.id));
    const selected = subjects.filter((s) => subjectIds.includes(s.id));

    const selectAll = () => setSubjectIds(filteredSubjects.map((s) => s.id));
    const clearAll = () => setSubjectIds([]);

    const handleSubmit = async () => {
        if (!examName.trim() || !examTerm || !sessionId || subjectIds.length === 0 || !fullMarks) {
            setMessage("Please fill in all required fields and select at least one subject.");
            setMessageType("error");
            return;
        }
        try {
            setLoading(true);
            await api.createExam({
                examName: examName.trim(),
                examTerm,
                sessionId,
                subjectIds,
                fullMarks: Number(fullMarks),
            });
            setMessage("Exam created successfully");
            setMessageType("success");
            onRefresh();
            onClose();
        } catch (err: any) {
            setMessage(err?.response?.data?.message || "Failed to create exam");
            setMessageType("error");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const showSecondaryFilter = filterType === "class" || filterType === "course";
    const canShowSubjects =
        filterType === "subject" ||
        (showSecondaryFilter && selectedFilterValue);

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/50 flex justify-center items-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Create Exam</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Fill in the details and select subjects</p>
                    </div>
                    <button data-testid="create-exam-modal-close-btn"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">

                    {/* Row 1: Session */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                            Academic Session <span className="text-red-400">*</span>
                        </label>
                        <select data-testid="create-exam-modal-session-id-select"
                            value={sessionId}
                            onChange={(e) => {
                                setSessionId(e.target.value);
                                setFilterType("");
                                setFilterOptions([]);
                                setSubjects([]);
                                setSubjectIds([]);
                            }}
                            className="w-full border border-slate-200 bg-slate-50 text-slate-700 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                        >
                            <option value="">— Select Session —</option>
                            {sessions.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Row 2: Exam Name + Term */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                                Exam Name <span className="text-red-400">*</span>
                            </label>
                            <input data-testid="create-exam-modal-exam-name-input"
                                placeholder="e.g. Mid-Term 2024"
                                value={examName}
                                onChange={(e) => setExamName(e.target.value)}
                                className="w-full border border-slate-200 bg-slate-50 text-slate-700 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                                Term <span className="text-red-400">*</span>
                            </label>
                            <select data-testid="create-exam-modal-exam-term-select"
                                value={examTerm}
                                onChange={(e) => setExamTerm(e.target.value)}
                                className="w-full border border-slate-200 bg-slate-50 text-slate-700 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                            >
                                <option value="">— Select Term —</option>
                                {TERMS.map((t) => (
                                    <option key={t} value={t}>{t.replace("TERM", "Term ")}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Full Marks */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                            Full Marks <span className="text-red-400">*</span>
                        </label>
                        <input data-testid="create-exam-modal-full-marks-input"
                            type="number"
                            min={1}
                            placeholder="e.g. 100"
                            value={fullMarks}
                            onChange={(e) => setFullMarks(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full border border-slate-200 bg-slate-50 text-slate-700 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 pt-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Subject Selection</p>
                    </div>

                    {/* Row 4: Filter Type */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                            Find Subjects By
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["class", "course", "subject"] as const).map((type) => (
                                <button data-testid="create-exam-modal-filter-type-btn"
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    disabled={!sessionId}
                                    className={`py-2 px-3 text-sm font-medium rounded-lg border transition capitalize
                                        ${filterType === type
                                            ? "bg-emerald-600 text-white border-emerald-600"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                        }`}
                                >
                                    {type === "class" ? "By Class" : type === "course" ? "By Course" : "By Subject"}
                                </button>
                            ))}
                        </div>
                        {!sessionId && (
                            <p className="text-xs text-amber-500 mt-1.5">⚠ Select a session first</p>
                        )}
                    </div>

                    {/* Row 5: Secondary filter (class or course dropdown) */}
                    {showSecondaryFilter && (
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                                Select {filterType === "class" ? "Class" : "Course"} <span className="text-red-400">*</span>
                            </label>
                            <select data-testid="create-exam-modal-selected-filter-value-select"
                                value={selectedFilterValue}
                                onChange={(e) => setSelectedFilterValue(e.target.value)}
                                className="w-full border border-slate-200 bg-slate-50 text-slate-700 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                            >
                                <option value="">— Select {filterType} —</option>
                                {filterOptions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Row 6: Subjects panel */}
                    {canShowSubjects && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            {/* Panel header */}
                            <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Subjects
                                    {subjects.length > 0 && (
                                        <span className="ml-1.5 text-slate-400 font-normal normal-case">({subjects.length} available)</span>
                                    )}
                                </span>
                                <div className="flex items-center gap-3">
                                    {subjectIds.length > 0 && (
                                        <span className="text-xs font-semibold text-emerald-600">
                                            {subjectIds.length} selected
                                        </span>
                                    )}
                                    {subjects.length > 0 && (
                                        <>
                                            <button data-testid="create-exam-modal-select-all-btn"
                                                onClick={selectAll}
                                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                Select all
                                            </button>
                                            {subjectIds.length > 0 && (
                                                <button data-testid="create-exam-modal-clear-all-btn"
                                                    onClick={clearAll}
                                                    className="text-xs text-red-400 hover:text-red-600 font-medium"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Search */}
                            {subjects.length > 4 && (
                                <div className="px-3 pt-2.5 pb-1">
                                    <input data-testid="create-exam-modal-subject-search-input"
                                        placeholder="Search subjects..."
                                        value={subjectSearch}
                                        onChange={(e) => setSubjectSearch(e.target.value)}
                                        className="w-full border border-slate-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                                    />
                                </div>
                            )}

                            {/* Selected chips */}
                            {selected.length > 0 && (
                                <div className="px-3 py-2.5 flex flex-wrap gap-1.5">
                                    {selected.map((s) => (
                                        <span
                                            key={s.id}
                                            className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full"
                                        >
                                            {s.name}
                                            <button data-testid={`create-exam-modal-remove-subject-${s.id}`}
                                                onClick={() => toggleSubject(s.id)}
                                                className="text-emerald-400 hover:text-emerald-700 leading-none"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {selected.length > 0 && unselected.length > 0 && (
                                <div className="mx-3 border-t border-slate-100" />
                            )}

                            {/* Scrollable list */}
                            <div ref={subjectListRef} className="max-h-44 overflow-y-auto px-2 py-1.5">
                                {loadingSubjects ? (
                                    <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-400">
                                        <svg className="animate-spin w-4 h-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Loading subjects...
                                    </div>
                                ) : unselected.length > 0 ? (
                                    unselected.map((s) => (
                                        <div
                                            key={s.id}
                                            data-testid={`create-exam-modal-add-subject-${s.id}`}
                                            data-subject-name={s.name}
                                            onClick={() => toggleSubject(s.id)}
                                            className="flex items-center gap-2.5 text-sm text-slate-700 px-3 py-2 rounded-lg cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition group"
                                        >
                                            <span className="w-4 h-4 rounded border border-slate-300 group-hover:border-emerald-400 flex-shrink-0 transition" />
                                            {s.name}
                                        </div>
                                    ))
                                ) : subjects.length === 0 ? (
                                    <p className="text-sm text-slate-400 px-3 py-4 text-center">
                                        No subjects with an assigned teacher found
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-400 px-3 py-4 text-center">
                                        All subjects selected
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
                    <p className="text-xs text-slate-400">
                        {subjectIds.length > 0
                            ? `${subjectIds.length} subject${subjectIds.length > 1 ? "s" : ""} selected`
                            : "No subjects selected"}
                    </p>
                    <div className="flex gap-2">
                        <button data-testid="create-exam-modal-close-btn-2"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition"
                        >
                            Cancel
                        </button>
                        <button data-testid="create-exam-modal-submit-btn"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                            {loading && (
                                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            )}
                            {loading ? "Creating…" : "Create Exam"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreateExamModal;


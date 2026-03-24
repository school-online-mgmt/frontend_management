import { useEffect, useState } from "react";
import api from "../../api/api";

const CreateExamModal = ({
     onClose,
     onRefresh,
     setMessage,
     setMessageType
 }: any) => {

    const [examName, setExamName] = useState("");
    const [examTerm, setExamTerm] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [filterType, setFilterType] = useState<"class" | "course" | "subject" | "">("");
    const [filterOptions, setFilterOptions] = useState<any[]>([]);
    const [selectedFilterValue, setSelectedFilterValue] = useState("");

    const [subjects, setSubjects] = useState<any[]>([]);
    const [subjectIds, setSubjectIds] = useState<string[]>([]);

    const [fullMarks, setFullMarks] = useState<number | "">("");

    const [sessions, setSessions] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    // Load sessions
    useEffect(() => {
        const load = async () => {
            const sessions = await api.getSessions();
            setSessions(sessions || []);
        };
        load();
    }, []);

    useEffect(() => {
        if (!sessionId || !filterType) return;

        const loadOptions = async () => {
            let data = [];

            if (filterType === "class") {
                data = await api.getClasses();
            } else if (filterType === "course") {
                data = await api.getCourses({ sessionId });
            } else if (filterType === "subject") {
                data = await api.getSubjects({ sessionId });
            }

            setFilterOptions(data || []);
        };

        loadOptions();

        // reset
        setSelectedFilterValue("");
        setSubjects([]);
        setSubjectIds([]);

    }, [sessionId, filterType]);

    // Fetch Subjects
    useEffect(() => {

        if (!sessionId || !filterType || !selectedFilterValue) return;

        const fetchSubjects = async () => {
            setLoadingSubjects(true);

            try {
                let data;

                if (filterType === "class") {
                    data = await api.getSubjects({
                        classId: selectedFilterValue,
                        sessionId,
                        onlyWithTeacher: true
                    });
                } else if (filterType === "course") {
                    data = await api.getSubjects({
                        courseId: selectedFilterValue,
                        sessionId,
                        onlyWithTeacher: true
                    });
                } else {
                    data = await api.getSubjects({
                        sessionId,
                        onlyWithTeacher: true
                    });
                }

                setSubjects(data || []);
                setSubjectIds([]);

            } catch {
                setSubjects([]);
            } finally {
                setLoadingSubjects(false);
            }
        };

        fetchSubjects();

    }, [filterType, selectedFilterValue, sessionId]);

    const toggleSubject = (id: string) => {
        if (subjectIds.includes(id)) {
            setSubjectIds(subjectIds.filter((s) => s !== id));
        } else {
            setSubjectIds([...subjectIds, id]);
        }
    };


    const selectAllSubjects = () => {
        setSubjectIds(subjects.map(s => s.id));
    };

    const handleSubmit = async () => {

        if (!examName || !examTerm || !sessionId || subjectIds.length === 0 || !fullMarks) {
            setMessage("All required fields must be filled");
            setMessageType("error");
            return;
        }

        try {
            setLoading(true);

            await api.createExam({
                examName,
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
            setMessage(err?.response?.data?.message || "Failed");
            setMessageType("error");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex justify-center items-center pointer-events-auto">
            <div className="bg-white p-6 rounded-xl w-[500px] space-y-3">

                <h2>Create Exam</h2>

                {/* Session */}
                <select
                    value={sessionId}
                    onChange={(e) => {
                        setSessionId(e.target.value);
                        setFilterType("");
                        setFilterOptions([]);
                        setSubjects([]);
                        setSubjectIds([]);
                    }}
                    className="w-full border p-2 rounded-lg"
                >
                    <option value="">Select Session</option>
                    {sessions.map((session) => (
                        <option key={session.id} value={session.id}>{session.name}</option>
                    ))}
                </select>

                {/*Exam Term*/}
                <select
                    value={examTerm}
                    onChange={(e) => setExamTerm(e.target.value)}
                    className="w-full border p-2">
                    <option value="">Select Term</option>
                    <option value="TERM1">TERM1</option>
                    <option value="TERM2">TERM2</option>
                    <option value="TERM3">TERM3</option>
                </select>

                {/* Exam Name */}
                <input
                    placeholder="Exam Name"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className="w-full border p-2"
                />


                {/* Filter Type */}
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    disabled={!sessionId}
                    className="w-full border p-2 rounded-lg"
                >
                    <option value="">Filter By</option>
                    <option value="class">Class</option>
                    <option value="course">Course</option>
                    <option value="subject">Subject</option>
                </select>

                {/* Dynamic Dropdown */}
                <select
                    value={selectedFilterValue}
                    onChange={(e) => setSelectedFilterValue(e.target.value)}
                    disabled={!filterType}
                    className="w-full border p-2 rounded-lg"
                >
                    <option value="">Select {filterType}</option>
                    {filterOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                {/*Subjects Section*/}
                <div className="border p-3 rounded-lg">

                    {/* Select All */}
                    {subjects.length > 0 && (
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500">
                                {subjectIds.length} selected
                            </span>

                            <button
                                onClick={selectAllSubjects}
                                disabled={subjectIds.length === subjects.length}
                                className="text-sm text-emerald-600 hover:underline"
                            >
                                Select All
                            </button>
                        </div>
                    )}

                    {/* Selected */}
                    <div className="flex flex-wrap gap-2">
                        {subjectIds.length === 0 && (
                            <p className="text-sm text-slate-400">No subjects selected</p>
                        )}
                        {subjects
                            .filter(s => subjectIds.includes(s.id))
                            .map(s => (
                                <div
                                    key={s.id}
                                    className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                                >
                                    {s.name}
                                    <button onClick={() => toggleSubject(s.id)}>✕</button>
                                </div>
                            ))}
                    </div>

                    <div className="border-t my-3" />

                    {/* Available */}
                    <div className="max-h-32 overflow-y-auto">
                        {loadingSubjects ? (
                            <p className="text-sm text-slate-500">Loading subjects...</p>
                        ) : subjects.length ? (
                            subjects
                                .filter(s => !subjectIds.includes(s.id))
                                .map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => toggleSubject(s.id)}
                                        className="text-sm p-2 cursor-pointer hover:bg-slate-100 rounded"
                                    >
                                        {s.name}
                                    </div>
                                ))
                        ) : (
                            <p className="text-sm text-slate-400">
                                No subjects with assigned teacher available
                            </p>
                        )}
                    </div>
                </div>

                {/*Full Marks*/}
                <input
                    type="number"
                    placeholder="Full Marks"
                    value={fullMarks}
                    onChange={(e) => setFullMarks(Number(e.target.value))}
                    className="w-full border p-2"/>

                {/*Cancel and Submit buttons*/}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                    className="bg-grey rounded-lg">Cancel</button>
                    <button onClick={handleSubmit}
                            disabled={loading}
                            className="bg-emerald-600 text-white px-3 py-1 rounded-lg">
                        {loading ? "Creating..." : "Create"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CreateExamModal;
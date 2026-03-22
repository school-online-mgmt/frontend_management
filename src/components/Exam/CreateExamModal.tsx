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
    const [classId, setClassId] = useState("");
    const [courseId, setCourseId] = useState("");

    const [mode, setMode] = useState<"course" | "class">("class");
    const [subjects, setSubjects] = useState<any[]>([]);
    const [subjectIds, setSubjectIds] = useState<string[]>([]);

    const [fullMarks, setFullMarks] = useState<number | "">("");

    const [sessions, setSessions] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);

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

    // Load Classes
    useEffect(() => {
        if (!sessionId) return;

        const loadClasses = async () => {
            const data = await api.getClasses();
            setClasses(data || []);
        };

        loadClasses();

        setClassId("");
        setCourseId("");
        setSubjects([]);
        setSubjectIds([]);

    }, [sessionId]);

    useEffect(() => {
        if (!classId || !sessionId) return;

        const loadCourses = async () => {
            const data = await api.getCourses({ sessionId });
            setCourses((data || []).filter((c: any) => c.classId === classId));
        };

        loadCourses();

        setCourseId("");
        setSubjects([]);
        setSubjectIds([]);

    }, [classId]);

    // Reset when mode changes
    useEffect(() => {
        setSubjects([]);
        setSubjectIds([]);
        setCourseId("");

    }, [mode]);

    // Fetch Subjects
    useEffect(() => {

        if (!sessionId || !classId) return;

        const fetchSubjects = async () => {
            setLoadingSubjects(true);

            try {
                let data;

                if (mode === "course") {
                    if (!courseId) return;
                    data = await api.getSubjects({ courseId, sessionId, onlyWithTeacher : true });
                } else {
                    data = await api.getSubjects({ classId, sessionId, onlyWithTeacher : true });
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

    }, [mode, courseId, classId, sessionId]);

    const toggleSubject = (id: string) => {
        if (subjectIds.includes(id)) {
            setSubjectIds(subjectIds.filter((s) => s !== id));
        } else {
            setSubjectIds([...subjectIds, id]);
        }
    };

    const allSelected = subjects.length > 0 && subjectIds.length === subjects.length;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSubjectIds([]);
        } else {
            setSubjectIds(subjects.map(s => s.id));
        }
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

                {/* Exam Name */}
                <input
                    placeholder="Exam Name"
                   value={examName}
                   onChange={(e) => setExamName(e.target.value)}
                   className="w-full border p-2"/>

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

                {/*Session*/}
                <select
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="w-full border p-2 rounded-lg"
                >
                    <option value="">Select Session</option>
                    {sessions.map((session) => (
                        <option key={session.id} value={session.id}>{session.name}</option>
                    ))}
                </select>

                {/* Subject Source */}
                <div className="flex gap-4 text-sm items-center">
                    <span className="text-slate-500">Subject Source:</span>

                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            checked={mode === "class"}
                            onChange={() => setMode("class")}
                            disabled={!sessionId}
                        />
                        From Class
                    </label>

                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            checked={mode === "course"}
                            onChange={() => setMode("course")}
                            disabled={!sessionId}
                        />
                        From Course
                    </label>
                </div>

                {/* Class */}
                    <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        disabled={!sessionId}
                        className="w-full border p-2 rounded-lg"
                    >
                        <option value="">Select Class</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                {/* Course */}
                {mode === "course" && (
                    <select
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        disabled={!classId}
                        className="w-full border p-2 rounded-lg"
                    >
                        <option value="">Select Course</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                    </select>
                )}

                {/* Subjects */}
                <div className="border p-3 rounded-lg max-h-40 overflow-y-auto">
                    {mode === "class" && !classId ? (
                        <p className="text-sm text-slate-400">Select class first</p>
                    ) : mode === "course" && !courseId ? (
                        <p className="text-sm text-slate-400">Select course to load subjects</p>
                    ) : loadingSubjects ? (
                        <p className="text-sm text-slate-500">Loading subjects...</p>
                    ) : subjects.length ? (
                        <>
                            <label className="flex gap-2 text-sm font-medium border-b pb-2 mb-2">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                />
                                Select All
                            </label>

                            {subjects.map((s) => (
                                <label key={s.id} className="flex gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={subjectIds.includes(s.id)}
                                        onChange={() => toggleSubject(s.id)}
                                    />
                                    {s.name}
                                </label>
                            ))}
                        </>
                    ) : (
                        <p className="text-sm text-slate-400">No subjects with assigned teacher available</p>
                    )}
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
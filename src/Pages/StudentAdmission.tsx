import { useEffect, useState } from "react";
import {
  Users, FileCheck, UserPlus, CheckCircle, XCircle, AlertCircle,
  Mail, Phone, Calendar, Search, Filter, Loader2, Eye, X,
  Bus, MapPin, Tag,
} from "lucide-react";
import api from "../api/api";
import PageHeader from "../components/PageHeader";

interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fatherName: string;
  motherName: string;
  gender: string;
  address: string;
  disability: boolean;
  status: string;
  createdAt: string;
  // ── Preferences captured at application time (used by the pre-fill effect
  // below). The applicant only flags whether they want transport; the
  // school assigns the actual zone here at admit time.
  sessionId?: string;
  desiredClassId?: string | null;
  transportOpted?: boolean;
}

interface AdmissionRequest {
  sessionId: string;
  classId: string;
  sectionId: string;
  courseId: string;
  admissionId: string;
  rollNo: string;
  transportOpted: boolean;
  transportZoneId?: string;
}

const StudentAdmission = () => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("APPLIED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [admissionData, setAdmissionData] = useState<AdmissionRequest>({
    sessionId: "",
    classId: "",
    sectionId: "",
    courseId: "",
    admissionId: "",
    rollNo: "",
    transportOpted: false,
  });

  // Dropdown data
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [transportZones, setTransportZones] = useState<any[]>([]);

  useEffect(() => {
    fetchApplicants();
    api.getSessions().then((data: any) => {
      setSessions(Array.isArray(data) ? data : []);
    }).catch(() => setSessions([]));
    api.getTransportZones().then((data: any) => {
      setTransportZones(Array.isArray(data) ? data : data?.zones ?? []);
    }).catch(() => setTransportZones([]));
    api.generateAdmissionInfo().then((data: any) => {
      setAdmissionData(prev => ({ ...prev, admissionId: data.admissionId }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (admissionData.sectionId) {
      api.generateAdmissionInfo(admissionData.sectionId).then((data: any) => {
        setAdmissionData(prev => ({ ...prev, rollNo: data.rollNo }));
      }).catch(() => {});
    }
  }, [admissionData.sectionId]);

  // When a specific applicant is selected for admission, pre-fill the
  // admit form with the preferences captured on the public application
  // form. Session, preferred class and the transport-opt-in boolean carry
  // through. The transport ZONE is NOT pre-filled — the applicant doesn't
  // pick a zone on the public form; management assigns one here based on
  // the student's home address.
  useEffect(() => {
    if (!selectedApplicant) return;
    setAdmissionData(prev => ({
      ...prev,
      sessionId: selectedApplicant.sessionId ?? prev.sessionId,
      classId:   selectedApplicant.desiredClassId ?? prev.classId,
      transportOpted: selectedApplicant.transportOpted ?? prev.transportOpted,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApplicant?.id]);

  useEffect(() => {
    filterApplicants();
  }, [searchQuery, statusFilter, applicants]);

  useEffect(() => {
    if (admissionData.sessionId) {
      api.getClasses().then((data: any) => {
        setClasses(Array.isArray(data) ? data : []);
      }).catch(() => setClasses([]));
      api.getCourses({ sessionId: admissionData.sessionId }).then((data: any) => {
        setAllCourses(Array.isArray(data) ? data : []);
      }).catch(() => setAllCourses([]));
    } else {
      setClasses([]);
      setAllCourses([]);
    }
    setAdmissionData(prev => ({ ...prev, classId: "", sectionId: "", courseId: "" }));
    setSections([]);
    setCourses([]);
  }, [admissionData.sessionId]);

  useEffect(() => {
    if (admissionData.classId) {
      api.getSectionsByClass(admissionData.classId).then((data: any) => {
        setSections(Array.isArray(data) ? data : []);
      }).catch(() => setSections([]));
      setCourses(allCourses.filter((c: any) => c.classId === admissionData.classId || c.class?.id === admissionData.classId));
    } else {
      setSections([]);
      setCourses([]);
    }
    setAdmissionData(prev => ({ ...prev, sectionId: "", courseId: "" }));
  }, [admissionData.classId, allCourses]);

  const fetchApplicants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getApplicants?.();
      if (data) setApplicants(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load applicants. Please try again.");
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  const filterApplicants = () => {
    let filtered = applicants;
    if (statusFilter !== "ALL") filtered = filtered.filter((app) => app.status === statusFilter);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.firstName.toLowerCase().includes(query) ||
          app.lastName.toLowerCase().includes(query) ||
          app.email.toLowerCase().includes(query) ||
          app.phone.includes(query)
      );
    }
    setFilteredApplicants(filtered);
  };

  const handleCreateAdmission = async (applicant: Applicant) => {
    if (!admissionData.sessionId) {
      setError("Session is required. Please select a session.");
      return;
    }
    if (!admissionData.classId) {
      setError("Class is required. Please select a class.");
      return;
    }
    if (!admissionData.sectionId) {
      setError("Section is required. Please select a section.");
      return;
    }
    if (!admissionData.courseId) {
      setError("Course is required. Please select a course.");
      return;
    }
    if (admissionData.transportOpted && !admissionData.transportZoneId) {
      setError("Please select a transport zone when transport is opted.");
      return;
    }
    try {
      await api.createAdmission?.(applicant.id, admissionData);
      fetchApplicants();
      setShowAdmissionForm(false);
      setSelectedApplicant(null);
    } catch {
      setError("Failed to create admission. Please try again.");
    }
  };

  const handleRejectApplication = async (applicantId: string) => {
    try {
      await api.rejectApplication?.(applicantId);
      fetchApplicants();
    } catch {
      setError("Failed to reject application.");
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      APPLIED:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending" },
      ACCEPTED:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500",  label: "Accepted" },
      REJECTED:  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",      label: "Rejected" },
      CANCELLED: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400",    label: "Cancelled" },
    };
    return map[status] ?? { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: status };
  };

  const selectedZone = transportZones.find((z: any) => z.id === admissionData.transportZoneId);

  return (
    <div className="min-h-full bg-slate-50 pb-12">
      <PageHeader
        icon={FileCheck}
        title="Student Admission Management"
        gradient="from-teal-600 via-cyan-600 to-blue-600"
        subtitle="Review applications and create admissions"
      />

      <div className="max-w-7xl mx-auto px-4 mt-8" data-testid="admission-page">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" data-testid="stats-grid">
          {[
            { label: "Pending",  value: applicants.filter(a => a.status === "APPLIED").length,   icon: AlertCircle, color: "text-amber-500" },
            { label: "Accepted", value: applicants.filter(a => a.status === "ACCEPTED").length,  icon: CheckCircle, color: "text-emerald-600" },
            { label: "Rejected", value: applicants.filter(a => a.status === "REJECTED").length,  icon: XCircle,     color: "text-red-500" },
            { label: "Total",    value: applicants.length,                                        icon: Users,       color: "text-indigo-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                </div>
                <Icon className={color} size={28} />
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                id="search-input"
                data-testid="search-input"
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                id="status-filter"
                data-testid="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="APPLIED">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
            <button data-testid="student-admission-error-btn" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="animate-spin w-10 h-10 text-indigo-500 mb-3" />
            <p className="text-slate-500 text-sm">Loading applications...</p>
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-16 text-center">
            <Users className="mx-auto w-12 h-12 text-slate-200 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No Applications</h3>
            <p className="text-slate-400 text-sm">
              {searchQuery ? "Try adjusting your search criteria." : "No applications to display."}
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="applicants-list">
            {filteredApplicants.map((applicant) => {
              const badge = getStatusBadge(applicant.status);
              return (
                <div key={applicant.id} data-testid={`applicant-row-${applicant.id}`} className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all overflow-hidden">
                  <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
                          {applicant.firstName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 truncate">
                            {applicant.firstName} {applicant.lastName}
                          </h3>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Mail size={12} />{applicant.email}</span>
                            <span className="flex items-center gap-1"><Phone size={12} />{applicant.phone}</span>
                            <span className="flex items-center gap-1"><Calendar size={12} />{new Date(applicant.createdAt).toLocaleDateString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 ${badge.bg} ${badge.text} px-3 py-1 rounded-full text-xs font-semibold shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
                      {[
                        { label: "Father", value: applicant.fatherName },
                        { label: "Mother", value: applicant.motherName },
                        { label: "Gender", value: applicant.gender },
                        { label: "Disability", value: applicant.disability ? "Yes" : "No" },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
                          <p className="text-sm font-medium text-slate-800 capitalize">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setSelectedApplicant(applicant)}
                        data-testid={`view-btn-${applicant.id}`}
                        className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
                        <Eye size={15} /> View Details
                      </button>
                      {applicant.status === "APPLIED" && (
                        <>
                          <button onClick={() => { setSelectedApplicant(applicant); setShowAdmissionForm(true); }}
                            data-testid={`create-admission-btn-${applicant.id}`}
                            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">
                            <UserPlus size={15} /> Create Admission
                          </button>
                          <button onClick={() => handleRejectApplication(applicant.id)}
                            data-testid={`reject-btn-${applicant.id}`}
                            className="flex items-center gap-1.5 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm font-medium">
                            <XCircle size={15} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Applicant Detail Modal */}
      {selectedApplicant && !showAdmissionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold">Applicant Details</h2>
              <button data-testid="student-admission-selected-applicant-btn" onClick={() => setSelectedApplicant(null)} className="p-1 rounded-lg hover:bg-white/10 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                  {selectedApplicant.firstName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedApplicant.firstName} {selectedApplicant.lastName}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Applicant</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Email",   value: selectedApplicant.email,      colSpan: "" },
                  { label: "Phone",   value: selectedApplicant.phone,      colSpan: "" },
                  { label: "Address", value: selectedApplicant.address,    colSpan: "col-span-2" },
                  { label: "Father",  value: selectedApplicant.fatherName, colSpan: "" },
                  { label: "Mother",  value: selectedApplicant.motherName, colSpan: "" },
                ].map(({ label, value, colSpan }) => (
                  <div key={label} className={`${colSpan} p-3 bg-slate-50 rounded-lg`}>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                {selectedApplicant.status === "APPLIED" && (
                  <>
                    <button data-testid="student-admission-show-admission-form-btn" onClick={() => setShowAdmissionForm(true)}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">
                      Create Admission
                    </button>
                    <button data-testid="student-admission-reject-application-btn" onClick={() => handleRejectApplication(selectedApplicant.id)}
                      className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg hover:bg-red-100 transition text-sm font-medium">
                      Reject
                    </button>
                  </>
                )}
                <button data-testid="student-admission-selected-applicant-btn-2" onClick={() => setSelectedApplicant(null)}
                  className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-200 transition text-sm font-medium">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admission Form Modal */}
      {showAdmissionForm && selectedApplicant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold">Create Admission</h2>
                <p className="text-emerald-100 text-xs mt-0.5">{selectedApplicant.firstName} {selectedApplicant.lastName}</p>
              </div>
              <button data-testid="student-admission-show-admission-form-btn-2" onClick={() => setShowAdmissionForm(false)} className="p-1 rounded-lg hover:bg-white/10 transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Academic placement */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Academic Placement</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Session */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Session <span className="text-red-500">*</span></label>
                    <select id="session-select" data-testid="session-select" value={admissionData.sessionId}
                      onChange={(e) => setAdmissionData({ ...admissionData, sessionId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      <option value="">Select Session</option>
                      {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  {/* Class */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Class <span className="text-red-500">*</span></label>
                    <select id="class-select" data-testid="class-select" value={admissionData.classId} disabled={!admissionData.sessionId}
                      onChange={(e) => setAdmissionData({ ...admissionData, classId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white">
                      <option value="">{!admissionData.sessionId ? "Select a session first" : "Select Class"}</option>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {/* Section */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Section <span className="text-red-500">*</span></label>
                    <select id="section-select" data-testid="section-select" value={admissionData.sectionId} disabled={!admissionData.classId}
                      onChange={(e) => setAdmissionData({ ...admissionData, sectionId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white">
                      <option value="">{!admissionData.classId ? "Select a class first" : "Select Section"}</option>
                      {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  {/* Course */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Course <span className="text-red-500">*</span></label>
                    <select id="course-select" data-testid="course-select" value={admissionData.courseId} disabled={!admissionData.classId}
                      onChange={(e) => setAdmissionData({ ...admissionData, courseId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white">
                      <option value="">{!admissionData.classId ? "Select a class first" : "Select Course"}</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {/* Admission ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Admission ID</label>
                    <input id="admission-id" data-testid="admission-id" type="text" value={admissionData.admissionId} readOnly
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                  </div>
                  {/* Roll No */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Roll Number</label>
                    <input id="roll-no" data-testid="roll-no" type="text" value={admissionData.rollNo} readOnly
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* Transport */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Transport</p>
                {/* Toggle */}
                <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors select-none">
                  <input data-testid="student-admission-admission-data-checkbox" type="checkbox" checked={admissionData.transportOpted}
                    onChange={(e) => setAdmissionData({
                      ...admissionData,
                      transportOpted: e.target.checked,
                      transportZoneId: e.target.checked ? admissionData.transportZoneId : undefined,
                    })}
                    className="w-4 h-4 rounded accent-emerald-600" />
                  <Bus size={16} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Transport Opted</p>
                    <p className="text-xs text-slate-400">Student will be assigned to a transport zone</p>
                  </div>
                </label>

                {/* Zone Picker — only when opted */}
                {admissionData.transportOpted && (
                  <div className="mt-3 space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Transport Zone <span className="text-red-500">*</span>
                    </label>

                    {transportZones.length === 0 ? (
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700">
                          No transport zones configured. Please set up zones in the <strong>Fees</strong> module first.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Dropdown */}
                        <select data-testid="student-admission-admission-data-select" value={admissionData.transportZoneId ?? ""}
                          onChange={(e) => setAdmissionData({ ...admissionData, transportZoneId: e.target.value || undefined })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                          <option value="">— Select a transport zone —</option>
                          {transportZones.map((zone: any) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name}{zone.description ? ` · ${zone.description}` : ""} — ₹{Number(zone.price).toLocaleString("en-IN")}/month
                            </option>
                          ))}
                        </select>

                        {/* Zone cards grid (quick-select visual) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {transportZones.map((zone: any) => {
                            const selected = admissionData.transportZoneId === zone.id;
                            return (
                              <button data-testid="student-admission-admission-data-btn" key={zone.id} type="button"
                                onClick={() => setAdmissionData({ ...admissionData, transportZoneId: zone.id })}
                                className={`text-left p-3 rounded-xl border-2 transition-all ${
                                  selected
                                    ? "border-emerald-500 bg-emerald-50"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                }`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-emerald-100" : "bg-slate-100"}`}>
                                      <MapPin size={13} className={selected ? "text-emerald-600" : "text-slate-400"} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className={`text-sm font-semibold truncate ${selected ? "text-emerald-800" : "text-slate-800"}`}>{zone.name}</p>
                                      {zone.description && (
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{zone.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${selected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                    <Tag size={10} />
                                    ₹{Number(zone.price).toLocaleString("en-IN")}/mo
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected zone summary */}
                        {selectedZone && (
                          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mt-1">
                            <Bus size={18} className="text-emerald-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-emerald-800">{selectedZone.name}</p>
                              {selectedZone.description && (
                                <p className="text-xs text-emerald-600 mt-0.5">{selectedZone.description}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-emerald-600 font-medium">Monthly Fee</p>
                              <p className="text-base font-bold text-emerald-800">₹{Number(selectedZone.price).toLocaleString("en-IN")}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button data-testid="confirm-admission-btn" onClick={() => handleCreateAdmission(selectedApplicant)}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition text-sm font-semibold">
                  Confirm Admission
                </button>
                <button data-testid="cancel-admission-btn" onClick={() => setShowAdmissionForm(false)}
                  className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl hover:bg-slate-200 transition text-sm font-medium">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAdmission;


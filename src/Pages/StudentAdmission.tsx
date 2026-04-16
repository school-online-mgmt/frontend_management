import { useEffect, useState } from "react";
import {
  Users, FileCheck, UserPlus, CheckCircle, XCircle, AlertCircle,
  Mail, Phone, Calendar, Search, Filter, Loader2, Eye
} from "lucide-react";
import api from "../api/api";

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
}

interface AdmissionRequest {
  sessionId: string;
  classId: string;
  sectionId: string;
  courseId: string;
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
    rollNo: "",
    transportOpted: false,
  });

  useEffect(() => {
    fetchApplicants();
  }, []);

  useEffect(() => {
    filterApplicants();
  }, [searchQuery, statusFilter, applicants]);

  const fetchApplicants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getApplicants?.();
      if (data) {
        setApplicants(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching applicants:", err);
      setError("Failed to load applicants. Please try again.");
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  const filterApplicants = () => {
    let filtered = applicants;

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Filter by search
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
    try {
      // Call backend to create admission
      await api.createAdmission?.(applicant.id, admissionData);
      // Refresh applicants
      fetchApplicants();
      setShowAdmissionForm(false);
      setSelectedApplicant(null);
    } catch (err) {
      console.error("Error creating admission:", err);
      setError("Failed to create admission. Please try again.");
    }
  };

  const handleRejectApplication = async (applicantId: string) => {
    try {
      await api.rejectApplication?.(applicantId);
      fetchApplicants();
    } catch (err) {
      console.error("Error rejecting application:", err);
      setError("Failed to reject application.");
    }
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; icon: string }> = {
      APPLIED: { bg: "bg-amber-100", text: "text-amber-700", icon: "📋" },
      ACCEPTED: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "✅" },
      REJECTED: { bg: "bg-red-100", text: "text-red-700", icon: "❌" },
      CANCELLED: { bg: "bg-slate-100", text: "text-slate-700", icon: "🚫" },
    };
    return statusMap[status] || { bg: "bg-slate-100", text: "text-slate-700", icon: "📌" };
  };

  return (
    <div className="min-h-full pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <FileCheck size={32} />
            <h1 className="text-4xl font-bold">Student Admission Management</h1>
          </div>
          <p className="text-indigo-100">Review applications and create admissions</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Pending</p>
                <p className="text-3xl font-bold text-slate-900">
                  {applicants.filter((a) => a.status === "APPLIED").length}
                </p>
              </div>
              <AlertCircle className="text-amber-600" size={28} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Accepted</p>
                <p className="text-3xl font-bold text-slate-900">
                  {applicants.filter((a) => a.status === "ACCEPTED").length}
                </p>
              </div>
              <CheckCircle className="text-emerald-600" size={28} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Rejected</p>
                <p className="text-3xl font-bold text-slate-900">
                  {applicants.filter((a) => a.status === "REJECTED").length}
                </p>
              </div>
              <XCircle className="text-red-600" size={28} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <p className="text-3xl font-bold text-slate-900">{applicants.length}</p>
              </div>
              <Users className="text-indigo-600" size={28} />
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="APPLIED">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex gap-4 mb-8">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="animate-spin w-12 h-12 text-indigo-600 mb-4" />
            <p className="text-slate-600 font-medium">Loading applications...</p>
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-16 text-center">
            <Users className="mx-auto w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Applications</h3>
            <p className="text-slate-600">
              {searchQuery ? "Try adjusting your search criteria." : "No applications to display."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplicants.map((applicant) => {
              const statusColor = getStatusColor(applicant.status);
              return (
                <div
                  key={applicant.id}
                  className="bg-white rounded-xl shadow-md border border-slate-100 hover:shadow-xl hover:border-indigo-200 transition overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Avatar */}
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {applicant.firstName.charAt(0)}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            {applicant.firstName} {applicant.lastName}
                          </h3>
                          <div className="flex gap-4 mt-2 text-sm text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail size={16} className="text-slate-400" />
                              {applicant.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={16} className="text-slate-400" />
                              {applicant.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={16} className="text-slate-400" />
                              {new Date(applicant.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className={`${statusColor.bg} ${statusColor.text} px-4 py-2 rounded-full font-semibold text-sm flex-shrink-0`}>
                        {statusColor.icon} {applicant.status}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Father</p>
                        <p className="font-medium text-slate-900">{applicant.fatherName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Mother</p>
                        <p className="font-medium text-slate-900">{applicant.motherName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Gender</p>
                        <p className="font-medium text-slate-900 capitalize">{applicant.gender}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Disability</p>
                        <p className="font-medium text-slate-900">
                          {applicant.disability ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedApplicant(applicant)}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium flex-1 md:flex-initial"
                      >
                        <Eye size={18} />
                        View Details
                      </button>

                      {applicant.status === "APPLIED" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedApplicant(applicant);
                              setShowAdmissionForm(true);
                            }}
                            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-medium flex-1 md:flex-initial"
                          >
                            <UserPlus size={18} />
                            Create Admission
                          </button>
                          <button
                            onClick={() => handleRejectApplication(applicant.id)}
                            className="flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition font-medium flex-1 md:flex-initial"
                          >
                            <XCircle size={18} />
                            Reject
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Applicant Details</h2>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="text-indigo-100 hover:text-white text-2xl transition"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Profile */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl">
                  {selectedApplicant.firstName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {selectedApplicant.firstName} {selectedApplicant.lastName}
                  </h3>
                  <p className="text-slate-600">Applicant</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Email</p>
                  <p className="font-medium text-slate-900">{selectedApplicant.email}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Phone</p>
                  <p className="font-medium text-slate-900">{selectedApplicant.phone}</p>
                </div>
                <div className="col-span-2 p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Address</p>
                  <p className="font-medium text-slate-900">{selectedApplicant.address}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Father</p>
                  <p className="font-medium text-slate-900">{selectedApplicant.fatherName}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Mother</p>
                  <p className="font-medium text-slate-900">{selectedApplicant.motherName}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                {selectedApplicant.status === "APPLIED" && (
                  <>
                    <button
                      onClick={() => setShowAdmissionForm(true)}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-medium"
                    >
                      Create Admission
                    </button>
                    <button
                      onClick={() => handleRejectApplication(selectedApplicant.id)}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition font-medium"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedApplicant(null)}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admission Form Modal */}
      {showAdmissionForm && selectedApplicant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Create Admission</h2>
              <button
                onClick={() => setShowAdmissionForm(false)}
                className="text-emerald-100 hover:text-white text-2xl transition"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Session *
                  </label>
                  <input
                    type="text"
                    placeholder="Session ID"
                    value={admissionData.sessionId}
                    onChange={(e) =>
                      setAdmissionData({ ...admissionData, sessionId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Class *
                  </label>
                  <input
                    type="text"
                    placeholder="Class ID"
                    value={admissionData.classId}
                    onChange={(e) =>
                      setAdmissionData({ ...admissionData, classId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Section *
                  </label>
                  <input
                    type="text"
                    placeholder="Section ID"
                    value={admissionData.sectionId}
                    onChange={(e) =>
                      setAdmissionData({ ...admissionData, sectionId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Course *
                  </label>
                  <input
                    type="text"
                    placeholder="Course ID"
                    value={admissionData.courseId}
                    onChange={(e) =>
                      setAdmissionData({ ...admissionData, courseId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    placeholder="Roll Number"
                    value={admissionData.rollNo}
                    onChange={(e) =>
                      setAdmissionData({ ...admissionData, rollNo: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    checked={admissionData.transportOpted}
                    onChange={(e) =>
                      setAdmissionData({ ...admissionData, transportOpted: e.target.checked })
                    }
                    id="transport"
                    className="w-5 h-5 text-emerald-600 rounded"
                  />
                  <label htmlFor="transport" className="ml-2 text-sm font-medium text-slate-700">
                    Transport Opted
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleCreateAdmission(selectedApplicant)}
                  className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 transition font-medium"
                >
                  Create Admission
                </button>
                <button
                  onClick={() => setShowAdmissionForm(false)}
                  className="bg-slate-100 text-slate-700 px-4 py-3 rounded-lg hover:bg-slate-200 transition font-medium"
                >
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


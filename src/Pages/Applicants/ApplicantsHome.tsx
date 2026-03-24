import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, Search, UserCheck } from 'lucide-react';
import api from '../../api/api';
import type { Applicant } from '../../api/types';

const ApplicantsHome: React.FC = () => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const response = await api.getApplicants();
      setApplicants(response);
    } catch (error) {
      console.error('Failed to fetch applicants', error);
    } finally {
      setLoading(false);
    }
  };

  const searchApplicants = async () => {
    if (!searchQuery.trim()) {
      fetchApplicants();
      return;
    }
    setLoading(true);
    try {
      const response = await api.searchApplicants(searchQuery);
      setApplicants(response);
    } catch (error) {
      console.error('Failed to search applicants', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptApplication = async (applicantId: string) => {
    try {
      await api.acceptApplication(applicantId);
      fetchApplicants(); // Refresh list
      navigate('/students-home');
    } catch (error) {
      console.error('Failed to accept application', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPLIED': return 'bg-blue-100 text-blue-800';
      case 'ACCEPTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      case 'ABANDONED': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Applicant Management
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Review and manage student applications
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchApplicants}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main>
        <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">
          {/* Search Bar */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-100">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search by phone or name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchApplicants()}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={searchApplicants}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700"
            >
              Search
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-700">
              All Applicants ({applicants.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="p-4 text-sm font-semibold uppercase">Name</th>
                  <th className="p-4 text-sm font-semibold uppercase">Phone</th>
                  <th className="p-4 text-sm font-semibold uppercase">Email</th>
                  <th className="p-4 text-sm font-semibold uppercase">Status</th>
                  <th className="p-4 text-sm font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-16 text-slate-500">
                      <RefreshCcw size={18} className="animate-spin inline mr-2" />
                      Loading applicants...
                    </td>
                  </tr>
                ) : applicants.length > 0 ? (
                  applicants.map((applicant) => (
                    <tr
                      key={applicant.id}
                      onClick={() => navigate(`/applicant/${applicant.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="p-4 font-semibold text-slate-800">
                        {applicant.firstName} {applicant.middleName} {applicant.lastName}
                      </td>
                      <td className="p-4 text-slate-600">{applicant.phone}</td>
                      <td className="p-4 text-slate-600">{applicant.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(applicant.status)}`}>
                          {applicant.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {applicant.status === 'APPLIED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptApplication(applicant.id);
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                          >
                            <UserCheck size={14} className="mr-1" />
                            Accept
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center p-16 text-slate-500">
                      No applicants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ApplicantsHome;

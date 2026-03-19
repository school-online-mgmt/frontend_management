import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import type { Applicant } from '../../api/types';

const ApplicantsHome: React.FC = () => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Applicants</h1>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search by phone or name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border p-2 flex-1"
        />
        <button onClick={searchApplicants} className="bg-blue-500 text-white px-4 py-2">
          Search
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {applicants.map((applicant) => (
            <Link
              key={applicant.id}
              to={`/applicant/${applicant.id}`}
              className="border p-4 rounded hover:bg-gray-50 cursor-pointer block"
            >
              <h2 className="text-lg font-semibold">
                {applicant.firstName} {applicant.middleName} {applicant.lastName}
              </h2>
              <p>Phone: {applicant.phone}</p>
              <p>Email: {applicant.email}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicantsHome;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import type { Applicant } from '../../api/types';

const ApplicantDetails: React.FC = () => {
  const { applicantId } = useParams<{ applicantId: string }>();
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (applicantId) {
      fetchApplicant();
    }
  }, [applicantId]);

  const fetchApplicant = async () => {
    setLoading(true);
    try {
      const response = await api.getApplicantById(applicantId!);
      setApplicant(response);
    } catch (error) {
      console.error('Failed to fetch applicant', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptApplication = async () => {
    if (!applicant) return;
    setAccepting(true);
    try {
      await api.acceptApplication(applicant.id);
      navigate('/students-home');
    } catch (error) {
      console.error('Failed to accept application', error);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!applicant) {
    return <div className="p-6">Applicant not found</div>;
  }

  return (
    <div className="p-6">
      <button
        onClick={() => navigate('/applicants-home')}
        className="mb-4 bg-gray-500 text-white px-4 py-2 rounded"
      >
        Back to Applicants
      </button>
      <h1 className="text-2xl font-bold mb-4">Applicant Details</h1>
      <div className="bg-white p-6 rounded shadow">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">First Name</label>
            <p>{applicant.firstName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Middle Name</label>
            <p>{applicant.middleName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <p>{applicant.lastName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Father Name</label>
            <p>{applicant.fatherName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Mother Name</label>
            <p>{applicant.motherName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Gender</label>
            <p>{applicant.gender}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <p>{applicant.phone}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <p>{applicant.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <p>{applicant.address}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Disability</label>
            <p>{applicant.disability ? 'Yes' : 'No'}</p>
          </div>
          {applicant.disability && (
            <div>
              <label className="block text-sm font-medium">Disability Description</label>
              <p>{applicant.disabilityDescription || 'N/A'}</p>
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-sm font-medium">Comments</label>
            <p>{applicant.comments || 'N/A'}</p>
          </div>
        </div>
        <div className="mt-6">
          {applicant.status === 'APPLIED' && (
            <button
              onClick={acceptApplication}
              disabled={accepting}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {accepting ? 'Accepting...' : 'Accept Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetails;

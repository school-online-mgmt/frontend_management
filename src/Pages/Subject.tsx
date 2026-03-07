import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Search, Trash2, RefreshCcw } from 'lucide-react';
import axios from 'axios'; 
import CreateSubject from './CreateSubject'; 
import '../css/Subject.css';

const SubjectPage = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:8080/management/subject');

      setSubjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleGetById = async () => {
    if (!searchId) {
      fetchSubjects();
      return;
    }
    try {
      const response = await axios.get(`http://localhost:8080/management/subject/${searchId}`);

      setSubjects(response.data ? [response.data] : []); 
    } catch (error) {
      alert("Subject not found");
      setSubjects([]);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      try {
        await axios.delete(`http://localhost:8080/management/subject/${id}/delete`);
        fetchSubjects();
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Failed to delete. This subject might be assigned to active courses.");
      }
    }
  };

  return (
    <div className="subject-container">
      <div className="grid-bg"></div>

      {/* --- Create Subject Modal Overlay --- */}
      {isModalOpen && (
        <CreateSubject 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchSubjects} 
        />
      )}
      
      <header className="subject-header">
        <div className="header-title">
          <p className="subtitle">ADMIN ACCESS</p>
          <h1>Subject Management</h1>
        </div>
        <div className="header-actions">
          <button className="secondary-btn" onClick={fetchSubjects}>
            <RefreshCcw size={18} className={isLoading ? 'spin' : ''} />
            <span>{isLoading ? 'Loading...' : 'Refresh List'}</span>
          </button>
          
          {/* Updated Button to open modal */}
          <button className="create-btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Create Subject</span>
          </button>
        </div>
      </header>

      <main className="subject-content">
        <div className="filter-bar">
          <div className="search-group">
            <div className="input-wrapper">
              <Search size={18} className="search-icon" />
              <input 
                type="number" 
                placeholder="Enter Subject ID..." 
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGetById()}
              />
            </div>
            <button className="get-btn" onClick={handleGetById}>Get Subject</button>
          </div>
        </div>

        <div className="table-card">
          <table className="subject-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length > 0 ? (
                subjects.map((subject: any) => (
                  <tr key={subject.id}>
                    <td className="id-cell">#{subject.id}</td>
                    <td className="subject-name">
                      <BookOpen size={16} className="icon-light" />
                      {subject.name}
                    </td>
                    <td>
                      <span className="code-badge">
                        {subject.code || 'N/A'}
                      </span>
                    </td>
                    <td className="teacher-cell">
                      {subject.teacher || 'Unassigned'}
                    </td>
                    <td>
                      <button 
                        className="delete-action-btn" 
                        onClick={() => handleDelete(subject.id)}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="no-data">
                    {isLoading ? "Fetching data..." : "No subjects found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default SubjectPage;
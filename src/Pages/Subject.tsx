import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Search, Trash2, RefreshCcw } from 'lucide-react';
import axios from 'axios'; 
import '../css/Subject.css';

const SubjectPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [searchId, setSearchId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/management/subject');
      setSubjects(response.data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run on page load
  useEffect(() => {
    fetchSubjects();
  }, []);

  // 2. Get Subject by ID from DB   
  const handleGetById = async () => {
    if (!searchId) return;
    try {
      const response = await axios.get(`http://localhost:3000/management/subject/${searchId}`);
      // APIs usually return a single object for ID searches, so we wrap it in an array
      setSubjects([response.data]); 
    } catch (error) {
      alert("Subject not found");
      setSubjects([]);
    }
  };

  // 3. Delete Subject from DB
  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      try {
        await axios.delete(`http://localhost:3000/management/subject/${id}/delete`);
        // Refresh the list after successful deletion
        fetchSubjects();
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  return (
    <div className="subject-container">
      <div className="grid-bg"></div>
      
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
          <button className="create-btn">
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
                    <td><span className="code-badge">{subject.code}</span></td>
                    <td>{subject.teacher || 'Not Assigned'}</td>
                    <td>
                      <button className="delete-action-btn" onClick={() => handleDelete(subject.id)}>
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
import React, { useState } from 'react';
import { X, Save, BookOpen, AlertCircle, Plus } from 'lucide-react';
import axios from 'axios';
import '../css/CreateSubject.css';

interface CreateSubjectProps {
  onClose: () => void;
  onRefresh: () => void;
}

const CreateSubject: React.FC<CreateSubjectProps> = ({ onClose, onRefresh }) => {
  const [subjectData, setSubjectData] = useState({
    name: '',
    code: '',
    teacher: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Adjusted endpoint to match your existing naming convention
      await axios.post('http://localhost:8080/management/subject/create', subjectData);
      alert("Subject Created Successfully!");
      onRefresh(); // Refresh the list in SubjectPage
      onClose();   // Close the modal
    } catch (error) {
      console.error("Error creating subject:", error);
      alert("Failed to create subject. Please check the console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="create-card">
        <div className="modal-header">
          <div className="header-info">
  
            <div>
              <h3>Add New Subject</h3>
              <p>Enter details to initialize a new course</p>
            </div>
          </div>
          
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="input-group">
            <label>Subject Name</label>
            <div className="input-field">
              <BookOpen size={18} className="field-icon" />
              <input 
                type="text" 
                placeholder="e.g. Advanced Systems Programming"
                required
                value={subjectData.name}
                onChange={(e) => setSubjectData({...subjectData, name: e.target.value})}
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Subject Code</label>
              <input 
                type="text" 
                placeholder="CS101"
                required
                value={subjectData.code}
                onChange={(e) => setSubjectData({...subjectData, code: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label>Assign Teacher</label>
              <input 
                type="text" 
                placeholder="Name of Instructor"
                value={subjectData.teacher}
                onChange={(e) => setSubjectData({...subjectData, teacher: e.target.value})}
              />
            </div>
          </div>

          <div className="form-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-submit-btn" disabled={isSubmitting}>
              <Save size={18} />
              <span>{isSubmitting ? 'Saving...' : 'Confirm Creation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSubject;
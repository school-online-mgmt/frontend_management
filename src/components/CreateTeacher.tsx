import React, { useState } from 'react';
import api from '../api/api';

interface CreateTeacherProps {
  onClose: () => void;
  onRefresh: () => void;
}

const CreateTeacher: React.FC<CreateTeacherProps> = ({ onClose, onRefresh }) => {
  const [teacherData, setTeacherData] = useState({ 
    name: '', 
    gender: '', 
    age: '', 
    qualification: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Sending data: age converted to number, gender as lowercase string
      await api.createTeacher({
        ...teacherData,
        age: parseInt(teacherData.age)
      });
      onRefresh();
      onClose();
    } catch (err) { 
      console.error(err);
      alert("Failed to create teacher. Please ensure all fields are valid."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white text-2xl font-bold mb-6 text-center">Add New Teacher</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500 transition"
            placeholder="Full Name"
            value={teacherData.name}
            onChange={(e) => setTeacherData({...teacherData, name: e.target.value})}
            required
          />

          <div className="flex gap-4">
            {/* Gender values now match the Zod enum lowercase requirements */}
            <select 
              className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500 transition appearance-none"
              value={teacherData.gender}
              onChange={(e) => setTeacherData({...teacherData, gender: e.target.value})}
              required
            >
              <option value="" disabled>Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <input 
              type="number"
              className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500 transition" 
              placeholder="Age" 
              min="18"
              max="100"
              value={teacherData.age} 
              onChange={(e) => setTeacherData({...teacherData, age: e.target.value})} 
              required 
            />
          </div>

          <input 
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500 transition"
            placeholder="Qualification"
            value={teacherData.qualification}
            onChange={(e) => setTeacherData({...teacherData, qualification: e.target.value})}
            required
          />
          
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              className="flex-1 py-3 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Confirm Creation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeacher;
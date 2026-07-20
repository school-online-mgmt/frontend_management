import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X, CheckCircle2 } from 'lucide-react';
import api from '../../api/api';

interface ConductExamModalProps {
    examId: string;
    examName: string;
    onClose: () => void;
    onSuccess?: () => void;
}

const ConductExamModal = ({ examId, examName, onClose, onSuccess }: ConductExamModalProps) => {
    const queryClient = useQueryClient();
    const [conductedDate, setConductedDate] = useState(new Date().toISOString().split('T')[0]);
    const [confirmConducting, setConfirmConducting] = useState(false);

    // Conduct exam mutation
    const conductExamMutation = useMutation({
        mutationFn: () =>
            api.conductExam(examId, { conductedDate: new Date(conductedDate) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exams'] });
            queryClient.invalidateQueries({ queryKey: ['examDetails', examId] });
            setConfirmConducting(false);
            setConductedDate(new Date().toISOString().split('T')[0]);
            onSuccess?.();
            setTimeout(onClose, 500);
        },
    });

    const handleConduct = () => {
        if (!confirmConducting) {
            setConfirmConducting(true);
            return;
        }
        conductExamMutation.mutate();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Conduct Exam</h2>
                        <p className="text-purple-100 text-sm mt-1">{examName}</p>
                    </div>
                    <button data-testid="conduct-exam-modal-close-btn" onClick={onClose} className="p-2 hover:bg-purple-600 rounded-lg transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {!confirmConducting ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Exam Conducted Date
                                </label>
                                <input data-testid="conduct-exam-modal-conducted-date-input"
                                    type="date"
                                    value={conductedDate}
                                    onChange={(e) => setConductedDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Select the date when the exam was conducted
                                </p>
                            </div>

                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="text-sm text-slate-700">
                                    <strong>Note:</strong> Conducting an exam will create result records for all students assigned to this subject in their respective sections. Teachers will then be able to update marks for each student.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <CheckCircle2 size={48} className="text-green-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirm Exam Conduction</h3>
                            <p className="text-slate-600 text-sm mb-4">
                                Are you sure you want to mark this exam as conducted? This will create result records for all assigned students.
                            </p>
                            <p className="text-sm text-purple-600 font-medium">
                                Date: {new Date(conductedDate).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t p-4 flex justify-end gap-2">
                    <button
                        onClick={() => {
                            if (confirmConducting) {
                                setConfirmConducting(false);
                            } else {
                                onClose();
                            }
                        }}
                        className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
                    >
                        {confirmConducting ? 'Back' : 'Cancel'}
                    </button>
                    <button data-testid="conduct-exam-modal-conduct-btn"
                        onClick={handleConduct}
                        disabled={conductExamMutation.isPending}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium flex items-center gap-2"
                    >
                        {conductExamMutation.isPending ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={16} />
                        )}
                        {confirmConducting ? 'Confirm & Conduct' : 'Proceed'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConductExamModal;


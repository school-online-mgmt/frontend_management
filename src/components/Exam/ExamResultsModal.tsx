import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, X, Edit2, Save } from 'lucide-react';
import api from '../../api/api';
import type { ExamResult } from '../../api/types';

interface ExamResultsModalProps {
    examId: string;
    examName: string;
    onClose: () => void;
}

const ExamResultsModal = ({ examId, examName, onClose }: ExamResultsModalProps) => {
    const queryClient = useQueryClient();
    const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
    const [marksData, setMarksData] = useState<{ [key: string]: { marks: string; remarks: string } }>({});

    // Fetch exam results
    const { data: results = [], isLoading } = useQuery({
        queryKey: ['examResults', examId],
        queryFn: () => api.getExamResults(examId),
    });

    // Update result mutation
    const updateResultMutation = useMutation({
        mutationFn: (data: { resultId: string; marks: number; remarks?: string }) =>
            api.updateResultMarks(data.resultId, { marks: data.marks, remarks: data.remarks }),
        onSuccess: () => {
            setEditingIds(new Set());
            setMarksData({});
            queryClient.invalidateQueries({ queryKey: ['examResults', examId] });
        },
    });

    const handleEditStart = (result: ExamResult) => {
        const newEditing = new Set(editingIds);
        newEditing.add(result.id);
        setEditingIds(newEditing);
        setMarksData({
            ...marksData,
            [result.id]: {
                marks: result.marks?.toString() || '',
                remarks: result.remarks || '',
            },
        });
    };

    const handleEditCancel = (resultId: string) => {
        const newEditing = new Set(editingIds);
        newEditing.delete(resultId);
        setEditingIds(newEditing);
        const newData = { ...marksData };
        delete newData[resultId];
        setMarksData(newData);
    };

    const handleSaveMarks = (result: ExamResult) => {
        const data = marksData[result.id];
        if (!data || data.marks === '') return;
        updateResultMutation.mutate({
            resultId: result.id,
            marks: parseFloat(data.marks),
            remarks: data.remarks || undefined,
        });
    };

    const handleMarksChange = (resultId: string, marks: string) => {
        setMarksData({
            ...marksData,
            [resultId]: {
                ...marksData[resultId],
                marks,
            },
        });
    };

    const handleRemarksChange = (resultId: string, remarks: string) => {
        setMarksData({
            ...marksData,
            [resultId]: {
                ...marksData[resultId],
                remarks,
            },
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold">{examName} - Results</h2>
                        <p className="text-blue-100 text-sm mt-1">Update student marks and remarks</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-blue-600 rounded-lg transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No results to display. Conduct the exam first to create result records.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                                        <th className="text-left p-4 font-semibold text-slate-700">Student Name</th>
                                        <th className="text-left p-4 font-semibold text-slate-700">Roll No</th>
                                        <th className="text-center p-4 font-semibold text-slate-700">Marks</th>
                                        <th className="text-left p-4 font-semibold text-slate-700">Remarks</th>
                                        <th className="text-center p-4 font-semibold text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((result: ExamResult) => (
                                        <tr key={result.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                                            <td className="p-4">
                                                <p className="font-medium text-slate-900">{result.studentName}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-slate-600 font-mono">{result.studentRollNo}</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                {editingIds.has(result.id) ? (
                                                    <input
                                                        type="number"
                                                        value={marksData[result.id]?.marks || ''}
                                                        onChange={(e) => handleMarksChange(result.id, e.target.value)}
                                                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="0"
                                                    />
                                                ) : (
                                                    <span className={`text-lg font-bold ${result.marks !== undefined && result.marks !== null ? 'text-blue-600' : 'text-slate-400'}`}>
                                                        {result.marks !== undefined && result.marks !== null ? result.marks : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {editingIds.has(result.id) ? (
                                                    <input
                                                        type="text"
                                                        value={marksData[result.id]?.remarks || ''}
                                                        onChange={(e) => handleRemarksChange(result.id, e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="Add remarks (optional)"
                                                    />
                                                ) : (
                                                    <span className="text-slate-600 text-sm">
                                                        {result.remarks || <span className="text-slate-400">No remarks</span>}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {editingIds.has(result.id) ? (
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleEditCancel(result.id)}
                                                            className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition text-sm"
                                                            disabled={updateResultMutation.isPending}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveMarks(result)}
                                                            disabled={updateResultMutation.isPending || !marksData[result.id]?.marks}
                                                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm flex items-center gap-1"
                                                        >
                                                            {updateResultMutation.isPending ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <Save size={14} />
                                                            )}
                                                            Save
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditStart(result)}
                                                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm flex items-center gap-1 mx-auto"
                                                    >
                                                        <Edit2 size={14} />
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t p-4 flex justify-end gap-2 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamResultsModal;


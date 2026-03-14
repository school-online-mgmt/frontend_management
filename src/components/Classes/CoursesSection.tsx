import { Eye } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CoursesSection = ({ courses }: any) => {

    const navigate = useNavigate();
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

    const toggleExpand = (courseId: string) => {

        if (expandedCourse === courseId) {
            setExpandedCourse(null);
        } else {
            setExpandedCourse(courseId);
        }

    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">

            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-700">
                    Available Courses
                </h2>
            </div>

            <table className="w-full text-left">

                <thead>
                <tr className="border-b border-slate-100">
                    <th className="p-4 text-sm font-semibold uppercase">Slug</th>
                    <th className="p-4 text-sm font-semibold uppercase">Course</th>
                    <th className="p-4 text-sm font-semibold uppercase">View</th>
                </tr>
                </thead>

                <tbody>

                {courses.map((course: any) => (

                    <>
                        <tr
                            key={course.id}
                            onClick={() => navigate(`/course/${course.id}`)}
                            className="cursor-pointer hover:bg-slate-50"
                        >

                            <td className="p-4 font-mono text-slate-500">
                                #{course.slug}
                            </td>

                            <td className="p-4 font-semibold">
                                {course.name}
                            </td>

                            <td
                                className="p-4"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(course.id);
                                }}
                            >
                                <Eye size={18} />
                            </td>

                        </tr>

                        {expandedCourse === course.id && (

                            <tr className="bg-slate-50">

                                <td colSpan={3} className="p-4">

                                    {course.courseSubjects?.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-4">

                                            {course.courseSubjects.map((cs: any) => {
                                                const subject = cs.subject;

                                                return (
                                                    <div
                                                        key={subject.id}
                                                        className="border rounded-lg p-3 text-sm cursor-pointer hover:bg-white"
                                                    >
                                                        <div className="font-semibold">{subject.name}</div>
                                                        <div className="text-slate-500 font-mono text-xs">#{subject.slug}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (

                                        <p className="text-slate-500">
                                            No subjects in this course
                                        </p>
                                    )}
                                </td>
                            </tr>
                        )}
                    </>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default CoursesSection;
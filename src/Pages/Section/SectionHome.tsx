import { useState, useEffect } from "react";
import { Plus, Layers, RefreshCcw } from "lucide-react";
import api from "../../api/api";
// import CreateSection from "../../components/Sections/CreateSection";
import { useNavigate } from "react-router-dom";

const SectionHome = () => {

    const [sections, setSections] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const navigate = useNavigate();

    const fetchSections = async () => {
        setIsLoading(true);

        try {

            const data = await api.getSections();

            setSections(data.sections || []);

        } catch (error) {

            console.error("Error fetching sections", error);
            setSections([]);

        } finally {

            setIsLoading(false);

        }
    };

    useEffect(() => {

        fetchSections();

    }, []);

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">

            {/*{isCreateModalOpen && (*/}
            {/*    <CreateSection*/}
            {/*        onClose={() => setIsCreateModalOpen(false)}*/}
            {/*        onRefresh={fetchSections}*/}
            {/*    />*/}
            {/*)}*/}

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">

                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Section Management
                    </h1>

                    <p className="text-slate-500 mt-2 text-lg">
                        Create, view and manage sections
                    </p>
                </div>

                <div className="flex gap-3">

                    <button
                        onClick={fetchSections}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>

                    <button
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create Section
                    </button>
                    {/*<button*/}
                    {/*    onClick={() => setIsCreateModalOpen(true)}*/}
                    {/*    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 flex items-center gap-2"*/}
                    {/*>*/}
                    {/*    <Plus size={18} />*/}
                    {/*    Create Section*/}
                    {/*</button>*/}

                </div>

            </header>

            <main>

                <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">

                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-700">
                            All Sections
                        </h2>
                    </div>

                    <div className="overflow-x-auto">

                        <table className="w-full border-collapse text-left">

                            <thead>
                            <tr className="border-b border-slate-100">

                                <th className="p-4 text-sm font-semibold uppercase">
                                    Slug
                                </th>

                                <th className="p-4 text-sm font-semibold uppercase">
                                    Section Name
                                </th>

                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">

                            {isLoading ? (

                                <tr>
                                    <td colSpan={2} className="text-center p-16 text-slate-500">
                                        <RefreshCcw size={18} className="animate-spin inline mr-2" />
                                        Loading sections...
                                    </td>
                                </tr>

                            ) : sections.length > 0 ? (

                                sections.map((section: any) => (

                                    <tr
                                        key={section.id}
                                        onClick={() => navigate(`/section/${section.id}`)}
                                        className="hover:bg-slate-50 cursor-pointer transition"
                                    >

                                        <td className="p-4 font-mono text-slate-500">
                                            #{section.slug}
                                        </td>

                                        <td className="p-4 font-semibold text-slate-800 flex items-center gap-3">

                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <Layers size={20} />
                                            </div>

                                            {section.name}

                                        </td>

                                    </tr>

                                ))

                            ) : (

                                <tr>
                                    <td colSpan={2} className="text-center p-16 text-slate-500">
                                        No sections found
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

export default SectionHome;
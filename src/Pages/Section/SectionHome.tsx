import { useState, useEffect } from "react";
import { Plus, Layers, RefreshCcw } from "lucide-react";
import api from "../../api/api";
// import CreateSection from "../../components/Sections/CreateSection";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";

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

            setSections([]);

        } finally {

            setIsLoading(false);

        }
    };

    useEffect(() => {

        fetchSections();

    }, []);

    return (
        <div className="min-h-full bg-slate-50">
            <PageHeader
                icon={Layers}
                title="Section Management"
                gradient="from-fuchsia-600 via-pink-600 to-rose-600"
                subtitle="Create, view and manage sections"
                actions={
                    <div className="flex gap-2">
                        <button onClick={fetchSections} disabled={isLoading}
                            className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl flex items-center gap-2 text-sm hover:bg-white/20 transition backdrop-blur-sm">
                            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button className="px-4 py-2 bg-white/15 border border-white/25 text-white rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-white/25 transition backdrop-blur-sm">
                            <Plus size={18} /> Create Section
                        </button>
                    </div>
                }
            />
            <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">

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
        </div>
    );
};

export default SectionHome;
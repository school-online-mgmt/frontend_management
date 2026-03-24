import { useState, useEffect } from "react";
import { Plus, RefreshCcw, Users, Search, ChevronRight, Phone, Briefcase } from "lucide-react";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import CreateTeacher from "../../components/CreateTeacher";
import Button from "../../components/common/Button";
import { Card, CardContent, Badge, EmptyState } from "../../components/common/FormComponents";
import { PageWrapper, PageContent, PageHeader, Section } from "../../components/common/PageWrappers";
import { Input } from "../../components/common/FormComponents";

const TeacherHome = () => {
    const [teachers, setTeachers] = useState<any[]>([]);
    const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    const navigate = useNavigate();

    const fetchTeachers = async () => {
        setIsLoading(true);
        try {
            const data = await api.getTeachers();
            const teacherList = Array.isArray(data) ? data : data.teachers || [];
            setTeachers(teacherList);
            filterTeachers(teacherList, searchTerm, filterStatus);
        } catch (error) {
            console.error("Error fetching teachers", error);
            setTeachers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterTeachers = (list: any[], search: string, status: string) => {
        let filtered = list;
        
        if (search) {
            filtered = filtered.filter(t => 
                t.name.toLowerCase().includes(search.toLowerCase()) ||
                t.email?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (status !== "all") {
            filtered = filtered.filter(t => 
                status === "active" ? t.isActive : !t.isActive
            );
        }

        setFilteredTeachers(filtered);
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    useEffect(() => {
        filterTeachers(teachers, searchTerm, filterStatus);
    }, [searchTerm, filterStatus, teachers]);

    return (
        <PageWrapper>
            <PageContent>
                {isCreateModalOpen && (
                    <CreateTeacher
                        onClose={() => setIsCreateModalOpen(false)}
                        onRefresh={fetchTeachers}
                    />
                )}

                <PageHeader
                    title="Teachers Management"
                    subtitle="Manage your teaching staff and view their assignments"
                    actions={
                        <>
                            <Button 
                                variant="secondary" 
                                icon={<RefreshCcw size={18} />}
                                isLoading={isLoading}
                                onClick={fetchTeachers}
                            >
                                Refresh
                            </Button>
                            <Button 
                                variant="primary" 
                                icon={<Plus size={18} />}
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                Add Teacher
                            </Button>
                        </>
                    }
                />

                <Section>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Input
                            icon={<Search size={18} />}
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
                        </div>
                    ) : filteredTeachers.length === 0 ? (
                        <EmptyState
                            icon={<Users size={48} />}
                            title="No Teachers Found"
                            description={searchTerm ? "Try adjusting your search terms" : "Add your first teacher to get started"}
                            action={
                                <Button 
                                    variant="primary"
                                    onClick={() => setIsCreateModalOpen(true)}
                                >
                                    Add Teacher
                                </Button>
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTeachers.map((teacher) => (
                                <Card 
                                    key={teacher.id} 
                                    hoverable 
                                    bordered
                                    className="cursor-pointer"
                                    onClick={() => navigate(`/teacher/${teacher.id}`)}
                                >
                                    <CardContent className="pb-0">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                                    {teacher.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{teacher.name}</p>
                                                    <p className="text-xs text-slate-500">{teacher.qualification}</p>
                                                </div>
                                            </div>
                                            <Badge variant={teacher.isActive ? "success" : "warning"}>
                                                {teacher.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>

                                        <div className="space-y-3 mt-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Phone size={14} className="text-slate-400" />
                                                {teacher.phone || "No phone"}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Briefcase size={14} className="text-slate-400" />
                                                {teacher.gender} • {teacher.age} years
                                            </div>
                                        </div>
                                    </CardContent>
                                    <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between">
                                        <span className="text-xs font-medium text-slate-600">View Details</span>
                                        <ChevronRight size={16} className="text-slate-400" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </Section>

                <Section>
                    <div className="bg-white rounded-xl border border-slate-100 p-6">
                        <p className="text-sm text-slate-600">
                            Showing <span className="font-semibold text-slate-900">{filteredTeachers.length}</span> of <span className="font-semibold text-slate-900">{teachers.length}</span> teachers
                        </p>
                    </div>
                </Section>
            </PageContent>
        </PageWrapper>
    );
};

export default TeacherHome;


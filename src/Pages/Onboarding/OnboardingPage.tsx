import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Circle, ArrowRight, RefreshCw,
    CalendarDays, LayoutGrid, BookOpen, UserCheck,
    ShieldCheck, CreditCard, Bus, Bell,
} from 'lucide-react';
import { useOnboarding, type OnboardingSteps } from '../../context/OnboardingContext';
import { useAuthContext } from '../../context/AuthContext';

type StepKey = keyof OnboardingSteps;

interface StepConfig {
    key: StepKey;
    icon: React.ReactNode;
    title: string;
    description: string;
    path: string;
    getDetail: (steps: OnboardingSteps) => string;
}

const STEPS: StepConfig[] = [
    {
        key: 'session',
        icon: <CalendarDays size={22} />,
        title: 'Academic Session',
        description: 'Create the current academic year session that ties all activity together.',
        path: '/sessions',
        getDetail: (s) => s.session.count > 0 ? `${s.session.count} session${s.session.count > 1 ? 's' : ''} created` : 'No sessions yet',
    },
    {
        key: 'classAndSection',
        icon: <LayoutGrid size={22} />,
        title: 'Classes & Sections',
        description: 'Add at least one class (e.g. Class 10) and one section (e.g. 10-A).',
        path: '/class-Home',
        getDetail: (s) => s.classAndSection.complete
            ? `${s.classAndSection.classCount} class${s.classAndSection.classCount > 1 ? 'es' : ''}, ${s.classAndSection.sectionCount} section${s.classAndSection.sectionCount > 1 ? 's' : ''}`
            : `${s.classAndSection.classCount} class${s.classAndSection.classCount !== 1 ? 'es' : ''}, ${s.classAndSection.sectionCount} section${s.classAndSection.sectionCount !== 1 ? 's' : ''}`,
    },
    {
        key: 'subjectAndCourse',
        icon: <BookOpen size={22} />,
        title: 'Subjects & Courses',
        description: 'Define the subjects taught and group them into courses.',
        path: '/subject-Home',
        getDetail: (s) => s.subjectAndCourse.complete
            ? `${s.subjectAndCourse.subjectCount} subject${s.subjectAndCourse.subjectCount > 1 ? 's' : ''}, ${s.subjectAndCourse.courseCount} course${s.subjectAndCourse.courseCount > 1 ? 's' : ''}`
            : `${s.subjectAndCourse.subjectCount} subject${s.subjectAndCourse.subjectCount !== 1 ? 's' : ''}, ${s.subjectAndCourse.courseCount} course${s.subjectAndCourse.courseCount !== 1 ? 's' : ''}`,
    },
    {
        key: 'teacher',
        icon: <UserCheck size={22} />,
        title: 'Teaching Staff',
        description: 'Onboard at least one teacher before enrolling students.',
        path: '/teacher-home',
        getDetail: (s) => s.teacher.count > 0 ? `${s.teacher.count} teacher${s.teacher.count > 1 ? 's' : ''} onboarded` : 'No teachers yet',
    },
    {
        key: 'principal',
        icon: <ShieldCheck size={22} />,
        title: 'School Principal',
        description: 'Assign a Principal role to a management user for academic authority.',
        path: '/staff',
        getDetail: (s) => s.principal.count > 0 ? 'Principal assigned' : 'No principal assigned',
    },
    {
        key: 'fees',
        icon: <CreditCard size={22} />,
        title: 'Fee Structure',
        description: 'Set up course-level fees or create an active fee structure for the session.',
        path: '/fees',
        getDetail: (s) => {
            const parts = [];
            if (s.fees.feeStructureCount > 0) parts.push(`${s.fees.feeStructureCount} active structure`);
            if (s.fees.courseFeeCount > 0) parts.push(`${s.fees.courseFeeCount} course fee${s.fees.courseFeeCount > 1 ? 's' : ''}`);
            return parts.length > 0 ? parts.join(', ') : 'No fees configured';
        },
    },
    {
        key: 'transport',
        icon: <Bus size={22} />,
        title: 'Transport Zones',
        description: 'Configure transport zones and their monthly fees for students who commute.',
        path: '/transport',
        getDetail: (s) => s.transport.count > 0 ? `${s.transport.count} zone${s.transport.count > 1 ? 's' : ''} configured` : 'No transport zones',
    },
    {
        key: 'noticeBoard',
        icon: <Bell size={22} />,
        title: 'School Notice Board',
        description: 'Create the school-wide notice board used for announcements and circulars.',
        path: '/notices',
        getDetail: (s) => s.noticeBoard.count > 0 ? `${s.noticeBoard.count} board${s.noticeBoard.count > 1 ? 's' : ''} created` : 'No boards yet',
    },
];

const OnboardingPage: React.FC = () => {
    const navigate = useNavigate();
    const { isComplete, steps, refetch } = useOnboarding();
    const { user, logout } = useAuthContext();
    const [refreshing, setRefreshing] = React.useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const completedCount = steps ? STEPS.filter((s) => steps[s.key].complete).length : 0;
    const progressPct = Math.round((completedCount / STEPS.length) * 100);

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
            {/* Top bar */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <ShieldCheck size={18} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900 leading-none">EduPilots</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Management Portal</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {user && (
                        <span className="text-xs text-slate-500 hidden sm:block">
                            Signed in as <strong className="text-slate-700">{user.firstName} {user.lastName}</strong>
                        </span>
                    )}
                    <button
                        onClick={logout}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </header>

            <main className="flex-1 px-4 py-10 sm:px-6 lg:px-10 max-w-5xl mx-auto w-full">
                {/* Hero */}
                <div className="mb-10">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {isComplete ? 'Setup Complete!' : 'Complete your school setup'}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1.5 max-w-lg">
                                {isComplete
                                    ? 'All steps are done. Your management portal is fully operational.'
                                    : 'Complete the 8 required steps below before accessing the full portal. You can navigate to any setup page and return here.'}
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                            Refresh Status
                        </button>
                    </div>

                    {/* Progress bar */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600">
                                {completedCount} of {STEPS.length} steps complete
                            </span>
                            <span className={`text-xs font-bold ${isComplete ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {progressPct}%
                            </span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${isComplete ? 'bg-emerald-500' : 'bg-emerald-400'}`}
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Steps grid */}
                {!steps ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {STEPS.map((_, i) => (
                            <div key={i} className="skeleton h-36 rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {STEPS.map((step) => {
                            const done = steps[step.key].complete;
                            const detail = step.getDetail(steps);
                            return (
                                <div
                                    key={step.key}
                                    className={`relative flex items-start gap-4 p-5 rounded-2xl border transition-all
                                        ${done
                                            ? 'bg-emerald-50 border-emerald-200'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                        }`}
                                >
                                    {/* Icon */}
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {step.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className={`text-sm font-bold ${done ? 'text-emerald-800' : 'text-slate-900'}`}>
                                                {step.title}
                                            </h3>
                                            {done ? (
                                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                            ) : (
                                                <Circle size={15} className="text-slate-300 shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                            {step.description}
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-[11px] font-medium ${done ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {detail}
                                            </span>
                                            {!done && (
                                                <button
                                                    onClick={() => navigate(step.path)}
                                                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors whitespace-nowrap"
                                                >
                                                    Set up <ArrowRight size={11} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* CTA once complete */}
                {isComplete && (
                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2.5 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-colors shadow-lg shadow-emerald-200"
                        >
                            Enter Dashboard <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {/* Helper note */}
                {!isComplete && steps && (
                    <p className="mt-8 text-center text-xs text-slate-400">
                        After completing each step, click <strong>Refresh Status</strong> to update the checklist.
                    </p>
                )}
            </main>
        </div>
    );
};

export default OnboardingPage;

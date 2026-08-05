import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Briefcase, GraduationCap, HandCoins, PartyPopper, Search, School, TrendingUp,
} from 'lucide-react';
import ReunionsTab from './ReunionsTab';
import CampaignsTab from './CampaignsTab';
import api from '../../api/api';
import PageHeader, { MODULE_THEMES } from '../../components/PageHeader';
import { EmptyState, ErrorState, Skeleton, dateStr } from '../../components/ui';
import { useSession } from '../../context/SessionContext';

/**
 * The school's own alumni register.
 *
 * Distinct from the alumni-facing DIRECTORY in the student portal: this shows
 * the school everyone it has ever taught, whether or not they chose to be
 * listed. Per-field privacy governs what alumni show EACH OTHER — not what the
 * school knows about its own former students.
 *
 * There is deliberately NO certificate issuance here. Certificates live on the
 * **Documents** page, which runs the school's real flow: the student (or
 * alumnus) requests, the office publishes, and a PDF is rendered and stored.
 * A button here briefly created certificates through a parallel path that had
 * no PDF and no approval — it was removed in the same change that consolidated
 * the two systems.
 *
 * The institution and employer lists are suppressed server-side below a
 * small-group threshold: "1 alumnus at Google" combined with a batch list
 * identifies a person, which the per-field privacy exists to prevent.
 */
const OutcomesPanel: React.FC = () => {
    const { data, isLoading } = useQuery({
        queryKey: ['alumni-outcomes'],
        queryFn: () => api.getAlumniOutcomes(),
    });

    if (isLoading) return <Skeleton rows={2} />;
    if (!data || data.totalAlumni === 0) return null;

    const pct = (n: number) =>
        data.totalAlumni > 0 ? Math.round((n / data.totalAlumni) * 100) : 0;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="alumni-outcomes">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-900">Where they are now</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    ['Alumni', data.totalAlumni, null],
                    ['In higher education', data.inHigherEducation, pct(data.inHigherEducation)],
                    ['Working', data.employed, pct(data.employed)],
                    ['In the directory', data.listedInDirectory, pct(data.listedInDirectory)],
                ].map(([label, value, percent]) => (
                    <div key={label as string}>
                        <div className="text-2xl font-bold text-slate-900">{value as number}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            {label as string}
                            {percent !== null && <span className="text-slate-400"> · {percent as number}%</span>}
                        </div>
                    </div>
                ))}
            </div>

            {(data.topInstitutions.length > 0 || data.topEmployers.length > 0) && (
                <div className="mt-5 pt-5 border-t border-slate-100 grid sm:grid-cols-2 gap-6">
                    {data.topInstitutions.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
                                Where they studied
                            </h4>
                            <div className="space-y-1.5">
                                {data.topInstitutions.map((i) => (
                                    <div key={i.name} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-700 truncate">{i.name}</span>
                                        <span className="text-slate-400 tabular-nums ml-3">{i.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {data.topEmployers.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
                                Where they work
                            </h4>
                            <div className="space-y-1.5">
                                {data.topEmployers.map((e) => (
                                    <div key={e.name} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-700 truncate">{e.name}</span>
                                        <span className="text-slate-400 tabular-nums ml-3">{e.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {data.note && (
                <p className="mt-4 text-xs text-slate-400">{data.note}</p>
            )}
        </div>
    );
};

/**
 * Which classes mean "leaving".
 *
 * The terminal class is a property of the SCHOOL, not of the grade list — a
 * primary ends at 5, a secondary at 10, a senior secondary at 12. It cannot be
 * inferred, so it has to be told to us.
 *
 * It does not graduate anyone by itself: every continuing student goes through
 * the readmission page and an office decision. This flag only pre-selects
 * "Mark as alumni" there, because that is overwhelmingly what happens to a
 * Class 12 leaver — while still letting the office admit a repeating student,
 * or mark a Class 10 leaver alumni from a non-terminal class.
 */
const GraduatingClasses: React.FC = () => {
    const qc = useQueryClient();
    const { selectedSessionId } = useSession();

    const classes = useQuery({
        queryKey: ['classes', selectedSessionId],
        queryFn: () => api.getClasses(selectedSessionId!),
        enabled: !!selectedSessionId,
    });

    const toggle = useMutation({
        mutationFn: (c: { id: string; isGraduating: boolean }) =>
            api.setClassGraduating(c.id, !c.isGraduating),
        onSuccess: () => void qc.invalidateQueries({ queryKey: ['classes'] }),
    });

    if (!selectedSessionId || classes.isLoading) return null;

    const rows = (classes.data ?? []) as Array<{ id: string; name: string; isGraduating?: boolean }>;
    if (rows.length === 0) return null;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="graduating-classes">
            <div className="flex items-center gap-2 mb-1">
                <GraduationCap size={16} className="text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-900">Classes that finish here</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                Students leaving these classes are pre-selected as alumni on the readmission page.
                You can still decide otherwise for any individual student.
            </p>

            <div className="flex flex-wrap gap-2">
                {rows.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => toggle.mutate({ id: c.id, isGraduating: !!c.isGraduating })}
                        disabled={toggle.isPending}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                            c.isGraduating
                                ? 'bg-violet-600 text-white border-violet-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        data-testid={`graduating-${c.id}`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

const TABS = [
    { key: 'directory', label: 'Alumni', icon: GraduationCap },
    { key: 'reunions', label: 'Reunions', icon: PartyPopper },
    { key: 'giving', label: 'Giving', icon: HandCoins },
] as const;
type Tab = typeof TABS[number]['key'];

const DirectoryTab: React.FC = () => {
    const [batchYear, setBatchYear] = useState<number | undefined>();
    const [search, setSearch] = useState('');

    const batches = useQuery({ queryKey: ['alumni-batches'], queryFn: () => api.getAlumniBatches() });
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['alumni', batchYear],
        queryFn: () => api.getAlumni({ batchYear, limit: 200 }),
    });

    const rows = useMemo(() => {
        const all = data?.alumni ?? [];
        if (!search.trim()) return all;
        const q = search.toLowerCase();
        return all.filter((a) => `${a.firstName} ${a.lastName}`.toLowerCase().includes(q));
    }, [data, search]);

    return (
        <>
            <div className="space-y-5">
                <OutcomesPanel />
                <GraduatingClasses />

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={batchYear ?? ''}
                        onChange={(e) => setBatchYear(e.target.value ? Number(e.target.value) : undefined)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        data-testid="batch-filter"
                    >
                        <option value="">All batches</option>
                        {(batches.data?.batches ?? [])
                            .filter((b) => b.batchYear)
                            .map((b) => (
                                <option key={b.batchYear} value={b.batchYear!}>
                                    Batch of {b.batchYear} ({b.count})
                                </option>
                            ))}
                    </select>

                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search alumni by name"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                            data-testid="alumni-search"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-6"><Skeleton rows={6} /></div>
                    ) : error ? (
                        <div className="p-6"><ErrorState error={error} onRetry={() => void refetch()} /></div>
                    ) : rows.length === 0 ? (
                        <EmptyState
                            icon={<GraduationCap size={22} />}
                            title="No alumni yet"
                            message="Students appear here once you mark them as alumni from the readmission page at the end of a session."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Batch</th>
                                        <th className="px-4 py-3">Left from</th>
                                        <th className="px-4 py-3">Now</th>
                                        <th className="px-4 py-3">Directory</th>
                                        <th className="px-4 py-3 text-right">Certificates</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((a) => (
                                        <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {a.firstName} {a.lastName}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {a.personalEmail ?? a.email ?? '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {a.batchYear ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {a.graduationClassName ?? '—'}
                                                {a.graduatedAt && (
                                                    <div className="text-xs text-slate-400">{dateStr(a.graduatedAt)}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {a.employer ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Briefcase size={12} className="text-slate-400" /> {a.employer}
                                                    </span>
                                                ) : a.higherEducationInstitution ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <School size={12} className="text-slate-400" />{' '}
                                                        {a.higherEducationInstitution}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {a.listedInDirectory ? (
                                                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                                        Listed
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Private</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

        </>
    );
};

/**
 * Three jobs, three tabs.
 *
 * They were one page until reunions and giving arrived. Keeping them stacked
 * would have put a donation ledger below an alumni register below a reunion
 * list — three unrelated tables the office visits for different reasons on
 * different days.
 */
const AlumniHome: React.FC = () => {
    const [tab, setTab] = useState<Tab>('directory');

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                icon={GraduationCap}
                title="Alumni"
                subtitle="Everyone your school has taught — their records, reunions and giving"
                gradient={MODULE_THEMES.admin}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 mb-6">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                                tab === key ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                            data-testid={`alumni-tab-${key}`}
                        >
                            <Icon size={14} /> {label}
                        </button>
                    ))}
                </div>

                {tab === 'directory' && <DirectoryTab />}
                {tab === 'reunions' && <ReunionsTab />}
                {tab === 'giving' && <CampaignsTab />}
            </div>
        </div>
    );
};

export default AlumniHome;

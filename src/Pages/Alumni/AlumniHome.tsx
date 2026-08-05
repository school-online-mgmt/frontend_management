import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Award, Briefcase, Copy, ExternalLink, GraduationCap, Search,
    ShieldCheck, X, School, Check, TrendingUp,
} from 'lucide-react';
import api from '../../api/api';
import type { AlumnusRow, CredentialType } from '../../api/api';
import PageHeader, { MODULE_THEMES } from '../../components/PageHeader';
import { EmptyState, ErrorState, Skeleton, dateStr } from '../../components/ui';

/**
 * The school's own alumni register.
 *
 * Distinct from the alumni-facing DIRECTORY in the student portal: this shows
 * the school everyone it has ever taught, whether or not they chose to be
 * listed. Per-field privacy governs what alumni show EACH OTHER — not what the
 * school knows about its own former students.
 *
 * The certificate tooling is here because the office still issues most of them.
 * An alumnus can self-serve a bonafide or marksheet, but a character
 * certificate is a judgement the school makes rather than a fact it holds, so
 * it is only ever issued from this screen.
 */

const CREDENTIAL_LABELS: Record<CredentialType, string> = {
    TRANSFER_CERTIFICATE: 'Transfer Certificate',
    BONAFIDE: 'Bonafide Certificate',
    CHARACTER_CERTIFICATE: 'Character Certificate',
    MARKSHEET: 'Marksheet',
    PROVISIONAL: 'Provisional Certificate',
};

const IssueCertificateModal: React.FC<{
    alumnus: AlumnusRow;
    onClose: () => void;
}> = ({ alumnus, onClose }) => {
    const [type, setType] = useState<CredentialType>('BONAFIDE');
    const [issued, setIssued] = useState<{ verificationToken: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const issue = useMutation({
        mutationFn: async () => api.issueAlumniCredential(alumnus.id, type),
        onSuccess: (res) => setIssued({ verificationToken: res.verificationToken }),
    });

    const verifyUrl = issued
        ? `${window.location.origin.replace(/\/$/, '')}/verify/${issued.verificationToken}`
        : '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" data-testid="issue-certificate-modal">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
                            <Award className="text-violet-600" size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Issue a certificate</h3>
                            <p className="text-sm text-slate-500">
                                {alumnus.firstName} {alumnus.lastName}
                                {alumnus.batchYear ? ` · Batch of ${alumnus.batchYear}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                {!issued ? (
                    <>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Certificate type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as CredentialType)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                            data-testid="certificate-type"
                        >
                            {Object.entries(CREDENTIAL_LABELS).map(([k, label]) => (
                                <option key={k} value={k}>{label}</option>
                            ))}
                        </select>

                        <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 leading-relaxed">
                            The certificate records what is true today and never changes afterwards, even
                            if the student record is later edited. It carries a verification link anyone
                            can check without an account.
                        </p>

                        {issue.error && <div className="mt-3"><ErrorState error={issue.error} /></div>}

                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => issue.mutate()}
                                disabled={issue.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                                data-testid="issue-certificate-btn"
                            >
                                {issue.isPending ? 'Issuing…' : 'Issue certificate'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                            <ShieldCheck className="text-emerald-600 shrink-0" size={20} />
                            <div>
                                <p className="text-sm font-medium text-emerald-900">Certificate issued</p>
                                <p className="text-xs text-emerald-800/80 mt-0.5">
                                    Print this link or its QR code on the document. Anyone can check it —
                                    no account needed.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                                Verification link
                            </label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={verifyUrl}
                                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-700"
                                    data-testid="verification-url"
                                />
                                <button
                                    onClick={() => {
                                        void navigator.clipboard.writeText(verifyUrl);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 1800);
                                    }}
                                    className="px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                                    title="Copy link"
                                >
                                    {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                                </button>
                                <a
                                    href={verifyUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center"
                                    title="Open"
                                >
                                    <ExternalLink size={15} />
                                </a>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="mt-5 w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                        >
                            Done
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

/**
 * "Where are they now" — the headline a school writes its prospectus from and
 * answers on an admissions tour.
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

const AlumniHome: React.FC = () => {
    const qc = useQueryClient();
    const [batchYear, setBatchYear] = useState<number | undefined>();
    const [search, setSearch] = useState('');
    const [issuing, setIssuing] = useState<AlumnusRow | null>(null);

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
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                icon={GraduationCap}
                title="Alumni"
                subtitle="Everyone your school has taught — and the certificates they can prove it with"
                gradient={MODULE_THEMES.admin}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                <OutcomesPanel />

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
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => setIssuing(a)}
                                                    className="px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 inline-flex items-center gap-1.5"
                                                    data-testid={`issue-cert-${a.id}`}
                                                >
                                                    <Award size={13} /> Issue
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {issuing && (
                <IssueCertificateModal
                    alumnus={issuing}
                    onClose={() => {
                        setIssuing(null);
                        void qc.invalidateQueries({ queryKey: ['alumni'] });
                    }}
                />
            )}
        </div>
    );
};

export default AlumniHome;

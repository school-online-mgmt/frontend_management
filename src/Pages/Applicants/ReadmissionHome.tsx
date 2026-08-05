import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, GraduationCap, RefreshCcw, Search,
    UserCheck, UserX, Users, Wallet, X, Sparkles, Info,
} from 'lucide-react';
import api from '../../api/api';
import type { ReadmissionApplicant, OutstandingDues } from '../../api/api';
import PageHeader, { MODULE_THEMES } from '../../components/PageHeader';
import { EmptySessionState } from '../../components/common/SessionGate';
import { useSession } from '../../context/SessionContext';
import { ErrorState, Skeleton, EmptyState, StatusPill, inr } from '../../components/ui';

/**
 * Year-end readmission — where every continuing student is resolved.
 *
 * When a session is finalised, every student who was enrolled becomes an
 * applicant for the next year. This page is where the office decides what
 * happened to each of them: they came back, they left, or they never turned up.
 *
 * ── Why this page exists as its own screen ────────────────────────────────
 *
 * It could have been a filter on the applicants list. It is not, because the
 * two populations need different things: a new applicant needs assessing, while
 * a returning student needs a decision the school already half-knows. Mixing
 * them buries 400 rows of routine rollover under a handful of real applications.
 *
 * The single most important element here is the UNRESOLVED banner. A student
 * nobody resolves stays ACTIVE and keeps appearing in the statutory register and
 * board returns as enrolled — a compliance number going out wrong, silently, for
 * a year. Making that a number at the top of the page is the whole mitigation.
 */

type Kind = 'RETURNING' | 'NEW' | 'ALL';

// ── Dues confirmation ─────────────────────────────────────────────────────────

/**
 * Dues warn, they never block (owner decision). A school often knows a debt is
 * uncollectable and still needs its register accurate; blocking would strand a
 * child as ACTIVE in a statutory return over a disputed ₹200.
 *
 * The amount is shown before the action is possible, so nobody records a leaver
 * without seeing what is owed.
 */
const DuesConfirmModal: React.FC<{
    name: string;
    action: 'alumni' | 'abandoned';
    dues: OutstandingDues;
    busy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ name, action, dues, busy, onConfirm, onCancel }) => {
    const [acknowledged, setAcknowledged] = useState(false);
    const verb = action === 'alumni' ? 'an alumnus' : 'not returning';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" data-testid="dues-confirm-modal">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 mb-4">
                    <Wallet className="text-amber-600" size={22} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Outstanding fees</h3>
                <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">{name}</span> owes{' '}
                    <span className="font-semibold text-amber-700">{inr(dues.amount)}</span> across{' '}
                    {dues.invoiceCount} unpaid invoice{dues.invoiceCount === 1 ? '' : 's'}.
                </p>
                <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 leading-relaxed">
                    Recording them as {verb} does <strong>not</strong> cancel the debt — the invoices
                    stay open and payable. This only stops them being counted as an enrolled student.
                </p>

                <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        data-testid="dues-acknowledge"
                    />
                    <span className="text-sm text-slate-700">
                        I understand this student is leaving with fees outstanding.
                    </span>
                </label>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!acknowledged || busy}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        data-testid="dues-confirm-btn"
                    >
                        {busy ? 'Saving…' : action === 'alumni' ? 'Mark as alumni' : 'Mark as not returning'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Row ───────────────────────────────────────────────────────────────────────

const ApplicantRow: React.FC<{
    a: ReadmissionApplicant;
    onAdmit: () => void;
    onAlumni: () => void;
    onAbandon: () => void;
    busy: boolean;
}> = ({ a, onAdmit, onAlumni, onAbandon, busy }) => {
    const resolved = a.status !== 'APPLIED';

    return (
        <tr
            className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${resolved ? 'opacity-60' : ''}`}
            data-testid={`readmission-row-${a.id}`}
        >
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="font-medium text-slate-900 text-sm">{a.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            {a.applicationNumber ?? a.phone}
                        </div>
                    </div>
                </div>
            </td>

            <td className="px-4 py-3">
                {a.isReturningStudent ? (
                    <div className="text-sm text-slate-700">{a.previousClassName ?? '—'}</div>
                ) : (
                    <span className="text-xs text-slate-400">New applicant</span>
                )}
            </td>

            <td className="px-4 py-3">
                {/* Held back is the one thing on this page that must never be
                    missed — it changes which class the student goes into. */}
                {a.wasHeldBack ? (
                    <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-medium"
                        data-testid="held-back-badge"
                    >
                        <AlertTriangle size={12} /> Held back
                    </span>
                ) : a.previousPromotionStatus === 'PROMOTE' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                        Promoted
                    </span>
                ) : (
                    <span className="text-xs text-slate-400">—</span>
                )}
            </td>

            <td className="px-4 py-3">
                {a.outstandingDues ? (
                    <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700"
                        title={`${a.outstandingDues.invoiceCount} unpaid invoice(s)`}
                    >
                        <Wallet size={12} /> {inr(a.outstandingDues.amount)}
                    </span>
                ) : (
                    <span className="text-xs text-slate-300">—</span>
                )}
            </td>

            <td className="px-4 py-3">
                <StatusPill status={a.status} />
            </td>

            <td className="px-4 py-3">
                {resolved ? (
                    <span className="text-xs text-slate-400">Resolved</span>
                ) : (
                    <div className="flex items-center gap-1.5 justify-end">
                        <button
                            onClick={onAdmit}
                            disabled={busy}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                            data-testid="action-admit"
                        >
                            <UserCheck size={13} /> Admit
                        </button>
                        {a.isReturningStudent && (
                            <button
                                onClick={onAlumni}
                                disabled={busy}
                                className="px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 disabled:opacity-50 inline-flex items-center gap-1.5"
                                data-testid="action-alumni"
                            >
                                <GraduationCap size={13} /> Alumni
                            </button>
                        )}
                        <button
                            onClick={onAbandon}
                            disabled={busy}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100 disabled:opacity-50 inline-flex items-center gap-1.5"
                            data-testid="action-abandon"
                        >
                            <UserX size={13} /> Not returning
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const ReadmissionHome: React.FC = () => {
    const { selectedSessionId } = useSession();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [kind, setKind] = useState<Kind>('RETURNING');
    const [search, setSearch] = useState('');
    const [pending, setPending] = useState<{
        applicant: ReadmissionApplicant;
        action: 'alumni' | 'abandoned';
        dues: OutstandingDues;
    } | null>(null);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['readmission', selectedSessionId, kind],
        queryFn: () => api.getReadmissionApplicants({ sessionId: selectedSessionId!, kind }),
        enabled: !!selectedSessionId,
    });

    const resolve = useMutation({
        mutationFn: async (args: {
            id: string;
            action: 'alumni' | 'abandoned';
            acknowledgeDues?: boolean;
        }) =>
            args.action === 'alumni'
                ? api.markApplicantAlumni(args.id, { acknowledgeDues: args.acknowledgeDues })
                : api.markApplicantAbandoned(args.id, { acknowledgeDues: args.acknowledgeDues }),
        onSuccess: () => {
            setPending(null);
            void qc.invalidateQueries({ queryKey: ['readmission'] });
        },
    });

    /**
     * The 409 is not an error — it is the server refusing to let a leaver be
     * recorded without the dues being seen. Convert it into the modal.
     */
    const attempt = (a: ReadmissionApplicant, action: 'alumni' | 'abandoned') => {
        if (a.outstandingDues) {
            setPending({ applicant: a, action, dues: a.outstandingDues });
            return;
        }
        resolve.mutate({ id: a.id, action });
    };

    const rows = useMemo(() => {
        const all = data?.applicants ?? [];
        if (!search.trim()) return all;
        const q = search.toLowerCase();
        return all.filter(
            (a) => a.name.toLowerCase().includes(q) || a.phone.includes(q)
                || (a.applicationNumber ?? '').toLowerCase().includes(q),
        );
    }, [data, search]);

    if (!selectedSessionId) return <EmptySessionState entityPlural="readmissions" />;

    const unresolved = data?.unresolved;

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                icon={RefreshCcw}
                title="Readmission"
                subtitle="Resolve every student from last session — admitted, alumni, or not returning"
                gradient={MODULE_THEMES.people}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                {/* The compliance safety net. Every unresolved student is one the
                    register still counts as enrolled. */}
                {!!unresolved && unresolved.total > 0 && (
                    <div
                        className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5"
                        data-testid="unresolved-banner"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                <AlertTriangle className="text-amber-700" size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-amber-900">
                                    {unresolved.total} student{unresolved.total === 1 ? '' : 's'} still unresolved
                                </h3>
                                <p className="text-sm text-amber-800/90 mt-1 leading-relaxed">
                                    Until you resolve them, they are still counted as enrolled — including in
                                    your statutory register and board returns.{' '}
                                    {unresolved.heldBack > 0 && (
                                        <span className="font-medium">
                                            {unresolved.heldBack} {unresolved.heldBack === 1 ? 'was' : 'were'} held back.
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="hidden sm:flex items-center gap-4 shrink-0">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-700">{unresolved.promoted}</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Promoted</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-700">{unresolved.heldBack}</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Held back</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                        {([
                            ['RETURNING', 'Returning students', Users],
                            ['NEW', 'New applicants', Sparkles],
                            ['ALL', 'All', null],
                        ] as const).map(([k, label, Icon]) => (
                            <button
                                key={k}
                                onClick={() => setKind(k as Kind)}
                                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                                    kind === k ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                                data-testid={`filter-${k.toLowerCase()}`}
                            >
                                {Icon && <Icon size={14} />} {label}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, phone or application no."
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                            data-testid="readmission-search"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => void refetch()}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm inline-flex items-center gap-2"
                    >
                        <RefreshCcw size={14} /> Refresh
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-6"><Skeleton rows={6} /></div>
                    ) : error ? (
                        <div className="p-6"><ErrorState error={error} onRetry={() => void refetch()} /></div>
                    ) : rows.length === 0 ? (
                        <EmptyState
                            icon={<Users size={22} />}
                            title={kind === 'RETURNING' ? 'No students awaiting readmission' : 'No applicants'}
                            message={
                                kind === 'RETURNING'
                                    ? 'Students appear here once you finalise the previous session. If you have just finalised and see nothing, check that you have subscribed to this session.'
                                    : 'New applications from the public admission form will appear here.'
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        <th className="px-4 py-3">Student</th>
                                        <th className="px-4 py-3">Last class</th>
                                        <th className="px-4 py-3">Outcome</th>
                                        <th className="px-4 py-3">Dues</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((a) => (
                                        <ApplicantRow
                                            key={a.id}
                                            a={a}
                                            busy={resolve.isPending}
                                            onAdmit={() => navigate(`/admissions/readmission/${a.id}/admit`)}
                                            onAlumni={() => attempt(a, 'alumni')}
                                            onAbandon={() => attempt(a, 'abandoned')}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Explains why returning students skip the entrance exam, so the
                    office is not left wondering whether something is broken. */}
                {kind === 'RETURNING' && rows.length > 0 && (
                    <div className="flex items-start gap-2.5 text-xs text-slate-500 px-1">
                        <Info size={14} className="mt-0.5 shrink-0" />
                        <p>
                            Returning students skip the entrance exam — a year at your school is a better
                            assessment than a two-hour paper. You can still require one on the admit screen,
                            which is useful for Class&nbsp;10 → 11 stream selection.
                        </p>
                    </div>
                )}
            </div>

            {pending && (
                <DuesConfirmModal
                    name={pending.applicant.name}
                    action={pending.action}
                    dues={pending.dues}
                    busy={resolve.isPending}
                    onCancel={() => setPending(null)}
                    onConfirm={() =>
                        resolve.mutate({
                            id: pending.applicant.id,
                            action: pending.action,
                            acknowledgeDues: true,
                        })
                    }
                />
            )}
        </div>
    );
};

export default ReadmissionHome;

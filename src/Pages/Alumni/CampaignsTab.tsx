import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle, HandCoins, Pause, Play, Plus, Receipt, ShieldCheck, X,
} from 'lucide-react';
import api from '../../api/api';
import type { DonationCampaign, DonationRow } from '../../api/api';
import { EmptyState, ErrorState, Skeleton, StatusPill, dateStr, inr } from '../../components/ui';

/**
 * Appeals and the gifts they raise.
 *
 * ── The 80(G) number is the thing to get right ────────────────────────────
 *
 * An Indian donor gives partly to claim a deduction. That needs a receipt
 * carrying the school's section 80(G) registration AND the donor's PAN — miss
 * either and the receipt is a thank-you note the donor cannot file.
 *
 * So the form asks for the registration, explains what happens without it, and
 * the list shows which gifts are actually claimable. Nobody should discover at
 * filing time that the receipt they were given is worthless.
 */

const CampaignForm: React.FC<{
    existing?: DonationCampaign;
    onClose: () => void;
}> = ({ existing, onClose }) => {
    const qc = useQueryClient();
    const [title, setTitle] = useState(existing?.title ?? '');
    const [description, setDescription] = useState(existing?.description ?? '');
    const [goalAmount, setGoalAmount] = useState(existing?.goalAmount?.toString() ?? '');
    const [taxNo, setTaxNo] = useState(existing?.taxExemptionNumber ?? '');

    const save = useMutation({
        mutationFn: async () => {
            const body = {
                title,
                description: description || null,
                goalAmount: goalAmount ? Number(goalAmount) : null,
                taxExemptionNumber: taxNo || null,
            };
            return existing ? api.updateCampaign(existing.id, body) : api.createCampaign(body);
        },
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ['campaigns'] });
            onClose();
        },
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" data-testid="campaign-form">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <HandCoins className="text-emerald-600" size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-900">
                            {existing ? 'Edit appeal' : 'New appeal'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            What are you raising for? <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Rebuild the school library"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            data-testid="campaign-title"
                        />
                        <p className="mt-1 text-xs text-slate-400">
                            A specific appeal raises far more than "give to the school".
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Details</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Target (₹)</label>
                        <input
                            value={goalAmount}
                            onChange={(e) => setGoalAmount(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Leave blank for an open appeal"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            data-testid="campaign-goal"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            80(G) registration number
                        </label>
                        <input
                            value={taxNo}
                            onChange={(e) => setTaxNo(e.target.value)}
                            placeholder="e.g. AAATE1234F"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            data-testid="campaign-tax-no"
                        />
                        {taxNo ? (
                            <p className="mt-1.5 text-xs text-emerald-600 flex items-start gap-1.5">
                                <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                                Receipts will carry this number, so donors who give their PAN can claim
                                the deduction.
                            </p>
                        ) : (
                            <p className="mt-1.5 text-xs text-amber-600 flex items-start gap-1.5">
                                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                Without it, receipts will state plainly that donations are{' '}
                                <strong>not</strong> tax-deductible. You can add it later — but only
                                receipts issued afterwards will carry it.
                            </p>
                        )}
                    </div>
                </div>

                {save.error && <div className="mt-4"><ErrorState error={save.error} /></div>}

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => save.mutate()}
                        disabled={title.trim().length < 3 || save.isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
                        data-testid="campaign-save"
                    >
                        {save.isPending ? 'Saving…' : existing ? 'Save changes' : 'Create appeal'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CampaignsTab: React.FC = () => {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<DonationCampaign | undefined>();
    const [showForm, setShowForm] = useState(false);
    const [viewing, setViewing] = useState<string | undefined>();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['campaigns'],
        queryFn: () => api.getCampaigns(),
    });

    const donations = useQuery({
        queryKey: ['donations', viewing],
        queryFn: () => api.getDonations(viewing ? { campaignId: viewing } : {}),
    });

    const toggle = useMutation({
        mutationFn: (c: DonationCampaign) => api.updateCampaign(c.id, { isActive: !c.isActive }),
        onSuccess: () => void qc.invalidateQueries({ queryKey: ['campaigns'] }),
    });

    if (isLoading) return <Skeleton rows={5} />;
    if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

    const campaigns = data?.campaigns ?? [];
    const totals = donations.data?.totals;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    {totals && totals.donorCount > 0 && (
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{inr(totals.totalRaised)}</span>
                            <span className="text-sm text-slate-500">
                                from {totals.donorCount} gift{totals.donorCount === 1 ? '' : 's'}
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => { setEditing(undefined); setShowForm(true); }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 inline-flex items-center gap-2"
                    data-testid="new-campaign"
                >
                    <Plus size={15} /> New appeal
                </button>
            </div>

            {campaigns.length === 0 ? (
                <EmptyState
                    icon={<HandCoins size={22} />}
                    title="No appeals yet"
                    message="Create one and your alumni can give from their portal, with a receipt they can file."
                />
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {campaigns.map((c) => (
                        <div
                            key={c.id}
                            className={`rounded-2xl border p-5 ${c.isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'}`}
                            data-testid={`campaign-${c.id}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-slate-900 truncate">{c.title}</h3>
                                    {c.description && (
                                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                                    )}
                                </div>
                                <StatusPill status={c.isActive ? 'ACTIVE' : 'CLOSED'} />
                            </div>

                            <div className="mt-4">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-xl font-bold text-slate-900">{inr(c.raisedAmount)}</span>
                                    {c.goalAmount && (
                                        <span className="text-xs text-slate-400">of {inr(c.goalAmount)}</span>
                                    )}
                                </div>
                                {c.percentOfGoal !== null && (
                                    <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all"
                                            style={{ width: `${c.percentOfGoal}%` }}
                                        />
                                    </div>
                                )}
                                <p className="mt-1.5 text-xs text-slate-500">
                                    {c.donorCount} donor{c.donorCount === 1 ? '' : 's'}
                                </p>
                            </div>

                            {/* The consequence, stated on the card rather than
                                buried in the edit form. */}
                            {!c.taxExemptionNumber && (
                                <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-600">
                                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                    Receipts say donations are not tax-deductible — no 80(G) number.
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                                <button
                                    onClick={() => { setEditing(c); setShowForm(true); }}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => toggle.mutate(c)}
                                    disabled={toggle.isPending}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"
                                >
                                    {c.isActive ? <><Pause size={12} /> Close</> : <><Play size={12} /> Reopen</>}
                                </button>
                                <button
                                    onClick={() => setViewing(viewing === c.id ? undefined : c.id)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 ml-auto"
                                >
                                    {viewing === c.id ? 'Hide gifts' : 'View gifts'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Ledger */}
            {donations.data && donations.data.donations.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Receipt size={15} className="text-emerald-600" />
                        <h3 className="text-sm font-semibold text-slate-900">
                            {viewing ? 'Gifts to this appeal' : 'All gifts'}
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    <th className="px-4 py-3">Donor</th>
                                    <th className="px-4 py-3">Appeal</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Receipt</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {donations.data.donations.map((d: DonationRow) => (
                                    <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                                        <td className="px-4 py-3">
                                            {/* The school always sees the real name — anonymity
                                                hides a donor from public lists, not from the
                                                ledger or their own receipt. */}
                                            <div className="text-sm text-slate-900">{d.donorName}</div>
                                            {d.isAnonymous && (
                                                <div className="text-xs text-slate-400">shown publicly as Anonymous</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {d.campaignTitle ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                            {inr(d.amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {d.receiptNo ? (
                                                <div>
                                                    <div className="text-xs font-mono text-slate-700">{d.receiptNo}</div>
                                                    <div className={`text-[11px] ${d.taxDeductible ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {d.taxDeductible
                                                            ? '80(G) claimable'
                                                            : d.donorPan ? 'no 80(G) number' : 'no PAN given'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill status={d.status} />
                                            {d.paidAt && (
                                                <div className="text-[11px] text-slate-400 mt-0.5">{dateStr(d.paidAt)}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showForm && (
                <CampaignForm existing={editing} onClose={() => { setShowForm(false); setEditing(undefined); }} />
            )}
        </div>
    );
};

export default CampaignsTab;

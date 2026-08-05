import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle, Check, Info, MessageCircle, Moon, ShieldAlert, Wallet,
} from 'lucide-react';
import api from '../../api/api';
import { ErrorState, Skeleton, inr } from '../../components/ui';

/**
 * WhatsApp channel settings — the school's half of the configuration.
 *
 * They own the master switch and which modules may use the channel. They do NOT
 * own credentials, the sending mode, the per-message rate or the monthly cap:
 * those are set by us, because a school being able to raise its own spending
 * cap defeats the point of having one.
 *
 * ── Why this screen leads with money ──────────────────────────────────────
 *
 * Unlike email, every WhatsApp message costs real money on every send. A school
 * that cannot see what it is spending until the invoice arrives will either
 * turn the channel off in a panic or be surprised — so this month's usage and
 * cost sit at the top, before any toggle.
 */

const MODULE_LABELS: Record<string, string> = {
    ADMISSION: 'Admissions',
    FINANCE: 'Fees & payments',
    ATTENDANCE: 'Attendance',
    COMMUNICATION: 'Meetings & announcements',
    LIBRARY: 'Library',
    TRANSPORT: 'Transport',
    EXAM: 'Exams & results',
    ASSIGNMENT: 'Homework',
    NOTICE: 'Notices',
    SPORTS: 'Sports',
};

/**
 * Which modules actually send anything on WhatsApp today. The others are listed
 * as off-by-design rather than hidden, so a school looking for "why doesn't
 * homework message parents" finds an answer instead of an absence.
 */
const MODULES_WITH_WHATSAPP = new Set(['ADMISSION', 'FINANCE', 'ATTENDANCE', 'COMMUNICATION', 'EXAM']);

export default function WhatsAppServiceTab() {
    const qc = useQueryClient();
    const [modules, setModules] = useState<Record<string, boolean>>({});
    const [saved, setSaved] = useState(false);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['whatsapp-settings'],
        queryFn: () => api.getWhatsAppSettings(),
    });

    useEffect(() => {
        if (data) setModules(data.moduleSettings ?? {});
    }, [data]);

    const toggleService = useMutation({
        mutationFn: (enabled: boolean) => api.updateWhatsAppEnabled(enabled),
        onSuccess: () => void qc.invalidateQueries({ queryKey: ['whatsapp-settings'] }),
    });

    const saveModules = useMutation({
        mutationFn: () => api.updateWhatsAppModules(modules),
        onSuccess: () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            void qc.invalidateQueries({ queryKey: ['whatsapp-settings'] });
        },
    });

    if (isLoading) return <Skeleton rows={6} />;
    if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
    if (!data) return null;

    const spentThisMonth = Math.ceil((data.usedThisMonth * data.pricePer100) / 100);
    const capPct = data.monthlyCap ? Math.min(100, (data.usedThisMonth / data.monthlyCap) * 100) : 0;

    return (
        <div className="space-y-5">
            {!data.configured && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-sm font-medium text-amber-900">WhatsApp is not set up yet</p>
                        <p className="text-xs text-amber-800/80 mt-1">
                            Contact support to connect your school's WhatsApp — messages cannot be sent
                            until then.
                        </p>
                    </div>
                </div>
            )}

            {/* Usage first. */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Wallet size={15} className="text-emerald-600" /> This month
                        </h3>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900">{inr(spentThisMonth)}</span>
                            <span className="text-sm text-slate-500">
                                · {data.usedThisMonth} message{data.usedThisMonth === 1 ? '' : 's'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Billed at {inr(data.pricePer100 / 100)} a message, added to your monthly bill.
                        </p>
                    </div>

                    {data.monthlyCap != null && (
                        <div className="min-w-[180px]">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                                <span>Monthly limit</span>
                                <span>{data.usedThisMonth} / {data.monthlyCap}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        capPct > 90 ? 'bg-rose-500' : capPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${capPct}%` }}
                                />
                            </div>
                            {capPct >= 100 && (
                                <p className="text-xs text-rose-600 mt-1.5">
                                    Limit reached — messages are paused until next month.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Master switch + identity note */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={data.enabled}
                        disabled={!data.configured || toggleService.isPending}
                        onChange={(e) => toggleService.mutate(e.target.checked)}
                        data-testid="whatsapp-master-toggle"
                    />
                    <div>
                        <div className="text-sm font-medium text-slate-900">Send notifications on WhatsApp</div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Important messages go out by email <em>and</em> WhatsApp. Everything else stays
                            email only.
                        </p>
                    </div>
                </label>

                <div
                    className={`mt-4 rounded-lg p-3.5 flex items-start gap-2.5 ${
                        data.useOwnCredentials
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-slate-50 border border-slate-200'
                    }`}
                >
                    {data.useOwnCredentials
                        ? <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                        : <ShieldAlert size={15} className="text-slate-400 shrink-0 mt-0.5" />}
                    <p className="text-xs text-slate-600 leading-relaxed">{data.senderIdentityNote}</p>
                </div>
            </div>

            {/* Per-module gates */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-1">
                    <MessageCircle size={15} className="text-emerald-600" />
                    <h3 className="text-sm font-semibold text-slate-900">What may use WhatsApp</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                    Turning one off does not stop the email — only the WhatsApp copy.
                </p>

                <div className="space-y-1">
                    {(data.modules ?? []).map((m) => {
                        const supported = MODULES_WITH_WHATSAPP.has(m);
                        const on = modules[m] !== false;
                        return (
                            <div
                                key={m}
                                className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                                    supported ? 'hover:bg-slate-50' : 'opacity-50'
                                }`}
                            >
                                <div>
                                    <span className="text-sm text-slate-800">{MODULE_LABELS[m] ?? m}</span>
                                    {!supported && (
                                        <span className="ml-2 text-[11px] text-slate-400">
                                            email only — too frequent for WhatsApp
                                        </span>
                                    )}
                                </div>
                                <button
                                    disabled={!supported || !data.enabled}
                                    onClick={() => setModules((s) => ({ ...s, [m]: !on }))}
                                    className={`relative w-10 h-5.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                        supported && on && data.enabled ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`}
                                    style={{ height: '22px' }}
                                    data-testid={`whatsapp-module-${m}`}
                                >
                                    <span
                                        className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                                            supported && on && data.enabled ? 'translate-x-[21px]' : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                    {saved && (
                        <span className="text-sm text-emerald-600 inline-flex items-center gap-1.5">
                            <Check size={15} /> Saved
                        </span>
                    )}
                    <button
                        onClick={() => saveModules.mutate()}
                        disabled={saveModules.isPending || !data.enabled}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                        data-testid="save-whatsapp-modules"
                    >
                        {saveModules.isPending ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Quiet hours — read-only, with the reason. */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-2.5">
                <Moon size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-medium text-slate-700">
                        Quiet hours: {data.quietHours.start}:00 – {data.quietHours.end}:00
                    </span>
                    <p className="mt-1">
                        Non-urgent messages are held overnight. A fee reminder at 6am is the fastest way
                        for parents to block your number, which limits how many messages WhatsApp lets you
                        send at all. Contact support to change this.
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-slate-400 px-1">
                <Info size={13} className="mt-0.5 shrink-0" />
                <p>
                    WhatsApp only allows pre-approved message templates, so custom broadcasts stay
                    email-only. Your credentials, rate and monthly limit are managed by support.
                </p>
            </div>
        </div>
    );
}

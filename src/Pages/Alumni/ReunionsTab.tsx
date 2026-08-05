import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarHeart, Info, PartyPopper, Plus, Users, X } from 'lucide-react';
import api from '../../api/api';
import { EmptyState, ErrorState, Skeleton, dateStr } from '../../components/ui';

/**
 * Reunions and who is coming.
 *
 * ── Headcount, not reply count ────────────────────────────────────────────
 *
 * Reunion attendance is almost never one person — spouses and children come.
 * Catering ordered from raw RSVP counts is wrong by roughly half, so the big
 * number on each card is `GOING replies + their guests`, and the reply count is
 * the smaller, secondary figure.
 *
 * A reunion is a normal calendar event underneath (`schoolEvents`, type
 * REUNION), so it shows on the school calendar too. It is created here rather
 * than on the events screen because the audience — alumni, who are on no class
 * list — is what makes it different, and that is gated on the ALUMNI module.
 */

const ReunionForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const qc = useQueryClient();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');

    const save = useMutation({
        mutationFn: () => api.createReunion({
            title,
            description: description || null,
            date: new Date(date).toISOString(),
        }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ['reunions'] });
            onClose();
        },
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" data-testid="reunion-form">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
                            <PartyPopper className="text-violet-600" size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-900">New reunion</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Class of 2016 — ten years on"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                            data-testid="reunion-title"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            When <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                            data-testid="reunion-date"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Details — venue, timings, what to expect
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="School auditorium, 4pm onwards. Families welcome."
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                        <p className="mt-1 text-xs text-slate-400">
                            Say whether families are welcome — alumni are asked how many guests they
                            are bringing.
                        </p>
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
                        disabled={title.trim().length < 2 || !date || save.isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40"
                        data-testid="reunion-save"
                    >
                        {save.isPending ? 'Creating…' : 'Create reunion'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReunionsTab: React.FC = () => {
    const [showForm, setShowForm] = useState(false);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['reunions'],
        queryFn: () => api.getReunions(false),
    });

    if (isLoading) return <Skeleton rows={4} />;
    if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

    const reunions = data?.reunions ?? [];
    const now = Date.now();

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-end">
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 inline-flex items-center gap-2"
                    data-testid="new-reunion"
                >
                    <Plus size={15} /> New reunion
                </button>
            </div>

            {reunions.length === 0 ? (
                <EmptyState
                    icon={<PartyPopper size={22} />}
                    title="No reunions planned"
                    message="Create one and every alumnus can reply from their portal — including how many guests they are bringing."
                />
            ) : (
                <div className="space-y-4">
                    {reunions.map((r) => {
                        const past = new Date(r.date).getTime() < now;
                        return (
                            <div
                                key={r.id}
                                className={`rounded-2xl border p-5 ${past ? 'border-slate-200 bg-slate-50 opacity-75' : 'border-slate-200 bg-white'}`}
                                data-testid={`reunion-${r.id}`}
                            >
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-slate-900">{r.title}</h3>
                                        <div className="text-sm text-slate-500 mt-1 inline-flex items-center gap-1.5">
                                            <CalendarHeart size={14} className="text-slate-400" />
                                            {dateStr(r.date)}
                                            {past && <span className="text-xs text-slate-400">· past</span>}
                                        </div>
                                        {r.description && (
                                            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{r.description}</p>
                                        )}
                                    </div>

                                    {/* Headcount is the number that gets catered for. */}
                                    <div className="flex items-center gap-6 shrink-0">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-slate-900">{r.headcount}</div>
                                            <div className="text-[11px] uppercase tracking-wide text-slate-400">
                                                attending
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-slate-600">{r.goingCount}</div>
                                            <div className="text-[11px] uppercase tracking-wide text-slate-400">
                                                replied yes
                                            </div>
                                        </div>
                                        {r.maybeCount > 0 && (
                                            <div className="text-center">
                                                <div className="text-lg font-semibold text-amber-600">{r.maybeCount}</div>
                                                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                                                    maybe
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* The gap between the two numbers is the guests, and it is
                                    the thing a caterer needs explained once. */}
                                {r.headcount > r.goingCount && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
                                        <Users size={13} className="mt-0.5 shrink-0" />
                                        {r.headcount - r.goingCount} guest
                                        {r.headcount - r.goingCount === 1 ? ' is' : 's are'} coming with them —
                                        cater for {r.headcount}, not {r.goingCount}.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex items-start gap-2.5 text-xs text-slate-400 px-1">
                <Info size={13} className="mt-0.5 shrink-0" />
                <p>
                    Reunions appear on your school calendar like any other event. Edit the date or
                    title from there; RSVPs and headcounts live here.
                </p>
            </div>

            {showForm && <ReunionForm onClose={() => setShowForm(false)} />}
        </div>
    );
};

export default ReunionsTab;

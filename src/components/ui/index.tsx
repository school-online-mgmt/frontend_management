import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Info, XCircle, Inbox, Loader2,
  ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Lock,
} from 'lucide-react';

/**
 * The management portal design kit.
 *
 * Ported from the super-admin kit (frontend_superadmin/src/components/ui) so
 * both consoles share one visual language. Sixty-plus pages had drifted into
 * their own answers for "what does a table look like", "how do I show an empty
 * list", "what colour is OVERDUE" — several with no error state at all, which
 * renders a failed request as an empty list. This file is the one answer to
 * each, so a change to the standard lands everywhere rather than in the page
 * someone remembered to update.
 *
 * Two rules the components enforce, because getting them wrong is what makes an
 * operator console feel unreliable:
 *
 *   1. **Empty, loading and error are distinct states.** A spinner that resolves
 *      into a blank page leaves you unable to tell "nothing here" from "it
 *      broke". Every list component takes all three.
 *
 *   2. **Money and time are formatted in one place.** ₹1,600 and "2 hours ago"
 *      render identically on every screen, and INR grouping is Indian
 *      (₹1,60,000, not ₹160,000).
 */

/* ── Formatters ─────────────────────────────────────────────────────────── */

/** Indian digit grouping — ₹1,60,000, not ₹160,000. */
export const inr = (n: number | null | undefined, opts: { compact?: boolean } = {}): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (opts.compact) {
    if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
    if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
    if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  }
  return `₹${n.toLocaleString('en-IN')}`;
};

export const num = (n: number | null | undefined): string =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : n.toLocaleString('en-IN');

export const dateStr = (d: string | Date | null | undefined): string => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const dateTimeStr = (d: string | Date | null | undefined): string => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

/**
 * "2 hours ago". Operators scan logs for recency far more than for wall-clock
 * time, and an absolute timestamp forces mental arithmetic on every row.
 */
export const relativeTime = (d: string | Date | null | undefined): string => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return '—';
  const secs = Math.round((Date.now() - dt.getTime()) / 1000);
  const future = secs < 0;
  const s = Math.abs(secs);
  const pick = (): string => {
    if (s < 45) return 'just now';
    if (s < 90) return 'a minute';
    if (s < 3600) return `${Math.round(s / 60)} minutes`;
    if (s < 5400) return 'an hour';
    if (s < 86400) return `${Math.round(s / 3600)} hours`;
    if (s < 172800) return 'a day';
    if (s < 2592000) return `${Math.round(s / 86400)} days`;
    if (s < 5184000) return 'a month';
    if (s < 31536000) return `${Math.round(s / 2592000)} months`;
    return `${Math.round(s / 31536000)} years`;
  };
  const label = pick();
  if (label === 'just now') return label;
  return future ? `in ${label}` : `${label} ago`;
};

/* ── Status ─────────────────────────────────────────────────────────────── */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger:  'bg-rose-50 text-rose-700 border-rose-200',
  info:    'bg-sky-50 text-sky-700 border-sky-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  muted:   'bg-slate-50 text-slate-400 border-slate-200',
};

/**
 * Every status string the platform uses, mapped once.
 *
 * Previously each page decided its own colours, so PAID was green on one screen
 * and grey on another — which quietly teaches an operator not to trust colour
 * as a signal at all.
 */
const STATUS_TONE: Record<string, Tone> = {
  // Lifecycle
  ACTIVE: 'success', PUBLISHED: 'success', COMPLETED: 'success', DONE: 'success',
  PROVISIONING: 'info', DRAFT: 'neutral', SCHEDULED: 'info',
  ENDING: 'warning', EXPIRING: 'warning', PENDING: 'warning', IN_PROGRESS: 'info',
  ENDED: 'muted', EXPIRED: 'muted', CLOSED: 'muted', SUPERSEDED: 'muted', INACTIVE: 'muted',
  CANCELLED: 'muted', RENEWED: 'info',
  // Money
  PAID: 'success', WAIVED: 'info', OVERDUE: 'danger', FAILED: 'danger', REFUNDED: 'info',
  CAPTURED: 'success', INITIATED: 'info', ORDER_CREATED: 'info', SIGNATURE_VERIFIED: 'info',
  // Delivery
  SENT: 'info', DELIVERED: 'success', OPENED: 'success', CLICKED: 'success',
  BOUNCED: 'danger', REJECTED: 'danger',
  // Generic
  SUCCESS: 'success', ERROR: 'danger', WARNING: 'warning', SKIPPED: 'muted',
  OPEN: 'warning', RESOLVED: 'success', ACCEPTED: 'success', APPLIED: 'info',
  SHORTLISTED: 'info', BOOKED: 'info', BLOCKED: 'muted',

  // ── School domain ──────────────────────────────────────────────────────
  // Attendance. ABSENT is `warning`, not `danger`: a child being away is a
  // fact to notice, not a fault — and colouring an ordinary register red
  // makes the genuinely urgent rows stop standing out.
  PRESENT: 'success', ABSENT: 'warning', LATE: 'warning',
  HALF_DAY: 'info', ON_LEAVE: 'info', HOLIDAY: 'muted',

  // Student lifecycle
  ADMITTED: 'success', ENROLLED: 'success', GRADUATED: 'info',
  TRANSFERRED: 'muted', WITHDRAWN: 'muted',

  // Exams — the 5-stage and 9-stage flows both appear, so both are mapped.
  READY_TO_CONDUCT: 'info', CONDUCTED: 'success', EXAM_CONDUCTED: 'success',
  RESULT_PUBLISHED: 'success',

  // Fees
  PARTIALLY_PAID: 'warning', UNPAID: 'warning',

  // Library
  ISSUED: 'info', RETURNED: 'success', LOST: 'danger', RENEWED_BOOK: 'info',

  // Homework
  GRADED: 'success', NOT_SUBMITTED: 'warning',

  // Payroll
  FINALIZED: 'info',

  // Pantry
  PLACED: 'info', READY: 'warning', COLLECTED: 'success',

  // Approvals
  APPROVED: 'success',
};

export const toneFor = (status: string | null | undefined): Tone =>
  status ? (STATUS_TONE[status.toUpperCase()] ?? 'neutral') : 'muted';

export const StatusPill: React.FC<{
  status: string | null | undefined;
  tone?: Tone;
  className?: string;
}> = ({ status, tone, className = '' }) => {
  if (!status) return <span className="text-slate-300">—</span>;
  const t = tone ?? toneFor(status);
  return (
    <span
      data-testid="status-pill"
      data-status={status}
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${TONE_CLASS[t]} ${className}`}
    >
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
};

/* ── Layout primitives ──────────────────────────────────────────────────── */

export const Card: React.FC<{
  children: React.ReactNode; className?: string; padded?: boolean; testId?: string;
}> = ({ children, className = '', padded = true, testId }) => (
  <div data-testid={testId} className={`bg-white border border-slate-200 rounded-2xl ${padded ? 'p-5' : ''} ${className}`}>
    {children}
  </div>
);

export const SectionCard: React.FC<{
  title: string; subtitle?: string; icon?: React.ReactNode;
  actions?: React.ReactNode; children: React.ReactNode; testId?: string; className?: string;
}> = ({ title, subtitle, icon, actions, children, testId, className = '' }) => (
  <div data-testid={testId} className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${className}`}>
    <div className="px-5 py-3.5 border-b border-slate-100 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        {icon && <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

/* ── States ─────────────────────────────────────────────────────────────── */

export const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center py-16 ${className}`}>
    <Loader2 size={24} className="animate-spin text-emerald-500" />
  </div>
);

/** Shaped like the content it replaces, so the layout does not jump on load. */
export const Skeleton: React.FC<{ rows?: number; className?: string }> = ({ rows = 4, className = '' }) => (
  <div className={`space-y-2 p-4 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
    ))}
  </div>
);

/**
 * An empty list is not a failure, and should not look like one. `action` turns
 * the dead end into the next step — which for an operator console is usually
 * "create the first one".
 */
export const EmptyState: React.FC<{
  icon?: React.ReactNode; title: string; message?: string;
  action?: React.ReactNode; testId?: string;
}> = ({ icon, title, message, action, testId }) => (
  <div data-testid={testId ?? 'empty-state'} className="text-center py-14 px-6">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-300">
      {icon ?? <Inbox size={22} />}
    </div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {message && <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/**
 * Is this failure a module paywall rather than a broken request?
 *
 * The backend answers 402 + `MODULE_NOT_ENABLED` when a school's plan does not
 * cover the feature. That is not an error the user can retry away, and showing
 * them a "Try again" button invites them to click it forever.
 */
export const isModulePaywall = (err: unknown): boolean => {
  const e = err as { response?: { status?: number; data?: { code?: string } } } | undefined;
  return e?.response?.status === 402 || e?.response?.data?.code === 'MODULE_NOT_ENABLED';
};

/**
 * Distinct from EmptyState on purpose — "it broke" must not read as "nothing here".
 *
 * Pass `error` (the caught request error) and a 402 renders as an upgrade
 * prompt with no retry, because retrying a billing state never succeeds.
 */
export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
  testId?: string;
  /** The caught error, so a module paywall can be told from a real failure. */
  error?: unknown;
}> = ({ message, onRetry, testId, error }) => {
  const paywall = error !== undefined && isModulePaywall(error);

  if (paywall) {
    const mod = (error as { response?: { data?: { module?: string } } })?.response?.data?.module;
    return (
      <div data-testid={testId ? testId + '-paywall' : 'module-paywall'} className="text-center py-14 px-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
          <Lock size={22} className="text-amber-600" />
        </div>
        <p className="text-sm font-semibold text-slate-800">Not included in your plan</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {mod
            ? 'The ' + mod.replace(/_/g, ' ').toLowerCase() + ' module is not enabled for your school.'
            : 'This feature is not enabled for your school.'}{' '}
          Contact your administrator to add it.
        </p>
      </div>
    );
  }

  return (
    <div data-testid={testId ?? 'error-state'} className="text-center py-14 px-6">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-3">
        <XCircle size={22} className="text-rose-500" />
      </div>
      <p className="text-sm font-semibold text-slate-800">Could not load this</p>
      <p className="text-xs text-slate-500 mt-1">{message ?? 'Something went wrong fetching the data.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800">
          Try again
        </button>
      )}
    </div>
  );
};

/* ── Metrics ────────────────────────────────────────────────────────────── */

export type MetricTone = 'default' | 'good' | 'warn' | 'bad';

const METRIC_VALUE: Record<MetricTone, string> = {
  default: 'text-slate-900', good: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-rose-600',
};

/**
 * One number, what it means, and — where it exists — which way it is moving.
 *
 * `hint` is deliberately prominent: a bare "12" tells an operator nothing,
 * while "12 · 3 overdue" tells them whether to act.
 */
export const Metric: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: MetricTone;
  delta?: { value: number; suffix?: string; goodWhenUp?: boolean };
  onClick?: () => void;
  testId?: string;
}> = ({ label, value, hint, icon, tone = 'default', delta, onClick, testId }) => {
  const interactive = !!onClick;
  const deltaGood = delta ? (delta.goodWhenUp !== false ? delta.value > 0 : delta.value < 0) : false;
  const DeltaIcon = !delta || delta.value === 0 ? Minus : delta.value > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid={testId ?? 'metric'}
      data-label={label}
      {...(interactive ? { onClick, role: 'button', tabIndex: 0 } : {})}
      className={`bg-white border border-slate-200 rounded-2xl p-4 ${
        interactive ? 'cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        <span className="truncate">{label}</span>
        {interactive && <ChevronRight size={11} className="ml-auto text-slate-300" />}
      </div>
      <div className={`text-2xl font-bold mt-1.5 tabular-nums ${METRIC_VALUE[tone]}`}>{value}</div>
      <div className="flex items-center gap-2 mt-1 min-h-[16px]">
        {hint && <span className="text-[11px] text-slate-500 truncate">{hint}</span>}
        {delta && (
          <span className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ml-auto ${
            delta.value === 0 ? 'text-slate-400' : deltaGood ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            <DeltaIcon size={11} />
            {Math.abs(delta.value)}{delta.suffix ?? '%'}
          </span>
        )}
      </div>
    </motion.div>
  );
};

/* ── Insight ────────────────────────────────────────────────────────────── */

export type InsightLevel = 'critical' | 'warning' | 'info' | 'success';

const INSIGHT_STYLE: Record<InsightLevel, { box: string; icon: React.ReactNode }> = {
  critical: { box: 'bg-rose-50 border-rose-200 text-rose-900',      icon: <XCircle size={16} className="text-rose-600" /> },
  warning:  { box: 'bg-amber-50 border-amber-200 text-amber-900',   icon: <AlertTriangle size={16} className="text-amber-600" /> },
  info:     { box: 'bg-sky-50 border-sky-200 text-sky-900',         icon: <Info size={16} className="text-sky-600" /> },
  success:  { box: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: <CheckCircle2 size={16} className="text-emerald-600" /> },
};

/**
 * A thing the operator should know, and — crucially — what to do about it.
 *
 * An observation with no next step is noise. `action` is not optional in
 * spirit: if there is nothing to do, the insight probably should not be shown.
 */
export const Insight: React.FC<{
  level: InsightLevel; title: string; detail?: string;
  action?: { label: string; onClick: () => void };
  testId?: string;
}> = ({ level, title, detail, action, testId }) => {
  const s = INSIGHT_STYLE[level];
  return (
    <div
      data-testid={testId ?? 'insight'}
      data-level={level}
      className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${s.box}`}
    >
      <span className="shrink-0 mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {detail && <p className="text-xs mt-0.5 opacity-80">{detail}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="shrink-0 text-xs font-bold underline underline-offset-2 hover:no-underline whitespace-nowrap"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

/** A stack of insights, hidden entirely when there is nothing worth saying. */
export const InsightList: React.FC<{ children: React.ReactNode; testId?: string }> = ({ children, testId }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return <div data-testid={testId ?? 'insights'} className="space-y-2">{items}</div>;
};

/* ── Table ──────────────────────────────────────────────────────────────── */

export interface Column<T> {
  key: string;
  header: string;
  /** Tailwind width/alignment for the cell, e.g. "w-32 text-right". */
  className?: string;
  render: (row: T) => React.ReactNode;
}

/**
 * One table for the whole portal.
 *
 * Takes loading / error / empty explicitly rather than inferring them from an
 * empty array — the three look identical to `rows.length === 0` and mean
 * completely different things to whoever is on call.
 */
export function DataTable<T>({
  columns, rows, keyOf, loading, error, onRetry, empty, onRowClick, testId, footer,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: { title: string; message?: string; icon?: React.ReactNode; action?: React.ReactNode };
  onRowClick?: (row: T) => void;
  testId?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto" data-testid={testId}>
      {loading ? (
        <Skeleton rows={5} />
      ) : error ? (
        <ErrorState {...(onRetry ? { onRetry } : {})} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={empty?.title ?? 'Nothing here yet'}
          {...(empty?.message ? { message: empty.message } : {})}
          {...(empty?.icon ? { icon: empty.icon } : {})}
          {...(empty?.action ? { action: empty.action } : {})}
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap ${c.className ?? ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => (
              <tr
                key={keyOf(row)}
                data-testid="table-row"
                {...(onRowClick ? { onClick: () => onRowClick(row) } : {})}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-2.5 text-slate-700 ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {footer && !loading && rows.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500">{footer}</div>
      )}
    </div>
  );
}

/* ── Misc ───────────────────────────────────────────────────────────────── */

export const Toolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>
);

/** Label + value, for the read-only detail grids that appear on every tab. */
export const Detail: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label, children, className = '',
}) => (
  <div className={className}>
    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
    <dd className="text-sm text-slate-800 mt-0.5 break-words">{children}</dd>
  </div>
);

/** A bar with the value written on it — a percentage nobody has to hover to read. */
export const Meter: React.FC<{
  value: number; max?: number; tone?: MetricTone; label?: string; className?: string;
}> = ({ value, max = 100, tone = 'default', label, className = '' }) => {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const bar = tone === 'bad' ? 'bg-rose-500' : tone === 'warn' ? 'bg-amber-500'
    : tone === 'good' ? 'bg-emerald-500' : 'bg-emerald-500';
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
          <span>{label}</span><span className="tabular-nums">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

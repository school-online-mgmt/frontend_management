import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Plus, ChevronRight, CheckCircle2,
  Send, X, Lightbulb, ArrowLeft, LifeBuoy,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";

// ── Types ────────────────────────────────────────────────────────────────────
interface Ticket {
  id: string; ticketNumber: string; type: string; category: string;
  priority: string; status: string; subject: string; description: string;
  createdByName: string; lastActivityAt: string; createdAt: string;
  resolvedAt?: string | null;
}
interface Reply {
  id: string; authorType: string; authorName: string;
  message: string; createdAt: string; isInternal: boolean;
}
interface FeatureRequest {
  id: string; title: string; description: string; category: string;
  status: string; createdByName: string; createdAt: string; adminNotes?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  open:          { bg: "bg-blue-50",   text: "text-blue-700",   label: "Open" },
  in_progress:   { bg: "bg-violet-50", text: "text-violet-700", label: "In Progress" },
  waiting_reply: { bg: "bg-amber-50",  text: "text-amber-700",  label: "Waiting for Reply" },
  resolved:      { bg: "bg-emerald-50",text: "text-emerald-700",label: "Resolved" },
  closed:        { bg: "bg-slate-100", text: "text-slate-500",  label: "Closed" },
};
const PRIORITY_MAP: Record<string, { text: string; label: string }> = {
  low:      { text: "text-slate-500",  label: "Low" },
  medium:   { text: "text-amber-600",  label: "Medium" },
  high:     { text: "text-orange-600", label: "High" },
  critical: { text: "text-red-600",    label: "Critical" },
};
const FR_STATUS_MAP: Record<string, { bg: string; text: string }> = {
  submitted:       { bg: "bg-blue-50 text-blue-700",     text: "Submitted" },
  under_review:    { bg: "bg-amber-50 text-amber-700",   text: "Under Review" },
  planned:         { bg: "bg-violet-50 text-violet-700", text: "Planned" },
  in_development:  { bg: "bg-indigo-50 text-indigo-700", text: "In Development" },
  shipped:         { bg: "bg-emerald-50 text-emerald-700", text: "Shipped 🎉" },
  declined:        { bg: "bg-slate-100 text-slate-500",  text: "Declined" },
};

const relTime = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// ── Ticket List View ──────────────────────────────────────────────────────────
function TicketList({ onSelect, onCreate }: { onSelect: (t: Ticket) => void; onCreate: () => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.getSupportTickets().then(d => setTickets(d.tickets ?? [])).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const counts = { open: tickets.filter(t => t.status === 'open').length, in_progress: tickets.filter(t => t.status === 'in_progress').length, waiting_reply: tickets.filter(t => t.status === 'waiting_reply').length };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">My Support Tickets</h2>
          <p className="text-sm text-slate-500 mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { key: "all", label: `All (${tickets.length})` },
          { key: "open", label: `Open (${counts.open})` },
          { key: "in_progress", label: `In Progress (${counts.in_progress})` },
          { key: "waiting_reply", label: `Waiting Reply (${counts.waiting_reply})` },
          { key: "resolved", label: "Resolved" },
          { key: "closed", label: "Closed" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors
              ${filter === key ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:text-slate-700 bg-white border border-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <MessageSquare size={40} className="text-slate-200 mb-3" />
          <p className="font-medium">{filter === 'all' ? 'No tickets yet' : `No ${filter} tickets`}</p>
          {filter === 'all' && <p className="text-sm mt-1 mb-4">Create a ticket if you need help from our team</p>}
          {filter === 'all' && (
            <button onClick={onCreate} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl">
              Create First Ticket
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => {
            const st = STATUS_MAP[ticket.status] ?? STATUS_MAP.open;
            const pr = PRIORITY_MAP[ticket.priority] ?? PRIORITY_MAP.medium;
            return (
              <button key={ticket.id} onClick={() => onSelect(ticket)}
                className="w-full text-left bg-white border border-slate-200 hover:border-violet-200 hover:shadow-sm rounded-2xl px-5 py-4 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono font-semibold text-slate-400">{ticket.ticketNumber}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                      <span className={`text-[10px] font-semibold ${pr.text}`}>{pr.label} priority</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-violet-700 transition-colors">{ticket.subject}</p>
                    <p className="text-xs text-slate-400 mt-1">{ticket.category} · Updated {relTime(ticket.lastActivityAt)}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-violet-400 shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Create Ticket Form ────────────────────────────────────────────────────────
function CreateTicketForm({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("support");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return setError("Subject and description are required.");
    setLoading(true); setError(null);
    try {
      await api.createSupportTicket({ subject, description, type, category, priority });
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to Tickets
      </button>
      <h2 className="text-base font-bold text-slate-900 mb-5">Create Support Ticket</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30 bg-white">
              <option value="support">Support</option>
              <option value="bug">Bug Report</option>
              <option value="billing">Billing</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30 bg-white">
              <option value="general">General</option>
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="feature">Feature</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30 bg-white">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Subject *</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required
            placeholder="Brief summary of your issue..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30" />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Description *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={6}
            placeholder="Describe your issue in detail. Include steps to reproduce if it's a bug..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30 resize-none" />
        </div>

        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onBack}
            className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-2 flex-1 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-50">
            {loading ? "Creating..." : "Submit Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Ticket Detail + Thread ────────────────────────────────────────────────────
function TicketDetail({ ticket: initialTicket, onBack }: { ticket: Ticket; onBack: () => void }) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => {
    api.getSupportTicket(ticket.id).then(d => {
      setTicket(d.ticket);
      setReplies(d.replies ?? []);
    }).finally(() => setLoading(false));
  }, [ticket.id]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      await api.replyToTicket(ticket.id, reply.trim());
      setReply("");
      load();
    } finally { setSending(false); }
  };

  const closeTicket = async () => {
    setClosing(true);
    try {
      await api.closeTicket(ticket.id);
      load();
    } finally { setClosing(false); }
  };

  const st = STATUS_MAP[ticket.status] ?? STATUS_MAP.open;
  const pr = PRIORITY_MAP[ticket.priority] ?? PRIORITY_MAP.medium;
  const canReply = ticket.status !== 'closed';

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to Tickets
      </button>

      {/* Ticket header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono font-semibold text-slate-400">{ticket.ticketNumber}</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
              <span className={`text-xs font-semibold ${pr.text}`}>{pr.label}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">{ticket.subject}</h2>
            <p className="text-xs text-slate-400 mt-1.5">
              Opened by {ticket.createdByName} · {new Date(ticket.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              {ticket.resolvedAt && ` · Resolved ${relTime(ticket.resolvedAt)}`}
            </p>
          </div>
          {canReply && (
            <button onClick={closeTicket} disabled={closing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0">
              <CheckCircle2 size={13} /> {closing ? "Closing..." : "Close Ticket"}
            </button>
          )}
        </div>
      </div>

      {/* Thread */}
      {loading ? (
        <div className="space-y-3 mb-4">
          {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {replies.map((r) => {
            const isSupport = r.authorType === 'superadmin';
            return (
              <div key={r.id} className={`rounded-2xl p-4 ${isSupport ? 'bg-violet-50 border border-violet-100 ml-4' : 'bg-white border border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isSupport ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {r.authorName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">{r.authorName}</span>
                    {isSupport && <span className="ml-1.5 text-[9px] font-semibold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">EduPilots Support</span>}
                  </div>
                  <span className="ml-auto text-[10px] text-slate-400">{relTime(r.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{r.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply box */}
      {canReply ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={4}
            placeholder="Type your reply here..."
            className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 mb-3"
          />
          <div className="flex justify-end">
            <button onClick={sendReply} disabled={!reply.trim() || sending}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
              <Send size={15} /> {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-sm text-slate-400">
          This ticket is closed. <button onClick={onBack} className="text-violet-600 hover:underline">Create a new ticket</button> if you need further help.
        </div>
      )}
    </div>
  );
}

// ── Feature Requests View ─────────────────────────────────────────────────────
function FeatureRequestsView() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.getFeatureRequests().then(d => setRequests(d.requests ?? [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return setError("Title and description are required.");
    setSubmitting(true); setError(null);
    try {
      await api.createFeatureRequest({ title, description, category });
      setTitle(""); setDescription(""); setCategory("general");
      setShowForm(false); setSuccess(true);
      load();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to submit.");
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Feature Requests</h2>
          <p className="text-sm text-slate-500 mt-0.5">Suggest improvements to make EduPilots better for your school</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
          <Plus size={16} /> Request Feature
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={16} /> Feature request submitted! Our team will review it soon.
        </div>
      )}

      {/* Submit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-violet-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">New Feature Request</h3>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30">
                <option value="general">General</option>
                <option value="ui">UI / Experience</option>
                <option value="performance">Performance</option>
                <option value="integration">Integration</option>
                <option value="reporting">Reporting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Feature Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="Brief title of the feature..."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4}
                placeholder="Describe the feature and how it would help your school..."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/30 resize-none" />
            </div>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Lightbulb size={40} className="text-slate-200 mb-3" />
          <p className="font-medium">No feature requests yet</p>
          <p className="text-sm mt-1">Share your ideas to help us improve EduPilots</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const st = FR_STATUS_MAP[req.status] ?? FR_STATUS_MAP.submitted;
            return (
              <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 border border-amber-100">
                    <Lightbulb size={16} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{req.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg}`}>{st.text}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2">{req.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="capitalize">{req.category}</span>
                      <span>·</span>
                      <span>Submitted {relTime(req.createdAt)}</span>
                    </div>
                    {req.adminNotes && (
                      <div className="mt-3 p-3 bg-violet-50 border border-violet-100 rounded-xl">
                        <p className="text-[10px] font-bold text-violet-600 mb-1">EduPilots Team Response:</p>
                        <p className="text-xs text-slate-600">{req.adminNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Support Center ────────────────────────────────────────────────────────
export default function SupportCenter() {
  const [activeTab, setActiveTab] = useState<"tickets" | "feature-requests">("tickets");
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  // Bumped to force-refetch the active list when the user clicks the
  // header refresh button. We pass the key into TicketList /
  // FeatureRequestsView via React's standard `key` prop so the
  // component remounts and re-fires its initial fetch.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-full bg-slate-50">
      <PageHeader
        icon={LifeBuoy}
        title="Support Center"
        subtitle="Get help from the EduPilots team or share your ideas"
        gradient={MODULE_THEMES.communication}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        primaryActions={
          view === "list" ? (
            <button
              onClick={() => activeTab === "tickets" ? setView("create") : setActiveTab("feature-requests")}
              data-testid="support-quick-action"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 transition backdrop-blur-sm shrink-0"
            >
              <Plus size={14} /> {activeTab === "tickets" ? "New Ticket" : "Feature Requests"}
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
        {/* Info banner — positioned right below the header so the user
            sees the SLA promise before scrolling further. */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3 shadow-sm">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <MessageSquare size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">How our support works</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Create a ticket and our team will respond within 4 business hours. For urgent issues, mark the priority as <strong>Critical</strong>.
              You can also email us directly at <a href="mailto:hello@edupilots.in" className="underline font-semibold">hello@edupilots.in</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Tabbed section — only used when in list view; the create /
          detail flows take over the full page so the user focuses on
          the form. */}
      {view === "list" ? (
        <TabbedSection
          idPrefix="support"
          ariaLabel="Support sections"
          theme="amber"
          flushPanel
          value={activeTab}
          onChange={(k) => setActiveTab(k as typeof activeTab)}
          tabs={[
            { key: "tickets",          label: "Support Tickets",  icon: MessageSquare },
            { key: "feature-requests", label: "Feature Requests", icon: Lightbulb },
          ]}
        >
          <TabPanel tabKey="tickets">
            <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
              <TicketList key={`tickets-${refreshKey}`}
                onSelect={t => { setSelectedTicket(t); setView("detail"); }}
                onCreate={() => setView("create")} />
            </div>
          </TabPanel>
          <TabPanel tabKey="feature-requests">
            <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
              <FeatureRequestsView key={`features-${refreshKey}`} />
            </div>
          </TabPanel>
        </TabbedSection>
      ) : (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {view === "create" && (
            <CreateTicketForm onBack={() => setView("list")} onCreated={() => setView("list")} />
          )}
          {view === "detail" && selectedTicket && (
            <TicketDetail ticket={selectedTicket} onBack={() => { setView("list"); setSelectedTicket(null); }} />
          )}
        </div>
      )}
    </div>
  );
}


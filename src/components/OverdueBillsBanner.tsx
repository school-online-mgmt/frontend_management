import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";
import api from "../api/api";
import { useAuthContext } from "../context/AuthContext";

/**
 * Sticky top-of-page banner that appears when any platform bill is overdue.
 *
 * Polls the lightweight overdue-summary endpoint every 5 min so the UI
 * reflects payments made in another tab or by a colleague.
 *
 * Dismissable per session (sessionStorage) — the banner re-appears on the
 * next login so nothing gets silently ignored. If the tenant fully clears
 * their overdue balance, the banner disappears until a new invoice ages out.
 */
const OverdueBillsBanner = () => {
    const { isAuthenticated, user } = useAuthContext();
    const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("overdueBannerDismissed") === "1");

    // Platform bills are ADMIN-only — only the school's single admin sees this
    // alert and can view/pay the bills.
    const isAdmin = user?.role === "ADMIN";

    const q = useQuery({
        queryKey: ["platform-bills-overdue"],
        queryFn: () => api.getPlatformBillsOverdueSummary(),
        enabled: !!isAuthenticated && !!user && isAdmin,
        refetchInterval: 5 * 60 * 1000,
        staleTime: 60 * 1000,
    });

    if (!isAuthenticated || !isAdmin || dismissed || !q.data || q.data.count === 0) return null;

    const dismiss = () => {
        sessionStorage.setItem("overdueBannerDismissed", "1");
        setDismissed(true);
    };

    return (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5">
            <div className="max-w-7xl mx-auto flex items-center gap-3">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-rose-900">
                        <strong>{q.data.count} platform {q.data.count === 1 ? "invoice is" : "invoices are"} overdue</strong>
                        <span className="text-rose-700"> — ₹{q.data.totalAmountINR.toLocaleString("en-IN")} outstanding.</span>
                        <Link to="/platform-bills" className="ml-2 underline font-semibold hover:text-rose-950">
                            View &amp; pay
                        </Link>
                    </p>
                </div>
                <button onClick={dismiss} className="text-rose-500 hover:text-rose-700 shrink-0" title="Dismiss">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default OverdueBillsBanner;

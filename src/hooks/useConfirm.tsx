import { useCallback, useState } from "react";
import ConfirmModal from "../components/common/ConfirmModal";

interface ConfirmRequest {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => Promise<void> | void;
}

interface ConfirmState extends ConfirmRequest {
    loading: boolean;
}

/**
 * Lightweight replacement for native `window.confirm()` — returns a `confirm(req)` function
 * and a `dialog` node to render. The dialog runs the async `onConfirm` with a loading state
 * and auto-dismisses on success; if `onConfirm` throws, the dialog stays open so the caller
 * can surface a toast and the user can retry.
 *
 *   const { confirm, dialog } = useConfirm();
 *   // …
 *   const handleDelete = () => confirm({
 *     title: "Delete this invoice?",
 *     message: "Students will lose access immediately.",
 *     confirmText: "Delete",
 *     onConfirm: async () => { await api.deleteInvoice(id); await reload(); },
 *   });
 *   return <>{dialog}{…}</>;
 */
export const useConfirm = () => {
    const [state, setState] = useState<ConfirmState | null>(null);

    const confirm = useCallback((req: ConfirmRequest) => {
        setState({ ...req, loading: false });
    }, []);

    const close = useCallback(() => {
        setState((prev) => (prev?.loading ? prev : null));
    }, []);

    const runConfirm = useCallback(async () => {
        if (!state) return;
        setState({ ...state, loading: true });
        try {
            await state.onConfirm();
            setState(null);
        } catch {
            // Leave the dialog open so the caller can show a toast and the user can retry.
            setState((prev) => (prev ? { ...prev, loading: false } : null));
        }
    }, [state]);

    const dialog = state ? (
        <ConfirmModal
            title={state.title}
            message={state.message ?? ""}
            confirmText={state.confirmText ?? "Confirm"}
            cancelText={state.cancelText ?? "Cancel"}
            loading={state.loading}
            onConfirm={runConfirm}
            onCancel={close}
        />
    ) : null;

    return { confirm, dialog };
};

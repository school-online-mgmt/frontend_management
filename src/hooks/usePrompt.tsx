import { useCallback, useState } from "react";
import ConfirmModal from "../components/common/ConfirmModal";

interface PromptRequest {
    title: string;
    /** Helper text under the title. */
    message?: string;
    /** Label rendered above the field. */
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    /** Render a textarea instead of a single-line input. */
    multiline?: boolean;
    /**
     * Return an error string to block submission, or null to accept.
     * Runs on submit, so the message appears next to the field the user is
     * looking at rather than as a toast after the dialog has closed.
     */
    validate?: (value: string) => string | null;
    onSubmit: (value: string) => Promise<void> | void;
}

interface PromptState extends PromptRequest {
    value: string;
    error: string | null;
    loading: boolean;
}

/**
 * Replacement for native `window.prompt()`, matching {@link useConfirm}.
 *
 * Native prompts are unstyleable, sit outside the React tree, are suppressed
 * entirely in some embedded browsers, and cannot express validation — the old
 * code had to accept whatever string came back and then fire a toast after the
 * fact. Here `validate` runs before `onSubmit`, so a bad value never reaches
 * the API and the message renders against the field.
 *
 *   const { prompt, dialog } = usePrompt();
 *   prompt({
 *     title: `Add stock for "${item.name}"`,
 *     defaultValue: "10",
 *     validate: v => Number.isInteger(Number(v)) && Number(v) > 0 ? null : "Enter a whole positive number.",
 *     onSubmit: async v => { await api.restock(item.id, Number(v)); refresh(); },
 *   });
 *   return <>{dialog}{…}</>;
 */
export const usePrompt = () => {
    const [state, setState] = useState<PromptState | null>(null);

    const prompt = useCallback((req: PromptRequest) => {
        setState({ ...req, value: req.defaultValue ?? "", error: null, loading: false });
    }, []);

    const close = useCallback(() => {
        setState((prev) => (prev?.loading ? prev : null));
    }, []);

    const submit = useCallback(async () => {
        if (!state) return;
        const error = state.validate ? state.validate(state.value) : null;
        if (error) {
            setState({ ...state, error });
            return;
        }
        setState({ ...state, loading: true, error: null });
        try {
            await state.onSubmit(state.value);
            setState(null);
        } catch {
            // Keep the dialog open so the caller can toast and the user retry.
            setState((prev) => (prev ? { ...prev, loading: false } : null));
        }
    }, [state]);

    const dialog = state ? (
        <ConfirmModal
            title={state.title}
            message={state.error ?? state.message ?? ""}
            confirmText={state.confirmText ?? "Save"}
            cancelText={state.cancelText ?? "Cancel"}
            loading={state.loading}
            onConfirm={submit}
            onCancel={close}
        >
            <label className="block text-sm">
                {state.label && <span className="mb-1 block font-medium text-slate-700">{state.label}</span>}
                {state.multiline ? (
                    <textarea
                        data-testid="prompt-input"
                        autoFocus
                        rows={3}
                        value={state.value}
                        placeholder={state.placeholder}
                        disabled={state.loading}
                        onChange={(e) => setState((prev) => (prev ? { ...prev, value: e.target.value, error: null } : prev))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                    />
                ) : (
                    <input
                        data-testid="prompt-input"
                        autoFocus
                        value={state.value}
                        placeholder={state.placeholder}
                        disabled={state.loading}
                        onChange={(e) => setState((prev) => (prev ? { ...prev, value: e.target.value, error: null } : prev))}
                        onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                    />
                )}
            </label>
        </ConfirmModal>
    ) : null;

    return { prompt, dialog };
};

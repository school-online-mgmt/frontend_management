import React from "react";

type ConfirmModalProps = {
    title: string;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    children?: React.ReactNode;
};

const ConfirmModal =
    ({
          title,
          confirmText = "Confirm",
          cancelText = "Cancel",
          loading = false,
          onConfirm,
          onCancel,
        children
      }: ConfirmModalProps) => {

    return (
        <div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            onClick={loading ? undefined : onCancel}
        >
            <div
                className="bg-white rounded-xl w-[440px] p-6 space-y-4 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold">
                    {title}
                </h2>
                {children && (
                    <div className="space-y-3 pt-2">{children}</div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        disabled={loading}
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        disabled={loading}
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading ? "Processing..." : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
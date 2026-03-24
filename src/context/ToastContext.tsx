import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    description?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType, description?: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; bgColor: string; borderColor: string; textColor: string }> = {
    success: {
        icon: <CheckCircle2 size={20} />,
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        textColor: 'text-emerald-800',
    },
    error: {
        icon: <AlertCircle size={20} />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
    },
    warning: {
        icon: <AlertCircle size={20} />,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
    },
    info: {
        icon: <Info size={20} />,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
    },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info', description?: string, duration: number = 5000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = { id, type, message, description, duration };

        setToasts(prev => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-4 right-4 z-[9999] space-y-3 max-w-sm pointer-events-none">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
    const config = TOAST_CONFIG[toast.type];

    return (
        <div
            className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-right-5 duration-200 pointer-events-auto`}
        >
            <div className={config.textColor}>{config.icon}</div>
            <div className="flex-1 min-w-0">
                <p className={`${config.textColor} font-semibold`}>{toast.message}</p>
                {toast.description && (
                    <p className={`${config.textColor} text-sm opacity-90 mt-1`}>{toast.description}</p>
                )}
            </div>
            <button
                onClick={onClose}
                className={`${config.textColor} hover:opacity-70 transition flex-shrink-0 mt-0.5`}
            >
                <X size={18} />
            </button>
        </div>
    );
};


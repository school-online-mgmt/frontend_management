import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo,
        });
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-8">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-slate-600 text-center mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page or contact support.
                        </p>

                        {import.meta.env.MODE === 'development' && this.state.error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm font-mono overflow-auto max-h-40">
                                <p className="text-red-800 whitespace-pre-wrap">{this.state.error.toString()}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                            >
                                Go Home
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

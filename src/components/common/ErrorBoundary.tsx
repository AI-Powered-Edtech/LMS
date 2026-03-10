import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error at UI Level:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] bg-slate-50 rounded-2xl border border-red-100 h-full w-full">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-500 border border-red-200">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Konten Gagal Dimuat</h2>
                    <p className="text-slate-500 mb-6 max-w-sm">Materi ini mengalami masalah teknis. Coba muat ulang halaman atau pilih pelajaran lain.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium rounded-xl transition-all"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Muat Ulang Halaman
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

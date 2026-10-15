import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Zhafx ErrorBoundary caught]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0C14] text-[#F2F4FB] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF5C6C]/10 border border-[#FF5C6C]/30 text-[#FF5C6C] flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Terjadi Gangguan pada Halaman</h1>
          <p className="text-sm text-[#98A2C3] max-w-md mb-6 leading-relaxed">
            Aplikasi mengalami kendala teknis saat memuat tampilan. Silakan coba segarkan kembali halaman.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all cursor-pointer"
          >
            <RefreshCcw className="w-4 h-4" />
            Muat ulang aplikasi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

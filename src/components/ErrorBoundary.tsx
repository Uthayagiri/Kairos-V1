import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackScreen?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Kairos ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackScreen) {
        return this.props.fallbackScreen;
      }

      return (
        <div className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-surface text-on-surface text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-error-container/30 border border-error/30 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-3xl">error_outline</span>
          </div>
          <div className="space-y-1 max-w-xs">
            <h2 className="text-lg font-bold text-on-surface">Something interrupted Kairos</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {this.state.error?.message || 'A visual error occurred. Tap below to reload your space safely.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            Reload Kairos
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

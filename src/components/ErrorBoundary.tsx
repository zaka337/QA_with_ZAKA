import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="font-eb-garamond text-3xl mb-4">Something went wrong</h1>
            <p className="text-white/60 font-inter font-light mb-8">
              This page hit an unexpected error. Reloading usually fixes it — if it keeps
              happening, let us know what you were doing.
            </p>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.href = '/';
              }}
              className="px-6 py-3 bg-white text-black font-geist text-sm uppercase tracking-widest hover:bg-neutral-200 transition-colors"
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

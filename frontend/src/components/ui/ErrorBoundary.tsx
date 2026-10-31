'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('[AgentForge ErrorBoundary]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[280px] p-6 flex flex-col items-center justify-center text-center rounded-lg border border-rose-900/50 bg-rose-950/20 text-slate-100 my-4">
          <div className="w-10 h-10 rounded-md bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 mb-3">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-base text-slate-100 tracking-tight">
            Component Execution Crash
          </h3>
          <p className="text-xs text-rose-300 font-mono mt-1.5 max-w-md bg-slate-950/80 p-2.5 rounded border border-rose-950/80 break-words">
            {this.state.error?.message || 'An unhandled render exception occurred.'}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="workbench"
              size="sm"
              icon={RefreshCw}
              onClick={this.handleReset}
            >
              Reload View
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

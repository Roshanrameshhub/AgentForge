'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected frontend route exception
    console.error('[AgentForge Route Crash caught by error.tsx]:', error);
  }, [error]);

  const isAuthIssue = error.message?.toLowerCase().includes('401') ||
    error.message?.toLowerCase().includes('unauthorized') ||
    error.message?.toLowerCase().includes('token');

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-6 shadow-xl shadow-rose-950/40 animate-pulse">
        {isAuthIssue ? <ShieldAlert className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs font-mono mb-3">
        <span>RUNTIME EXECUTION EXCEPTION</span>
        {error.digest && <span className="text-slate-500">[{error.digest}]</span>}
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
        {isAuthIssue ? 'Session Authorization Failure' : 'Subsystem Render Interrupted'}
      </h1>

      <p className="text-sm text-slate-400 max-w-md mb-6 font-mono leading-relaxed">
        {isAuthIssue
          ? 'Your access token has expired or credentials could not be verified by the FastAPI security middleware.'
          : error.message || 'An unexpected state occurred while rendering this interface.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="primary"
          onClick={() => reset()}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Retry Route Render
        </Button>

        {isAuthIssue ? (
          <Link href="/login">
            <Button variant="workbench" leftIcon={<ShieldAlert className="w-4 h-4" />}>
              Re-Authenticate
            </Button>
          </Link>
        ) : (
          <Link href="/dashboard">
            <Button variant="workbench" leftIcon={<Home className="w-4 h-4" />}>
              Return to Mission Control
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-850 text-xs font-mono text-slate-400 max-w-lg text-left">
        <div className="text-slate-400 font-semibold mb-1">Diagnostic Details:</div>
        <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-[11px] overflow-x-auto text-rose-300/90 whitespace-pre-wrap">
          {error.stack || error.message || 'No stack trace available.'}
        </div>
      </div>
    </div>
  );
}

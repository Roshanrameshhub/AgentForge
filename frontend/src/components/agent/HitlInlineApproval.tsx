'use client';

import React, { useState } from 'react';
import { ShieldAlert, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { agentApiClient } from '@/lib/api/client';
import { useToast } from '@/lib/context/ToastContext';

interface HitlInlineApprovalProps {
  threadId: string;
  query: string;
  onDecision: (decision: 'approved' | 'rejected') => void;
  disabled?: boolean;
}

export function HitlInlineApproval({
  threadId,
  query,
  onDecision,
  disabled = false,
}: HitlInlineApprovalProps) {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [decided, setDecided] = useState<'approved' | 'rejected' | null>(null);

  const handleAction = async (decision: 'approved' | 'rejected') => {
    if (disabled || submitting || decided) return;
    setSubmitting(true);
    try {
      await agentApiClient.recordHitlDecision({
        user_id: 'active-user',
        thread_id: threadId,
        query: query || 'Web Search Query',
        decision,
        reason: decision === 'approved' ? 'User approved web search generation' : 'User rejected web search',
      });
      setDecided(decision);
      addToast({
        title: decision === 'approved' ? 'Search Approved' : 'Search Rejected',
        message: `Web synthesis was ${decision}. Continuing multi-agent pipeline.`,
        type: decision === 'approved' ? 'success' : 'warning',
      });
      onDecision(decision);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record decision';
      addToast({
        title: 'Decision Error',
        message: msg,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="my-3 p-4 rounded-lg border border-amber-500/40 bg-amber-950/20 shadow-md shadow-amber-950/20 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-amber-800/30">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-xs text-amber-200 tracking-tight">
            Human-in-the-Loop Governance Gate
          </span>
        </div>
        <Badge variant="warning" dot>
          ACTION REQUIRED
        </Badge>
      </div>

      <div className="py-2.5 text-xs text-slate-300 font-sans leading-relaxed space-y-1.5">
        <p>
          The multi-agent supervisor has evaluated this query against live recency criteria and requires human authorization before executing external web synthesis.
        </p>
        {query && (
          <div className="flex items-center gap-2 p-2 rounded bg-slate-950/80 border border-slate-800 font-mono text-[11px] text-slate-300">
            <Search className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">Target: {query}</span>
          </div>
        )}
      </div>

      <div className="pt-2 flex items-center justify-end gap-2.5">
        {decided ? (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Decision recorded:</span>
            <Badge variant={decided === 'approved' ? 'success' : 'error'}>
              {decided.toUpperCase()}
            </Badge>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || submitting}
              onClick={() => handleAction('rejected')}
              leftIcon={<X className="w-3.5 h-3.5 text-rose-400" />}
            >
              Reject Web Search
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submitting}
              disabled={disabled}
              onClick={() => handleAction('approved')}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Approve & Synthesize
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

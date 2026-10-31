'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckSquare,
  ShieldAlert,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Search,
  Globe,
  History,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { HitlEvent, StoredMessageRecord } from '@/lib/types/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/lib/context/ToastContext';

interface PendingRequest {
  threadId: string;
  query: string;
  recencyDays: number;
  previewEntries: { title: string; url: string; date?: string; snippet?: string }[];
  requestingAgent: string;
  timestamp: string;
  sourceMeta: string;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  // State: Historical Audit Trail
  const [events, setEvents] = useState<HitlEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [auditFilter, setAuditFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [auditSearch, setAuditSearch] = useState('');

  // State: Active Pending Queue
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(true);
  const [selectedPendingIndex, setSelectedPendingIndex] = useState<number>(0);

  // State: Dialog Modals
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load audit trail from GET /hitl/web_decisions
  const loadAuditHistory = useCallback(async () => {
    try {
      const res = await apiClient.listHitlDecisions(50);
      setEvents(res.events || []);
    } catch {
      // Backend may return 401 or empty if not yet initialized
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  // Inspect durable threads for pending web_hitl_gate_agent requests
  const scanPendingThreads = useCallback(async () => {
    try {
      const threadsRes = await apiClient.listThreads(30);
      const threads = threadsRes.threads || [];
      const pendingFound: PendingRequest[] = [];

      for (const t of threads) {
        const preview = (t.last_message_preview || '').toLowerCase();
        const isCandidate =
          preview.includes('hitl') ||
          preview.includes('pending') ||
          preview.includes('approve') ||
          preview.includes('reject');

        if (isCandidate) {
          try {
            const history = await apiClient.getThreadHistory(t.thread_id, 10);
            const msgs = history.messages || [];
            const lastAssistant = msgs.filter((m: StoredMessageRecord) => m.role === 'assistant' || m.role === 'ai').pop();

            if (lastAssistant && (lastAssistant.content.includes('web_hitl') || lastAssistant.content.includes('pending') || lastAssistant.content.includes('Approve/Reject'))) {
              // Parse entries from preview prompt
              const queryMatch = lastAssistant.content.match(/Query:\s*([^\n\r]+)/i);
              const recencyMatch = lastAssistant.content.match(/(\d+)\s*days?/i);

              pendingFound.push({
                threadId: t.thread_id,
                query: queryMatch ? queryMatch[1].trim() : 'Live web intelligence retrieval',
                recencyDays: recencyMatch ? parseInt(recencyMatch[1], 10) : 7,
                requestingAgent: 'web_hitl_gate_agent',
                timestamp: lastAssistant.created_at || t.last_message_at,
                sourceMeta: 'FastMCP Web Search Gate',
                previewEntries: [
                  {
                    title: 'Live search results awaiting human gate authorization',
                    url: 'https://news.ycombinator.com',
                    snippet: 'Candidate web entries parsed by recency guard ready for synthesis if approved.',
                  },
                ],
              });
            }
          } catch {
            // Skip thread on history fetch error
          }
        }
      }

      setPendingRequests(pendingFound);
    } catch {
      setPendingRequests([]);
    } finally {
      setIsLoadingPending(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let isCancelled = false;
    const init = async () => {
      try {
        const [auditRes, threadsRes] = await Promise.allSettled([
          apiClient.listHitlDecisions(50),
          apiClient.listThreads(30),
        ]);

        if (!isCancelled) {
          if (auditRes.status === 'fulfilled') {
            setEvents(auditRes.value.events || []);
          }
          if (threadsRes.status === 'fulfilled') {
            const threads = threadsRes.value.threads || [];
            const pendingFound: PendingRequest[] = [];

            for (const t of threads) {
              const preview = (t.last_message_preview || '').toLowerCase();
              if (preview.includes('hitl') || preview.includes('pending') || preview.includes('approve')) {
                pendingFound.push({
                  threadId: t.thread_id,
                  query: preview.slice(0, 80),
                  recencyDays: 7,
                  requestingAgent: 'web_hitl_gate_agent',
                  timestamp: t.last_message_at,
                  sourceMeta: 'FastMCP Web Search Gate',
                  previewEntries: [
                    {
                      title: 'Live web candidate preview awaiting authorization',
                      url: 'https://news.ycombinator.com',
                      snippet: 'Gate inspection required before external network retrieval completes.',
                    },
                  ],
                });
              }
            }
            setPendingRequests(pendingFound);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (!isCancelled) {
          setIsLoadingEvents(false);
          setIsLoadingPending(false);
        }
      }
    };
    init();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Filtered audit events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch =
        ev.query.toLowerCase().includes(auditSearch.toLowerCase()) ||
        ev.thread_id.toLowerCase().includes(auditSearch.toLowerCase()) ||
        ev.reason.toLowerCase().includes(auditSearch.toLowerCase());

      if (!matchesSearch) return false;
      if (auditFilter === 'approved') return ev.decision === 'approved';
      if (auditFilter === 'rejected') return ev.decision === 'rejected';
      return true;
    });
  }, [events, auditFilter, auditSearch]);

  // Telemetry KPIs
  const totalApproved = useMemo(() => events.filter((e) => e.decision === 'approved').length, [events]);
  const totalRejected = useMemo(() => events.filter((e) => e.decision === 'rejected').length, [events]);
  const approvalRate = useMemo(() => {
    const total = totalApproved + totalRejected;
    return total > 0 ? Math.round((totalApproved / total) * 100) : 100;
  }, [totalApproved, totalRejected]);

  // Active selected request
  const currentPending = pendingRequests[selectedPendingIndex] || null;

  // Handle Approve Decision
  const handleApprove = async () => {
    if (!currentPending) return;
    setIsSubmitting(true);
    try {
      // 1. Record decision in backend audit store
      await apiClient.recordHitlDecision({
        thread_id: currentPending.threadId,
        query: currentPending.query,
        decision: 'approved',
        action: 'approve',
        recency_days: currentPending.recencyDays,
      });

      // 2. Also send state transition message into thread
      await apiClient.invoke({
        message: 'approve',
        thread_id: currentPending.threadId,
      }).catch(() => null);

      addToast({
        title: 'Gate Approved',
        message: `Web retrieval authorized for thread ${currentPending.threadId}.`,
        type: 'success',
      });

      // Remove from pending list and reload audit history
      setPendingRequests((prev) => prev.filter((_, idx) => idx !== selectedPendingIndex));
      setSelectedPendingIndex(0);
      setApproveDialogOpen(false);
      loadAuditHistory();
    } catch (err) {
      addToast({
        title: 'Approval Submission Failed',
        message: err instanceof Error ? err.message : 'Backend rejected authorization payload.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject Decision
  const handleReject = async () => {
    if (!currentPending) return;
    setIsSubmitting(true);
    const finalReason = rejectReason.trim() || 'Operator rejected retrieval without specific reason';

    try {
      // 1. Record rejection in backend audit store
      await apiClient.recordHitlDecision({
        thread_id: currentPending.threadId,
        query: currentPending.query,
        decision: 'rejected',
        action: 'reject',
        reason: finalReason,
        recency_days: currentPending.recencyDays,
      });

      // 2. Send rejection feedback message into thread
      await apiClient.invoke({
        message: `reject: ${finalReason}`,
        thread_id: currentPending.threadId,
      }).catch(() => null);

      addToast({
        title: 'Gate Rejected',
        message: `Search request rejected with feedback recorded.`,
        type: 'info',
      });

      // Remove from pending list and reload audit history
      setPendingRequests((prev) => prev.filter((_, idx) => idx !== selectedPendingIndex));
      setSelectedPendingIndex(0);
      setRejectDialogOpen(false);
      setRejectReason('');
      loadAuditHistory();
    } catch (err) {
      addToast({
        title: 'Rejection Submission Failed',
        message: err instanceof Error ? err.message : 'Backend rejected decision payload.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-slate-100 font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            Human-in-the-Loop Approval Center
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Supervisory verification gate for agentic web searches and high-impact external actions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              setIsLoadingEvents(true);
              setIsLoadingPending(true);
              loadAuditHistory();
              scanPendingThreads();
            }}
            disabled={isLoadingEvents || isLoadingPending}
            className="text-xs font-mono"
          >
            Refresh
          </Button>
          <Button
            variant="workbench"
            size="sm"
            icon={ExternalLink}
            onClick={() => router.push('/playground')}
            className="text-xs font-mono"
          >
            Agent Playground
          </Button>
        </div>
      </div>

      {/* KPI Telemetry Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Active Gate Queue
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {pendingRequests.length}
            </span>
            <Badge variant={pendingRequests.length > 0 ? 'warning' : 'neutral'} dot={pendingRequests.length > 0}>
              {pendingRequests.length > 0 ? 'Action Needed' : 'Clear'}
            </Badge>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Total Authorized
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {totalApproved}
            </span>
            <Badge variant="success">Verified</Badge>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Operator Rejections
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {totalRejected}
            </span>
            <Badge variant="error">Audited</Badge>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Approval Ratio
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-sky-400">
              {approvalRate}%
            </span>
            <span className="text-[10px] font-mono text-slate-500">All-time</span>
          </div>
        </div>
      </div>

      {/* Active Pending Request Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Pending Authorization Queue ({pendingRequests.length})
        </h2>

        {isLoadingPending ? (
          <div className="p-8 text-center border border-slate-800 rounded-lg bg-slate-950/40 text-xs font-mono text-slate-500 space-y-2">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto text-emerald-400" />
            <span>Scanning thread checkpoints for pending gates…</span>
          </div>
        ) : pendingRequests.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="All Verification Gates Clear"
            description="No active agent executions are currently paused awaiting human review. Trigger a live news or web research query in the Playground to inspect the gate in real time."
            actionLabel="Open Playground"
            onAction={() => router.push('/playground?prompt=Find+latest+autonomous+AI+agent+releases+this+week')}
          />
        ) : (
          <div className="space-y-4">
            {/* Queue Selector if multiple */}
            {pendingRequests.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-mono">
                {pendingRequests.map((req, idx) => (
                  <button
                    key={req.threadId}
                    type="button"
                    onClick={() => setSelectedPendingIndex(idx)}
                    className={`px-3 py-1.5 rounded-md border whitespace-nowrap transition-colors ${
                      selectedPendingIndex === idx
                        ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Gate #{idx + 1}: {req.threadId.slice(0, 8)}…
                  </button>
                ))}
              </div>
            )}

            {currentPending && (
              <Card
                className="border-amber-500/50 bg-slate-925/90 shadow-xl shadow-amber-950/20"
                title={
                  <div className="flex items-center gap-2">
                    <StatusIndicator status="busy" label="Awaiting Operator Decision" />
                    <span className="text-slate-300 font-mono text-xs font-normal">
                      Node: <code className="text-amber-400 font-semibold">{currentPending.requestingAgent}</code>
                    </span>
                  </div>
                }
                subtitle={`Thread Context: ${currentPending.threadId} • Detected: ${currentPending.timestamp ? new Date(currentPending.timestamp).toLocaleTimeString() : 'Recent'}`}
                headerAction={
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => router.push(`/playground?thread=${currentPending.threadId}`)}
                    className="text-xs font-mono text-slate-400 hover:text-slate-200"
                  >
                    Open in Playground
                  </Button>
                }
              >
                <div className="space-y-4 font-mono text-xs">
                  {/* Proposed Action Banner */}
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                        <Globe className="w-3.5 h-3.5 text-sky-400" />
                        Proposed External Retrieval Action
                      </span>
                      <Badge variant="workbench">{currentPending.sourceMeta}</Badge>
                    </div>

                    <div className="text-sm font-semibold text-emerald-400">
                      &quot;{currentPending.query}&quot;
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-850/80">
                      <span>Temporal Bound: <strong className="text-slate-200">{currentPending.recencyDays} days</strong></span>
                      <span>Requesting Agent: <strong className="text-slate-200">{currentPending.requestingAgent}</strong></span>
                      <span>Candidate Previews: <strong className="text-slate-200">{currentPending.previewEntries.length} items</strong></span>
                    </div>
                  </div>

                  {/* Candidate Results Preview */}
                  <div className="space-y-2">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase block">
                      Parsed Candidates Awaiting Synthesis:
                    </span>
                    <div className="space-y-2">
                      {currentPending.previewEntries.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-md bg-slate-900/80 border border-slate-800 text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{item.title}</span>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline flex items-center gap-1 text-[10px]"
                              >
                                View Source <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          {item.snippet && (
                            <p className="text-slate-400 line-clamp-2">{item.snippet}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Decision Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <div className="text-[11px] text-slate-500">
                      Approving dispatches web retrieval to synthesis; rejecting halts search with feedback.
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        icon={X}
                        onClick={() => setRejectDialogOpen(true)}
                        disabled={isSubmitting}
                        className="text-xs font-mono"
                      >
                        Reject with Feedback…
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        icon={Check}
                        onClick={() => setApproveDialogOpen(true)}
                        disabled={isSubmitting}
                        className="text-xs font-mono"
                      >
                        Approve & Ingest
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Historical Audit Trail Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-emerald-400" />
            Decision Audit Trail (<code className="text-emerald-400">hitl_events</code> table)
          </h2>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="w-56">
              <Input
                icon={Search}
                placeholder="Search audit trail…"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono">
              {(['all', 'approved', 'rejected'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAuditFilter(mode)}
                  className={`px-2 py-1 rounded border transition-colors ${
                    auditFilter === mode
                      ? 'bg-slate-800 text-slate-100 border-slate-700 font-semibold'
                      : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-925/80">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 font-mono text-xs">Timestamp</TableHead>
                  <TableHead className="w-36 font-mono text-xs">Thread ID</TableHead>
                  <TableHead className="font-mono text-xs">Query Target</TableHead>
                  <TableHead className="w-28 font-mono text-xs">Decision</TableHead>
                  <TableHead className="font-mono text-xs">Reason / Feedback</TableHead>
                  <TableHead className="w-36 font-mono text-xs">Provenance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingEvents ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs font-mono text-slate-500">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-emerald-400" />
                      Loading persisted audit trail records…
                    </TableCell>
                  </TableRow>
                ) : filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs font-mono text-slate-500">
                      No decision events matching the filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((ev, i) => (
                    <TableRow key={i} className="hover:bg-slate-900/50">
                      <TableCell className="font-mono text-slate-400 text-xs">
                        {new Date(ev.created_at).toLocaleString([], {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-slate-300 text-xs">
                        <button
                          type="button"
                          onClick={() => router.push(`/playground?thread=${ev.thread_id}`)}
                          className="hover:text-emerald-400 underline decoration-slate-700 hover:decoration-emerald-400 truncate max-w-[120px] block"
                        >
                          {ev.thread_id}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-slate-200 text-xs max-w-xs truncate">
                        &quot;{ev.query}&quot;
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ev.decision === 'approved' ? 'success' : 'error'}
                          className="text-[10px]"
                        >
                          {ev.decision.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-slate-400 text-xs max-w-xs truncate">
                        {ev.reason || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sky-400 text-xs">
                        {ev.metadata?.source || (ev.metadata?.cache_hit ? 'cache hit' : 'web mcp')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Confirmation Dialog: Approve */}
      <Dialog
        isOpen={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        title="Confirm Retrieval Authorization"
      >
        <div className="space-y-4 font-mono text-xs text-slate-300">
          <p>
            You are about to authorize <strong className="text-slate-100">web_search_agent</strong> to execute a live query:
          </p>
          <div className="p-3 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-semibold">
            &quot;{currentPending?.query}&quot;
          </div>
          <div className="text-[11px] text-slate-400 space-y-1">
            <div>• Temporal Bound: {currentPending?.recencyDays} days</div>
            <div>• Target Thread: {currentPending?.threadId}</div>
            <div>• Decision record will be committed to <code className="text-slate-200">hitl_events</code> table.</div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setApproveDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording…' : 'Confirm Authorization'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog: Reject with Feedback */}
      <Dialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        title="Reject Search Retrieval with Feedback"
      >
        <div className="space-y-4 font-mono text-xs text-slate-300">
          <p>
            The agent will halt search ingestion for <strong className="text-slate-100">&quot;{currentPending?.query}&quot;</strong> and request user reformulation.
          </p>

          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-semibold block">
              Rejection Feedback / Reason:
            </label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Too broad, outside target timeframe, irrelevant sources"
              className="h-8 text-xs font-mono"
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'Sources outside timeframe',
                'Topic too broad',
                'Irrelevant domains',
                'Refine search keywords',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRejectReason(chip)}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={X}
              onClick={handleReject}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

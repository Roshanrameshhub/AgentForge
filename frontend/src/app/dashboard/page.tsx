'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  Server,
  Terminal,
  CheckSquare,
  Wrench,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Layers,
  Radio,
  MessageSquare,
} from 'lucide-react';
import { BentoCard, Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { agentApiClient } from '@/lib/api/client';
import { useToast } from '@/lib/context/ToastContext';
import { ALL_SPECIALIZED_AGENTS } from '@/lib/types/agent';
import type { HealthzResponse, ReadyzResponse, ThreadsResponse } from '@/lib/types/api';

export default function DashboardPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Live state from backend
  const [health, setHealth] = useState<HealthzResponse | null>(null);
  const [ready, setReady] = useState<ReadyzResponse | null>(null);
  const [threadsData, setThreadsData] = useState<ThreadsResponse | null>(null);
  const [metricsSummary, setMetricsSummary] = useState<{
    totalRequests?: number;
    errorCount?: number;
    avgLatencyMs?: number;
    activeStreams?: number;
  } | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, rRes, tRes, mText] = await Promise.all([
        agentApiClient.getHealthz().catch(() => null),
        agentApiClient.getReadyz().catch(() => null),
        agentApiClient.listThreads(5).catch(() => null),
        agentApiClient.getMetricsText().catch(() => null),
      ]);

      if (hRes) setHealth(hRes);
      if (rRes) setReady(rRes);
      if (tRes) setThreadsData(tRes);

      // Parse OpenMetrics exposition text if available
      if (mText && typeof mText === 'string') {
        let total = 0;
        let errors = 0;
        let latencySum = 0;
        let latencyCount = 0;

        const lines = mText.split('\n');
        for (const line of lines) {
          if (line.startsWith('#') || !line.trim()) continue;
          if (line.startsWith('http_requests_total')) {
            const parts = line.split(' ');
            const val = parseFloat(parts[parts.length - 1]);
            if (!isNaN(val)) total += val;
            if (
              line.includes('status_code="5') ||
              line.includes('status_code="4') ||
              line.includes('status="5') ||
              line.includes('status="4')
            ) {
              errors += val;
            }
          } else if (line.startsWith('http_request_duration_seconds_sum')) {
            const parts = line.split(' ');
            const val = parseFloat(parts[parts.length - 1]);
            if (!isNaN(val)) latencySum += val;
          } else if (line.startsWith('http_request_duration_seconds_count')) {
            const parts = line.split(' ');
            const val = parseFloat(parts[parts.length - 1]);
            if (!isNaN(val)) latencyCount += val;
          }
        }

        const avgMs = latencyCount > 0 ? (latencySum / latencyCount) * 1000 : undefined;
        setMetricsSummary({
          totalRequests: total,
          errorCount: errors,
          avgLatencyMs: avgMs ? Math.round(avgMs) : undefined,
          activeStreams: 0,
        });
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Telemetry sync failed';
      addToast({
        title: 'Dashboard Sync Notice',
        message: msg,
        type: 'warning',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  const isOnline = health?.status === 'ok';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Bar with Status & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-400" />
            AgentForge Mission Control
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Real-time telemetry, multi-agent pipeline status, and persistent execution sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={isOnline ? 'success' : 'error'} dot={isOnline}>
            {isOnline ? 'FASTAPI BACKEND CONNECTED' : 'BACKEND OFFLINE'}
          </Badge>
          {lastUpdated && (
            <span className="text-[11px] font-mono text-slate-500">
              Synced: {lastUpdated}
            </span>
          )}
          <Button
            variant="workbench"
            size="sm"
            onClick={fetchDashboardData}
            isLoading={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Poll Live
          </Button>
        </div>
      </div>

      {/* 2. Top-Level Asymmetric Bento Grid: Operational Metrics & Health */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: System Liveness */}
        <BentoCard
          title="Liveness"
          subtitle="/healthz ping"
          icon={<Server className="w-4 h-4 text-emerald-400" />}
          headerAction={
            <Badge variant={isOnline ? 'success' : 'neutral'} dot={isOnline}>
              {isOnline ? 'HEALTHY' : 'UNREACHABLE'}
            </Badge>
          }
        >
          <div className="space-y-2 mt-1">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">
              {isOnline ? '200 OK' : 'Offline'}
            </div>
            <p className="text-xs text-slate-400">
              FastAPI ASGI loop responding on internal port 8000 via proxy rewrite.
            </p>
          </div>
        </BentoCard>

        {/* Metric 2: Readiness Status */}
        <BentoCard
          title="Readiness"
          subtitle="/readyz composite"
          icon={<Radio className="w-4 h-4 text-sky-400" />}
          headerAction={
            <Badge variant={ready?.status === 'ready' ? 'success' : 'warning'}>
              {ready?.status ? ready.status.toUpperCase() : 'PENDING'}
            </Badge>
          }
        >
          <div className="space-y-2 mt-1">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">
              {ready?.status === 'ready' ? 'Ready' : 'Degraded'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>SQLite Store:</span>
                <span className={ready?.components?.database ? 'text-emerald-400' : 'text-slate-500'}>
                  {ready?.components?.database ? 'Online' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Redis / Memory:</span>
                <span className={ready?.components?.redis ? 'text-emerald-400' : 'text-slate-500'}>
                  {ready?.components?.redis ? 'Active' : 'Fallback'}
                </span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Metric 3: Active Conversations */}
        <BentoCard
          title="Sessions"
          subtitle="/store/threads count"
          icon={<MessageSquare className="w-4 h-4 text-purple-400" />}
          headerAction={
            <Badge variant="workbench">{threadsData?.count ?? 0} TOTAL</Badge>
          }
        >
          <div className="space-y-2 mt-1">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">
              {threadsData?.count !== undefined ? threadsData.count : '—'}
            </div>
            <p className="text-xs text-slate-400">
              Durable SQLite conversational threads with full turn history.
            </p>
          </div>
        </BentoCard>

        {/* Metric 4: HTTP Telemetry */}
        <BentoCard
          title="Telemetry"
          subtitle="/metrics summary"
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          headerAction={<Badge variant="workbench">PROMETHEUS</Badge>}
        >
          <div className="space-y-2 mt-1">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">
              {metricsSummary?.totalRequests !== undefined
                ? `${metricsSummary.totalRequests} reqs`
                : isOnline
                ? 'Active'
                : 'Offline'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Avg Latency:</span>
                <span className="text-emerald-400">
                  {metricsSummary?.avgLatencyMs ? `${metricsSummary.avgLatencyMs}ms` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>HTTP Errors:</span>
                <span className={metricsSummary?.errorCount ? 'text-rose-400' : 'text-slate-400'}>
                  {metricsSummary?.errorCount ?? 0}
                </span>
              </div>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* 3. Middle Section: Asymmetric Split (Recent Conversations vs 12-Agent Pipeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Conversation Threads */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Recent Execution Sessions"
            subtitle="Persistent multi-agent conversational threads in store"
            headerAction={
              <Link href="/conversations">
                <Button variant="workbench" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All Sessions
                </Button>
              </Link>
            }
          >
            {loading ? (
              <div className="space-y-3 py-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : threadsData?.threads && threadsData.threads.length > 0 ? (
              <div className="divide-y divide-slate-850">
                {threadsData.threads.map((thread) => (
                  <div
                    key={thread.thread_id}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-900/40 px-2 rounded transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-200 font-bold">
                          {thread.thread_id.slice(0, 18)}...
                        </span>
                        <Badge variant="neutral">{thread.message_count} turns</Badge>
                      </div>
                      <p className="text-xs text-slate-400 truncate font-sans">
                        {thread.last_message_preview || 'No message preview available.'}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                        {thread.last_message_at}
                      </span>
                      <Link href={`/playground?thread=${thread.thread_id}`}>
                        <Button variant="workbench" size="sm">
                          Resume
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-mono text-slate-400 space-y-2">
                <p>No active execution sessions found in the persistent store.</p>
                <Link href="/playground">
                  <Button variant="primary" size="sm" className="mt-2">
                    Start First Chat in Playground
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Quick Actions Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/playground" className="block">
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-925/80 hover:bg-slate-900 hover:border-emerald-500/40 transition-colors group">
                <Terminal className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-105 transition-transform" />
                <div className="font-semibold text-xs text-slate-100">Playground</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Stream agent runs</div>
              </div>
            </Link>

            <Link href="/approvals" className="block">
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-925/80 hover:bg-slate-900 hover:border-amber-500/40 transition-colors group">
                <CheckSquare className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-105 transition-transform" />
                <div className="font-semibold text-xs text-slate-100">HITL Gates</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Authorize web search</div>
              </div>
            </Link>

            <Link href="/knowledge" className="block">
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-925/80 hover:bg-slate-900 hover:border-sky-500/40 transition-colors group">
                <BookOpen className="w-5 h-5 text-sky-400 mb-2 group-hover:scale-105 transition-transform" />
                <div className="font-semibold text-xs text-slate-100">Knowledge RAG</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Vector DB & Graph</div>
              </div>
            </Link>

            <Link href="/tools" className="block">
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-925/80 hover:bg-slate-900 hover:border-purple-500/40 transition-colors group">
                <Wrench className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-105 transition-transform" />
                <div className="font-semibold text-xs text-slate-100">FastMCP Tools</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Subprocess servers</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: 12 Specialized Agents Registry */}
        <div className="space-y-4">
          <Card
            title="12 Specialized Agents"
            subtitle="LangGraph registered subagent nodes"
            headerAction={<Badge variant="workbench">12 NODES</Badge>}
          >
            <div className="space-y-2 max-h-[390px] overflow-y-auto pr-1">
              {ALL_SPECIALIZED_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className="p-2 rounded bg-slate-950 border border-slate-850 flex items-center justify-between gap-2 text-xs font-mono"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-200 font-semibold truncate">{agent.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{agent.role}</div>
                  </div>
                  <Badge variant="neutral">{agent.route.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

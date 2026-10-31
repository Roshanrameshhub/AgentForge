'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Server, Database, Cpu, HardDrive } from 'lucide-react';
import { BentoCard, Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { agentApiClient } from '@/lib/api/client';
import { useToast } from '@/lib/context/ToastContext';
import { ReadyzResponse, HealthzResponse } from '@/lib/types/api';

export default function ObservabilityPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthzResponse | null>(null);
  const [ready, setReady] = useState<ReadyzResponse | null>(null);

  const checkProbes = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, rRes] = await Promise.all([
        agentApiClient.getHealthz().catch(() => null),
        agentApiClient.getReadyz().catch(() => null),
      ]);

      if (hRes) setHealth(hRes);
      if (rRes) {
        setReady(rRes);
      } else {
        setReady({
          status: 'degraded',
          components: {
            database: false,
            redis: false,
            groq: false,
          },
          detail: 'Unable to connect to backend readiness probe (FastAPI service offline or unreachable).',
        });
      }
      setLastCheck(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Probe inspection failed';
      addToast({
        title: 'Observability Probe Failed',
        message: msg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkProbes();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkProbes]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            System Observability & Health Probes
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Real-time inspection of backend Kubernetes-style probes (/healthz, /readyz) and Prometheus telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastCheck && (
            <span className="text-[11px] font-mono text-slate-500">
              Checked: {lastCheck}
            </span>
          )}
          <Button
            variant="workbench"
            size="sm"
            onClick={checkProbes}
            isLoading={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Poll Probes
          </Button>
        </div>
      </div>

      {/* Main Status Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Liveness Probe */}
        <BentoCard
          title="Liveness Probe"
          subtitle="/healthz endpoint"
          icon={<Server className="w-4 h-4 text-emerald-400" />}
          headerAction={
            <Badge
              variant={health?.status === 'ok' ? 'success' : 'neutral'}
              dot={health?.status === 'ok'}
            >
              {health?.status ? health.status.toUpperCase() : 'OFFLINE'}
            </Badge>
          }
        >
          <p className="text-xs text-slate-300 font-sans mb-3">
            Lightweight HTTP 200 ping verifying the FastAPI event loop is responsive and handling requests.
          </p>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-850 text-xs font-mono space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span className="text-slate-500">HTTP Status:</span>
              <span className={health?.status === 'ok' ? 'text-emerald-400' : 'text-slate-400'}>
                {health?.status === 'ok' ? '200 OK' : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Service:</span>
              <span className="text-slate-200">FastAPI ASGI</span>
            </div>
          </div>
        </BentoCard>

        {/* Readiness Probe */}
        <BentoCard
          title="Readiness Probe"
          subtitle="/readyz composite check"
          icon={<Database className="w-4 h-4 text-sky-400" />}
          headerAction={
            <Badge
              variant={ready?.status === 'ready' ? 'success' : 'warning'}
              dot={ready?.status === 'ready'}
            >
              {ready?.status ? ready.status.toUpperCase() : 'UNREACHABLE'}
            </Badge>
          }
        >
          <p className="text-xs text-slate-300 font-sans mb-3">
            Composite health check evaluating SQLite/Postgres conversation store, Redis pub/sub cache, and Groq LLM API.
          </p>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-850 text-xs font-mono space-y-2 text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Database className="w-3.5 h-3.5 text-slate-500" /> Database Store:
              </span>
              <span className={ready?.components?.database ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {ready?.components?.database ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" /> Redis Cache:
              </span>
              <span className={ready?.components?.redis ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {ready?.components?.redis ? 'ACTIVE' : 'FALLBACK'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-slate-500" /> Groq API Client:
              </span>
              <span className={ready?.components?.groq ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {ready?.components?.groq ? 'INITIALIZED' : 'PENDING KEY'}
              </span>
            </div>
          </div>
        </BentoCard>

        {/* Prometheus Scrape Exporter */}
        <BentoCard
          title="Prometheus Metrics"
          subtitle="/metrics endpoint"
          icon={<Activity className="w-4 h-4 text-purple-400" />}
          headerAction={<Badge variant="workbench">PORT 8000</Badge>}
        >
          <p className="text-xs text-slate-300 font-sans mb-3">
            Prometheus client instrumenting HTTP request latencies, active SSE streaming connections, and agent state transitions.
          </p>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-850 text-xs font-mono space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span className="text-slate-500">Scrape Endpoint:</span>
              <span className="text-slate-300">/metrics</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Format:</span>
              <span className="text-slate-300">OpenMetrics v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Default Interval:</span>
              <span className="text-slate-300">15s Scrape Target</span>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* Observability Details Card */}
      <Card
        title="Prometheus & Telemetry Architecture"
        subtitle="Agent execution latency buckets and LangGraph state telemetry"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded bg-slate-950 border border-slate-850 space-y-2">
            <span className="text-emerald-400 font-bold block mb-1">Standard Exported Metrics</span>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li><code className="text-slate-200">http_requests_total</code>: Counter by method, handler, status</li>
              <li><code className="text-slate-200">http_request_duration_seconds</code>: Histogram of response time</li>
              <li><code className="text-slate-200">agent_execution_seconds</code>: Duration per LangGraph agent node</li>
              <li><code className="text-slate-200">hitl_pending_decisions</code>: Gauge of human approval queue length</li>
              <li><code className="text-slate-200">mcp_tool_invocation_total</code>: Counter for MCP stdio executions</li>
            </ul>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-850 space-y-2">
            <span className="text-sky-400 font-bold block mb-1">Telemetry Integration Status</span>
            <p className="text-slate-400 leading-relaxed font-sans">
              The AgentForge backend utilizes <code className="text-slate-200">prometheus-fastapi-instrumentator</code>.
              When starting the Prometheus server locally (<code className="text-slate-200">monitoring/prometheus.yml</code>), metrics from <code className="text-slate-200">host.docker.internal:8000</code> are scraped directly into Prometheus and visualized via Grafana dashboards.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

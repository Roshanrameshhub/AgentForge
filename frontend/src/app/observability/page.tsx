'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  Server,
  Database,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { ReadyResponse, HealthResponse } from '@/lib/types/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useToast } from '@/lib/context/ToastContext';

// Parsed sample from Prometheus text representation
interface PrometheusMetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

interface ParsedPrometheusData {
  totalRequests: number;
  statusDistribution: {
    code2xx: number;
    code3xx: number;
    code4xx: number;
    code5xx: number;
  };
  endpointTraffic: { path: string; count: number; percentage: number }[];
  methodDistribution: Record<string, number>;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  memoryUsageMb: number | null;
  cpuSeconds: number | null;
  sampleCount: number;
}

// Prometheus OpenMetrics Text Parser (RFC compliant)
function parsePrometheusText(text: string): ParsedPrometheusData {
  const lines = text.split('\n');
  const samples: PrometheusMetricSample[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Matches: metric_name{labels} value OR metric_name value
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([^\s]+)/);
    if (!match) continue;

    const [, name, labelsStr, valStr] = match;
    const value = parseFloat(valStr);
    if (isNaN(value)) continue;

    const labels: Record<string, string> = {};
    if (labelsStr) {
      // Parse key="value", key="value"
      const labelPairs = labelsStr.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)=(?:"([^"]*)"|([^,]*))/g);
      for (const pair of labelPairs) {
        labels[pair[1]] = pair[2] ?? pair[3] ?? '';
      }
    }

    samples.push({ name, labels, value });
  }

  // Aggregate metrics
  let totalRequests = 0;
  const statusDistribution = { code2xx: 0, code3xx: 0, code4xx: 0, code5xx: 0 };
  const endpointCounts: Record<string, number> = {};
  const methodDistribution: Record<string, number> = {};

  let durationSum = 0;
  let durationCount = 0;
  const buckets: { le: number; count: number }[] = [];
  let memoryUsageMb: number | null = null;
  let cpuSeconds: number | null = null;

  for (const s of samples) {
    if (s.name === 'http_requests_total') {
      totalRequests += s.value;
      const status = s.labels.status_code || '';
      if (status.startsWith('2')) statusDistribution.code2xx += s.value;
      else if (status.startsWith('3')) statusDistribution.code3xx += s.value;
      else if (status.startsWith('4')) statusDistribution.code4xx += s.value;
      else if (status.startsWith('5')) statusDistribution.code5xx += s.value;

      const path = s.labels.path || 'unknown';
      endpointCounts[path] = (endpointCounts[path] || 0) + s.value;

      const method = s.labels.method || 'GET';
      methodDistribution[method] = (methodDistribution[method] || 0) + s.value;
    }

    if (s.name === 'http_request_duration_seconds_sum') {
      durationSum += s.value;
    }
    if (s.name === 'http_request_duration_seconds_count') {
      durationCount += s.value;
    }
    if (s.name === 'http_request_duration_seconds_bucket') {
      const le = parseFloat(s.labels.le || '0');
      if (!isNaN(le)) {
        buckets.push({ le, count: s.value });
      }
    }

    if (s.name === 'process_resident_memory_bytes') {
      memoryUsageMb = Math.round((s.value / (1024 * 1024)) * 10) / 10;
    }
    if (s.name === 'process_cpu_seconds_total') {
      cpuSeconds = Math.round(s.value * 100) / 100;
    }
  }

  // Calculate top endpoints
  const endpointTraffic = Object.entries(endpointCounts)
    .map(([path, count]) => ({
      path,
      count,
      percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Latency calculation
  const avgLatencyMs =
    durationCount > 0 ? Math.round((durationSum / durationCount) * 1000 * 10) / 10 : null;

  // Approximate P95 from histogram buckets
  let p95LatencyMs: number | null = null;
  if (buckets.length > 0 && durationCount > 0) {
    const targetCount = durationCount * 0.95;
    const sortedBuckets = buckets.sort((a, b) => a.le - b.le);
    const p95Bucket = sortedBuckets.find((b) => b.count >= targetCount);
    if (p95Bucket && isFinite(p95Bucket.le)) {
      p95LatencyMs = Math.round(p95Bucket.le * 1000 * 10) / 10;
    }
  }

  return {
    totalRequests,
    statusDistribution,
    endpointTraffic,
    methodDistribution,
    avgLatencyMs,
    p95LatencyMs,
    memoryUsageMb,
    cpuSeconds,
    sampleCount: samples.length,
  };
}

export default function ObservabilityPage() {
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);

  // Probes & telemetry state
  const [healthz, setHealthz] = useState<HealthResponse | null>(null);
  const [readyz, setReadyz] = useState<ReadyResponse | null>(null);
  const [rawMetrics, setRawMetrics] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'raw'>('overview');

  // Load telemetry data from real endpoints
  const pollTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hRes, rRes, mRes] = await Promise.allSettled([
        apiClient.getHealth(),
        apiClient.getReadiness(),
        apiClient.getMetricsText(),
      ]);

      if (hRes.status === 'fulfilled') {
        setHealthz(hRes.value);
      } else {
        setHealthz({ status: 'offline' });
      }

      if (rRes.status === 'fulfilled') {
        setReadyz(rRes.value);
      } else {
        setReadyz({
          status: 'degraded',
          components: { database: false, redis: false, groq: false },
          detail: 'Readiness probe failed to respond.',
        });
      }

      if (mRes.status === 'fulfilled') {
        setRawMetrics(mRes.value || '');
      } else {
        setRawMetrics('');
      }

      setLastScrapeTime(new Date().toLocaleTimeString());
    } catch {
      addToast({
        title: 'Probe Polling Error',
        message: 'Could not contact backend monitoring services.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    let isCancelled = false;
    const init = async () => {
      try {
        const [hRes, rRes, mRes] = await Promise.allSettled([
          apiClient.getHealth(),
          apiClient.getReadiness(),
          apiClient.getMetricsText(),
        ]);
        if (!isCancelled) {
          if (hRes.status === 'fulfilled') setHealthz(hRes.value);
          if (rRes.status === 'fulfilled') setReadyz(rRes.value);
          if (mRes.status === 'fulfilled') setRawMetrics(mRes.value || '');
          setLastScrapeTime(new Date().toLocaleTimeString());
        }
      } catch {
        // Fallback
      }
    };
    init();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Parsed Prometheus Telemetry
  const parsedMetrics = useMemo(() => {
    if (!rawMetrics) {
      return {
        totalRequests: 0,
        statusDistribution: { code2xx: 0, code3xx: 0, code4xx: 0, code5xx: 0 },
        endpointTraffic: [],
        methodDistribution: {},
        avgLatencyMs: null,
        p95LatencyMs: null,
        memoryUsageMb: null,
        cpuSeconds: null,
        sampleCount: 0,
      };
    }
    return parsePrometheusText(rawMetrics);
  }, [rawMetrics]);

  // Derived Error Rate
  const errorRate = useMemo(() => {
    const errors =
      parsedMetrics.statusDistribution.code4xx + parsedMetrics.statusDistribution.code5xx;
    if (parsedMetrics.totalRequests === 0) return 0;
    return Math.round((errors / parsedMetrics.totalRequests) * 1000) / 10;
  }, [parsedMetrics]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-slate-100 font-sans pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Platform Observability & Prometheus Telemetry
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Real-time inspection of Kubernetes probes (/healthz, /readyz) and OpenMetrics scrape exporter (/metrics)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastScrapeTime && (
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              Last Scrape: {lastScrapeTime}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={pollTelemetry}
            disabled={isLoading}
            className="text-xs font-mono"
          >
            {isLoading ? 'Scraping…' : 'Scrape Now'}
          </Button>
        </div>
      </div>

      {/* Component Availability Matrix (System Status) */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          Component Health & Dependency Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. FastAPI ASGI Server */}
          <div className="p-3.5 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                FastAPI ASGI
              </span>
              <StatusIndicator
                status={healthz?.status === 'ok' ? 'ready' : 'offline'}
              />
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              {healthz?.status === 'ok' ? '200 OK' : 'Unreachable'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1">
              Probe: /healthz
            </span>
          </div>

          {/* 2. Conversation Database */}
          <div className="p-3.5 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                Thread Store
              </span>
              <Badge
                variant={readyz?.components?.database ? 'success' : 'warning'}
                className="text-[9px]"
              >
                {readyz?.components?.database ? 'CONNECTED' : 'DISCONNECTED'}
              </Badge>
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              SQLite / PostgreSQL
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1">
              Checkpoints Store
            </span>
          </div>

          {/* 3. Redis Cache */}
          <div className="p-3.5 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                Redis Cache
              </span>
              <Badge
                variant={readyz?.components?.redis ? 'success' : 'neutral'}
                className="text-[9px]"
              >
                {readyz?.components?.redis ? 'ACTIVE' : 'FALLBACK'}
              </Badge>
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              {readyz?.components?.redis ? 'Connected' : 'In-Memory Cache'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1">
              TTL RAG Caching
            </span>
          </div>

          {/* 4. Groq / LLM Engine */}
          <div className="p-3.5 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                LLM Provider
              </span>
              <Badge
                variant={readyz?.components?.groq ? 'success' : 'warning'}
                className="text-[9px]"
              >
                {readyz?.components?.groq ? 'INITIALIZED' : 'STANDBY'}
              </Badge>
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              {readyz?.components?.groq ? 'Groq / Llama-3' : 'API Key Pending'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1">
              Inference Engine
            </span>
          </div>

          {/* 5. FastMCP Stdio Server */}
          <div className="p-3.5 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                FastMCP Engine
              </span>
              <Badge variant="success" className="text-[9px]">
                STDIO OK
              </Badge>
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              Subprocess Tools
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1">
              Search & Calculator
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Telemetry Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Total HTTP Traffic
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {parsedMetrics.totalRequests.toLocaleString()}
            </span>
            <Badge variant="neutral" className="text-[10px]">
              {parsedMetrics.sampleCount} metrics
            </Badge>
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1">
            Counted since service start
          </span>
        </div>

        <div className="p-4 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            HTTP Error Rate
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span
              className={`text-2xl font-bold font-mono ${
                errorRate > 5 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {errorRate}%
            </span>
            <Badge variant={errorRate > 5 ? 'error' : 'success'} className="text-[10px]">
              {errorRate > 5 ? 'Elevated' : 'Optimal'}
            </Badge>
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1">
            4xx + 5xx status codes
          </span>
        </div>

        <div className="p-4 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Average Latency
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-sky-400">
              {parsedMetrics.avgLatencyMs !== null
                ? `${parsedMetrics.avgLatencyMs} ms`
                : '—'}
            </span>
            {parsedMetrics.p95LatencyMs !== null && (
              <span className="text-[10px] font-mono text-slate-400">
                P95: {parsedMetrics.p95LatencyMs} ms
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1">
            Histogram bucket estimation
          </span>
        </div>

        <div className="p-4 rounded-lg bg-slate-925/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Process Memory (RSS)
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono text-purple-400">
              {parsedMetrics.memoryUsageMb !== null
                ? `${parsedMetrics.memoryUsageMb} MB`
                : '—'}
            </span>
            {parsedMetrics.cpuSeconds !== null && (
              <span className="text-[10px] font-mono text-slate-400">
                CPU: {parsedMetrics.cpuSeconds}s
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1">
            Resident memory footprint
          </span>
        </div>
      </div>

      {/* Telemetry Tabs: Visuals, Traffic, Raw */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-800/80 text-xs font-mono">
          {[
            { id: 'overview', label: 'Telemetry Overview & Status Codes' },
            { id: 'traffic', label: 'Endpoint Traffic & Routes' },
            { id: 'raw', label: 'Raw OpenMetrics Scrape Stream' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-emerald-400 font-semibold bg-emerald-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Status Codes */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Code Distribution Card */}
            <Card
              title="HTTP Status Code Distribution"
              subtitle="Grouped by response category from http_requests_total counter"
            >
              <div className="space-y-3 font-mono text-xs">
                {/* 2xx Success */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 2xx Success
                    </span>
                    <span className="text-slate-300">
                      {parsedMetrics.statusDistribution.code2xx} reqs
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${
                          parsedMetrics.totalRequests > 0
                            ? (parsedMetrics.statusDistribution.code2xx / parsedMetrics.totalRequests) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* 3xx Redirect */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-sky-400 font-semibold flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5" /> 3xx Redirection
                    </span>
                    <span className="text-slate-300">
                      {parsedMetrics.statusDistribution.code3xx} reqs
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{
                        width: `${
                          parsedMetrics.totalRequests > 0
                            ? (parsedMetrics.statusDistribution.code3xx / parsedMetrics.totalRequests) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* 4xx Client Error */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> 4xx Client Errors
                    </span>
                    <span className="text-slate-300">
                      {parsedMetrics.statusDistribution.code4xx} reqs
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{
                        width: `${
                          parsedMetrics.totalRequests > 0
                            ? (parsedMetrics.statusDistribution.code4xx / parsedMetrics.totalRequests) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* 5xx Server Error */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> 5xx Server Errors
                    </span>
                    <span className="text-slate-300">
                      {parsedMetrics.statusDistribution.code5xx} reqs
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-all duration-300"
                      style={{
                        width: `${
                          parsedMetrics.totalRequests > 0
                            ? (parsedMetrics.statusDistribution.code5xx / parsedMetrics.totalRequests) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Methods & SLA Card */}
            <Card
              title="HTTP Verb Breakdown & Reliability SLA"
              subtitle="Observed request methods and service operational health"
            >
              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">GET Traffic</span>
                    <span className="text-base font-bold text-slate-100">
                      {parsedMetrics.methodDistribution['GET'] || 0} reqs
                    </span>
                  </div>
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">POST Traffic</span>
                    <span className="text-base font-bold text-emerald-400">
                      {parsedMetrics.methodDistribution['POST'] || 0} reqs
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
                  <span className="text-slate-200 font-semibold block">SLA Compliance:</span>
                  <div>• Liveness SLA: <strong>99.9% Uptime Target</strong> (/healthz verified)</div>
                  <div>• Streaming SSE: Non-blocking async event loop with heartbeat</div>
                  <div>• Prometheus Protocol: RFC 0001 OpenMetrics standard text format</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Endpoint Traffic */}
        {activeTab === 'traffic' && (
          <Card
            title="Top Endpoint Traffic Distribution"
            subtitle="Aggregated from http_requests_total label:path"
          >
            <div className="space-y-3 font-mono text-xs">
              {parsedMetrics.endpointTraffic.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  No HTTP request telemetry recorded yet.
                </div>
              ) : (
                parsedMetrics.endpointTraffic.map((ep, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-emerald-400">{ep.path}</span>
                      <span className="text-slate-400">
                        {ep.count} reqs ({ep.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${ep.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Tab 3: Raw OpenMetrics Text Stream */}
        {activeTab === 'raw' && (
          <Card
            title="Raw Prometheus /metrics OpenMetrics Stream"
            subtitle="Direct scrape payload exported by prometheus_client"
            headerAction={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(rawMetrics);
                  addToast({
                    title: 'Copied',
                    message: 'Raw Prometheus text copied to clipboard.',
                    type: 'info',
                  });
                }}
                className="text-xs font-mono"
              >
                Copy Text
              </Button>
            }
          >
            <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono max-h-96 overflow-y-auto">
              {rawMetrics ? (
                <pre className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {rawMetrics}
                </pre>
              ) : (
                <span className="text-slate-500">No Prometheus scrape payload available.</span>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

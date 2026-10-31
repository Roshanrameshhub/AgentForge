'use client';

import {
  ShieldCheck,
  Cpu,
  Layers,
  Globe,
  Database,
  CheckCircle2,
  Clock,
  FileCode,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export type PipelineStageStatus = 'idle' | 'active' | 'completed' | 'failed' | 'paused_hitl' | 'skipped';

export interface PipelineStage {
  id: string;
  name: string;
  agent: string;
  role: string;
  status: PipelineStageStatus;
  durationMs?: number;
  outputPreview?: string;
  tools?: string[];
}

interface ExecutionFlowProps {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused_hitl';
  activeRoute?: string;
  activeAgent?: string;
  executionTimeMs?: number;
  toolCalls?: Array<{ name: string; args?: Record<string, unknown> }>;
  className?: string;
}

export function ExecutionFlow({
  status,
  activeRoute = 'hybrid',
  activeAgent,
  executionTimeMs = 0,
  toolCalls = [],
  className,
}: ExecutionFlowProps) {
  // Compute stage statuses based on execution lifecycle
  const stages: PipelineStage[] = [
    {
      id: 'guard_in',
      name: 'Input Moderation',
      agent: 'safety_guard',
      role: 'Audits user prompt against 14 policy categories',
      status:
        status === 'idle'
          ? 'idle'
          : status === 'running' && activeAgent === 'safety_guard'
          ? 'active'
          : 'completed',
    },
    {
      id: 'supervisor',
      name: 'Supervisor Router',
      agent: 'supervisor',
      role: `Classifies prompt and determines route [${activeRoute}]`,
      status:
        status === 'idle'
          ? 'idle'
          : status === 'running' && (!activeAgent || activeAgent === 'supervisor')
          ? 'active'
          : 'completed',
    },
    {
      id: 'worker',
      name:
        activeRoute === 'web'
          ? 'Web MCP Worker'
          : activeRoute === 'rag'
          ? 'ChromaDB RAG'
          : activeRoute === 'direct'
          ? 'Direct Orchestrator'
          : 'Hybrid Multi-Agent',
      agent:
        activeRoute === 'web'
          ? 'web_search'
          : activeRoute === 'rag'
          ? 'rag_search'
          : activeRoute === 'direct'
          ? 'orchestrator'
          : 'planner',
      role:
        activeRoute === 'web'
          ? 'FastMCP stdio server web query'
          : activeRoute === 'rag'
          ? 'Dense embeddings similarity search'
          : activeRoute === 'direct'
          ? 'Single-turn LLM synthesis'
          : 'Planner + Coder + Critic collaboration',
      status:
        status === 'idle'
          ? 'idle'
          : status === 'running' && activeAgent !== 'safety_guard' && activeAgent !== 'supervisor'
          ? 'active'
          : status === 'paused_hitl'
          ? 'paused_hitl'
          : status === 'completed'
          ? 'completed'
          : status === 'failed'
          ? 'failed'
          : 'idle',
      tools: toolCalls.map((t) => t.name),
    },
    {
      id: 'hitl',
      name: 'HITL Verification',
      agent: 'human_in_the_loop',
      role: 'Web search recency authorization gate',
      status:
        status === 'paused_hitl'
          ? 'paused_hitl'
          : activeRoute === 'web' && status === 'completed'
          ? 'completed'
          : 'skipped',
    },
    {
      id: 'output',
      name: 'Output Synthesis',
      agent: 'summarizer',
      role: 'Stream token assembly & policy validation',
      status:
        status === 'completed'
          ? 'completed'
          : status === 'running' && activeAgent === 'summarizer'
          ? 'active'
          : 'idle',
    },
  ];

  return (
    <div className={`p-4 rounded-lg bg-slate-950 border border-slate-850 font-mono text-xs ${className || ''}`}>
      {/* Topology Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-850">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-100 text-xs">LangGraph Execution Topology</span>
          <Badge variant="workbench">ROUTE: {activeRoute.toUpperCase()}</Badge>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{executionTimeMs > 0 ? `${(executionTimeMs / 1000).toFixed(2)}s` : '0.00s'}</span>
          </div>
          <Badge
            variant={
              status === 'completed'
                ? 'success'
                : status === 'running'
                ? 'warning'
                : status === 'paused_hitl'
                ? 'warning'
                : status === 'failed'
                ? 'error'
                : 'neutral'
            }
            dot={status === 'running' || status === 'paused_hitl'}
          >
            {status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Connected Pipeline Nodes */}
      <div className="space-y-2">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className={`p-2.5 rounded border transition-all ${
              stage.status === 'active'
                ? 'bg-slate-900 border-emerald-500/60 shadow-sm shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                : stage.status === 'paused_hitl'
                ? 'bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/30'
                : stage.status === 'completed'
                ? 'bg-slate-925/80 border-slate-800'
                : stage.status === 'skipped'
                ? 'bg-slate-950/40 border-slate-900 opacity-50'
                : 'bg-slate-950 border-slate-850 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Node Step Icon */}
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs ${
                    stage.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                      : stage.status === 'paused_hitl'
                      ? 'bg-amber-500/20 text-amber-400'
                      : stage.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-400'
                      : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {stage.status === 'completed' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : stage.status === 'paused_hitl' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  ) : stage.id === 'guard_in' ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : stage.id === 'supervisor' ? (
                    <Cpu className="w-3.5 h-3.5" />
                  ) : stage.id === 'worker' ? (
                    activeRoute === 'web' ? (
                      <Globe className="w-3.5 h-3.5" />
                    ) : (
                      <Database className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-200 truncate">{stage.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">@{stage.agent}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{stage.role}</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0 flex items-center gap-2">
                {stage.status === 'active' && (
                  <span className="text-[10px] text-emerald-400 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> EXECUTING
                  </span>
                )}
                {stage.status === 'paused_hitl' && (
                  <span className="text-[10px] text-amber-400 font-bold">PAUSED</span>
                )}
                {stage.status === 'completed' && (
                  <span className="text-[10px] text-slate-400">DONE</span>
                )}
                {stage.status === 'skipped' && (
                  <span className="text-[10px] text-slate-600">BYPASS</span>
                )}
              </div>
            </div>

            {/* Render any associated tool executions */}
            {stage.tools && stage.tools.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500">FastMCP Tools:</span>
                {stage.tools.map((tool, tIdx) => (
                  <span
                    key={tIdx}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-sky-300 font-mono"
                  >
                    <FileCode className="w-2.5 h-2.5 text-sky-400" />
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

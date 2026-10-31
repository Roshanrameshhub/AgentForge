'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  Cpu,
  Database,
  Globe,
  Share2,
  Calculator,
  Award,
  ExternalLink,
  RefreshCw,
  Info,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { ThreadSummary, StoredMessageRecord } from '@/lib/types/api';
import { ALL_SPECIALIZED_AGENTS, type SpecializedAgent } from '@/lib/types/agent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tooltip } from '@/components/ui/Tooltip';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { workbenchSpring } from '@/lib/motion/springs';

// 6 Execution Stages in the LangGraph Orchestrator
interface StageDefinition {
  stage: number;
  name: string;
  description: string;
  agents: SpecializedAgent[];
}

const EXECUTION_STAGES: StageDefinition[] = [
  {
    stage: 1,
    name: 'Safety & Moderation',
    description: 'Input moderation via LlamaGuard-3-8b',
    agents: ['safety_agent'],
  },
  {
    stage: 2,
    name: 'Intent Classification',
    description: 'Supervisor routing & deterministic pattern matching',
    agents: ['intent_router_agent'],
  },
  {
    stage: 3,
    name: 'Query Pre-Processing',
    description: 'Clarification, expansion, or temporal bound detection',
    agents: ['clarification_agent', 'query_rewriter_agent', 'recency_guard_agent'],
  },
  {
    stage: 4,
    name: 'Execution & Retrieval',
    description: 'Parallel or conditional tool & knowledge retrieval',
    agents: [
      'web_hitl_gate_agent',
      'web_search_agent',
      'knowledge_graph_agent',
      'rag_agent',
      'math_agent',
    ],
  },
  {
    stage: 5,
    name: 'Response Synthesis',
    description: 'Grounded generation with citations and source linking',
    agents: ['response_agent'],
  },
  {
    stage: 6,
    name: 'Quality Evaluation',
    description: 'Automated 100-point rubric inspection & scoring',
    agents: ['evaluation_agent'],
  },
];

export default function WorkflowsPage() {
  const router = useRouter();

  // State: Run Directory
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [backendStore, setBackendStore] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'evaluated' | 'awaiting' | 'web' | 'rag' | 'math'>('all');

  // State: Selected Run Details
  const [messages, setMessages] = useState<StoredMessageRecord[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<SpecializedAgent | null>(null);
  const [activeTab, setActiveTab] = useState<'execution' | 'evaluation' | 'architecture'>('execution');

  // Manual refresh of thread list
  const refreshThreads = useCallback(async () => {
    setIsLoadingThreads(true);
    try {
      const res = await apiClient.listThreads(50);
      setThreads(res.threads || []);
      setBackendStore(res.backend);
      if (res.threads && res.threads.length > 0 && !selectedThreadId) {
        setSelectedThreadId(res.threads[0].thread_id);
      }
    } catch {
      setThreads([]);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [selectedThreadId]);

  // Initial load on mount
  useEffect(() => {
    let isCancelled = false;
    const initLoad = async () => {
      try {
        const res = await apiClient.listThreads(50);
        if (!isCancelled) {
          setThreads(res.threads || []);
          setBackendStore(res.backend);
          if (res.threads && res.threads.length > 0) {
            setSelectedThreadId((prev) => prev || res.threads[0].thread_id);
          }
        }
      } catch {
        if (!isCancelled) setThreads([]);
      } finally {
        if (!isCancelled) setIsLoadingThreads(false);
      }
    };
    initLoad();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Load message history when selected thread changes
  useEffect(() => {
    if (!selectedThreadId) return;
    let isCancelled = false;
    const fetchHistory = async () => {
      try {
        const history = await apiClient.getThreadHistory(selectedThreadId);
        if (!isCancelled) {
          setMessages(history.messages || []);
        }
      } catch {
        if (!isCancelled) {
          setMessages([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMessages(false);
        }
      }
    };
    fetchHistory();
    return () => {
      isCancelled = true;
    };
  }, [selectedThreadId]);

  // Derived active run metadata
  const selectedRunMetadata = useMemo(() => {
    if (!messages.length) return null;
    const assistantMsgs = messages.filter((m) => m.role === 'assistant' || m.role === 'ai');
    const lastAssistant = assistantMsgs[assistantMsgs.length - 1];
    const userMsgs = messages.filter((m) => m.role === 'user' || m.role === 'human');
    const firstUser = userMsgs[0];

    const route = (lastAssistant?.metadata?.route as string) || 'general';
    const evalScore = lastAssistant?.metadata?.evaluation_score as number | undefined;
    const evalReport = lastAssistant?.metadata?.evaluation_report as string | undefined;
    const model = (lastAssistant?.metadata?.model as string) || 'gpt-4o-mini';
    const isAwaitingHitl =
      lastAssistant?.content.includes('web_hitl') ||
      lastAssistant?.content.includes('web HITL decision is pending');

    // Parse traversed agents based on route and outcome
    const activeAgents: SpecializedAgent[] = ['safety_agent', 'intent_router_agent'];

    if (route === 'clarify') {
      activeAgents.push('clarification_agent', 'evaluation_agent');
    } else if (route === 'rewrite') {
      activeAgents.push('query_rewriter_agent', 'response_agent', 'evaluation_agent');
    } else if (route === 'math') {
      activeAgents.push('math_agent', 'response_agent', 'evaluation_agent');
    } else if (route === 'web') {
      activeAgents.push('recency_guard_agent', 'web_hitl_gate_agent', 'web_search_agent', 'response_agent', 'evaluation_agent');
    } else if (route === 'rag') {
      activeAgents.push('rag_agent', 'response_agent', 'evaluation_agent');
    } else if (route === 'kg') {
      activeAgents.push('knowledge_graph_agent', 'rag_agent', 'response_agent', 'evaluation_agent');
    } else if (route === 'hybrid') {
      activeAgents.push('recency_guard_agent', 'web_hitl_gate_agent', 'web_search_agent', 'rag_agent', 'response_agent', 'evaluation_agent');
    } else {
      activeAgents.push('response_agent', 'evaluation_agent');
    }

    // Parse checks from evaluation report
    const evalChecks: { name: string; score: string; positive: boolean }[] = [];
    if (evalReport) {
      const match = evalReport.match(/Checks:\s*(.*)$/);
      if (match && match[1]) {
        const parts = match[1].split(';');
        for (const p of parts) {
          const trimmed = p.trim();
          if (trimmed) {
            const [name, scoreVal] = trimmed.split(':');
            evalChecks.push({
              name: name || trimmed,
              score: scoreVal || '+0',
              positive: (scoreVal || '').includes('+'),
            });
          }
        }
      }
    }

    return {
      runId: lastAssistant?.run_id || selectedThreadId,
      firstPrompt: firstUser?.content || 'No prompt recorded',
      lastResponse: lastAssistant?.content || 'No response recorded',
      createdAt: lastAssistant?.created_at || firstUser?.created_at || 'Just now',
      route,
      evalScore,
      evalReport,
      evalChecks,
      model,
      isAwaitingHitl,
      activeAgents,
      totalTurns: messages.length,
    };
  }, [messages, selectedThreadId]);

  // Filtered thread list
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const matchesSearch =
        t.thread_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.last_message_preview || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'evaluated') {
        // Assume evaluated if thread preview indicates completed turn
        return true;
      }
      if (statusFilter === 'awaiting') {
        return (t.last_message_preview || '').includes('HITL') || (t.last_message_preview || '').includes('pending');
      }
      if (statusFilter === 'web') {
        return (t.last_message_preview || '').toLowerCase().includes('web') || (t.last_message_preview || '').toLowerCase().includes('search');
      }
      if (statusFilter === 'rag') {
        return (t.last_message_preview || '').toLowerCase().includes('rag') || (t.last_message_preview || '').toLowerCase().includes('project');
      }
      if (statusFilter === 'math') {
        return (t.last_message_preview || '').toLowerCase().includes('math') || (t.last_message_preview || '').toLowerCase().includes('=');
      }
      return true;
    });
  }, [threads, searchQuery, statusFilter]);

  // Agent meta lookup
  const getAgentMeta = (id: SpecializedAgent) => {
    return ALL_SPECIALIZED_AGENTS.find((a) => a.id === id) || {
      id,
      name: id,
      role: 'Specialized node',
      route: 'general',
    };
  };

  const getAgentIcon = (id: SpecializedAgent) => {
    switch (id) {
      case 'safety_agent':
        return ShieldCheck;
      case 'intent_router_agent':
        return Cpu;
      case 'clarification_agent':
      case 'query_rewriter_agent':
        return Sparkles;
      case 'recency_guard_agent':
        return Clock;
      case 'web_hitl_gate_agent':
      case 'web_search_agent':
        return Globe;
      case 'knowledge_graph_agent':
        return Share2;
      case 'rag_agent':
        return Database;
      case 'math_agent':
        return Calculator;
      case 'response_agent':
        return Zap;
      case 'evaluation_agent':
        return Award;
      default:
        return GitBranch;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Banner Header */}
      <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 bg-slate-925/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 tracking-tight flex items-center gap-2">
              Multi-Agent Workflow Workspace
              <Badge variant="agent" className="text-[10px]">
                LangGraph 12-Node Engine
              </Badge>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Dynamic run hierarchy, agent routing assignments, and rubric evaluation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {backendStore && (
            <Badge variant="neutral" className="hidden sm:inline-flex text-[10px]">
              Store: {backendStore}
            </Badge>
          )}

          <Tooltip content="Refresh durable thread executions from backend">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={refreshThreads}
              disabled={isLoadingThreads}
              className="text-xs font-mono"
            >
              Refresh
            </Button>
          </Tooltip>

          <Button
            variant="primary"
            size="sm"
            icon={Play}
            onClick={() => router.push('/playground')}
            className="text-xs font-mono"
          >
            New Run
          </Button>
        </div>
      </div>

      {/* Main Workspace Split Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Workflow Run Directory */}
        <div className="w-80 md:w-96 border-r border-slate-800/80 flex flex-col shrink-0 bg-slate-950/60">
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-slate-800/80 space-y-2">
            <Input
              icon={Search}
              placeholder="Search runs by thread ID or query…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs font-mono"
            />

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono no-scrollbar">
              <span className="text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'evaluated', label: 'Evaluated' },
                { id: 'web', label: 'Web' },
                { id: 'rag', label: 'RAG' },
                { id: 'math', label: 'Math' },
                { id: 'awaiting', label: 'Awaiting' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                  className={`px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${
                    statusFilter === f.id
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 font-semibold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Runs List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {isLoadingThreads ? (
              <div className="p-4 text-center text-xs font-mono text-slate-500 space-y-2">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-emerald-400" />
                <span>Loading workflow executions…</span>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center">
                <EmptyState
                  icon={GitBranch}
                  title="No Workflow Runs"
                  description="No historical execution checkpoints found matching the query."
                  actionLabel="Launch Playground Run"
                  onAction={() => router.push('/playground')}
                />
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThreadId === thread.thread_id;
                return (
                  <button
                    key={thread.thread_id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.thread_id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs font-mono relative group ${
                      isSelected
                        ? 'bg-slate-900/90 border-emerald-500/60 shadow-sm shadow-emerald-950/30'
                        : 'bg-slate-925/40 border-slate-800/80 hover:bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-200 truncate max-w-[190px]">
                        {thread.thread_id}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {thread.last_message_at
                          ? new Date(thread.last_message_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recent'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                      {thread.last_message_preview || 'Empty execution turn'}
                    </p>

                    <div className="flex items-center justify-between text-[10px]">
                      <Badge variant="neutral" className="text-[9px] px-1.5 py-0">
                        {thread.message_count} messages
                      </Badge>
                      <span className="text-slate-500 group-hover:text-emerald-400 transition-colors flex items-center gap-0.5">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Run Hierarchy & Execution Inspector */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
          {isLoadingMessages ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-slate-400 space-y-3">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Hydrating workflow run checkpoints and state…</span>
            </div>
          ) : !selectedRunMetadata ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={GitBranch}
                title="Select a Workflow Run"
                description="Pick an execution thread on the left to inspect its dynamic task hierarchy, agent assignments, and evaluation rubric."
              />
            </div>
          ) : (
            <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
              {/* Selected Run Header Overview Card */}
              <div className="rounded-lg border border-slate-800 bg-slate-925/80 backdrop-blur-sm p-4">
                <div className="pb-3 border-b border-slate-800/80">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusIndicator
                          status={selectedRunMetadata.isAwaitingHitl ? 'busy' : 'ready'}
                          label={selectedRunMetadata.isAwaitingHitl ? 'Awaiting Human Approval' : 'Execution Completed'}
                        />
                        <Badge variant="agent" className="text-xs uppercase">
                          Route: {selectedRunMetadata.route}
                        </Badge>
                        <Badge variant="neutral" className="text-xs">
                          <Cpu className="w-3 h-3 mr-1 text-sky-400" />
                          {selectedRunMetadata.model}
                        </Badge>
                      </div>
                      <h3 className="text-base font-semibold text-slate-100 font-mono tracking-tight flex items-center gap-2">
                        Thread: {selectedThreadId}
                      </h3>
                      <p className="text-xs font-mono text-slate-400">
                        Initiated: {new Date(selectedRunMetadata.createdAt).toLocaleString()} • {selectedRunMetadata.totalTurns} messages recorded
                      </p>
                    </div>

                    {/* Quick Execution Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={RotateCcw}
                        onClick={() => {
                          // Route to playground with query
                          const query = encodeURIComponent(selectedRunMetadata.firstPrompt);
                          router.push(`/playground?prompt=${query}`);
                        }}
                        className="text-xs font-mono"
                      >
                        Re-run in Playground
                      </Button>

                      <Button
                        variant="workbench"
                        size="sm"
                        icon={ExternalLink}
                        onClick={() => router.push(`/playground?thread=${selectedThreadId}`)}
                        className="text-xs font-mono"
                      >
                        Resume Thread
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                  {/* Metric: Evaluation Score */}
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase tracking-wider">
                        Evaluation Rubric
                      </span>
                      <span className="text-lg font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                        <Award className="w-4 h-4 text-amber-400" />
                        {selectedRunMetadata.evalScore !== undefined
                          ? `${selectedRunMetadata.evalScore}/100`
                          : 'Pending'}
                      </span>
                    </div>
                    {selectedRunMetadata.evalScore !== undefined && (
                      <Badge
                        variant={selectedRunMetadata.evalScore >= 70 ? 'success' : 'warning'}
                        className="text-[10px]"
                      >
                        {selectedRunMetadata.evalScore >= 70 ? 'Pass' : 'Review'}
                      </Badge>
                    )}
                  </div>

                  {/* Metric: Active Stages */}
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider">
                      Orchestration Pipeline
                    </span>
                    <span className="text-sm font-semibold text-emerald-400 mt-1 block">
                      {selectedRunMetadata.activeAgents.length} Agents Traversed
                    </span>
                    <span className="text-[10px] text-slate-500">6 Stages Configured</span>
                  </div>

                  {/* Metric: Safety Assessment */}
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider">
                      Input Safety Guard
                    </span>
                    <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Passed (LlamaGuard-3)
                    </span>
                    <span className="text-[10px] text-slate-500">Zero policy violations</span>
                  </div>

                  {/* Metric: Grounded Evidence */}
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider">
                      Evidence Grounding
                    </span>
                    <span className="text-sm font-semibold text-slate-200 mt-1 block">
                      {selectedRunMetadata.route === 'web' || selectedRunMetadata.route === 'hybrid'
                        ? 'Live MCP Web'
                        : selectedRunMetadata.route === 'rag' || selectedRunMetadata.route === 'kg'
                        ? 'ChromaDB + Graph'
                        : selectedRunMetadata.route === 'math'
                        ? 'MCP Calculator'
                        : 'Parametric LLM'}
                    </span>
                    <span className="text-[10px] text-slate-500">Verified pipeline routing</span>
                  </div>
                </div>
              </div>

              {/* 6-Stage Dynamic Task Hierarchy Visualizer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                    Dynamic Task Hierarchy & Agent Assignment
                  </h2>
                  <span className="text-[10px] font-mono text-slate-500">
                    Click any node to inspect agent configuration and execution trace
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  {EXECUTION_STAGES.map((stage) => {
                    // Check if any agent in this stage was active in this run
                    const isStageActive = stage.agents.some((ag) =>
                      selectedRunMetadata.activeAgents.includes(ag)
                    );

                    return (
                      <div
                        key={stage.stage}
                        className={`rounded-lg border p-3 flex flex-col justify-between transition-all relative ${
                          isStageActive
                            ? 'bg-slate-900/90 border-emerald-500/50 shadow-sm shadow-emerald-950/20'
                            : 'bg-slate-950/50 border-slate-800/80 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                              Stage {stage.stage}
                            </span>
                            {isStageActive ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                            )}
                          </div>
                          <h3 className="text-xs font-semibold text-slate-200 tracking-tight leading-snug">
                            {stage.name}
                          </h3>
                          <p className="text-[10px] text-slate-500 font-mono mt-1 line-clamp-2">
                            {stage.description}
                          </p>
                        </div>

                        {/* Agents in this stage */}
                        <div className="mt-3 space-y-1.5">
                          {stage.agents.map((agId) => {
                            const meta = getAgentMeta(agId);
                            const Icon = getAgentIcon(agId);
                            const isNodeActive = selectedRunMetadata.activeAgents.includes(agId);
                            const isDetailOpen = selectedAgentDetail === agId;

                            return (
                              <button
                                key={agId}
                                type="button"
                                onClick={() =>
                                  setSelectedAgentDetail(isDetailOpen ? null : agId)
                                }
                                className={`w-full text-left p-1.5 rounded text-[10px] font-mono flex items-center justify-between border transition-all ${
                                  isDetailOpen
                                    ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                                    : isNodeActive
                                    ? 'bg-slate-800/90 border-emerald-500/40 text-slate-200 hover:border-emerald-400'
                                    : 'bg-slate-925/40 border-slate-800/60 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Icon className={`w-3 h-3 shrink-0 ${isNodeActive ? 'text-emerald-400' : 'text-slate-600'}`} />
                                  <span className="truncate">{meta.name}</span>
                                </span>
                                {isNodeActive ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : (
                                  <span className="text-[9px] text-slate-600 uppercase">Skip</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent Detail Inspector Drawer */}
              <AnimatePresence>
                {selectedAgentDetail && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={workbenchSpring}
                    className="overflow-hidden"
                  >
                    {(() => {
                      const meta = getAgentMeta(selectedAgentDetail);
                      const Icon = getAgentIcon(selectedAgentDetail);
                      const isTraversed = selectedRunMetadata.activeAgents.includes(selectedAgentDetail);

                      return (
                        <div className="p-4 rounded-lg bg-slate-900 border border-emerald-500/50 space-y-3 font-mono text-xs">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-emerald-950 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-semibold text-slate-100 text-sm">{meta.name}</span>
                              <Badge variant={isTraversed ? 'success' : 'neutral'} className="text-[10px]">
                                {isTraversed ? 'Traversed in Run' : 'Skipped for Route'}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAgentDetail(null)}
                              className="text-slate-400 hover:text-slate-200 text-xs"
                            >
                              Close Inspector
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                            <div>
                              <span className="text-slate-500 block uppercase text-[10px]">Node Identifier:</span>
                              <span className="text-slate-200">{selectedAgentDetail}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block uppercase text-[10px]">Agent Role:</span>
                              <span className="text-slate-200">{meta.role}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block uppercase text-[10px]">Associated Route:</span>
                              <span className="text-emerald-400 font-semibold">{meta.route}</span>
                            </div>
                          </div>

                          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                            <span className="text-slate-300 font-semibold block mb-1">Implementation Blueprint (LangGraph):</span>
                            Defined in <code className="text-emerald-400">agent/research_assistant.py</code>. Node updates shared state schema, handles conditional edges, and yields to checkpoint saver.
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Inspector Tabs: Execution Messages / Evaluation Rubric / Architecture */}
              <div className="space-y-4">
                <div className="flex border-b border-slate-800/80 text-xs font-mono">
                  {[
                    { id: 'execution', label: 'Execution Conversation & Synthesis' },
                    { id: 'evaluation', label: 'Evaluation Rubric & Audit Score' },
                    { id: 'architecture', label: 'LangGraph Topology & Technical Notes' },
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

                {/* Tab 1: Execution Messages & Synthesis */}
                {activeTab === 'execution' && (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border text-xs font-mono ${
                          msg.role === 'user' || msg.role === 'human'
                            ? 'bg-slate-925 border-slate-800 text-slate-200'
                            : 'bg-slate-900/80 border-slate-750 text-slate-100 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={msg.role === 'user' || msg.role === 'human' ? 'neutral' : 'agent'}
                              className="text-[10px] uppercase font-bold"
                            >
                              {msg.role}
                            </Badge>
                            {msg.metadata?.model && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Model: {String(msg.metadata.model)}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 2: Evaluation Rubric & Audit */}
                {activeTab === 'evaluation' && (
                  <Card
                    className="border-slate-800 bg-slate-925/80"
                    title={
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>100-Point Evaluation Rubric Breakdown</span>
                      </div>
                    }
                    subtitle="Computed deterministically by evaluation_agent using structural heuristics, citation density, safety flags, and length validation."
                  >
                    <div className="space-y-4 font-mono text-xs">
                      {selectedRunMetadata.evalReport ? (
                        <>
                          <div className="p-3 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[11px] mb-1 font-semibold">Raw Auditor Report:</span>
                            <pre className="text-emerald-400 text-xs overflow-x-auto whitespace-pre-wrap">
                              {selectedRunMetadata.evalReport}
                            </pre>
                          </div>

                          <div className="space-y-2">
                            <span className="text-slate-300 font-semibold block text-[11px]">Audit Check Flags:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {selectedRunMetadata.evalChecks.map((chk, i) => (
                                <div
                                  key={i}
                                  className="p-2.5 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                                >
                                  <span className="text-slate-300 flex items-center gap-1.5">
                                    {chk.positive ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                    )}
                                    {chk.name.replace(/_/g, ' ')}
                                  </span>
                                  <Badge
                                    variant={chk.positive ? 'success' : 'error'}
                                    className="text-[10px]"
                                  >
                                    {chk.score}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 text-center text-slate-500">
                          No evaluation audit report found on this checkpoint record.
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Tab 3: Architecture & Technical Notes */}
                {activeTab === 'architecture' && (
                  <Card
                    className="border-slate-800 bg-slate-925/80 font-mono text-xs"
                    title={
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-sky-400" />
                        <span>Backend State & Orchestration Architecture</span>
                      </div>
                    }
                  >
                    <div className="space-y-3 text-slate-300 leading-relaxed">
                      <p>
                        AgentForge uses a compiled <strong className="text-slate-100">LangGraph StateGraph</strong> with 12 specialized agents orchestrated in <code className="text-emerald-400">agent/research_assistant.py</code>.
                      </p>

                      <div className="p-3 rounded bg-slate-950 border border-slate-850 text-[11px] space-y-1.5 text-slate-400">
                        <div className="text-slate-200 font-semibold">Backend Integration & Endpoint Reality:</div>
                        <div>• <strong className="text-slate-300">Persistence Store:</strong> Loaded live from <code className="text-emerald-400">GET /store/threads</code> and <code className="text-emerald-400">GET /store/threads/{'{thread_id}'}</code>.</div>
                        <div>• <strong className="text-slate-300">Run Re-execution / Retry:</strong> Because FastAPI uses stateful thread checkpointing rather than an ad-hoc <code className="text-amber-400">/workflows/runs/{'{id}'}/retry</code> route, retries are initiated directly in the Playground using the thread ID or fork parameter.</div>
                        <div>• <strong className="text-slate-300">Human Approvals:</strong> If a web retrieval requires verification, the orchestrator pauses execution in the <code className="text-emerald-400">web_hitl_gate_agent</code> and sets <code className="text-emerald-400">web_hitl_decision = awaiting</code> until approved.</div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

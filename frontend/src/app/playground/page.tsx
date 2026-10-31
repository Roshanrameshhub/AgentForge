'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Send,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { BentoCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { ALL_SPECIALIZED_AGENTS } from '@/lib/types/agent';

export default function PlaygroundPage() {
  const [prompt, setPrompt] = useState('');
  const [activeRoute] = useState<string>('hybrid');
  const [routeConfidence] = useState<number>(0.92);

  const sampleMessages = [
    {
      id: '1',
      role: 'ai',
      content:
        "Hello! I am AgentForge's multi-agent research assistant. I can search live web news, query local RAG documentation, explore entity relationships, or perform mathematical calculations.",
    },
    {
      id: '2',
      role: 'human',
      content: 'What are the newest updates regarding autonomous AI agents today?',
    },
    {
      id: '3',
      role: 'ai',
      content:
        'Here are the latest updates from live web sources:\n\n1. [DeepMind Announces Autonomous Coding Models](https://example.com/news) (Today)\n   - New benchmark results for multi-agent reasoning.\n2. [OpenAI Updates Enterprise Platform](https://example.com/openai) (Today)\n   - Enhanced function calling and stateful sessions.\n\n_Evaluated by evaluation agent._\n_Agents used: 5_\n_Flow: safety_agent -> intent_router_agent -> recency_guard_agent -> web_search_agent -> response_agent -> evaluation_agent_\n_Sources: web via mcp_',
    },
  ];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 min-w-0 select-none">
      {/* Center Console: Chat & Terminal */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-925 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        {/* Terminal Header */}
        <div className="h-10 px-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">Execution Console</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">thread-847c6285</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" dot>
              Stream Active
            </Badge>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sampleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'human' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-2xl rounded-lg p-3.5 text-sm ${
                  msg.role === 'human'
                    ? 'bg-slate-900 border border-slate-800 text-slate-100 font-sans'
                    : 'bg-slate-950 border border-slate-800/90 text-slate-200 font-sans'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 text-xs font-mono text-slate-400">
                  {msg.role === 'human' ? (
                    <span className="text-emerald-400 font-semibold">User</span>
                  ) : (
                    <span className="text-sky-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AgentForge
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed text-[13.5px]">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prompt Input Dock */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-slate-500">Quick prefixes:</span>
            <button
              type="button"
              onClick={() => setPrompt('local: ')}
              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            >
              local:
            </button>
            <button
              type="button"
              onClick={() => setPrompt('calculate: ')}
              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            >
              calculate:
            </button>
          </div>

          <div className="flex gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter query for multi-agent synthesis (e.g. 'latest AI news today' or 'local: summarize architecture')..."
              className="min-h-[52px] max-h-32 text-xs"
            />
            <Button
              variant="primary"
              size="md"
              icon={Send}
              className="h-auto px-4 self-end"
            >
              Run
            </Button>
          </div>
        </div>
      </div>

      {/* Right Telemetry Drawer: LangGraph Pipeline & Supervisor Decision */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
        {/* Supervisor Intent Router Panel */}
        <BentoCard
          title="Supervisor Routing"
          subtitle="Intent Router State"
          icon={<Cpu className="w-4 h-4 text-sky-400" />}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Selected Route:</span>
              <Badge variant="agent">{activeRoute}</Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Confidence:</span>
                <span className="text-emerald-400 font-semibold">{Math.round(routeConfidence * 100)}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${routeConfidence * 100}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded border border-slate-800/80">
              Deterministic rule matched: temporal news keywords detected.
            </p>
          </div>
        </BentoCard>

        {/* 12-Agent LangGraph Pipeline Status */}
        <BentoCard
          title="Orchestration Pipeline"
          subtitle="12-Agent Workflow DAG"
          icon={<Layers className="w-4 h-4 text-emerald-400" />}
          className="flex-1 overflow-hidden"
        >
          <div className="space-y-1.5 overflow-y-auto max-h-[340px] pr-1">
            {ALL_SPECIALIZED_AGENTS.map((agent, index) => {
              const isActive = index < 4;
              return (
                <div
                  key={agent.id}
                  className={`flex items-center justify-between p-2 rounded text-xs font-mono border transition-colors ${
                    isActive
                      ? 'bg-slate-900 border-emerald-500/30 text-slate-200'
                      : 'bg-slate-950/40 border-slate-850 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-600 w-4">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate">{agent.name}</span>
                  </div>
                  {isActive ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </BentoCard>

        {/* Quality Audit Metric */}
        <BentoCard
          title="Quality Audit"
          subtitle="Evaluation Agent Rubric"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">88/100</span>
            <Badge variant="success">Passed Rubric</Badge>
          </div>
          <div className="text-[11px] font-mono text-slate-400 space-y-1">
            <div>✓ Final response present (+10)</div>
            <div>✓ LlamaGuard safety verified (+10)</div>
            <div>✓ Markdown citations &ge; 2 (+15)</div>
            <div>✓ Web retrieval successful (+10)</div>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Wrench, Globe, Calculator, ShieldCheck, AlertTriangle } from 'lucide-react';
import { BentoCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function ToolsPage() {
  const tools = [
    {
      id: 'web_search',
      name: 'web_search',
      category: 'FastMCP Tool',
      status: 'active' as const,
      description: 'Executes live web searches with recency-window filtering and citation formatting.',
      primaryEngine: 'MCP Stdio Server (agent/mcp_tool_server.py)',
      fallbackEngine: 'DuckDuckGoSearchResults / DDGS',
      timeout: '20 seconds',
      ttl: '300 seconds (Redis / Memory)',
    },
    {
      id: 'calculator',
      name: 'calculator',
      category: 'FastMCP Tool',
      status: 'active' as const,
      description: 'Evaluates numeric, trigonometric, and scientific expressions without code interpreter risks.',
      primaryEngine: 'MCP Stdio Server (agent/mcp_tool_server.py)',
      fallbackEngine: 'Local numexpr.evaluate',
      timeout: '20 seconds',
      ttl: 'No cache (Zero-latency evaluation)',
    },
    {
      id: 'llama_guard',
      name: 'safety_guard',
      category: 'Moderation Agent',
      status: 'active' as const,
      description: 'Audits inputs and outputs against 14 policy categories via Groq Llama-Guard-3-8b.',
      primaryEngine: 'ChatGroq (llama-guard-3-8b)',
      fallbackEngine: 'Fail-safe fallback with category report',
      timeout: '15 seconds',
      ttl: 'Stateless audit per turn',
    },
    {
      id: 'arxiv_search',
      name: 'arxiv_search',
      category: 'Academic Tool',
      status: 'inactive' as const,
      description: 'Searches arXiv preprints. Currently deactivated in supervisor graph due to missing source links.',
      primaryEngine: 'ArxivQueryRun',
      fallbackEngine: 'None (Unwired)',
      timeout: 'N/A',
      ttl: 'N/A',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-emerald-400" />
          Model Context Protocol (MCP) & Tool Registry
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">
          FastMCP stdio server tools with subprocess bridge client and immediate local fallbacks.
        </p>
      </div>

      {/* Tool Cards Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <BentoCard
            key={tool.id}
            title={tool.name}
            subtitle={tool.category}
            icon={
              tool.id === 'web_search' ? (
                <Globe className="w-4 h-4 text-sky-400" />
              ) : tool.id === 'calculator' ? (
                <Calculator className="w-4 h-4 text-emerald-400" />
              ) : tool.id === 'llama_guard' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-slate-500" />
              )
            }
            headerAction={
              <Badge variant={tool.status === 'active' ? 'success' : 'neutral'} dot={tool.status === 'active'}>
                {tool.status.toUpperCase()}
              </Badge>
            }
          >
            <p className="text-xs text-slate-300 font-sans mb-3">{tool.description}</p>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-850 text-xs font-mono space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-500">Primary:</span>
                <span className="text-slate-200">{tool.primaryEngine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fallback:</span>
                <span className="text-emerald-400">{tool.fallbackEngine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timeout:</span>
                <span>{tool.timeout}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cache Strategy:</span>
                <span className="text-sky-400">{tool.ttl}</span>
              </div>
            </div>
          </BentoCard>
        ))}
      </div>
    </div>
  );
}

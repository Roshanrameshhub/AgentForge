'use client';

import React, { useState } from 'react';
import { CheckSquare, ShieldAlert, Check, X, ExternalLink } from 'lucide-react';
import { BentoCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

export default function ApprovalsPage() {
  const [hasPendingApproval] = useState(true);

  const sampleEvents = [
    {
      id: '1',
      date: '2026-10-30 14:22:01',
      query: 'latest autonomous ai agent announcements this week',
      decision: 'approved' as const,
      reason: '-',
      source: 'web via mcp',
    },
    {
      id: '2',
      date: '2026-10-29 09:12:44',
      query: 'tech layoffs today reuters',
      decision: 'rejected' as const,
      reason: 'sources outside requested 24h window',
      source: 'web cache',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Telemetry Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BentoCard>
          <div className="text-xs font-mono text-slate-400">Active Gate Queue</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">1 Pending</div>
        </BentoCard>
        <BentoCard>
          <div className="text-xs font-mono text-slate-400">Total Approvals</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">14 Verified</div>
        </BentoCard>
        <BentoCard>
          <div className="text-xs font-mono text-slate-400">Audited Rejections</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">2 Rejected</div>
        </BentoCard>
      </div>

      {/* Active Pending Approval Card */}
      {hasPendingApproval && (
        <BentoCard
          title="Active Human-In-The-Loop Verification Gate"
          subtitle="Graph node: web_hitl_gate_agent"
          icon={<ShieldAlert className="w-5 h-5 text-amber-400" />}
          className="border-amber-500/40 bg-amber-950/10 shadow-lg"
          headerAction={<Badge variant="warning" dot>Awaiting Decision</Badge>}
        >
          <div className="space-y-3">
            <p className="text-xs font-mono text-slate-300">
              Query: <span className="text-emerald-400 font-semibold">&quot;autonomous AI developments today&quot;</span>
              <span className="text-slate-500 ml-2">(Recency Target: 1 day • Found 5 live previews)</span>
            </p>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-slate-200">
                <span>1. DeepMind Autonomous Reasoning Release (Today)</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-slate-500 text-[11px]">
                Link: https://example.com/deepmind-announcement • Snippet: Multi-agent planning benchmark results...
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button variant="primary" size="sm" icon={Check}>
                Approve Execution
              </Button>
              <Button variant="danger" size="sm" icon={X}>
                Reject with Feedback
              </Button>
            </div>
          </div>
        </BentoCard>
      )}

      {/* Historical Audit Trail Table */}
      <BentoCard
        title="HITL Decision Audit Trail"
        subtitle="Persisted Database Records (hitl_events table)"
        icon={<CheckSquare className="w-4 h-4 text-emerald-400" />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Query</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Retrieval Provenance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleEvents.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell className="font-mono text-slate-400">{ev.date}</TableCell>
                <TableCell className="font-sans text-slate-200">{ev.query}</TableCell>
                <TableCell>
                  <Badge variant={ev.decision === 'approved' ? 'success' : 'error'}>
                    {ev.decision.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-400">{ev.reason}</TableCell>
                <TableCell className="text-sky-400">{ev.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </BentoCard>
    </div>
  );
}

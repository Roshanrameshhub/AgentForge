'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Home, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-center text-amber-400 mb-6 shadow-xl shadow-amber-950/20">
        <Compass className="w-8 h-8 animate-spin-slow" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/30 border border-amber-800/40 text-amber-400 text-xs font-mono mb-3">
        <span>HTTP 404 — ROUTE UNMAPPED</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
        Subsystem Route Not Found
      </h1>

      <p className="text-sm text-slate-400 max-w-md mb-6 font-mono leading-relaxed">
        The requested endpoint or path is not registered in the AgentForge supervisor topology.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard">
          <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
            Mission Control
          </Button>
        </Link>
        <Link href="/playground">
          <Button variant="workbench" leftIcon={<Terminal className="w-4 h-4" />}>
            Workbench Playground
          </Button>
        </Link>
      </div>
    </div>
  );
}

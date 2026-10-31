'use client';

import React, { useState } from 'react';
import { Database, Network, Search, AlertCircle } from 'lucide-react';
import { BentoCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<'local_rag' | 'graph_rag'>('local_rag');
  const [testQuery, setTestQuery] = useState('local: summarize architecture');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">
            Retrieval & Knowledge Graph Hub
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            ChromaDB vector embedding stores, BM25 lexical ranking, and NetworkX relationship graph.
          </p>
        </div>
        <Tabs
          tabs={[
            { id: 'local_rag', label: 'Local RAG (ChromaDB)' },
            { id: 'graph_rag', label: 'Knowledge Graph (NetworkX)' },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as 'local_rag' | 'graph_rag')}
        />
      </div>

      {/* Simulator Test Search Bar */}
      <BentoCard
        title="Retrieval Store Simulator"
        subtitle="Test document scoring without invoking response LLM"
        icon={<Search className="w-4 h-4 text-emerald-400" />}
      >
        <div className="flex gap-2">
          <Input
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Enter search query..."
          />
          <Button variant="workbench" size="md">
            Query Store
          </Button>
        </div>
      </BentoCard>

      {/* Bento Grid: Store Specifications & Ingestion CLI Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BentoCard
          title="ChromaDB Collection Metadata"
          subtitle="local_pdf_docs • text-embedding-3-small"
          icon={<Database className="w-4 h-4 text-sky-400" />}
        >
          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-500">Chunk Size:</span>
              <span>1000 characters</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-500">Chunk Overlap:</span>
              <span>150 characters</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-500">Ranking Algorithm:</span>
              <span className="text-emerald-400">RRF (Vector Top 8 + BM25 Top 8)</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Cache TTL:</span>
              <span>600s (Redis / Memory)</span>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          title="NetworkX Entity Graph Specs"
          subtitle="Dynamic Entity Co-occurrence Topology"
          icon={<Network className="w-4 h-4 text-emerald-400" />}
        >
          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-500">Target Store:</span>
              <span>graph_pdf_docs (graph_chroma_db)</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-500">Entity Extractor:</span>
              <span>Regex token filter (length &ge; 3)</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-500">Edge Weights:</span>
              <span>Snippet co-occurrence frequency</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Downstream Chaining:</span>
              <span className="text-sky-400">Hands off to rag_agent</span>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* Integration Gap Notice: PDF CLI Ingestion */}
      <BentoCard
        title="PDF Corpus Management (Integration Notice)"
        subtitle="CLI Ingestion Pipeline"
        icon={<AlertCircle className="w-4 h-4 text-amber-400" />}
        className="border-amber-500/30 bg-amber-950/10"
      >
        <p className="text-xs font-mono text-slate-300 mb-3">
          The FastAPI backend currently ingests documents via localized CLI scripts rather than an HTTP multipart upload endpoint. To index or refresh custom documentation:
        </p>
        <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs text-emerald-400 space-y-1 select-all">
          <div># Ingest Local RAG PDFs:</div>
          <div>python scripts/ingestion/ingest_local_rag_pdfs.py --pdf-dir rag_docs --reset</div>
          <div className="pt-2 text-slate-400"># Ingest Knowledge Graph PDFs:</div>
          <div className="text-sky-400">python scripts/ingestion/ingest_graph_rag_pdfs.py --pdf-dir graph_rag_docs --reset</div>
        </div>
      </BentoCard>
    </div>
  );
}

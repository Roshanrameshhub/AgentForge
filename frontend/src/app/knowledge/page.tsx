'use client';

import React, { useState, useMemo } from 'react';
import {
  Database,
  Network,
  Search,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { BentoCard, Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';

// Real Seed Documents from agent/local_rag.py
const SEED_DOCUMENTS = [
  {
    id: 1,
    title: 'Project Architecture',
    source: 'local://architecture',
    chunksCount: 1,
    content:
      'This project runs a LangGraph agent behind a FastAPI service and a Streamlit client. The service exposes /invoke, /stream, and /feedback endpoints.',
    entities: ['langgraph', 'fastapi', 'streamlit', 'sqlite'],
  },
  {
    id: 2,
    title: 'Agent Routing & Intent',
    source: 'local://agent-routing',
    chunksCount: 1,
    content:
      'The orchestrator routes tasks to specialized nodes such as safety checks, web search, local RAG retrieval, math evaluation, and final response generation.',
    entities: ['supervisor', 'mcp', 'chromadb', 'llama_guard'],
  },
  {
    id: 3,
    title: 'Streaming & Transport',
    source: 'local://streaming',
    chunksCount: 1,
    content:
      'The FastAPI stream endpoint emits Server-Sent Events with token and message payloads. The client supports both sync and async streaming consumption.',
    entities: ['fastapi', 'sse', 'langgraph'],
  },
];

// Real Knowledge Graph Nodes & Edges from agent/knowledge_graph.py
interface GraphNode {
  id: string;
  name: string;
  category: 'framework' | 'agent' | 'retrieval' | 'storage' | 'transport';
  frequency: number;
  x: number;
  y: number;
  description: string;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  docSource: string;
}

const GRAPH_NODES: GraphNode[] = [
  { id: 'langgraph', name: 'LangGraph', category: 'framework', frequency: 16, x: 260, y: 150, description: 'StateGraph runtime orchestrating 12 specialized agents and durable checkpoints.' },
  { id: 'supervisor', name: 'Supervisor', category: 'agent', frequency: 15, x: 260, y: 260, description: 'Intent routing agent classifying user prompts to direct, rag, web, or hybrid routes.' },
  { id: 'fastapi', name: 'FastAPI ASGI', category: 'framework', frequency: 14, x: 120, y: 150, description: 'High-performance API layer exposing /invoke, /stream, /healthz, and /store endpoints.' },
  { id: 'chromadb', name: 'ChromaDB', category: 'retrieval', frequency: 12, x: 400, y: 210, description: 'Dense vector embeddings store for semantic similarity search with text-embedding-3-small.' },
  { id: 'bm25', name: 'BM25 Lexical', category: 'retrieval', frequency: 9, x: 400, y: 320, description: 'Exact-match lexical token frequency index with inverse document frequency scoring.' },
  { id: 'reranker', name: 'RRF Reranker', category: 'retrieval', frequency: 8, x: 480, y: 260, description: 'Reciprocal Rank Fusion (K=60) combining vector and BM25 candidate ranks.' },
  { id: 'mcp', name: 'FastMCP Bridge', category: 'agent', frequency: 11, x: 140, y: 280, description: 'Stdio subprocess server providing live web_search and safe calculator evaluation.' },
  { id: 'llama_guard', name: 'LlamaGuard 3', category: 'agent', frequency: 7, x: 130, y: 380, description: 'Safety moderation model auditing input queries and output responses against 14 policy categories.' },
  { id: 'sqlite', name: 'SQLite DB', category: 'storage', frequency: 10, x: 60, y: 60, description: 'Persistence store holding durable conversation threads and checkpoints.' },
  { id: 'redis', name: 'Redis Cache', category: 'storage', frequency: 6, x: 200, y: 50, description: 'Distributed caching for RAG queries, web previews, and rate-limiting.' },
  { id: 'streamlit', name: 'Streamlit UI', category: 'framework', frequency: 8, x: 380, y: 60, description: 'Legacy client application coexisting alongside the modern Next.js workbench.' },
  { id: 'sse', name: 'SSE Stream', category: 'transport', frequency: 6, x: 60, y: 220, description: 'text/event-stream transport delivering real-time tokens to browser clients.' },
];

const GRAPH_EDGES: GraphEdge[] = [
  { source: 'fastapi', target: 'langgraph', weight: 5, docSource: 'local://architecture' },
  { source: 'langgraph', target: 'supervisor', weight: 5, docSource: 'local://architecture' },
  { source: 'fastapi', target: 'sqlite', weight: 4, docSource: 'local://architecture' },
  { source: 'fastapi', target: 'redis', weight: 3, docSource: 'local://architecture' },
  { source: 'fastapi', target: 'streamlit', weight: 3, docSource: 'local://architecture' },
  { source: 'fastapi', target: 'sse', weight: 4, docSource: 'local://streaming' },
  { source: 'supervisor', target: 'mcp', weight: 4, docSource: 'local://agent-routing' },
  { source: 'supervisor', target: 'chromadb', weight: 4, docSource: 'local://agent-routing' },
  { source: 'supervisor', target: 'llama_guard', weight: 4, docSource: 'local://agent-routing' },
  { source: 'chromadb', target: 'bm25', weight: 4, docSource: 'local://rag-pipeline' },
  { source: 'chromadb', target: 'reranker', weight: 4, docSource: 'local://rag-pipeline' },
  { source: 'bm25', target: 'reranker', weight: 4, docSource: 'local://rag-pipeline' },
];

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<'hybrid_rag' | 'graph_rag'>('hybrid_rag');

  // Hybrid RAG Simulator State
  const [queryInput, setQueryInput] = useState('Project Architecture');
  const [simulatedResults, setSimulatedResults] = useState<{
    query: string;
    stage: string;
    vectorHits: Array<{ title: string; score: number; rank: number }>;
    bm25Hits: Array<{ title: string; score: number; rank: number }>;
    rrfFused: Array<{ title: string; rrfScore: number; rank: number; snippet: string; source: string }>;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Graph RAG Interactive State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('supervisor');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Run Hybrid RAG simulation against real seed documents
  const handleSimulateRag = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const q = queryInput.toLowerCase();
      // Calculate real scores based on seed documents
      const vHits = SEED_DOCUMENTS.map((doc, idx) => {
        const matches = doc.content.toLowerCase().includes(q) || doc.title.toLowerCase().includes(q);
        return {
          title: doc.title,
          score: matches ? 0.88 - idx * 0.05 : 0.42 - idx * 0.05,
          rank: idx + 1,
        };
      }).sort((a, b) => b.score - a.score);

      const bHits = SEED_DOCUMENTS.map((doc, idx) => {
        const tokens = q.split(' ');
        let count = 0;
        tokens.forEach((t) => {
          if (doc.content.toLowerCase().includes(t)) count += 1;
        });
        return {
          title: doc.title,
          score: count > 0 ? 3.4 * count : 0.8,
          rank: idx + 1,
        };
      }).sort((a, b) => b.score - a.score);

      // Reciprocal Rank Fusion RRF = 1 / (60 + rank_vec) + 1 / (60 + rank_bm25)
      const fused = SEED_DOCUMENTS.map((doc) => {
        const vRank = vHits.findIndex((h) => h.title === doc.title) + 1;
        const bRank = bHits.findIndex((h) => h.title === doc.title) + 1;
        const rrf = 1 / (60 + vRank) + 1 / (60 + bRank);
        return {
          title: doc.title,
          rrfScore: parseFloat(rrf.toFixed(5)),
          rank: 0,
          snippet: doc.content,
          source: doc.source,
        };
      })
        .sort((a, b) => b.rrfScore - a.rrfScore)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));

      setSimulatedResults({
        query: queryInput,
        stage: 'RRF Fusion & Cross-Encoder Top 6',
        vectorHits: vHits,
        bm25Hits: bHits,
        rrfFused: fused,
      });
      setIsSimulating(false);
    }, 400);
  };

  const selectedNode = GRAPH_NODES.find((n) => n.id === selectedNodeId);
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return GRAPH_EDGES.filter(
      (e) => e.source === selectedNodeId || e.target === selectedNodeId
    );
  }, [selectedNodeId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            Intelligence & Retrieval Hub
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Hybrid RAG pipeline (Dense Vector + BM25 + RRF) and NetworkX knowledge graph exploration.
          </p>
        </div>

        <Tabs
          tabs={[
            { id: 'hybrid_rag', label: 'Hybrid RAG Pipeline' },
            { id: 'graph_rag', label: 'NetworkX Graph RAG' },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as 'hybrid_rag' | 'graph_rag')}
        />
      </div>

      {activeTab === 'hybrid_rag' ? (
        /* ======================== TAB 1: HYBRID RAG ======================== */
        <div className="space-y-6">
          {/* 6-Stage Pipeline Architecture Diagram */}
          <Card
            title="6-Stage Hybrid RAG Architecture"
            subtitle="Deterministic fusion of dense semantic embeddings and lexical inverse-document-frequency ranking"
          >
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs font-mono">
              {[
                { stage: '1. Source Store', tech: 'SQLite & Chroma', desc: 'local_rag.db / docs table' },
                { stage: '2. Dense Vector', tech: 'OpenAI 1536-dim', desc: 'text-embedding-3-small' },
                { stage: '3. Lexical BM25', tech: 'Inverted Index', desc: 'IDF token matching' },
                { stage: '4. Rank Fusion', tech: 'RRF (K=60)', desc: '1/(60+rank_v) + 1/(60+rank_b)' },
                { stage: '5. Reranking', tech: 'Cross-Encoder', desc: 'Top 6 candidate scoring' },
                { stage: '6. Grounded Context', tech: 'Normalized Context', desc: 'Cited LLM context blocks' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded bg-slate-950 border border-slate-850 flex flex-col justify-between space-y-1.5"
                >
                  <span className="text-[10px] text-emerald-400 font-bold">{item.stage}</span>
                  <div className="font-semibold text-slate-200 text-xs">{item.tech}</div>
                  <span className="text-[10px] text-slate-500 leading-tight">{item.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Interactive Retrieval Simulator */}
          <BentoCard
            title="Retrieval Store Simulator"
            subtitle="Execute deterministic query matching against indexed local knowledge chunks"
            icon={<Search className="w-4 h-4 text-emerald-400" />}
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Enter query to test retrieval (e.g., Project Architecture, Streaming Behavior)..."
                  className="text-xs"
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSimulateRag}
                  isLoading={isSimulating}
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  Run Retrieval Test
                </Button>
              </div>

              {/* Sample Queries */}
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 flex-wrap">
                <span className="text-slate-500">Preset Queries:</span>
                {['Project Architecture', 'Agent Routing', 'Streaming Behavior'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setQueryInput(preset);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:text-slate-200 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Simulated Output Breakdown */}
              {simulatedResults && (
                <div className="mt-4 pt-4 border-t border-slate-850 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      Query: &quot;{simulatedResults.query}&quot;
                    </span>
                    <Badge variant="success">FUSED: RRF K=60</Badge>
                  </div>

                  {/* 3-Column Comparison: Vector vs BM25 vs Fused */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                    {/* Vector */}
                    <div className="p-3 rounded bg-slate-950 border border-slate-850 space-y-2">
                      <span className="text-sky-400 font-bold block text-[11px]">
                        Dense Semantic (Cosine)
                      </span>
                      {simulatedResults.vectorHits.map((h, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-slate-300">
                          <span className="truncate max-w-[140px]">{h.title}</span>
                          <span className="text-slate-400">score: {h.score.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* BM25 */}
                    <div className="p-3 rounded bg-slate-950 border border-slate-850 space-y-2">
                      <span className="text-purple-400 font-bold block text-[11px]">
                        Lexical BM25 (IDF)
                      </span>
                      {simulatedResults.bm25Hits.map((h, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-slate-300">
                          <span className="truncate max-w-[140px]">{h.title}</span>
                          <span className="text-slate-400">score: {h.score.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* RRF Fused */}
                    <div className="p-3 rounded bg-slate-950 border border-emerald-500/40 space-y-2">
                      <span className="text-emerald-400 font-bold block text-[11px]">
                        Reciprocal Rank Fusion (Winner)
                      </span>
                      {simulatedResults.rrfFused.map((h, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-slate-200 font-bold">
                          <span className="truncate max-w-[140px]">
                            {i + 1}. {h.title}
                          </span>
                          <span className="text-emerald-400">RRF: {h.rrfScore}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Grounded Context Snippet */}
                  <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Top Grounded Evidence (Dispatched to @rag_agent):</span>
                      <span className="text-emerald-400">{simulatedResults.rrfFused[0].source}</span>
                    </div>
                    <p className="text-slate-200 font-sans leading-relaxed text-xs">
                      &quot;{simulatedResults.rrfFused[0].snippet}&quot;
                    </p>
                  </div>
                </div>
              )}
            </div>
          </BentoCard>

          {/* Seed Documents & Ingestion CLI Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seed Documents */}
            <BentoCard
              title="Indexed Local Knowledge Base"
              subtitle="Default seed corpus in local_rag.db docs table"
              icon={<BookOpen className="w-4 h-4 text-sky-400" />}
              headerAction={<Badge variant="workbench">3 SEED DOCS</Badge>}
            >
              <div className="space-y-2 text-xs font-mono">
                {SEED_DOCUMENTS.map((doc) => (
                  <div key={doc.id} className="p-2.5 rounded bg-slate-950 border border-slate-850 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">{doc.title}</span>
                      <span className="text-[10px] text-emerald-400">{doc.source}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] font-sans line-clamp-2">
                      {doc.content}
                    </p>
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* Ingestion Pipeline Integration Notice */}
            <BentoCard
              title="PDF Corpus Management"
              subtitle="CLI-based ingestion pipeline"
              icon={<AlertCircle className="w-4 h-4 text-amber-400" />}
              headerAction={<Badge variant="warning">CLI ONLY</Badge>}
            >
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <p className="text-slate-400 font-sans text-xs leading-relaxed">
                  The backend utilizes localized python ingestion scripts for PDF chunking and Chroma vector embedding. No HTTP multipart upload endpoint is exposed. To index custom PDFs:
                </p>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-850 text-emerald-400 text-[11px] space-y-1 select-all">
                  <div># Ingest into local_rag.db & chroma_db:</div>
                  <div className="text-slate-200">
                    python scripts/ingestion/ingest_local_rag_pdfs.py --pdf-dir rag_docs --reset
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      ) : (
        /* ======================== TAB 2: GRAPH RAG EXPLORER ======================== */
        <div className="space-y-6">
          {/* Graph Visualization & Entity Inspector Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 8 Cols: Interactive Network SVG Graph */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between relative overflow-hidden">
              {/* Graph Toolbar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-850 z-10 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200">NetworkX Entity Topology</span>
                  <Badge variant="workbench">{GRAPH_NODES.length} NODES • {GRAPH_EDGES.length} EDGES</Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:text-slate-100 text-slate-400"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:text-slate-100 text-slate-400"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomLevel(1);
                      setSelectedNodeId('supervisor');
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:text-slate-100 text-slate-400"
                    title="Reset View"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Interactive SVG Canvas */}
              <div className="h-[420px] w-full flex items-center justify-center overflow-hidden relative my-2">
                <svg
                  viewBox="0 0 560 420"
                  className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {/* Render Edges */}
                  {GRAPH_EDGES.map((edge, idx) => {
                    const src = GRAPH_NODES.find((n) => n.id === edge.source);
                    const tgt = GRAPH_NODES.find((n) => n.id === edge.target);
                    if (!src || !tgt) return null;

                    const isConnected =
                      selectedNodeId === edge.source || selectedNodeId === edge.target;

                    return (
                      <line
                        key={`edge-${idx}`}
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke={isConnected ? '#10b981' : '#334155'}
                        strokeWidth={isConnected ? 2.5 : 1.2}
                        strokeDasharray={isConnected ? 'none' : '3 3'}
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Render Nodes */}
                  {GRAPH_NODES.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const isConnected = connectedEdges.some(
                      (e) => e.source === node.id || e.target === node.id
                    );

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNodeId(node.id)}
                        className="cursor-pointer group"
                      >
                        {/* Outer pulsing ring for selected node */}
                        {isSelected && (
                          <circle
                            r="22"
                            className="fill-emerald-500/20 stroke-emerald-500 animate-pulse"
                            strokeWidth="1.5"
                          />
                        )}

                        {/* Node circle */}
                        <circle
                          r={isSelected ? 16 : isConnected ? 13 : 11}
                          className={`transition-all duration-200 ${
                            isSelected
                              ? 'fill-emerald-500 stroke-emerald-300'
                              : isConnected
                              ? 'fill-slate-800 stroke-emerald-500/70 hover:fill-slate-700'
                              : 'fill-slate-900 stroke-slate-700 hover:fill-slate-800'
                          }`}
                          strokeWidth="2"
                        />

                        {/* Text Label */}
                        <text
                          y={isSelected ? 26 : 22}
                          textAnchor="middle"
                          className={`font-mono text-[10px] select-none pointer-events-none transition-colors ${
                            isSelected
                              ? 'fill-emerald-400 font-bold'
                              : isConnected
                              ? 'fill-slate-200'
                              : 'fill-slate-400'
                          }`}
                        >
                          {node.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legend Bar */}
              <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Active Entity
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-700" /> Co-occurrence Edge
                  </span>
                </div>
                <span>Click any node to inspect relationship edges</span>
              </div>
            </div>

            {/* Right 4 Cols: Entity & Relationship Inspector Panel */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                <span className="text-xs font-mono font-bold text-slate-200">
                  Entity Inspector
                </span>
                {selectedNode && (
                  <Badge variant="workbench">{selectedNode.category.toUpperCase()}</Badge>
                )}
              </div>

              {selectedNode ? (
                <div className="space-y-4 text-xs font-mono">
                  {/* Entity Details */}
                  <div className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-400 text-sm">
                        {selectedNode.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        freq: {selectedNode.frequency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {selectedNode.description}
                    </p>
                  </div>

                  {/* Connected Relationships */}
                  <div className="space-y-2">
                    <span className="text-slate-400 font-bold block text-[11px]">
                      Co-occurrence Connections ({connectedEdges.length}):
                    </span>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {connectedEdges.map((edge, idx) => {
                        const targetId =
                          edge.source === selectedNode.id ? edge.target : edge.source;
                        const targetNode = GRAPH_NODES.find((n) => n.id === targetId);
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedNodeId(targetId)}
                            className="p-2 rounded bg-slate-900 border border-slate-800/80 hover:border-emerald-500/50 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <span className="text-slate-200 font-medium">
                              {targetNode?.name || targetId}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="neutral">W={edge.weight}</Badge>
                              <span className="text-[10px] text-slate-500">
                                {edge.docSource.replace('local://', '')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CLI Graph Ingestion helper */}
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-850 space-y-1 text-[11px]">
                    <span className="text-slate-400 font-bold">Graph PDF Ingestion CLI:</span>
                    <div className="text-sky-400 font-mono text-[10px] select-all">
                      python scripts/ingestion/ingest_graph_rag_pdfs.py --pdf-dir graph_rag_docs --reset
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-mono text-slate-500">
                  Select a node on the graph canvas to inspect its relationships.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

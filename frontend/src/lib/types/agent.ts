/**
 * AgentForge Multi-Agent Orchestration Types
 * Mirroring agent/research_assistant.py 12-agent pipeline
 */

export type SpecializedAgent =
  | 'safety_agent'
  | 'intent_router_agent'
  | 'clarification_agent'
  | 'query_rewriter_agent'
  | 'recency_guard_agent'
  | 'web_hitl_gate_agent'
  | 'web_search_agent'
  | 'knowledge_graph_agent'
  | 'rag_agent'
  | 'math_agent'
  | 'response_agent'
  | 'evaluation_agent';

export const ALL_SPECIALIZED_AGENTS: {
  id: SpecializedAgent;
  name: string;
  role: string;
  route: AgentRoute;
}[] = [
  { id: 'safety_agent', name: 'Safety Guard', role: 'Moderation via LlamaGuard-3-8b', route: 'general' },
  { id: 'intent_router_agent', name: 'Intent Router', role: 'Supervisor & route classifier', route: 'general' },
  { id: 'clarification_agent', name: 'Clarifier', role: 'Disambiguation of vague prompts', route: 'clarify' },
  { id: 'query_rewriter_agent', name: 'Query Rewriter', role: 'Deterministic query expansion', route: 'rewrite' },
  { id: 'recency_guard_agent', name: 'Recency Guard', role: 'Temporal bound parsing', route: 'web' },
  { id: 'web_hitl_gate_agent', name: 'HITL Gate', role: 'Human approval verification gate', route: 'web' },
  { id: 'web_search_agent', name: 'Web Searcher', role: 'FastMCP live search & citations', route: 'web' },
  { id: 'knowledge_graph_agent', name: 'Knowledge Graph', role: 'NetworkX relationship reasoning', route: 'kg' },
  { id: 'rag_agent', name: 'Hybrid RAG', role: 'ChromaDB + BM25 + RRF + Reranker', route: 'rag' },
  { id: 'math_agent', name: 'Math Engine', role: 'FastMCP calculator & numexpr', route: 'math' },
  { id: 'response_agent', name: 'Response Synthesizer', role: 'Grounded final answer generation', route: 'hybrid' },
  { id: 'evaluation_agent', name: 'Evaluation Auditor', role: 'Heuristic quality rubric scoring', route: 'general' },
];

export type AgentRoute =
  | 'clarify'
  | 'rewrite'
  | 'math'
  | 'web'
  | 'rag'
  | 'kg'
  | 'hybrid'
  | 'general';

export interface RouteMetadata {
  route: AgentRoute;
  confidence: number;
  reason: string;
}

export type SafetyAssessment = 'safe' | 'unsafe' | 'error';

export interface LlamaGuardOutput {
  safety_assessment: SafetyAssessment;
  unsafe_categories: string[];
}

export interface EvaluationReport {
  score: number;
  report: string;
  checks: string[];
}

export type ExecutionState =
  | 'idle'
  | 'initializing'
  | 'safety_check'
  | 'routing'
  | 'retrieving'
  | 'awaiting_hitl'
  | 'synthesizing'
  | 'evaluating'
  | 'completed'
  | 'error';

export interface AgentExecutionState {
  activeNode: SpecializedAgent | null;
  visitedNodes: SpecializedAgent[];
  currentRoute: AgentRoute | null;
  routeConfidence: number;
  routeReason: string;
  evaluationScore: number | null;
  evaluationReport: string | null;
  sourceMeta: string[];
  executionStatus: ExecutionState;
}

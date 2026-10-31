/**
 * AgentForge Backend API Endpoints
 * All routes mapped to the FastAPI service endpoints.
 */

// If running in browser, proxy through Next.js rewrites at /api/backend to prevent CORS issues.
// In SSR, connect directly to NEXT_PUBLIC_API_URL or http://localhost:8000.
const isServer = typeof window === 'undefined';
export const API_BASE_URL = isServer
  ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  : '/api/backend';

export const ENDPOINTS = {
  // Authentication (Public)
  AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,

  // Multi-Agent Execution (Protected)
  INVOKE: `${API_BASE_URL}/invoke`,
  STREAM: `${API_BASE_URL}/stream`,

  // Human-In-The-Loop & Previews (Protected)
  WEB_SEARCH_PREVIEW: `${API_BASE_URL}/web_search/preview`,
  HITL_WEB_DECISION: `${API_BASE_URL}/hitl/web_decision`,
  HITL_WEB_DECISIONS: `${API_BASE_URL}/hitl/web_decisions`,

  // Durable Conversation Store (Protected)
  STORE_THREADS: `${API_BASE_URL}/store/threads`,
  STORE_THREAD: (threadId: string) => `${API_BASE_URL}/store/${encodeURIComponent(threadId)}`,

  // Evaluation Feedback (Protected)
  FEEDBACK: `${API_BASE_URL}/feedback`,

  // Monitoring & Probes (Public)
  HEALTHZ: `${API_BASE_URL}/healthz`,
  READYZ: `${API_BASE_URL}/readyz`,
  METRICS: `${API_BASE_URL}/metrics`,
} as const;

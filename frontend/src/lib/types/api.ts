/**
 * AgentForge API Data Contracts
 * Mirroring backend schemas in schema/schema.py and service/service.py
 */

export interface UserInput {
  message: string;
  model?: string;
  thread_id?: string | null;
}

export interface StreamInput extends UserInput {
  stream_tokens?: boolean;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id: string;
  type?: string;
}

export type MessageRole = 'human' | 'ai' | 'tool' | 'system' | 'user' | 'assistant';

export interface ChatMessage {
  type: MessageRole;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string | null;
  run_id?: string | null;
  original?: Record<string, unknown>;
}

export interface AuthRegisterInput {
  user_id: string;
  password: string;
}

export interface AuthLoginInput {
  user_id: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: string;
  expires_in: number;
}

export interface Feedback {
  run_id: string;
  key: string;
  score: number;
  kwargs?: Record<string, unknown>;
}

export interface WebSearchPreviewItem {
  title: string;
  url: string;
  snippet: string;
  published_date: string;
  is_within_recency?: boolean | null;
  domain?: string;
}

export interface WebSearchPreviewResponse {
  query: string;
  recency_days: number;
  max_results: number;
  count: number;
  all_within_recency: boolean;
  source: string;
  cache_hit: boolean;
  items: WebSearchPreviewItem[];
  web_notes: string;
}

export interface HitlDecisionPayload {
  query: string;
  decision: 'approved' | 'rejected';
  thread_id?: string;
  user_id?: string;
  reason?: string;
  recency_days?: number;
  preview_count?: number;
  all_within_recency?: boolean;
  source?: string;
  cache_hit?: boolean;
}

export interface HitlEvent {
  user_id: string;
  thread_id: string;
  query: string;
  decision: 'approved' | 'rejected';
  reason: string;
  metadata: {
    recency_days?: number;
    preview_count?: number;
    all_within_recency?: boolean;
    source?: string;
    cache_hit?: boolean;
    audit_source?: string;
  };
  created_at: string;
}

export interface HitlEventsResponse {
  user_id: string;
  backend: string | null;
  thread_id: string;
  count: number;
  events: HitlEvent[];
}

export interface ThreadSummary {
  thread_id: string;
  last_message_at: string;
  updated_at?: string;
  message_count: number;
  last_message_preview?: string;
}

export interface ThreadsResponse {
  user_id: string;
  backend: string | null;
  count: number;
  threads: ThreadSummary[];
}

export interface StoredMessageRecord {
  user_id: string;
  thread_id: string;
  run_id: string;
  role: MessageRole;
  content: string;
  metadata: {
    model?: string;
    route?: string;
    evaluation_score?: number;
    evaluation_report?: string;
    stream?: boolean;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface ThreadHistoryResponse {
  thread_id: string;
  user_id: string;
  backend: string | null;
  count: number;
  messages: StoredMessageRecord[];
}

export interface HealthResponse {
  status: 'ok' | string;
}

export interface ReadyResponse {
  status: 'ready' | 'degraded' | string;
  components?: {
    database?: boolean;
    redis?: boolean;
    groq?: boolean;
    [key: string]: boolean | undefined;
  };
  detail?: string;
}

export type HealthzResponse = HealthResponse;
export type ReadyzResponse = ReadyResponse;

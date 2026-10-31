import { ENDPOINTS } from './endpoints';
import { ApiError } from './errors';
import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthToken,
  ChatMessage,
  Feedback,
  HealthResponse,
  HitlDecisionPayload,
  HitlEventsResponse,
  ReadyResponse,
  ThreadHistoryResponse,
  ThreadsResponse,
  UserInput,
  WebSearchPreviewResponse,
} from '../types/api';

/**
 * AgentApiClient — Centralized, typed API client for AgentForge FastAPI backend.
 */
export class AgentApiClient {
  private token: string | null = null;

  constructor(token?: string | null) {
    if (token) {
      this.token = token;
    } else if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('agentforge_token');
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('agentforge_token', token);
      } else {
        localStorage.removeItem('agentforge_token');
      }
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('agentforge_token');
    }
    return this.token;
  }

  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...customHeaders,
    };
    const activeToken = this.getToken();
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = this.getHeaders(
      (options.headers as Record<string, string>) || {}
    );

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err) {
      throw new ApiError(
        0,
        `Network request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!response.ok) {
      let detail = `HTTP ${response.status} ${response.statusText}`;
      let raw: unknown = null;
      try {
        raw = await response.json();
        if (typeof raw === 'object' && raw !== null && 'detail' in raw) {
          detail = String((raw as { detail: unknown }).detail);
        }
      } catch {
        try {
          const text = await response.text();
          if (text) detail = text;
        } catch {
          // Ignore
        }
      }
      throw new ApiError(response.status, detail, raw);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  }

  // --- Auth Endpoints ---

  public async register(payload: AuthRegisterInput): Promise<AuthToken> {
    const result = await this.request<AuthToken>(ENDPOINTS.AUTH_REGISTER, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(result.access_token);
    return result;
  }

  public async login(payload: AuthLoginInput): Promise<AuthToken> {
    const result = await this.request<AuthToken>(ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(result.access_token);
    return result;
  }

  // --- Multi-Agent Execution Endpoints ---

  public async invoke(input: UserInput, signal?: AbortSignal): Promise<ChatMessage> {
    return this.request<ChatMessage>(ENDPOINTS.INVOKE, {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    });
  }

  // --- Human-In-The-Loop Endpoints ---

  public async webSearchPreview(
    query: string,
    recencyDays = 7,
    maxResults = 5
  ): Promise<WebSearchPreviewResponse> {
    return this.request<WebSearchPreviewResponse>(ENDPOINTS.WEB_SEARCH_PREVIEW, {
      method: 'POST',
      body: JSON.stringify({
        query,
        recency_days: recencyDays,
        max_results: maxResults,
      }),
    });
  }

  public async recordHitlDecision(payload: HitlDecisionPayload): Promise<{ status: string }> {
    return this.request<{ status: string }>(ENDPOINTS.HITL_WEB_DECISION, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listHitlDecisions(limit = 50, threadId?: string): Promise<HitlEventsResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (threadId) params.append('thread_id', threadId);
    return this.request<HitlEventsResponse>(
      `${ENDPOINTS.HITL_WEB_DECISIONS}?${params.toString()}`,
      { method: 'GET' }
    );
  }

  // --- Durable Conversation Store Endpoints ---

  public async listThreads(limit = 30): Promise<ThreadsResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.request<ThreadsResponse>(
      `${ENDPOINTS.STORE_THREADS}?${params.toString()}`,
      { method: 'GET' }
    );
  }

  public async getThreadHistory(threadId: string, limit = 50): Promise<ThreadHistoryResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.request<ThreadHistoryResponse>(
      `${ENDPOINTS.STORE_THREAD(threadId)}?${params.toString()}`,
      { method: 'GET' }
    );
  }

  // --- Evaluation Feedback ---

  public async createFeedback(feedback: Feedback): Promise<{ status: string }> {
    return this.request<{ status: string }>(ENDPOINTS.FEEDBACK, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }

  // --- Health, Readiness & Metrics ---

  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>(ENDPOINTS.HEALTHZ, { method: 'GET' });
  }

  public async getHealthz(): Promise<HealthResponse> {
    return this.getHealth();
  }

  public async getReadiness(): Promise<ReadyResponse> {
    return this.request<ReadyResponse>(ENDPOINTS.READYZ, { method: 'GET' });
  }

  public async getReadyz(): Promise<ReadyResponse> {
    return this.getReadiness();
  }

  public async getMetricsText(): Promise<string> {
    return this.request<string>(ENDPOINTS.METRICS, {
      method: 'GET',
      headers: { Accept: 'text/plain' },
    });
  }
}

// Global default singleton client
export const apiClient = new AgentApiClient();
export const agentApiClient = apiClient;

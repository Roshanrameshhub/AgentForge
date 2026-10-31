import { ENDPOINTS } from './endpoints';
import { ApiError } from './errors';
import { streamAgent, type StreamCallbacks } from './stream';
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
  StreamInput,
  ThreadHistoryResponse,
  ThreadsResponse,
  UserInput,
  WebSearchPreviewResponse,
} from '../types/api';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

/**
 * AgentApiClient — Centralized, typed API client for AgentForge FastAPI backend.
 * Provides request timeouts, safe GET retries, 401 invalidation, and unified streaming.
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
    options: RequestOptions = {}
  ): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const isIdempotent = method === 'GET' || method === 'HEAD';
    const maxRetries = options.retries ?? (isIdempotent ? 1 : 0);
    const timeoutMs = options.timeoutMs ?? 30000;

    let attempt = 0;
    while (true) {
      attempt++;
      const controller = new AbortController();
      const userSignal = options.signal;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      if (userSignal?.aborted) {
        controller.abort(userSignal.reason);
      } else if (userSignal) {
        userSignal.addEventListener('abort', () => controller.abort(userSignal.reason), {
          once: true,
        });
      }

      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      const headers = this.getHeaders(
        (options.headers as Record<string, string>) || {}
      );

      let response: Response;
      try {
        response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });
      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);
        if (userSignal?.aborted) {
          throw new ApiError(0, 'Request aborted by user');
        }

        // Retry on network errors for idempotent requests
        if (isIdempotent && attempt <= maxRetries) {
          const backoff = 300 * Math.pow(2, attempt - 1) + Math.random() * 100;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        throw new ApiError(
          0,
          `Network request failed: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      // Safe retry for transient 502, 503, 504 server errors on GET/HEAD
      if (
        isIdempotent &&
        attempt <= maxRetries &&
        (response.status === 502 || response.status === 503 || response.status === 504)
      ) {
        const backoff = 300 * Math.pow(2, attempt - 1) + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.setToken(null);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agentforge_unauthorized'));
          }
        }

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

  // --- Multi-Agent Execution & Streaming ---

  public async invoke(input: UserInput, signal?: AbortSignal): Promise<ChatMessage> {
    return this.request<ChatMessage>(ENDPOINTS.INVOKE, {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
      timeoutMs: 60000, // 60s timeout for agent reasoning
    });
  }

  public async stream(
    input: StreamInput,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    return streamAgent(input, callbacks, this.getToken(), signal);
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
    const decision = payload.decision || (payload.action === 'approve' ? 'approved' : 'rejected');
    const body: HitlDecisionPayload = {
      ...payload,
      decision,
    };
    return this.request<{ status: string }>(ENDPOINTS.HITL_WEB_DECISION, {
      method: 'POST',
      body: JSON.stringify(body),
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


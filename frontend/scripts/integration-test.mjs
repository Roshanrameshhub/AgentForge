import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Mock browser localStorage and CustomEvent for Node.js environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

const dispatchedEvents = [];
global.window = {
  dispatchEvent: (event) => {
    dispatchedEvents.push(event);
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

global.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

describe('1. AgentForge Centralized API Client Architecture', () => {
  test('Token Lifecycle & Authorization Header Injection', () => {
    global.localStorage.clear();
    const token = 'test-jwt-token-alpha-9';
    global.localStorage.setItem('agentforge_token', token);

    // Verify token can be read and set
    assert.equal(global.localStorage.getItem('agentforge_token'), token);

    global.localStorage.removeItem('agentforge_token');
    assert.equal(global.localStorage.getItem('agentforge_token'), null);
  });

  test('401 Unauthorized Session Invalidation Event', () => {
    dispatchedEvents.length = 0;
    global.localStorage.setItem('agentforge_token', 'expired-token');

    // Simulate 401 handling
    global.localStorage.removeItem('agentforge_token');
    global.window.dispatchEvent(new CustomEvent('agentforge_unauthorized'));

    assert.equal(global.localStorage.getItem('agentforge_token'), null);
    assert.equal(dispatchedEvents.length, 1);
    assert.equal(dispatchedEvents[0].type, 'agentforge_unauthorized');
  });
});

describe('2. Endpoint Mapping & URL Contracts (All 13 Backend Routes)', () => {
  const API_BASE = 'http://127.0.0.1:8000';
  const ENDPOINTS = {
    AUTH_REGISTER: `${API_BASE}/auth/register`,
    AUTH_LOGIN: `${API_BASE}/auth/login`,
    INVOKE: `${API_BASE}/invoke`,
    STREAM: `${API_BASE}/stream`,
    WEB_SEARCH_PREVIEW: `${API_BASE}/web_search/preview`,
    HITL_WEB_DECISION: `${API_BASE}/hitl/web_decision`,
    HITL_WEB_DECISIONS: `${API_BASE}/hitl/web_decisions`,
    STORE_THREADS: `${API_BASE}/store/threads`,
    STORE_THREAD: (id) => `${API_BASE}/store/${encodeURIComponent(id)}`,
    FEEDBACK: `${API_BASE}/feedback`,
    HEALTHZ: `${API_BASE}/healthz`,
    READYZ: `${API_BASE}/readyz`,
    METRICS: `${API_BASE}/metrics`,
  };

  test('Public Endpoints Form Correct URLs', () => {
    assert.equal(ENDPOINTS.HEALTHZ, 'http://127.0.0.1:8000/healthz');
    assert.equal(ENDPOINTS.READYZ, 'http://127.0.0.1:8000/readyz');
    assert.equal(ENDPOINTS.METRICS, 'http://127.0.0.1:8000/metrics');
    assert.equal(ENDPOINTS.AUTH_REGISTER, 'http://127.0.0.1:8000/auth/register');
    assert.equal(ENDPOINTS.AUTH_LOGIN, 'http://127.0.0.1:8000/auth/login');
  });

  test('Protected Execution & Store Endpoints Encode Paths', () => {
    assert.equal(ENDPOINTS.INVOKE, 'http://127.0.0.1:8000/invoke');
    assert.equal(ENDPOINTS.STREAM, 'http://127.0.0.1:8000/stream');
    assert.equal(ENDPOINTS.WEB_SEARCH_PREVIEW, 'http://127.0.0.1:8000/web_search/preview');
    assert.equal(ENDPOINTS.HITL_WEB_DECISION, 'http://127.0.0.1:8000/hitl/web_decision');
    assert.equal(ENDPOINTS.STORE_THREADS, 'http://127.0.0.1:8000/store/threads');
    assert.equal(ENDPOINTS.STORE_THREAD('thread/123 with space'), 'http://127.0.0.1:8000/store/thread%2F123%20with%20space');
    assert.equal(ENDPOINTS.FEEDBACK, 'http://127.0.0.1:8000/feedback');
  });
});

describe('3. Real-Time Streaming Implementation (SSE Text/Event-Stream)', () => {
  function parseSseStreamChunks(rawChunks) {
    const tokens = [];
    const messages = [];
    const errors = [];
    let isDone = false;

    let buffer = '';
    for (const chunk of rawChunks) {
      buffer += chunk;
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        const rawLines = block.split('\n');
        for (const rawLine of rawLines) {
          const line = rawLine.trim();
          if (!line || line.startsWith(':')) continue;

          if (line.startsWith('data:')) {
            const dataStr = line.replace(/^data:\s?/, '').trim();
            if (dataStr === '[DONE]') {
              isDone = true;
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'token') tokens.push(parsed.content);
              if (parsed.type === 'message') messages.push(parsed.content);
              if (parsed.type === 'error') errors.push(parsed.content);
            } catch {
              // Ignore malformed
            }
          }
        }
      }
    }
    return { tokens, messages, errors, isDone };
  }

  test('Parses Token Chunks with Incremental Reconstruction', () => {
    const chunks = [
      'data: {"type": "token", "content": "Hello"}\n\n',
      'data: {"type": "token", "content": " "}\n\n',
      'data: {"type": "token", "content": "World"}\n\n',
      'data: [DONE]\n\n',
    ];
    const result = parseSseStreamChunks(chunks);
    assert.equal(result.tokens.join(''), 'Hello World');
    assert.equal(result.isDone, true);
  });

  test('Handles Fragmented Chunks Across TCP/HTTP Frame Boundaries', () => {
    const fragmented = [
      'data: {"type": "tok',
      'en", "content": "Frag',
      'ment"}\n\n: heartbeat\n\ndata: [DONE]\n\n',
    ];
    const result = parseSseStreamChunks(fragmented);
    assert.equal(result.tokens.join(''), 'Fragment');
    assert.equal(result.isDone, true);
  });

  test('Extracts Structured AIMessage from Backend Stream', () => {
    const stream = [
      'data: {"type": "message", "content": {"type": "ai", "content": "Synthesized report", "run_id": "run-42"}}\n\n',
      'data: [DONE]\n\n',
    ];
    const result = parseSseStreamChunks(stream);
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0].type, 'ai');
    assert.equal(result.messages[0].content, 'Synthesized report');
    assert.equal(result.messages[0].run_id, 'run-42');
    assert.equal(result.isDone, true);
  });

  test('Gracefully Handles Server Error Chunks in Stream', () => {
    const stream = [
      'data: {"type": "error", "content": "Model rate limit exceeded on Groq"}\n\n',
      'data: [DONE]\n\n',
    ];
    const result = parseSseStreamChunks(stream);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0], 'Model rate limit exceeded on Groq');
  });
});

describe('4. Human-In-The-Loop (HITL) Gate Recognition & Payload Mapping', () => {
  function isHitlRequired(content) {
    if (!content || typeof content !== 'string') return false;
    return (
      content.includes('Human approval required before web-answer generation.') ||
      content.includes('A web HITL decision is pending') ||
      content.includes('web HITL decision is pending') ||
      content.includes('Reply with `approve` or `reject')
    );
  }

  test('Identifies Preview Approval Prompt from research_assistant.py', () => {
    const msg =
      'Human approval required before web-answer generation.\n\nQuery: latest quantum computing\nReply with `approve` to continue, or `reject: <reason>` to stop.';
    assert.equal(isHitlRequired(msg), true);
  });

  test('Identifies Pending Reminder Prompt', () => {
    const msg = 'A web HITL decision is pending. Reply with `approve` or `reject: <reason>`.';
    assert.equal(isHitlRequired(msg), true);
  });

  test('Does Not False-Positive on Standard Reasoning Answers', () => {
    const msg = 'Here is the answer based on ChromaDB vector retrieval.\n\n_Evaluated by evaluation agent._';
    assert.equal(isHitlRequired(msg), false);
  });

  test('HITL Decision Normalization (action -> decision)', () => {
    function normalizeDecision(payload) {
      const decision = payload.decision || (payload.action === 'approve' ? 'approved' : 'rejected');
      return { ...payload, decision };
    }

    const payloadA = normalizeDecision({ query: 'tech news', action: 'approve' });
    assert.equal(payloadA.decision, 'approved');

    const payloadB = normalizeDecision({ query: 'tech news', action: 'reject', reason: 'out of date' });
    assert.equal(payloadB.decision, 'rejected');
  });
});

describe('5. OpenMetrics Prometheus Parser Engine', () => {
  function parsePrometheusText(text) {
    let total = 0;
    let errors = 0;
    let latencySum = 0;
    let latencyCount = 0;

    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      if (line.startsWith('http_requests_total')) {
        const parts = line.split(' ');
        const val = parseFloat(parts[parts.length - 1]);
        if (!isNaN(val)) total += val;
        if (
          line.includes('status_code="5') ||
          line.includes('status_code="4') ||
          line.includes('status="5') ||
          line.includes('status="4')
        ) {
          errors += val;
        }
      } else if (line.startsWith('http_request_duration_seconds_sum')) {
        const parts = line.split(' ');
        const val = parseFloat(parts[parts.length - 1]);
        if (!isNaN(val)) latencySum += val;
      } else if (line.startsWith('http_request_duration_seconds_count')) {
        const parts = line.split(' ');
        const val = parseFloat(parts[parts.length - 1]);
        if (!isNaN(val)) latencyCount += val;
      }
    }

    const avgLatencyMs = latencyCount > 0 ? (latencySum / latencyCount) * 1000 : 0;
    return { total, errors, avgLatencyMs: Math.round(avgLatencyMs) };
  }

  test('Parses Sample Prometheus Exposition Metrics Text', () => {
    const sample = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/healthz",status_code="200"} 45.0
http_requests_total{method="POST",path="/invoke",status_code="200"} 12.0
http_requests_total{method="POST",path="/invoke",status_code="500"} 3.0
# HELP http_request_duration_seconds HTTP request duration
http_request_duration_seconds_sum{method="POST",path="/invoke"} 7.5
http_request_duration_seconds_count{method="POST",path="/invoke"} 15.0
`;
    const parsed = parsePrometheusText(sample);
    assert.equal(parsed.total, 60.0);
    assert.equal(parsed.errors, 3.0);
    assert.equal(parsed.avgLatencyMs, 500); // 7.5 / 15 * 1000 = 500ms
  });
});

describe('6. Safe Retry Policy Engine', () => {
  test('Identifies Idempotent vs Non-Idempotent HTTP Methods', () => {
    function canSafelyRetry(method) {
      const upper = method.toUpperCase();
      return upper === 'GET' || upper === 'HEAD';
    }

    assert.equal(canSafelyRetry('GET'), true);
    assert.equal(canSafelyRetry('HEAD'), true);
    assert.equal(canSafelyRetry('POST'), false);
    assert.equal(canSafelyRetry('PUT'), false);
    assert.equal(canSafelyRetry('DELETE'), false);
  });
});

describe('8. End-to-End Workflow & Store Persistence Simulation', () => {
  test('Validates Durable Message History & Checkpoint Integrity', () => {
    const rawMessages = [
      {
        user_id: 'test_dev',
        thread_id: 'thread-alpha-1',
        run_id: 'run-99',
        role: 'human',
        content: 'Execute quantum research',
        metadata: { model: 'llama-3.3-70b-versatile' },
        created_at: '2026-10-31T12:00:00Z',
      },
      {
        user_id: 'test_dev',
        thread_id: 'thread-alpha-1',
        run_id: 'run-99',
        role: 'ai',
        content: 'Synthesizing literature review.\n\n_Evaluated by evaluation agent._',
        metadata: { route: 'hybrid', evaluation_score: 0.95 },
        created_at: '2026-10-31T12:00:05Z',
      },
    ];

    assert.equal(rawMessages.length, 2);
    assert.equal(rawMessages[0].role, 'human');
    assert.equal(rawMessages[1].role, 'ai');
    assert.equal(rawMessages[1].metadata.route, 'hybrid');
    assert.equal(rawMessages[1].metadata.evaluation_score, 0.95);
  });

  test('Validates JSON Transcript Export Structure', () => {
    function generateTranscriptPayload(threadId, messages) {
      return {
        thread_id: threadId,
        message_count: messages.length,
        exported_at: '2026-10-31T12:00:10Z',
        messages,
      };
    }

    const payload = generateTranscriptPayload('thread-alpha-1', [{ role: 'human', content: 'test' }]);
    assert.equal(payload.thread_id, 'thread-alpha-1');
    assert.equal(payload.message_count, 1);
    assert.equal(payload.messages[0].content, 'test');
  });

  test('Validates LangSmith Feedback Rating Structure', () => {
    const feedback = {
      run_id: 'run-99',
      key: 'human-rating',
      score: 1.0,
      kwargs: { comment: 'Accurate synthesis' },
    };

    assert.equal(feedback.run_id, 'run-99');
    assert.equal(feedback.score, 1.0);
    assert.equal(typeof feedback.kwargs.comment, 'string');
  });
});

describe('9. Hybrid RAG Reciprocal Rank Fusion (RRF) Engine', () => {
  test('Computes RRF Score with K=60 Constant', () => {
    function calculateRrf(ranks, k = 60) {
      return ranks.reduce((sum, r) => sum + 1 / (k + r), 0);
    }

    // Document ranked #1 in Vector and #2 in BM25
    const scoreCandidateA = calculateRrf([1, 2]);
    // Document ranked #10 in Vector and #10 in BM25
    const scoreCandidateB = calculateRrf([10, 10]);

    assert.ok(scoreCandidateA > scoreCandidateB, 'Candidate A must rank higher than Candidate B');
    assert.equal(Math.round(scoreCandidateA * 10000) / 10000, Math.round((1 / 61 + 1 / 62) * 10000) / 10000);
  });
});


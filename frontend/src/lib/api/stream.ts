import { ENDPOINTS } from './endpoints';
import { ApiError } from './errors';
import type { ChatMessage, StreamInput } from '../types/api';

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

export interface StreamEvent {
  type: 'token' | 'message' | 'error';
  content: string | ChatMessage;
}

/**
 * Stream agent response via Server-Sent Events (SSE) from POST /stream.
 */
export async function streamAgent(
  input: StreamInput,
  callbacks: StreamCallbacks,
  token?: string | null,
  signal?: AbortSignal
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  const activeToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('agentforge_token') : null);
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  let response: Response;
  try {
    response = await fetch(ENDPOINTS.STREAM, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) return;
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError?.(`Stream connection failed: ${msg}`);
    throw new ApiError(0, msg);
  }

  if (!response.ok) {
    let detail = `Stream request failed: HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson === 'object' && 'detail' in errorJson) {
        detail = String(errorJson.detail);
      }
    } catch {
      // Fallback
    }
    callbacks.onError?.(detail);
    throw new ApiError(response.status, detail);
  }

  if (!response.body) {
    callbacks.onError?.('Response body is empty.');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        const line = block.trim();
        if (!line.startsWith('data: ')) continue;

        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') {
          callbacks.onDone?.();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr) as StreamEvent;
          if (parsed.type === 'token') {
            callbacks.onToken?.(String(parsed.content));
          } else if (parsed.type === 'message') {
            callbacks.onMessage?.(parsed.content as ChatMessage);
          } else if (parsed.type === 'error') {
            callbacks.onError?.(String(parsed.content));
          }
        } catch {
          // If JSON parse fails, ignore malformed chunk
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return;
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError?.(`Stream reading error: ${msg}`);
  } finally {
    callbacks.onDone?.();
  }
}
